# 模板匹配系統 (Template Matching System)

基於 MCP (Model Context Protocol) 的模板標籤匹配系統，支援 PostgreSQL 和 MongoDB 兩種資料庫實現。

## 🏗️ 專案結構

```
test/
├── README.md                 # 專案說明
├── .gitignore               # Git 忽略檔案
├── database/                # 資料庫相關檔案
│   ├── create_tables.sql           # PostgreSQL 表格建立
│   ├── postgresql_multimodal.sql  # PostgreSQL 多模態資料
│   ├── template_matching_system.sql # 模板匹配系統 SQL
│   └── mongodb_insert.js           # MongoDB 資料插入腳本
├── document/                # 專案文件
│   ├── database_comparison.md      # 資料庫比較分析
│   ├── DEPLOYMENT_COMPLETE.md     # 部署完成報告
│   ├── evaluation_report.md       # 評估報告
│   └── template_tags.md           # 模板標籤說明
└── mcp-servers/             # MCP 服務器實現
    ├── postgresql-template-matching/  # PostgreSQL 版本
    │   ├── package.json
    │   ├── README.md
    │   └── src/
    │       └── index.js
    └── mongodb-template-matching/     # MongoDB 版本
        ├── package.json
        ├── README.md
        └── src/
            ├── index.js
            └── init-database.js
```

## 🚀 快速開始

### PostgreSQL 版本

```bash
cd mcp-servers/postgresql-template-matching
npm install
npm start
```

### MongoDB 版本

```bash
cd mcp-servers/mongodb-template-matching
npm install
npm run init-db  # 初始化資料庫
npm start
```

## 🎯 MCP 工具功能

兩個版本都提供相同的 MCP 工具：

- `get_all_tags` - 撈取所有標籤
- `find_best_template` - 找最佳匹配模板
- `analyze_template_matching` - 詳細匹配分析
- `get_template_stats` - 模板統計資訊
- `init_database` - 初始化資料庫

## ⚙️ VS Code 配置

在 `mcp.json` 中添加配置：

```json
{
  "servers": {
    "template-matching": {
      "command": "node",
      "args": ["/path/to/mcp-servers/postgresql-template-matching/src/index.js"],
      "env": {},
      "type": "stdio"
    },
    "mongodb-template-matching": {
      "command": "node", 
      "args": ["/path/to/mcp-servers/mongodb-template-matching/src/index.js"],
      "env": {},
      "type": "stdio"
    }
  }
}
```

## 📊 資料庫比較

| 特性 | PostgreSQL | MongoDB |
|------|------------|---------|
| 資料模型 | 關聯式 | 文件型 |
| 查詢語言 | SQL | Aggregation Pipeline |
| 擴展性 | 垂直擴展 | 水平擴展 |
| 一致性 | ACID | 最終一致性 |

## 📝 開發說明

- PostgreSQL 版本適合需要強一致性和複雜查詢的場景
- MongoDB 版本適合需要彈性擴展和文件導向的場景
- 兩版本提供相同的 API 介面，可依需求選擇使用

## 🎉 系統優勢

1. **雙資料庫支援** - PostgreSQL 和 MongoDB 可選
2. **高效查詢** - 優化的索引和聚合查詢
3. **易於擴展** - 模組化設計，易於添加新功能
4. **VS Code 整合** - 完整的 MCP 協議支援
5. **智能匹配** - 基於標籤的智能模板推薦