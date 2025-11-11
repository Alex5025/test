#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { DatabaseService } from './database.js';
import { OpenAIService } from './llm.js';
import { TemplateMatchingService } from './matching.js';
import * as fs from 'fs';
import * as path from 'path';

// 定義工具
const QUERY_TEMPLATE_TOOL: Tool = {
  name: 'query_template',
  description: '根據使用者的自然語言描述，推薦最適合的模板',
  inputSchema: {
    type: 'object',
    properties: {
      naturalLanguage: {
        type: 'string',
        description: '使用者輸入的自然語言需求描述'
      },
      debugMode: {
        type: 'boolean',
        description: '是否啟用除錯模式（顯示詳細資訊）',
        default: false
      }
    },
    required: ['naturalLanguage']
  }
};

const GET_ALL_TAGS_TOOL: Tool = {
  name: 'get_all_tags',
  description: '獲取資料庫中所有可用的標籤清單',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

const GET_TEMPLATE_BY_ID_TOOL: Tool = {
  name: 'get_template_by_id',
  description: '根據模板 ID 獲取模板的詳細資訊',
  inputSchema: {
    type: 'object',
    properties: {
      templateId: {
        type: 'string',
        description: '模板 ID'
      }
    },
    required: ['templateId']
  }
};

const ANALYZE_TEMPLATE_IMAGE_TOOL: Tool = {
  name: 'analyze_template_image',
  description: '根據圖片和描述文字，從現有標籤中選出15個最相關的標籤並按功能、情境、業務、佈局分類',
  inputSchema: {
    type: 'object',
    properties: {
      templateId: {
        type: 'string',
        description: '模板ID'
      },
      photo: {
        type: 'string',
        description: '圖片檔案路徑'
      },
      description: {
        type: 'string',
        description: '描述圖片內容的自然語言文字'
      }
    },
    required: ['templateId', 'photo', 'description']
  }
};

// 輔助函數：驗證圖片檔案
function validateImageFile(imagePath: string): { isValid: boolean; error?: string } {
  try {
    // 檢查檔案是否存在
    if (!fs.existsSync(imagePath)) {
      return { isValid: false, error: '圖片檔案不存在' };
    }

    // 檢查是否為檔案（不是目錄）
    const stats = fs.statSync(imagePath);
    if (!stats.isFile()) {
      return { isValid: false, error: '指定路徑不是檔案' };
    }

    // 檢查檔案格式
    const ext = path.extname(imagePath).toLowerCase();
    const supportedFormats = ['.png', '.jpg', '.jpeg'];
    if (!supportedFormats.includes(ext)) {
      return { isValid: false, error: `不支援的檔案格式。支援格式：${supportedFormats.join(', ')}` };
    }

    // 檢查檔案大小（限制為10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (stats.size > maxSize) {
      return { isValid: false, error: '圖片檔案過大（限制10MB）' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: `檔案驗證錯誤: ${error instanceof Error ? error.message : String(error)}` };
  }
}

// 初始化服務
const dbService = new DatabaseService();
const llmService = new OpenAIService();
const matchingService = new TemplateMatchingService();

// 建立 MCP 伺服器
const server = new Server(
  {
    name: 'template-recommendation-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 列出可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [QUERY_TEMPLATE_TOOL, GET_ALL_TAGS_TOOL, GET_TEMPLATE_BY_ID_TOOL, ANALYZE_TEMPLATE_IMAGE_TOOL],
  };
});

// 處理工具呼叫
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'query_template') {
      const { naturalLanguage, debugMode = false } = args as { 
        naturalLanguage: string; 
        debugMode?: boolean 
      };

      // 步驟 B: 到 DB 中拿取所有 tags 資料
      console.error(`[MCP] 步驟 B: 到 DB 中拿取所有 tags 資料...`);
      const allTags = await dbService.getAllTags();
      const tagsByGroup = await dbService.getTagsByGroup();
      console.error(`[MCP] 獲得 ${allTags.length} 個 tags`);

      // 步驟 C: 將 tags 和自然語言送入 LLM 模型，並請 LLM 從 tags 中選出 10 個與自然語言最接近的 tags
      console.error(`[MCP] 步驟 C: 將 tags 和自然語言送入 LLM 模型，選出 10 個最接近的 tags`);
      console.error(`[MCP] 輸入: "${naturalLanguage}"`);
      const selectedTags = await llmService.selectRelevantTags(naturalLanguage, allTags, tagsByGroup);
      console.error(`[MCP] 選出 ${selectedTags.length} 個相關 tags: ${selectedTags.join(', ')}`);

      // 步驟 D: 到 DB 中拿取所有 template 資料
      console.error(`[MCP] 步驟 D: 到 DB 中拿取所有 template 資料...`);
      const templates = await dbService.getAllTemplates();
      console.error(`[MCP] 獲得 ${templates.length} 個 templates`);

      // 步驟 E: 利用 AI 提供的 10 個 tags 找出最相關的 template_id
      console.error(`[MCP] 步驟 E: 利用 AI 提供的 ${selectedTags.length} 個 tags 找出最相關的 template_id...`);
      const matches = matchingService.calculateMatches(selectedTags, templates);
      console.error(`[MCP] 找到 ${matches.length} 個最相關的 templates: ${matches.map(m => m.templateId).join(', ')}`);

      // 步驟 F: 回傳給使用者
      const response = {
        MWHEADER: {
          MSGID: 'template-recommendation-mcp',
          SOURCECHANNEL: 'MCP_SERVER',
          TXNSEQ: '',
          RETURNCODE: '0000',
          RETURNDESC: '交易成功',
          O360SEQ: ''
        },
        TRANRS: {
          DebugMod: debugMode,
          tags: selectedTags,
          TemplateList: matches.map(match => ({
            TemplateID: match.templateId,
            Reliability: match.reliability,
            Tags: [
              match.tags.功能 && { 功能: match.tags.功能 },
              match.tags.情境 && { 情境: match.tags.情境 },
              match.tags.業務 && { 業務: match.tags.業務 },
              match.tags.佈局 && { 佈局: match.tags.佈局 }
            ].filter(Boolean)
          }))
        }
      };

      if (debugMode) {
        (response.TRANRS as any).Debug = {
          userInput: naturalLanguage,
          aiSelectedTags: selectedTags,
          totalTagsAvailable: allTags.length,
          totalTemplatesChecked: templates.length
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }

    if (name === 'get_all_tags') {
      const tags = await dbService.getAllTags();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ tags, total: tags.length }, null, 2)
          }
        ]
      };
    }

    if (name === 'get_template_by_id') {
      const { templateId } = args as { templateId: string };
      const template = await dbService.getTemplateById(templateId);
      
      if (!template) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: '找不到指定的模板' }, null, 2)
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(template, null, 2)
          }
        ]
      };
    }

    if (name === 'analyze_template_image') {
      const { templateId, photo, description } = args as { 
        templateId: string; 
        photo: string; 
        description: string 
      };

      // 驗證圖片檔案
      const validation = validateImageFile(photo);
      if (!validation.isValid) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                MWHEADER: {
                  RETURNCODE: '9998',
                  RETURNDESC: `圖片檔案錯誤: ${validation.error}`
                }
              }, null, 2)
            }
          ],
          isError: true
        };
      }

      console.error(`[MCP] 分析模板圖片 - TemplateID: ${templateId}`);
      console.error(`[MCP] 圖片路徑: ${photo}`);
      console.error(`[MCP] 描述: ${description}`);

      // 獲取所有標籤資料
      const allTags = await dbService.getAllTags();
      const tagsByGroup = await dbService.getTagsByGroup();
      console.error(`[MCP] 獲得 ${allTags.length} 個標籤`);

      // 使用 LLM 服務分析圖片和描述
      const categorizedTags = await llmService.analyzeTemplateImage(
        photo, 
        description, 
        allTags, 
        tagsByGroup
      );

      // 格式化回應
      const response = {
        TemplateID: templateId,
        description: description,
        Tags: [
          {
            功能: categorizedTags.功能
          },
          {
            情境: categorizedTags.情境
          },
          {
            業務: categorizedTags.業務
          },
          {
            佈局: categorizedTags.佈局
          }
        ]
      };

      console.error(`[MCP] 分析完成 - 功能:${categorizedTags.功能.length}, 情境:${categorizedTags.情境.length}, 業務:${categorizedTags.業務.length}, 佈局:${categorizedTags.佈局.length}`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            MWHEADER: {
              RETURNCODE: '9999',
              RETURNDESC: `系統異常: ${errorMessage}`
            }
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// 啟動伺服器
async function main() {
  try {
    // 連接資料庫
    await dbService.connect();

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('Template Recommendation MCP Server running on stdio');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
