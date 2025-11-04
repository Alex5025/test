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
    tools: [QUERY_TEMPLATE_TOOL, GET_ALL_TAGS_TOOL, GET_TEMPLATE_BY_ID_TOOL],
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

      // 步驟 2: 從資料庫取得所有標籤和標籤分組
      const allTags = await dbService.getAllTags();
      const tagsByGroup = await dbService.getTagsByGroup();

      // 步驟 3: 使用 LLM 選擇相關標籤（傳入資料庫的標籤分組）
      const selectedTags = await llmService.selectRelevantTags(naturalLanguage, allTags, tagsByGroup);

      // 步驟 4: 取得所有模板並計算匹配度
      const templates = await dbService.getAllTemplates();
      const matches = matchingService.calculateMatches(selectedTags, templates);

      // 步驟 5: 格式化回傳結果
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
