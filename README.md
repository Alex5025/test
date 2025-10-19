# 模板標籤匹配系統 MCP 服務器

## 🎯 系統概述

這個系統實現了基於 PostgreSQL + JSONB 的模板標籤匹配決策功能，提供完整的 MCP (Model Context Protocol) 服務器實現，包含：

1. **資料庫結構**：使用 PostgreSQL 的多模態能力 
2. **MCP 服務器**：JavaScript 實現的完整 MCP 服務器
3. **智能推薦**：標籤匹配和可信度評估功能
4. **MongoDB 支援**：已配置 MongoDB 資料庫 (UXD_MCP)

## 📁 專案結構

```
/Users/alex/IdeaProjects/test/
├── README.md                        # 專案說明文檔
├── mcp-config.json                  # MCP 配置文件  
├── template_matching_system.sql     # PostgreSQL 資料庫腳本
├── postgresql_multimodal.sql        # PostgreSQL 多模態腳本
├── document/
│   └── template_tags.md             # 原始需求規格
└── template-mcp-server/             # 核心 MCP 服務器
    ├── package.json                 # Node.js 依賴配置
    ├── src/
    │   └── index.js                 # 主要 MCP 服務器代碼
    ├── README.md                    # MCP 服務器說明
    └── CHANGELOG.md                 # 版本更新記錄
```

## 🚀 快速開始

### 前置需求
- Node.js 18+ 
- PostgreSQL 或 MongoDB
- VS Code with GitHub Copilot

### 1. 安裝依賴
```bash
cd template-mcp-server
npm install
```

### 2. 配置資料庫

#### PostgreSQL (推薦)
```bash
# 啟動 PostgreSQL 
brew services start postgresql@14

# 使用提供的 SQL 腳本初始化資料庫
psql -d webchecker -f template_matching_system.sql
```

#### MongoDB (替代選項)  
```bash
# 啟動 MongoDB
brew services start mongodb/brew/mongodb-community

# 連接到 UXD_MCP 資料庫
mongosh "mongodb://localhost:27017/UXD_MCP"
```

### 3. 啟動 MCP 服務器
```bash
cd template-mcp-server
npm start
```

### 4. 在 VS Code 中使用
1. 確認 `mcp-config.json` 已正確配置
2. 重啟 VS Code 
3. 在 GitHub Copilot Chat 中使用 `@template-matching`

## 🛠️ 核心功能

### MCP 工具列表
- **get_all_tags** - 撈取所有可用標籤
- **find_best_template** - 找出最佳匹配模板
- **analyze_template_matching** - 詳細匹配分析
- **get_template_stats** - 模板統計資訊
- **init_database** - 初始化資料庫
- **evaluate_confidence** - 可信度評估

### 使用範例
```bash
# 在 Copilot Chat 中使用
@template-matching 請幫我找出適合「信用卡申請表單」的模板

@template-matching 分析標籤「申請,表單,審核,狀態」的匹配情況
```

## 💾 資料庫設計

### PostgreSQL 結構

#### tags 表（標籤管理）
```sql
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    tag_name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### templates 表（模板定義）
```sql
CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    tags JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 核心資料
- **22個標籤**：申請、表單、資料、填寫、輸入、草稿、開戶、信用卡、文件、清單、追蹤、日期、狀態、審核、流程、傳遞、顯示、下載、內容、審查、放行、展示
- **3個模板**：
  - 資訊輸入模板（9個標籤）
  - 流程檢查模板（7個標籤）
  - 資訊展示模板（9個標籤）

## 🔍 匹配邏輯

### 評分計算
```
匹配度 = (匹配標籤數量 / 輸入標籤數量) × 100%
```

## 📊 測試結果範例

### IT工程師批次監控案例
- **用戶輸入**：「我是一個銀行的IT工程師,我需要一個頁面來顯示每天的批次執行狀況」
- **LLM推薦標籤**：['流程', '審核', '追蹤', '內容', '日期']
- **最佳匹配**：流程檢查模板（80% 匹配度）
- **匹配分析**：
  - ✅ 流程：直接匹配
  - ✅ 審核：直接匹配  
  - ✅ 追蹤：直接匹配
  - ✅ 日期：直接匹配
  - ❌ 內容：不在流程檢查模板中

## ⚙️ 技術架構

### 語言和框架
- **JavaScript (Node.js)** - MCP 服務器主要實現
- **PostgreSQL** - 主要資料庫（支援 JSONB）
- **MongoDB** - 替代資料庫選項 (UXD_MCP)
- **Model Context Protocol** - VS Code 整合

### 配置文件位置
- **MCP 服務器配置**: `mcp-config.json`
- **PostgreSQL 連線**: `template-mcp-server/src/index.js`
- **MongoDB 連線**: `mongodb://localhost:27017/UXD_MCP`

## 🎉 系統優勢

1. **多模態設計** - 支援 PostgreSQL 和 MongoDB
2. **高效查詢** - GIN 索引支援快速 JSONB 查詢  
3. **易於擴展** - 可輕鬆添加新模板和標籤
4. **VS Code 整合** - 原生支援 GitHub Copilot Chat
5. **智能評估** - 包含可信度評估功能

---

這個系統提供了完整的模板匹配決策功能，結合了資料庫的高效查詢和 LLM 的智能推薦！