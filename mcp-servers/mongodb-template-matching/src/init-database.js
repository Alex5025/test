#!/usr/bin/env node

/**
 * MongoDB 資料庫初始化腳本
 * 用於單獨初始化資料庫和資料
 */

import { MongoClient } from 'mongodb';

const mongoConfig = {
  url: 'mongodb://localhost:27017',
  dbName: 'UXD_MCP'
};

async function initDatabase() {
  const client = new MongoClient(mongoConfig.url);
  
  try {
    console.log('🔌 連接到 MongoDB...');
    await client.connect();
    const db = client.db(mongoConfig.dbName);

    console.log('📦 建立集合...');
    // 建立集合
    await db.createCollection('tags');
    await db.createCollection('templates');

    console.log('🏗️ 建立索引...');
    // 建立索引
    await db.collection('tags').createIndex({ tag_name: 1 }, { unique: true });
    await db.collection('templates').createIndex({ template_name: 1 }, { unique: true });
    await db.collection('templates').createIndex({ tags: 1 });

    console.log('🏷️ 插入標籤資料...');
    // 插入初始標籤資料
    const tags = [
      '申請', '表單', '資料', '填寫', '輸入', '草稿', '開戶', 
      '信用卡', '文件', '清單', '追蹤', '日期', '狀態', '審核', 
      '流程', '傳遞', '顯示', '下載', '內容', '審查', '放行', '展示'
    ];

    const tagDocuments = tags.map(tag => ({ 
      tag_name: tag, 
      created_at: new Date() 
    }));
    
    try {
      const tagResult = await db.collection('tags').insertMany(tagDocuments, { ordered: false });
      console.log(`✅ 插入了 ${tagResult.insertedCount} 個標籤`);
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️ 標籤已存在，跳過插入');
      } else {
        throw error;
      }
    }

    console.log('📋 插入模板資料...');
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

    try {
      const templateResult = await db.collection('templates').insertMany(templates, { ordered: false });
      console.log(`✅ 插入了 ${templateResult.insertedCount} 個模板`);
    } catch (error) {
      if (error.code === 11000) {
        console.log('⚠️ 模板已存在，跳過插入');
      } else {
        throw error;
      }
    }

    console.log('🔍 驗證資料...');
    // 驗證資料
    const tagCount = await db.collection('tags').countDocuments();
    const templateCount = await db.collection('templates').countDocuments();
    
    console.log(`📊 統計結果：`);
    console.log(`   - 標籤數量：${tagCount}`);
    console.log(`   - 模板數量：${templateCount}`);
    
    console.log('\n📋 所有模板：');
    const allTemplates = await db.collection('templates').find({}).toArray();
    allTemplates.forEach(template => {
      console.log(`   - ${template.template_name}: [${template.tags.join(', ')}]`);
    });

    console.log('\n🎉 MongoDB 資料庫初始化完成！');
    console.log(`🗄️ 資料庫名稱：${mongoConfig.dbName}`);
    console.log(`🔗 連線字串：${mongoConfig.url}/${mongoConfig.dbName}`);

  } catch (error) {
    console.error('❌ 初始化失敗:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 資料庫連接已關閉');
  }
}

// 執行初始化
initDatabase();