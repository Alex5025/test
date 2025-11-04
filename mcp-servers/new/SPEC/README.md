# Template Recommendation MCP Server

一個基於 Model Context Protocol (MCP) 的 AI 模板推薦伺服器，根據使用者的自然語言描述推薦最適合的 UI 模板。

## 功能特點

- 🤖 **AI 驅動**: 使用 LLM 理解使用者需求並選擇相關標籤
- 📊 **智能匹配**: 計算模板與需求的匹配度，提供可靠度評分
- 🗃️ **MongoDB 整合**: 高效的資料儲存和查詢
- 🔧 **MCP 協議**: 標準化的工具呼叫介面

## 業務流程

1. 使用者傳入自然語言需求描述
2. 從資料庫中取得所有可用標籤
3. 使用 LLM 從標籤清單中選出最相關的 10 個標籤
4. 比對 AI 推薦的標籤與資料庫中的模板，計算匹配度
5. 回傳可靠度最高的前 3 個模板及其相關標籤

## 安裝

### 前置需求

- Node.js >= 18
- MongoDB
- OpenAI API Key (或其他相容的 LLM 服務)

### 安裝步驟

```bash
# 安裝依賴
npm install

# 複製環境變數範例檔案
cp .env.example .env

# 編輯 .env 檔案，設定資料庫和 API 金鑰
# MONGODB_URI=mongodb://localhost:27017
# MONGODB_DATABASE=template_db
# OPENAI_API_KEY=your_api_key_here

# 建置專案
npm run build
```

### 資料庫初始化

```bash
# 連接到 MongoDB
mongosh

# 使用資料庫
use template_db

# 執行初始化腳本
load('MongoDB/createCollection.js')
load('MongoDB/templates.js')
load('MongoDB/tags.js')
```

## 使用方式

### 作為 MCP 伺服器執行

```bash
npm start
```

### 在 Claude Desktop 中設定

編輯 Claude Desktop 的設定檔：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "template-recommendation": {
      "command": "node",
      "args": ["/path/to/your/project/build/index.js"],
      "env": {
        "MONGODB_URI": "mongodb://localhost:27017",
        "MONGODB_DATABASE": "template_db",
        "OPENAI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## MCP 工具

### 1. query_template

根據自然語言推薦模板

**參數：**
- `naturalLanguage` (string, 必填): 使用者的需求描述
- `debugMode` (boolean, 可選): 是否顯示除錯資訊

**範例：**
```json
{
  "naturalLanguage": "我需要一個信用卡進度追蹤頁面",
  "debugMode": true
}
```

**回應：**
```json
{
  "MWHEADER": {
    "MSGID": "template-recommendation-mcp",
    "SOURCECHANNEL": "MCP_SERVER",
    "RETURNCODE": "0000",
    "RETURNDESC": "交易成功"
  },
  "TRANRS": {
    "DebugMod": true,
    "TemplateList": [
      {
        "TemplateID": "列表-進階",
        "Reliability": 0.70,
        "Tags": [
          { "功能": ["搜尋", "查詢", "追蹤"] },
          { "情境": ["案件", "進度", "追蹤"] },
          { "業務": ["銀行", "金融", "信貸"] },
          { "佈局": ["資料列表", "表格"] }
        ]
      }
    ]
  }
}
```

### 2. get_all_tags

取得所有可用標籤

**回應：**
```json
{
  "tags": ["搜尋", "查詢", "銀行", "金融", ...],
  "total": 150
}
```

### 3. get_template_by_id

根據 ID 取得模板詳細資訊

**參數：**
- `templateId` (string, 必填): 模板 ID

**範例：**
```json
{
  "templateId": "列表-基礎"
}
```

## 專案結構

```
.
├── src/
│   ├── index.ts          # MCP 伺服器主程式
│   ├── database.ts       # MongoDB 資料庫服務
│   ├── llm.ts           # LLM 服務（OpenAI）
│   └── matching.ts      # 模板匹配演算法
├── MongoDB/
│   ├── createCollection.js  # 建立集合
│   ├── templates.js         # 模板資料
│   └── tags.js             # 標籤提取
├── PSQL/                   # PostgreSQL 版本（參考用）
├── package.json
├── tsconfig.json
└── README.md
```

## 開發

```bash
# 監聽模式（自動重新編譯）
npm run watch

# 建置
npm run build

# 執行
npm start
```

## 環境變數

| 變數名稱 | 說明 | 預設值 |
|---------|------|--------|
| MONGODB_URI | MongoDB 連接字串 | mongodb://localhost:27017 |
| MONGODB_DATABASE | 資料庫名稱 | template_db |
| OPENAI_API_KEY | OpenAI API 金鑰 | - |
| OPENAI_MODEL | 使用的模型 | gpt-4 |
| OPENAI_BASE_URL | API 端點 | https://api.openai.com/v1 |

## 錯誤碼

| 代碼 | 說明 |
|------|------|
| 0000 | 交易成功 |
| E400 | 必填欄位不完整 |
| E500 | 內部伺服器錯誤 |
| E504 | AI Gateway 超時 |
| 9999 | 其他系統異常 |

## 授權

MIT License

## 維護者

- 最後更新: 2025年11月3日
- 版本: 1.0.0
