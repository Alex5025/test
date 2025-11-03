# 資料庫介紹文件

## 專案概述

本專案提供了 PostgreSQL 和 MongoDB 兩種資料庫的實作方案，用於管理模板系統。系統包含兩個主要集合/表格：`templates`（模板）和 `tags`（標籤）。

## 資料結構

### 1. Templates（模板）

儲存各種 UI 模板的資料，包含模板 ID 和四個類別的標籤陣列。

**欄位說明：**

| 欄位名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| template_id | String(32) | ✓ | 模板唯一識別碼 |
| json_data_layout | Array/JSONB | ✓ | 佈局標籤陣列 |
| json_data_situation | Array/JSONB | | 情境標籤陣列 |
| json_data_business | Array/JSONB | | 業務標籤陣列 |
| json_data_function | Array/JSONB | | 功能標籤陣列 |
| update_id | String(20) | ✓ | 更新者 ID |
| update_timestamp | DateTime | ✓ | 更新時間戳 |

**模板類型：**

1. **列表型模板**
   - 列表-基礎
   - 列表-進階
   - 列表-全區搜尋

2. **表單型模板**
   - 表單-基礎
   - 表單-進階

3. **步驟表單型模板**
   - 步驟表單-基礎
   - 步驟表單-基礎多項目
   - 步驟表單-進階

4. **詳情型模板**
   - 詳情-基礎
   - 詳情-審核

5. **設定型模板**
   - 設定-層級型
   - 設定-清單型

### 2. Tags（標籤）

儲存從模板中提取的所有唯一標籤，並按群組分類。

**欄位說明：**

| 欄位名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| tag_name | String(20) | ✓ | 標籤名稱 |
| tag_group | String(10) | ✓ | 標籤群組（業務/情境/功能/佈局） |
| update_id | String(20) | ✓ | 更新者 ID |
| update_timestamp | DateTime | ✓ | 更新時間戳 |

**標籤群組：**

- **業務（Business）**: 銀行、金融、經辦、信貸、客服、風險控管、合規、稽核等
- **情境（Situation）**: 案件、進度、管理、交易、紀錄、流程、追蹤、審查等
- **功能（Function）**: 搜尋、查詢、篩選、操作、新增、編輯、刪除、審核等
- **佈局（Layout）**: 資料列表、表格、卡片、表單、分步、詳情等

**唯一性約束：** (tag_name, tag_group) 組合必須唯一

## PostgreSQL 實作

### 檔案結構

```
PSQL/
├── createtable.sql    # 建立表格結構
├── templates.sql      # 插入模板資料和標籤
└── tags.sql          # 標籤提取邏輯
```

### 特點

- 使用 `JSONB` 型別儲存標籤陣列，支援高效查詢
- 設定表格層級的 `COMMENT` 和欄位說明
- 使用 `UNIQUE` 約束確保資料完整性
- 使用 CTE（Common Table Expression）從模板中提取標籤
- 使用 `ON CONFLICT DO NOTHING` 處理重複標籤

### 執行順序

```sql
-- 1. 建立表格
\i PSQL/createtable.sql

-- 2. 插入模板資料
\i PSQL/templates.sql

-- 3. 提取並插入標籤（已包含在 templates.sql 中）
```

### 關鍵 SQL 功能

**提取標籤範例：**

```sql
WITH all_tags AS (
    SELECT jsonb_array_elements_text(json_data_business) AS tag_name, 
           '業務' AS tag_group 
    FROM templates
    UNION ALL
    SELECT jsonb_array_elements_text(json_data_function), 
           '功能' 
    FROM templates
    -- ... 其他類別
)
SELECT DISTINCT tag_name, tag_group, 
       'system' AS update_id, 
       CURRENT_TIMESTAMP AS update_timestamp
FROM all_tags;
```

## MongoDB 實作

### 檔案結構

```
MongoDB/
├── createCollection.js    # 建立集合和索引
├── templates.js          # 插入模板資料
└── tags.js              # 標籤提取和插入
```

### 特點

- 使用 JSON Schema 驗證器確保資料格式正確
- 原生支援陣列型別，無需 JSON 轉換
- 使用唯一索引替代關聯式資料庫的約束
- 提供靈活的文件結構

### 執行順序

```javascript
// 1. 連接到 MongoDB
use your_database_name;

// 2. 建立集合和索引
load('MongoDB/createCollection.js');

// 3. 插入模板資料
load('MongoDB/templates.js');

// 4. 提取並插入標籤
load('MongoDB/tags.js');
```

### Schema 驗證器

MongoDB 使用 `$jsonSchema` 驗證器來確保文件符合預期格式：

```javascript
validator: {
    $jsonSchema: {
        bsonType: "object",
        required: ["template_id", "json_data_layout", "update_id", "update_timestamp"],
        properties: {
            template_id: {
                bsonType: "string",
                maxLength: 32
            },
            json_data_layout: {
                bsonType: "array",
                items: { bsonType: "string" }
            }
            // ... 其他欄位
        }
    }
}
```

### 索引策略

```javascript
// Templates 主鍵索引
db.templates.createIndex({ template_id: 1 }, { unique: true });

// Tags 複合唯一索引
db.tags.createIndex({ tag_name: 1, tag_group: 1 }, { unique: true });
```

## PostgreSQL vs MongoDB 對照表

| 特性 | PostgreSQL | MongoDB |
|-----|-----------|---------|
| 資料型別 | JSONB | Array |
| 主鍵 | PRIMARY KEY | Unique Index |
| 唯一約束 | UNIQUE CONSTRAINT | Unique Index |
| 時間戳 | TIMESTAMP | Date |
| Schema 驗證 | Table Definition | JSON Schema Validator |
| 陣列展開 | jsonb_array_elements_text() | forEach() |
| 重複處理 | ON CONFLICT DO NOTHING | insertMany({ordered: false}) |

## 使用場景

### PostgreSQL 適合：
- 需要強型別和嚴格的 schema
- 複雜的關聯查詢
- 需要 ACID 交易保證
- 已有 PostgreSQL 基礎設施

### MongoDB 適合：
- 需要靈活的 schema
- 文件導向的資料模型
- 水平擴展需求
- 快速開發迭代

## 查詢範例

### PostgreSQL

```sql
-- 查詢包含特定功能標籤的模板
SELECT template_id, json_data_function
FROM templates
WHERE json_data_function @> '["搜尋"]'::jsonb;

-- 統計每個標籤群組的標籤數量
SELECT tag_group, COUNT(*) as tag_count
FROM tags
GROUP BY tag_group;
```

### MongoDB

```javascript
// 查詢包含特定功能標籤的模板
db.templates.find({
    json_data_function: "搜尋"
});

// 統計每個標籤群組的標籤數量
db.tags.aggregate([
    { $group: { _id: "$tag_group", count: { $sum: 1 } } }
]);
```

## 維護建議

1. **定期備份**: 兩種資料庫都應該定期備份
2. **索引優化**: 根據查詢模式建立適當的索引
3. **資料驗證**: 插入前驗證資料格式
4. **版本控制**: 使用遷移腳本管理 schema 變更
5. **監控**: 監控查詢效能和資料庫健康狀態

## 擴展建議

1. **版本控制**: 為模板添加版本號欄位
2. **軟刪除**: 添加 `deleted_at` 欄位而非直接刪除
3. **審計日誌**: 記錄所有變更操作
4. **全文搜索**: 為標籤名稱建立全文索引
5. **快取層**: 使用 Redis 快取熱門查詢結果

## 授權與維護

- **維護者**: system
- **最後更新**: 2025年11月3日
- **版本**: 1.0.0

---

**注意**: 執行腳本前請確保已正確配置資料庫連接並備份現有資料。
