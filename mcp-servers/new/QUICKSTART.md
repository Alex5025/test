# 快速啟動指南

## 1. 環境設定

### 建立 .env 檔案

```bash
cp .env.example .env
```

編輯 `.env` 檔案：

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=template_db

# OpenAI API
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_BASE_URL=https://api.openai.com/v1
```

## 2. 資料庫初始化

### 啟動 MongoDB

```bash
# 如果使用 Homebrew 安裝
brew services start mongodb-community

# 或直接執行
mongod --config /usr/local/etc/mongod.conf
```

### 初始化資料

```bash
# 連接到 MongoDB
mongosh

# 執行以下指令
use template_db

# 載入初始化腳本
load('MongoDB/createCollection.js')
load('MongoDB/templates.js')
load('MongoDB/tags.js')

# 驗證資料
db.templates.countDocuments()  // 應該顯示 12
db.tags.countDocuments()       // 應該顯示標籤總數

# 離開 mongosh
exit
```

## 3. 測試 MCP 伺服器

### 直接測試（stdio 模式）

```bash
npm start
```

伺服器會監聽 stdio，等待 MCP 協議的輸入。

### 在 Claude Desktop 中設定

編輯設定檔：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "template-recommendation": {
      "command": "node",
      "args": [
        "/Users/alex/IdeaProjects/test/mcp-servers/new/build/index.js"
      ],
      "env": {
        "MONGODB_URI": "mongodb://localhost:27017",
        "MONGODB_DATABASE": "template_db",
        "OPENAI_API_KEY": "sk-your-api-key-here",
        "OPENAI_MODEL": "gpt-4"
      }
    }
  }
}
```

重啟 Claude Desktop 即可使用。

## 4. 使用範例

在 Claude 中可以這樣使用：

### 查詢模板

```
請使用 query_template 工具，幫我推薦一個適合「信用卡申請進度查詢頁面」的模板
```

### 查看所有標籤

```
使用 get_all_tags 工具列出所有可用的標籤
```

### 查詢特定模板

```
使用 get_template_by_id 工具查詢「列表-進階」這個模板的詳細資訊
```

## 5. 常見問題

### MongoDB 連接失敗

確認 MongoDB 服務是否正在運行：

```bash
brew services list | grep mongodb
# 或
ps aux | grep mongod
```

### LLM API 錯誤

1. 確認 API Key 是否正確
2. 確認網路連接
3. 確認 API 配額是否足夠

### 編譯錯誤

```bash
# 清除並重新安裝
rm -rf node_modules build
npm install
npm run build
```

## 6. 開發模式

```bash
# 監聽檔案變更並自動編譯
npm run watch

# 在另一個終端機執行
npm start
```

## 7. 驗證安裝

檢查以下項目：

- [ ] MongoDB 服務正在運行
- [ ] 資料庫中有 12 個模板
- [ ] 資料庫中有標籤資料
- [ ] .env 檔案已正確設定
- [ ] npm install 成功執行
- [ ] build 資料夾已建立
- [ ] npm start 可以執行

## 8. 下一步

- 閱讀 `README.md` 了解完整文檔
- 閱讀 `DB 介紹.md` 了解資料結構
- 閱讀 `業務流程.md` 了解業務邏輯
- 查看 `openapi.yml` 了解 API 規格

## 需要協助？

- 檢查日誌輸出（stderr）
- 確認環境變數設定
- 檢查資料庫連接
- 驗證 API Key 有效性
