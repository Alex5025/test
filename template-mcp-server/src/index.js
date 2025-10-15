#!/usr/bin/env node

/**
 * 模板標籤匹配 MCP 服務器
 * 提供與 PostgreSQL 資料庫的模板匹配功能
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import pg from 'pg';

const { Client } = pg;

class TemplateMatchingServer {
  constructor() {
    this.server = new Server(
      {
        name: "template-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // 資料庫配置（根據截圖調整）
    this.dbConfig = {
      host: '127.0.0.1',
      port: 5432,
      database: 'webchecker',
      user: 'webchecker',
      password: 'webchecker123',
    };

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  /**
   * 資料庫連接
   */
  async connectDB() {
    const client = new Client(this.dbConfig);
    await client.connect();
    return client;
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
            description: "撈取資料庫中所有唯一的標籤，供 LLM 推薦使用",
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
            description: "初始化資料庫表格和資料",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "evaluate_confidence",
            description: "評估輸入內容的可信度，支援標籤或自然語言輸入",
            inputSchema: {
              type: "object",
              properties: {
                input: {
                  type: "string",
                  description: "輸入內容：可以是逗號分隔的標籤或自然語言描述",
                },
                input_type: {
                  type: "string",
                  enum: ["tags", "natural_language", "auto"],
                  description: "輸入類型：tags(標籤)、natural_language(自然語言)、auto(自動判斷)",
                  default: "auto"
                },
              },
              required: ["input"],
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
          
          case "evaluate_confidence":
            return await this.evaluateConfidence(args.input, args.input_type);
          
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
    const client = await this.connectDB();
    
    try {
      const result = await client.query('SELECT tag_name FROM tags ORDER BY tag_name');
      const tags = result.rows.map(row => row.tag_name);
      
      return {
        content: [
          {
            type: "text",
            text: `找到 ${tags.length} 個標籤：\\n${JSON.stringify(tags, null, 2)}`,
          },
        ],
      };
    } finally {
      await client.end();
    }
  }

  /**
   * 找出最佳匹配模板（增強版，包含可信度評估）
   */
  async findBestTemplate(inputTags) {
    const client = await this.connectDB();
    
    try {
      // 獲取所有可用標籤
      const availableTagsResult = await client.query('SELECT tag_name FROM tags ORDER BY tag_name');
      const availableTags = availableTagsResult.rows.map(row => row.tag_name);
      
      // 執行模板匹配
      const matchingResults = await this.performTemplateMatching(client, inputTags);
      
      if (matchingResults.length === 0) {
        // 計算基礎可信度評估
        const confidence = this.calculateConfidence(
          inputTags.join(', '), 
          inputTags, 
          availableTags, 
          [], 
          'tags'
        );
        
        return {
          content: [
            {
              type: "text",
              text: `❌ 沒有找到匹配的模板\\n\\n` +
                    `🎯 可信度評估：${confidence.overall_confidence}% (${confidence.confidence_level})\\n` +
                    `💡 建議：${confidence.recommendations.slice(0, 2).join('\\n💡 建議：')}`,
            },
          ],
        };
      }
      
      const bestMatch = matchingResults[0];
      const matchPercentage = ((bestMatch.match_count / inputTags.length) * 100).toFixed(2);
      const matchLevel = this.getMatchLevel(bestMatch.match_count);
      
      // 找出匹配的標籤
      const templateTags = bestMatch.tags;
      const matchedTags = inputTags.filter(tag => templateTags.includes(tag));
      
      // 計算可信度評估
      const confidence = this.calculateConfidence(
        inputTags.join(', '), 
        inputTags, 
        availableTags, 
        matchingResults, 
        'tags'
      );
      
      return {
        content: [
          {
            type: "text",
            text: `🎯 最佳匹配模板：${bestMatch.template_name}\\n` +
                  `💯 匹配度：${matchPercentage}%\\n` +
                  `📈 匹配等級：${matchLevel}\\n` +
                  `🔢 匹配數量：${bestMatch.match_count}/${inputTags.length}\\n` +
                  `✅ 匹配標籤：${JSON.stringify(matchedTags, null, 2)}\\n\\n` +
                  `🎯 推薦可信度：${confidence.overall_confidence}% (${confidence.confidence_level})\\n` +
                  `📊 標籤覆蓋率：${confidence.details.tag_coverage}%\\n` +
                  `💡 建議：${confidence.recommendations.slice(0, 1).join('')}`,
          },
        ],
      };
    } finally {
      await client.end();
    }
  }

  /**
   * 詳細分析模板匹配（增強版，包含可信度評估）
   */
  async analyzeTemplateMatching(inputTags) {
    const client = await this.connectDB();
    
    try {
      // 獲取所有可用標籤
      const availableTagsResult = await client.query('SELECT tag_name FROM tags ORDER BY tag_name');
      const availableTags = availableTagsResult.rows.map(row => row.tag_name);
      
      // 執行模板匹配
      const matchingResults = await this.performTemplateMatching(client, inputTags);
      
      if (matchingResults.length === 0) {
        // 計算可信度評估
        const confidence = this.calculateConfidence(
          inputTags.join(', '), 
          inputTags, 
          availableTags, 
          [], 
          'tags'
        );
        
        return {
          content: [
            {
              type: "text",
              text: `📊 模板匹配詳細分析\\n` +
                    `📝 輸入標籤：${JSON.stringify(inputTags)}\\n\\n` +
                    `❌ 沒有找到匹配的模板\\n\\n` +
                    `🎯 推薦可信度評估：${confidence.overall_confidence}% (${confidence.confidence_level})\\n` +
                    `📊 詳細評分：標籤覆蓋率 ${confidence.details.tag_coverage}%，輸入品質 ${confidence.details.input_quality}%\\n\\n` +
                    `💡 改進建議：\\n${confidence.recommendations.map(rec => `   ${rec}`).join('\\n')}`,
            },
          ],
        };
      }
      
      // 計算可信度評估
      const confidence = this.calculateConfidence(
        inputTags.join(', '), 
        inputTags, 
        availableTags, 
        matchingResults, 
        'tags'
      );
      
      let analysisText = `📊 模板匹配詳細分析\\n`;
      analysisText += `📝 輸入標籤：${JSON.stringify(inputTags)}\\n`;
      analysisText += `🎯 推薦可信度：${confidence.overall_confidence}% (${confidence.confidence_level})\\n\\n`;
      
      matchingResults.forEach((row, index) => {
        const matchPercentage = ((row.match_count / inputTags.length) * 100).toFixed(2);
        const matchLevel = this.getMatchLevel(row.match_count);
        const templateTags = row.tags;
        const matchedTags = inputTags.filter(tag => templateTags.includes(tag));
        const unmatchedTags = inputTags.filter(tag => !templateTags.includes(tag));
        
        analysisText += `${index + 1}. ${row.template_name}\\n`;
        analysisText += `   💯 匹配度：${matchPercentage}%\\n`;
        analysisText += `   📈 等級：${matchLevel}\\n`;
        analysisText += `   ✅ 匹配：${matchedTags.map(tag => `✅ ${tag}`).join(', ')}\\n`;
        if (unmatchedTags.length > 0) {
          analysisText += `   ❌ 未匹配：${unmatchedTags.map(tag => `❌ ${tag}`).join(', ')}\\n`;
        }
        analysisText += `\\n`;
      });
      
      // 添加可信度詳細資訊
      analysisText += `🔍 可信度詳細分析：\\n`;
      analysisText += `   📊 標籤覆蓋率：${confidence.details.tag_coverage}%\\n`;
      analysisText += `   🎪 輸入品質：${confidence.details.input_quality}%\\n`;
      analysisText += `   🔗 語義一致性：${confidence.details.semantic_consistency}%\\n`;
      if (confidence.details.template_match) {
        analysisText += `   🏆 最佳匹配：${confidence.details.template_match.template_name} (${confidence.details.template_match.match_percentage}%)\\n`;
      }
      
      if (confidence.recommendations.length > 0) {
        analysisText += `\\n💡 改進建議：\\n`;
        confidence.recommendations.forEach(rec => {
          analysisText += `   ${rec}\\n`;
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
    } finally {
      await client.end();
    }
  }

  /**
   * 取得模板統計
   */
  async getTemplateStats() {
    const client = await this.connectDB();
    
    try {
      const result = await client.query(`
        SELECT 
          template_name,
          jsonb_array_length(tags) as tag_count,
          tags
        FROM templates
        ORDER BY template_name;
      `);
      
      let statsText = `📈 模板統計資訊\\n\\n`;
      
      result.rows.forEach(row => {
        statsText += `📋 ${row.template_name}\\n`;
        statsText += `   🔢 標籤數量：${row.tag_count}\\n`;
        statsText += `   🏷️ 標籤：${JSON.stringify(row.tags, null, 2)}\\n\\n`;
      });
      
      return {
        content: [
          {
            type: "text",
            text: statsText,
          },
        ],
      };
    } finally {
      await client.end();
    }
  }

  /**
   * 初始化資料庫
   */
  async initDatabase() {
    const client = await this.connectDB();
    
    try {
      // 建立 tags 表
      await client.query(`
        CREATE TABLE IF NOT EXISTS tags (
          id SERIAL PRIMARY KEY,
          tag_name VARCHAR(100) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 建立 templates 表
      await client.query(`
        CREATE TABLE IF NOT EXISTS templates (
          id SERIAL PRIMARY KEY,
          template_name VARCHAR(100) UNIQUE NOT NULL,
          tags JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 建立索引
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tags_tag_name ON tags(tag_name);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(template_name);
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_templates_tags ON templates USING GIN (tags);
      `);

      // 插入標籤資料
      const tags = [
        '申請', '表單', '資料', '填寫', '輸入', '草稿', '開戶', 
        '信用卡', '文件', '清單', '追蹤', '日期', '狀態', '審核', 
        '流程', '傳遞', '顯示', '下載', '內容', '審查', '放行', '展示'
      ];

      for (const tag of tags) {
        await client.query(`
          INSERT INTO tags (tag_name) VALUES ($1)
          ON CONFLICT (tag_name) DO NOTHING;
        `, [tag]);
      }

      // 插入模板資料
      const templates = [
        {
          name: '資訊輸入模板',
          tags: ['申請', '表單', '資料', '填寫', '輸入', '草稿', '開戶', '信用卡', '文件']
        },
        {
          name: '流程檢查模板',
          tags: ['清單', '追蹤', '日期', '狀態', '審核', '流程', '傳遞']
        },
        {
          name: '資訊展示模板',
          tags: ['顯示', '狀態', '下載', '內容', '審核', '審查', '放行', '展示', '資料']
        }
      ];

      for (const template of templates) {
        await client.query(`
          INSERT INTO templates (template_name, tags) VALUES ($1, $2)
          ON CONFLICT (template_name) DO NOTHING;
        `, [template.name, JSON.stringify(template.tags)]);
      }

      return {
        content: [
          {
            type: "text",
            text: `✅ 資料庫初始化完成！\\n` +
                  `📊 建立了 ${tags.length} 個標籤\\n` +
                  `📋 建立了 ${templates.length} 個模板\\n` +
                  `🎯 所有資料表和索引已建立`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`資料庫初始化失敗: ${error.message}`);
    } finally {
      await client.end();
    }
  }

  /**
   * 智能可信度評估
   * 支援標籤和自然語言輸入，回傳推薦可信度
   */
  async evaluateConfidence(input, inputType = 'auto') {
    const client = await this.connectDB();
    
    try {
      // 1. 判斷輸入類型
      const detectedType = inputType === 'auto' ? this.detectInputType(input) : inputType;
      
      // 2. 解析輸入獲取標籤
      let extractedTags;
      if (detectedType === 'tags') {
        extractedTags = this.parseTagInput(input);
      } else {
        extractedTags = this.extractTagsFromNaturalLanguage(input);
      }
      
      // 3. 獲取所有可用標籤用於驗證
      const availableTagsResult = await client.query('SELECT tag_name FROM tags ORDER BY tag_name');
      const availableTags = availableTagsResult.rows.map(row => row.tag_name);
      
      // 4. 進行模板匹配分析
      const matchingResult = await this.performTemplateMatching(client, extractedTags);
      
      // 5. 計算可信度評估
      const confidenceEvaluation = this.calculateConfidence(
        input, 
        extractedTags, 
        availableTags, 
        matchingResult, 
        detectedType
      );
      
      return {
        content: [
          {
            type: "text",
            text: this.formatConfidenceReport(confidenceEvaluation),
          },
        ],
      };
    } finally {
      await client.end();
    }
  }

  /**
   * 自動偵測輸入類型
   */
  detectInputType(input) {
    // 簡單的啟發式規則
    const tagPatterns = [
      /^[\w\s,，、]+$/,  // 只包含中文、英文、逗號
      /[,，、]/,          // 包含分隔符
    ];
    
    const naturalLanguagePatterns = [
      /我需要|我想要|請幫我/,     // 包含請求詞
      /的|是|在|有|會|能|要/,     // 包含常見中文連詞
      /申請.*表單|.*頁面|.*功能/, // 包含描述性詞組
    ];
    
    // 檢查是否為自然語言
    for (const pattern of naturalLanguagePatterns) {
      if (pattern.test(input)) {
        return 'natural_language';
      }
    }
    
    // 檢查是否為標籤格式
    for (const pattern of tagPatterns) {
      if (pattern.test(input) && input.split(/[,，、]/).length > 1) {
        return 'tags';
      }
    }
    
    // 默認為自然語言
    return 'natural_language';
  }

  /**
   * 解析標籤輸入
   */
  parseTagInput(input) {
    return input
      .split(/[,，、\s]+/)
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  /**
   * 從自然語言中提取標籤
   */
  extractTagsFromNaturalLanguage(input) {
    // 標籤關鍵詞映射表
    const keywordToTags = {
      '申請': ['申請'],
      '表單': ['表單'],
      '填寫': ['填寫'],
      '輸入': ['輸入'],
      '資料': ['資料'],
      '文件': ['文件'],
      '上傳': ['文件'],
      '顯示': ['顯示'],
      '展示': ['展示'],
      '狀態': ['狀態'],
      '進度': ['追蹤'],
      '追蹤': ['追蹤'],
      '審核': ['審核'],
      '審查': ['審查'],
      '流程': ['流程'],
      '清單': ['清單'],
      '列表': ['清單'],
      '下載': ['下載'],
      '內容': ['內容'],
      '信用卡': ['信用卡'],
      '開戶': ['開戶'],
      '銀行': ['開戶'],
      '帳戶': ['開戶'],
      '草稿': ['草稿'],
      '暫存': ['草稿'],
      '日期': ['日期'],
      '時間': ['日期'],
      '傳遞': ['傳遞'],
      '放行': ['放行'],
      'VPN': ['申請', '表單'],
      '推薦': ['顯示', '清單'],
      '排行榜': ['清單', '顯示'],
      '風險': ['審核', '狀態'],
      '管理': ['流程', '追蹤'],
    };
    
    const extractedTags = new Set();
    
    // 遍歷關鍵詞映射
    for (const [keyword, tags] of Object.entries(keywordToTags)) {
      if (input.includes(keyword)) {
        tags.forEach(tag => extractedTags.add(tag));
      }
    }
    
    // 如果沒有找到任何標籤，提供默認標籤
    if (extractedTags.size === 0) {
      extractedTags.add('內容');
      extractedTags.add('顯示');
    }
    
    return Array.from(extractedTags);
  }

  /**
   * 執行模板匹配
   */
  async performTemplateMatching(client, tags) {
    if (tags.length === 0) {
      return [];
    }
    
    const query = `
      SELECT 
        template_name,
        tags,
        (
          SELECT COUNT(*)
          FROM jsonb_array_elements_text(tags) as tag
          WHERE tag = ANY($1)
        ) as match_count,
        jsonb_array_length(tags) as total_template_tags
      FROM templates
      WHERE tags ?| $1
      ORDER BY match_count DESC;
    `;
    
    const result = await client.query(query, [tags]);
    return result.rows;
  }

  /**
   * 計算可信度評估
   */
  calculateConfidence(originalInput, extractedTags, availableTags, matchingResults, inputType) {
    // 1. 標籤覆蓋率 (Tag Coverage)
    const validTags = extractedTags.filter(tag => availableTags.includes(tag));
    const tagCoverage = extractedTags.length > 0 ? (validTags.length / extractedTags.length) : 0;
    
    // 2. 模板匹配度 (Template Matching)
    let bestMatchScore = 0;
    let templateMatchDetails = null;
    
    if (matchingResults.length > 0) {
      const bestMatch = matchingResults[0];
      bestMatchScore = extractedTags.length > 0 ? (bestMatch.match_count / extractedTags.length) : 0;
      templateMatchDetails = {
        template_name: bestMatch.template_name,
        match_count: bestMatch.match_count,
        total_input_tags: extractedTags.length,
        match_percentage: Math.round(bestMatchScore * 100)
      };
    }
    
    // 3. 輸入品質評估 (Input Quality)
    let inputQuality = 0.5; // 基礎分數
    
    if (inputType === 'tags') {
      // 標籤輸入：檢查標籤數量和有效性
      inputQuality = Math.min(1.0, 0.3 + (extractedTags.length * 0.1) + (tagCoverage * 0.6));
    } else {
      // 自然語言輸入：檢查描述性和完整性
      const inputLength = originalInput.length;
      const hasSpecificTerms = /申請|表單|顯示|管理|流程/.test(originalInput);
      const hasActionWords = /需要|想要|建立|創建|設計/.test(originalInput);
      
      inputQuality = Math.min(1.0, 
        0.2 + 
        (inputLength > 10 ? 0.2 : 0) +
        (hasSpecificTerms ? 0.3 : 0) +
        (hasActionWords ? 0.2 : 0) +
        (extractedTags.length > 0 ? 0.1 : 0)
      );
    }
    
    // 4. 語義一致性 (Semantic Consistency)
    let semanticConsistency = 0.5;
    if (matchingResults.length > 0) {
      // 檢查標籤間的相關性
      const topTemplates = matchingResults.slice(0, 2);
      const hasMultipleMatches = topTemplates.length > 1;
      const scoreGap = hasMultipleMatches ? 
        (topTemplates[0].match_count - topTemplates[1].match_count) / extractedTags.length : 1;
      
      semanticConsistency = Math.min(1.0, 0.3 + (bestMatchScore * 0.4) + (scoreGap * 0.3));
    }
    
    // 5. 計算綜合可信度
    const weights = {
      tagCoverage: 0.25,
      templateMatch: 0.35,
      inputQuality: 0.25,
      semanticConsistency: 0.15
    };
    
    const overallConfidence = 
      (tagCoverage * weights.tagCoverage) +
      (bestMatchScore * weights.templateMatch) +
      (inputQuality * weights.inputQuality) +
      (semanticConsistency * weights.semanticConsistency);
    
    return {
      overall_confidence: Math.round(overallConfidence * 100),
      confidence_level: this.getConfidenceLevel(overallConfidence),
      details: {
        input_type: inputType,
        original_input: originalInput,
        extracted_tags: extractedTags,
        valid_tags: validTags,
        tag_coverage: Math.round(tagCoverage * 100),
        template_match: templateMatchDetails,
        input_quality: Math.round(inputQuality * 100),
        semantic_consistency: Math.round(semanticConsistency * 100)
      },
      recommendations: this.generateRecommendations(overallConfidence, extractedTags, validTags, matchingResults)
    };
  }

  /**
   * 獲取可信度等級
   */
  getConfidenceLevel(score) {
    if (score >= 0.8) return "極高可信度";
    if (score >= 0.65) return "高可信度";
    if (score >= 0.45) return "中等可信度";
    if (score >= 0.25) return "低可信度";
    return "極低可信度";
  }

  /**
   * 生成改進建議
   */
  generateRecommendations(confidence, extractedTags, validTags, matchingResults) {
    const recommendations = [];
    
    if (confidence < 0.3) {
      recommendations.push("📝 建議提供更詳細和具體的描述");
      recommendations.push("🔍 嘗試使用更準確的關鍵詞");
    }
    
    if (extractedTags.length < 3) {
      recommendations.push("📊 建議增加更多相關標籤以提高匹配準確性");
    }
    
    if (validTags.length < extractedTags.length) {
      const invalidTags = extractedTags.filter(tag => !validTags.includes(tag));
      recommendations.push(`❌ 以下標籤不在系統中：${invalidTags.join(', ')}`);
      recommendations.push("💡 建議使用系統現有標籤或聯繫管理員添加新標籤");
    }
    
    if (matchingResults.length === 0) {
      recommendations.push("🎯 沒有找到匹配的模板，建議調整輸入內容");
    } else if (matchingResults.length === 1) {
      recommendations.push("✅ 找到唯一匹配模板，建議確認是否符合需求");
    }
    
    if (confidence >= 0.7) {
      recommendations.push("🎉 推薦結果可信度高，可以安心使用");
    }
    
    return recommendations;
  }

  /**
   * 格式化可信度報告
   */
  formatConfidenceReport(evaluation) {
    let report = `🎯 智能可信度評估報告\\n\\n`;
    
    // 總體評估
    report += `📊 總體可信度：${evaluation.overall_confidence}% (${evaluation.confidence_level})\\n\\n`;
    
    // 輸入分析
    report += `📝 輸入分析：\\n`;
    report += `   🔤 輸入類型：${evaluation.details.input_type === 'tags' ? '標籤格式' : '自然語言'}\\n`;
    report += `   📄 原始輸入：${evaluation.details.original_input}\\n`;
    report += `   🏷️ 提取標籤：[${evaluation.details.extracted_tags.join(', ')}]\\n`;
    report += `   ✅ 有效標籤：[${evaluation.details.valid_tags.join(', ')}]\\n\\n`;
    
    // 詳細評分
    report += `📈 詳細評分：\\n`;
    report += `   🎯 標籤覆蓋率：${evaluation.details.tag_coverage}%\\n`;
    report += `   🎪 輸入品質：${evaluation.details.input_quality}%\\n`;
    report += `   🔗 語義一致性：${evaluation.details.semantic_consistency}%\\n`;
    
    // 模板匹配
    if (evaluation.details.template_match) {
      const tm = evaluation.details.template_match;
      report += `   🏆 模板匹配：${tm.match_percentage}% (${tm.template_name})\\n`;
    } else {
      report += `   🏆 模板匹配：0% (無匹配模板)\\n`;
    }
    
    // 建議
    if (evaluation.recommendations.length > 0) {
      report += `\\n💡 改進建議：\\n`;
      evaluation.recommendations.forEach(rec => {
        report += `   ${rec}\\n`;
      });
    }
    
    return report;
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
    console.error("模板標籤匹配 MCP 服務器已啟動");
  }
}

// 啟動服務器
const server = new TemplateMatchingServer();
server.run().catch((error) => {
  console.error("服務器啟動失敗:", error);
  process.exit(1);
});