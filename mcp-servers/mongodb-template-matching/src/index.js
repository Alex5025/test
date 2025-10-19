#!/usr/bin/env node

/**
 * MongoDB 模板標籤匹配 MCP 服務器
 * 提供與 MongoDB 資料庫的模板匹配功能
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MongoClient } from 'mongodb';

class MongoDBTemplateMatchingServer {
  constructor() {
    this.server = new Server(
      {
        name: "mongodb-template-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // MongoDB 連接配置
    this.mongoConfig = {
      url: 'mongodb://localhost:27017',
      dbName: 'UXD_MCP'
    };

    this.client = null;
    this.db = null;

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  /**
   * 連接到 MongoDB
   */
  async connectDB() {
    if (!this.client) {
      this.client = new MongoClient(this.mongoConfig.url);
      await this.client.connect();
      this.db = this.client.db(this.mongoConfig.dbName);
    }
    return this.db;
  }

  /**
   * 關閉資料庫連接
   */
  async closeDB() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  /**
   * 設置工具處理器
   */
  setupToolHandlers() {
    // 註冊工具列表
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_all_tags",
            description: "撈取 MongoDB 中所有唯一的標籤，供 LLM 推薦使用",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "find_best_template",
            description: "根據輸入的標籤列表找出最佳匹配的模板",
            inputSchema: {
              type: "object",
              properties: {
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "要匹配的標籤列表",
                },
              },
              required: ["tags"],
            },
          },
          {
            name: "analyze_template_matching",
            description: "詳細分析模板匹配結果，包含匹配度和詳細說明",
            inputSchema: {
              type: "object",
              properties: {
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "要分析的標籤列表",
                },
              },
              required: ["tags"],
            },
          },
          {
            name: "get_template_stats",
            description: "取得所有模板的統計資訊",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "init_database",
            description: "初始化 MongoDB 資料庫和集合",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
        ],
      };
    });

    // 處理工具調用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_all_tags":
            return await this.getAllTags();
          
          case "find_best_template":
            return await this.findBestTemplate(args.tags);
          
          case "analyze_template_matching":
            return await this.analyzeTemplateMatching(args.tags);
          
          case "get_template_stats":
            return await this.getTemplateStats();
          
          case "init_database":
            return await this.initDatabase();
          
          default:
            throw new Error(`未知的工具: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `錯誤: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  /**
   * 撈取所有標籤
   */
  async getAllTags() {
    const db = await this.connectDB();
    
    try {
      const tags = await db.collection('tags').find({}).sort({tag_name: 1}).toArray();
      const tagNames = tags.map(tag => tag.tag_name);
      
      return {
        content: [
          {
            type: "text",
            text: `找到 ${tagNames.length} 個標籤：\n${JSON.stringify(tagNames, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`撈取標籤失敗: ${error.message}`);
    }
  }

  /**
   * 找出最佳匹配模板
   */
  async findBestTemplate(inputTags) {
    const db = await this.connectDB();
    
    try {
      const matchingResults = await db.collection('templates').aggregate([
        {
          $addFields: {
            match_count: {
              $size: {
                $setIntersection: ["$tags", inputTags]
              }
            }
          }
        },
        {
          $match: { match_count: { $gt: 0 } }
        },
        {
          $sort: { match_count: -1 }
        },
        {
          $addFields: {
            matched_tags: {
              $setIntersection: ["$tags", inputTags]
            },
            unmatched_tags: {
              $setDifference: [inputTags, "$tags"]
            }
          }
        }
      ]).toArray();

      if (matchingResults.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `❌ 沒有找到匹配的模板\n輸入標籤：${JSON.stringify(inputTags)}`,
            },
          ],
        };
      }
      
      const bestMatch = matchingResults[0];
      const matchPercentage = ((bestMatch.match_count / inputTags.length) * 100).toFixed(2);
      const matchLevel = this.getMatchLevel(bestMatch.match_count);
      
      return {
        content: [
          {
            type: "text",
            text: `🎯 最佳匹配模板：${bestMatch.template_name}\n` +
                  `💯 匹配度：${matchPercentage}%\n` +
                  `📈 匹配等級：${matchLevel}\n` +
                  `🔢 匹配數量：${bestMatch.match_count}/${inputTags.length}\n` +
                  `✅ 匹配標籤：${JSON.stringify(bestMatch.matched_tags, null, 2)}\n` +
                  `❌ 未匹配標籤：${JSON.stringify(bestMatch.unmatched_tags, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`模板匹配失敗: ${error.message}`);
    }
  }

  /**
   * 詳細分析模板匹配
   */
  async analyzeTemplateMatching(inputTags) {
    const db = await this.connectDB();
    
    try {
      const matchingResults = await db.collection('templates').aggregate([
        {
          $addFields: {
            match_count: {
              $size: {
                $setIntersection: ["$tags", inputTags]
              }
            }
          }
        },
        {
          $addFields: {
            matched_tags: {
              $setIntersection: ["$tags", inputTags]
            },
            unmatched_input_tags: {
              $setDifference: [inputTags, "$tags"]
            },
            unmatched_template_tags: {
              $setDifference: ["$tags", inputTags]
            },
            match_percentage: {
              $cond: {
                if: { $eq: [{ $size: inputTags }, 0] },
                then: 0,
                else: {
                  $multiply: [
                    { $divide: ["$match_count", { $size: inputTags }] },
                    100
                  ]
                }
              }
            }
          }
        },
        {
          $sort: { match_count: -1, match_percentage: -1 }
        }
      ]).toArray();

      let analysisText = `📊 模板匹配詳細分析\n`;
      analysisText += `📝 輸入標籤：${JSON.stringify(inputTags)}\n\n`;
      
      if (matchingResults.length === 0) {
        analysisText += `❌ 沒有找到任何匹配的模板\n`;
      } else {
        matchingResults.forEach((result, index) => {
          const matchLevel = this.getMatchLevel(result.match_count);
          
          analysisText += `${index + 1}. ${result.template_name}\n`;
          analysisText += `   💯 匹配度：${result.match_percentage.toFixed(2)}%\n`;
          analysisText += `   📈 等級：${matchLevel}\n`;
          analysisText += `   🔢 匹配數：${result.match_count}/${inputTags.length}\n`;
          analysisText += `   ✅ 匹配標籤：${result.matched_tags.join(', ')}\n`;
          if (result.unmatched_input_tags.length > 0) {
            analysisText += `   ❌ 未匹配輸入：${result.unmatched_input_tags.join(', ')}\n`;
          }
          if (result.unmatched_template_tags.length > 0) {
            analysisText += `   📋 模板其他標籤：${result.unmatched_template_tags.join(', ')}\n`;
          }
          analysisText += `\n`;
        });
      }
      
      return {
        content: [
          {
            type: "text",
            text: analysisText,
          },
        ],
      };
    } catch (error) {
      throw new Error(`分析模板匹配失敗: ${error.message}`);
    }
  }

  /**
   * 取得模板統計
   */
  async getTemplateStats() {
    const db = await this.connectDB();
    
    try {
      const templates = await db.collection('templates').find({}).toArray();
      
      let statsText = `📈 模板統計資訊\n\n`;
      
      templates.forEach(template => {
        statsText += `📋 ${template.template_name}\n`;
        statsText += `   🔢 標籤數量：${template.tags.length}\n`;
        statsText += `   🏷️ 標籤：${template.tags.join(', ')}\n`;
        statsText += `   📅 建立時間：${template.created_at.toISOString()}\n\n`;
      });
      
      return {
        content: [
          {
            type: "text",
            text: statsText,
          },
        ],
      };
    } catch (error) {
      throw new Error(`取得統計失敗: ${error.message}`);
    }
  }

  /**
   * 初始化資料庫
   */
  async initDatabase() {
    const db = await this.connectDB();
    
    try {
      // 建立集合
      await db.createCollection('tags');
      await db.createCollection('templates');

      // 建立索引
      await db.collection('tags').createIndex({ tag_name: 1 }, { unique: true });
      await db.collection('templates').createIndex({ template_name: 1 }, { unique: true });
      await db.collection('templates').createIndex({ tags: 1 });

      // 插入初始標籤資料
      const tags = [
        '申請', '表單', '資料', '填寫', '輸入', '草稿', '開戶', 
        '信用卡', '文件', '清單', '追蹤', '日期', '狀態', '審核', 
        '流程', '傳遞', '顯示', '下載', '內容', '審查', '放行', '展示'
      ];

      const tagDocuments = tags.map(tag => ({ tag_name: tag, created_at: new Date() }));
      await db.collection('tags').insertMany(tagDocuments, { ordered: false });

      // 插入初始模板資料
      const templates = [
        {
          template_name: '資訊輸入模板',
          tags: ['申請', '表單', '資料', '填寫', '輸入', '草稿', '開戶', '信用卡', '文件'],
          created_at: new Date()
        },
        {
          template_name: '流程檢查模板',
          tags: ['清單', '追蹤', '日期', '狀態', '審核', '流程', '傳遞'],
          created_at: new Date()
        },
        {
          template_name: '資訊展示模板',
          tags: ['顯示', '狀態', '下載', '內容', '審核', '審查', '放行', '展示', '資料'],
          created_at: new Date()
        }
      ];

      await db.collection('templates').insertMany(templates, { ordered: false });

      return {
        content: [
          {
            type: "text",
            text: `✅ MongoDB 資料庫初始化完成！\n` +
                  `📊 建立了 ${tags.length} 個標籤\n` +
                  `📋 建立了 ${templates.length} 個模板\n` +
                  `🎯 所有集合和索引已建立\n` +
                  `🗄️ 資料庫名稱：${this.mongoConfig.dbName}`,
          },
        ],
      };
    } catch (error) {
      // 忽略重複鍵錯誤（資料已存在）
      if (error.code === 11000) {
        return {
          content: [
            {
              type: "text",
              text: `✅ 資料庫已存在，跳過初始化\n` +
                    `🗄️ 資料庫名稱：${this.mongoConfig.dbName}`,
            },
          ],
        };
      }
      throw new Error(`資料庫初始化失敗: ${error.message}`);
    }
  }

  /**
   * 取得匹配等級
   */
  getMatchLevel(matchCount) {
    if (matchCount >= 4) return "高度匹配";
    if (matchCount >= 3) return "中度匹配";
    if (matchCount >= 2) return "低度匹配";
    return "不匹配";
  }

  /**
   * 設置錯誤處理
   */
  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.closeDB();
      await this.server.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      await this.closeDB();
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * 啟動服務器
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MongoDB 模板標籤匹配 MCP 服務器已啟動");
  }
}

// 啟動服務器
const server = new MongoDBTemplateMatchingServer();
server.run().catch((error) => {
  console.error("服務器啟動失敗:", error);
  process.exit(1);
});