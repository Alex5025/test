import { DatabaseService } from './build/database.js';

async function debugTags() {
  console.log('🔍 檢查資料庫中的 tags\n');
  
  const dbService = new DatabaseService();
  
  try {
    await dbService.connect();
    console.log('✅ 已連接資料庫\n');
    
    const allTags = await dbService.getAllTags();
    const tagsByGroup = await dbService.getTagsByGroup();
    
    console.log(`總共 ${allTags.length} 個 tags\n`);
    
    // 顯示每個群組的 tags
    for (const [group, tags] of tagsByGroup.entries()) {
      console.log(`\n=== ${group} (${tags.length} 個) ===`);
      console.log(tags.join(', '));
    }
    
    // 搜尋包含「貸款」、「申請」、「申辦」、「表單」相關的 tags
    console.log('\n\n=== 搜尋相關 tags ===');
    const keywords = ['貸款', '申請', '申辦', '表單', '金融', '輸入', '填寫'];
    for (const keyword of keywords) {
      const found = allTags.filter(tag => tag.includes(keyword));
      if (found.length > 0) {
        console.log(`\n"${keyword}" 相關: ${found.join(', ')}`);
      } else {
        console.log(`\n"${keyword}" 相關: (無)`);
      }
    }
    
    await dbService.disconnect();
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
    await dbService.disconnect();
  }
}

debugTags();
