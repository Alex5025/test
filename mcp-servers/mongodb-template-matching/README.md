# MongoDB 模板標籤匹配 MCP 服務器

基於 MongoDB 的模板標籤匹配 MCP (Model Context Protocol) 服務器。

## 🚀 功能特色

- ✅ **MongoDB 整合**: 使用 MongoDB 作為資料存儲
- ✅ **標籤管理**: 完整的標籤 CRUD 操作
- ✅ **模板匹配**: 智能模板匹配算法
- ✅ **詳細分析**: 提供匹配度分析和統計
- ✅ **MCP 協議**: 完全相容 MCP 標準
- ✅ **即時查詢**: 高效的 MongoDB 聚合查詢

## 📁 專案結構

```
mongoDB/
├── package.json              # 專案配置
├── README.md                 # 說明文件
└── src/
    ├── index.js              # 主要 MCP 服務器
    └── init-database.js      # 資料庫初始化腳本
```

## 🏗️ 安裝與設置

### 1. 安裝依賴
```bash
cd mongoDB
npm install
```

### 2. 確保 MongoDB 運行
```bash
brew services start mongodb/brew/mongodb-community
```

### 3. 初始化資料庫
```bash
npm run init-db
```

## 🎯 MCP 工具功能

### 📊 可用工具

| 工具名稱 | 描述 | 參數 |
|---------|------|------|
| `get_all_tags` | 撈取所有標籤 | 無 |
| `find_best_template` | 找最佳匹配模板 | `tags: string[]` |
| `analyze_template_matching` | 詳細匹配分析 | `tags: string[]` |
| `get_template_stats` | 模板統計資訊 | 無 |
| `init_database` | 初始化資料庫 | 無 |
| `add_template` | 新增模板 | `template_name: string, tags: string[]` |

### 🔍 使用範例

#### 1. 撈取所有標籤 (給 LLM 推薦用)
```javascript
{
  "tool": "get_all_tags",
  "arguments": {}
}
```

#### 2. 找最佳匹配模板
```javascript
{
  "tool": "find_best_template", 
  "arguments": {
    "tags": ["申請", "表單", "資料"]
  }
}
```

#### 3. 詳細匹配分析
```javascript
{
  "tool": "analyze_template_matching",
  "arguments": {
    "tags": ["顯示", "狀態", "資料", "追蹤", "流程"]
  }
}
```

#### 4. 新增自訂模板
```javascript
{
  "tool": "add_template",
  "arguments": {
    "template_name": "客戶服務模板",
    "tags": ["客服", "問題", "回應", "解決"]
  }
}
```

## 🗄️ 資料庫結構

### Tags 集合
```javascript
{
  "_id": ObjectId,
  "tag_name": "申請",
  "created_at": Date
}
```

### Templates 集合
```javascript
{
  "_id": ObjectId,
  "template_name": "資訊輸入模板",
  "tags": ["申請", "表單", "資料", "填寫", "輸入"],
  "created_at": Date
}
```

## 🏃‍♂️ 運行方式

### 開發模式 (自動重啟)
```bash
npm run dev
```

### 生產模式
```bash
npm start
```

### 單獨初始化資料庫
```bash
npm run init-db
```

## ⚙️ 配置

### MongoDB 連接設定
在 `src/index.js` 中修改：
```javascript
this.mongoConfig = {
  url: 'mongodb://localhost:27017',  // MongoDB 連接地址
  dbName: 'UXD_MCP'                  // 資料庫名稱
};
```

## 🔗 VS Code 整合

將此 MCP 服務器添加到 VS Code 的 MCP 配置中：

```json
{
  "servers": {
    "mongodb-template-matching": {
      "command": "node",
      "args": ["/path/to/mongoDB/src/index.js"],
      "env": {},
      "type": "stdio"
    }
  }
}
```

## 📈 效能特色

- **MongoDB 聚合管道**: 使用高效的聚合查詢
- **索引優化**: 針對標籤和模板名稱建立索引
- **連接池**: 自動管理資料庫連接
- **錯誤處理**: 完整的錯誤捕獲和處理

## 🎯 匹配算法

### 匹配等級
- **高度匹配**: 4+ 個標籤匹配
- **中度匹配**: 3 個標籤匹配  
- **低度匹配**: 2 個標籤匹配
- **不匹配**: 1 個或無標籤匹配

### 匹配度計算
```
匹配度 = (匹配標籤數量 / 輸入標籤數量) × 100%
```

## 🧪 測試

### 快速測試
```bash
# 測試資料庫連接
node src/init-database.js

# 測試 MCP 服務器（需要在另一個終端測試 MCP 調用）
npm start
```

## 🚨 故障排除

### MongoDB 連接問題
1. 確認 MongoDB 服務運行：`brew services list | grep mongodb`
2. 檢查連接字串是否正確
3. 確認資料庫權限設置

### MCP 工具錯誤
1. 檢查工具參數格式是否正確
2. 查看 MCP 服務器日誌輸出
3. 驗證資料庫中是否有資料

## 📝 開發說明

這個 MCP 服務器使用 MongoDB 原生驅動程式，提供完整的 CRUD 操作和複雜的聚合查詢功能。所有的模板匹配邏輯都在資料庫層面執行，確保高效能和一致性。