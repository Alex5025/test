# 模板標籤匹配系統實作指南

## 🎯 系統概述

這個系統實現了基於 PostgreSQL + JSONB 的模板標籤匹配決策功能，包含：

1. **資料庫結構**：使用 PostgreSQL 的多模態能力
2. **MCP 系統**：負責資料撈取和匹配邏輯
3. **智能推薦**：模擬 LLM 標籤推薦功能

## 📁 文件結構

```
/Users/alex/IdeaProjects/test/
├── template_matching_system.sql      # 完整的資料庫 SQL 腳本
├── template_mcp_system.py           # 完整的 MCP 系統（需要資料庫）
├── template_matching_demo.py        # 測試版本（無需資料庫）
├── setup_database.py               # 資料庫初始化腳本
└── template_tags.md                 # 原始標籤資料
```

## 🚀 快速開始

### 方法一：無資料庫測試（推薦先試用）

```bash
# 運行測試版本，查看匹配邏輯
/Users/alex/IdeaProjects/test/.venv/bin/python template_matching_demo.py
```

### 方法二：完整資料庫實作

#### 1. 準備 PostgreSQL
確保 PostgreSQL 已安裝並運行：
```bash
# macOS 使用 Homebrew
brew install postgresql
brew services start postgresql

# 創建資料庫（如果需要）
createdb template_matching_db
```

#### 2. 設置資料庫
```bash
# 修改 setup_database.py 中的資料庫連接配置
# 然後運行初始化
/Users/alex/IdeaProjects/test/.venv/bin/python setup_database.py
```

#### 3. 運行完整系統
```bash
# 修改 template_mcp_system.py 中的資料庫連接配置
# 然後運行完整系統
/Users/alex/IdeaProjects/test/.venv/bin/python template_mcp_system.py
```

## 💾 資料庫設計

### 資料表結構

#### tags 表（傳統關聯式）
```sql
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    tag_name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### templates 表（JSONB 格式）
```sql
CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    tags JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 核心資料
- **22個唯一標籤**：申請、表單、資料、填寫、輸入、草稿、開戶、信用卡、文件、清單、追蹤、日期、狀態、審核、流程、傳遞、顯示、下載、內容、審查、放行、展示
- **3個模板**：
  - 資訊輸入模板（9個標籤）
  - 流程檢查模板（7個標籤）
  - 資訊展示模板（9個標籤）

## 🔍 匹配邏輯

### 匹配分數計算
```
匹配度 = (匹配標籤數量 / 輸入標籤數量) × 100%
```

### 匹配等級
- **高度匹配**：4+ 個標籤匹配
- **中度匹配**：3 個標籤匹配
- **低度匹配**：2 個標籤匹配
- **不匹配**：1 個或無標籤匹配

## 📊 測試結果範例

### 測試案例：IT工程師批次監控
- **用戶輸入**：「我是一個銀行的IT工程師,我需要一個頁面來顯示每天的批次執行狀況」
- **LLM推薦標籤**：['流程', '審核', '追蹤', '內容', '日期']
- **最佳匹配**：流程檢查模板（80% 匹配度）
- **匹配分析**：
  - ✅ 流程：直接匹配
  - ✅ 審核：直接匹配  
  - ✅ 追蹤：直接匹配
  - ✅ 日期：直接匹配
  - ❌ 內容：不在流程檢查模板中

## 🛠️ 關鍵功能

### 1. MCP 資料撈取
```python
# 撈取所有標籤給 LLM
all_tags = mcp.get_all_tags()
```

### 2. 模板匹配決策
```python
# 根據推薦標籤找最佳模板
matches = mcp.find_best_template(['顯示', '狀態', '資料'])
```

### 3. 詳細分析報告
```python
# 產生完整的匹配分析
analysis = mcp.analyze_template_matching(recommended_tags)
```

## ⚙️ 配置說明

### 資料庫連接配置
在 `setup_database.py` 和 `template_mcp_system.py` 中修改：
```python
db_config = {
    'host': 'localhost',        # 資料庫主機
    'database': 'postgres',     # 資料庫名稱
    'user': 'postgres',         # 用戶名
    'password': 'your_password', # 密碼
    'port': '5432'             # 端口
}
```

## 🎉 系統優勢

### 1. 多模態設計
- **標籤表**：傳統關聯式，確保唯一性
- **模板表**：JSONB格式，靈活且高效

### 2. 高效查詢
- GIN 索引支援快速 JSONB 查詢
- PostgreSQL 函數封裝複雜邏輯

### 3. 易於擴展
- 可輕鬆添加新模板和標籤
- 支援標籤權重和額外屬性

### 4. 成本效益
- 主要邏輯在資料庫執行，無需頻繁調用 LLM
- 結果一致性好，響應速度快

## 🔗 與 LLM 整合

### 工作流程
1. **用戶輸入** → MCP 撈取標籤清單
2. **標籤清單** → LLM 推薦相關標籤
3. **推薦標籤** → 資料庫執行匹配計算
4. **匹配結果** → 回傳最佳模板

### LLM Prompt 範例
```
你是一個專業的標籤推薦助手。

可用標籤：[申請, 表單, 資料, 填寫, 輸入, 草稿, 開戶, 信用卡, 文件, 清單, 追蹤, 日期, 狀態, 審核, 流程, 傳遞, 顯示, 下載, 內容, 審查, 放行, 展示]

用戶需求：「我是一個銀行的IT工程師,我需要一個頁面來顯示每天的批次執行狀況」

請從標籤列表中選出5個最相關的標籤：
```

這個系統實現了您所需的模板匹配決策功能，結合了資料庫的高效查詢和 LLM 的智能推薦！