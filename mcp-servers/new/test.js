#!/usr/bin/env node

/**
 * MCP 伺服器測試腳本
 * 測試各項功能是否正常運作
 */

import { DatabaseService } from './build/database.js';
import { TemplateMatchingService } from './build/matching.js';

async function testDatabase() {
  console.log('=== 測試資料庫連接 ===');
  const db = new DatabaseService();
  
  try {
    await db.connect();
    console.log('✅ 資料庫連接成功');
    
    // 測試取得標籤
    const tags = await db.getAllTags();
    console.log(`✅ 取得 ${tags.length} 個標籤`);
    if (tags.length > 0) {
      console.log(`   範例標籤: ${tags.slice(0, 5).join(', ')}...`);
    }
    
    // 測試取得模板
    const templates = await db.getAllTemplates();
    console.log(`✅ 取得 ${templates.length} 個模板`);
    if (templates.length > 0) {
      console.log(`   範例模板: ${templates.slice(0, 3).map(t => t.template_id).join(', ')}`);
    }
    
    // 測試取得特定模板
    if (templates.length > 0) {
      const firstTemplate = await db.getTemplateById(templates[0].template_id);
      if (firstTemplate) {
        console.log(`✅ 成功取得模板: ${firstTemplate.template_id}`);
      }
    }
    
    await db.disconnect();
    console.log('✅ 資料庫斷線成功\n');
    
    return { tags, templates };
  } catch (error) {
    console.error('❌ 資料庫測試失敗:', error);
    throw error;
  }
}

async function testMatching() {
  console.log('=== 測試模板匹配演算法 ===');
  
  const db = new DatabaseService();
  await db.connect();
  
  const templates = await db.getAllTemplates();
  const matchingService = new TemplateMatchingService();
  
  // 測試案例 1: 搜尋相關的標籤
  const testTags1 = ['搜尋', '查詢', '篩選', '狀態', '操作', '案件', '進度', '銀行', '金融', '資料列表'];
  console.log(`\n測試案例 1: ${testTags1.join(', ')}`);
  const matches1 = matchingService.calculateMatches(testTags1, templates);
  console.log(`✅ 找到 ${matches1.length} 個匹配模板:`);
  matches1.forEach(m => {
    console.log(`   - ${m.templateId}: ${(m.reliability * 100).toFixed(0)}% 可靠度`);
  });
  
  // 測試案例 2: 表單相關的標籤
  const testTags2 = ['輸入', '填寫', '送出', '必填', '申請', '資料新增', '銀行', '金融', '表單', '單頁'];
  console.log(`\n測試案例 2: ${testTags2.join(', ')}`);
  const matches2 = matchingService.calculateMatches(testTags2, templates);
  console.log(`✅ 找到 ${matches2.length} 個匹配模板:`);
  matches2.forEach(m => {
    console.log(`   - ${m.templateId}: ${(m.reliability * 100).toFixed(0)}% 可靠度`);
  });
  
  // 測試案例 3: 審核相關的標籤
  const testTags3 = ['審核', '核決', '同意', '退回', '審查', '案件', '處理', '流程', '銀行', '詳情'];
  console.log(`\n測試案例 3: ${testTags3.join(', ')}`);
  const matches3 = matchingService.calculateMatches(testTags3, templates);
  console.log(`✅ 找到 ${matches3.length} 個匹配模板:`);
  matches3.forEach(m => {
    console.log(`   - ${m.templateId}: ${(m.reliability * 100).toFixed(0)}% 可靠度`);
  });
  
  await db.disconnect();
  console.log('\n✅ 匹配測試完成\n');
}

async function testResponseFormat() {
  console.log('=== 測試回應格式 ===');
  
  const db = new DatabaseService();
  await db.connect();
  
  const templates = await db.getAllTemplates();
  const matchingService = new TemplateMatchingService();
  
  const testTags = ['搜尋', '查詢', '案件', '銀行', '資料列表'];
  const matches = matchingService.calculateMatches(testTags, templates);
  
  // 模擬 MCP 回應格式
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
      DebugMod: true,
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
  
  console.log('✅ 回應格式範例:');
  console.log(JSON.stringify(response, null, 2));
  
  await db.disconnect();
  console.log('\n✅ 格式測試完成\n');
}

// 執行所有測試
async function runAllTests() {
  console.log('🧪 開始測試 MCP 伺服器\n');
  console.log('=' .repeat(50));
  
  try {
    await testDatabase();
    await testMatching();
    await testResponseFormat();
    
    console.log('=' .repeat(50));
    console.log('✅ 所有測試通過！\n');
    console.log('下一步:');
    console.log('1. 執行 npm start 啟動 MCP 伺服器');
    console.log('2. 在 Claude Desktop 中設定伺服器');
    console.log('3. 開始使用模板推薦功能');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 測試失敗:', error);
    process.exit(1);
  }
}

runAllTests();
