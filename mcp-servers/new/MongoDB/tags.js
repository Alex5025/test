// 從 templates 集合中提取所有標籤並插入到 tags 集合
// 此腳本需在插入 templates 資料後執行

// 收集所有唯一的標籤
const allTags = [];

// 從 templates 集合中讀取所有文件
db.templates.find().forEach(function(template) {
    // 處理 json_data_business
    if (template.json_data_business) {
        template.json_data_business.forEach(function(tag) {
            allTags.push({
                tag_name: tag,
                tag_group: "業務",
                update_id: "system",
                update_timestamp: new Date()
            });
        });
    }
    
    // 處理 json_data_function
    if (template.json_data_function) {
        template.json_data_function.forEach(function(tag) {
            allTags.push({
                tag_name: tag,
                tag_group: "功能",
                update_id: "system",
                update_timestamp: new Date()
            });
        });
    }
    
    // 處理 json_data_situation
    if (template.json_data_situation) {
        template.json_data_situation.forEach(function(tag) {
            allTags.push({
                tag_name: tag,
                tag_group: "情境",
                update_id: "system",
                update_timestamp: new Date()
            });
        });
    }
    
    // 處理 json_data_layout
    if (template.json_data_layout) {
        template.json_data_layout.forEach(function(tag) {
            allTags.push({
                tag_name: tag,
                tag_group: "佈局",
                update_id: "system",
                update_timestamp: new Date()
            });
        });
    }
});

// 去重並插入到 tags 集合
const uniqueTags = {};
allTags.forEach(function(tag) {
    const key = tag.tag_name + "_" + tag.tag_group;
    if (!uniqueTags[key]) {
        uniqueTags[key] = tag;
    }
});

// 批量插入唯一標籤（使用 ordered: false 忽略重複錯誤）
const tagsToInsert = Object.values(uniqueTags);
if (tagsToInsert.length > 0) {
    try {
        db.tags.insertMany(tagsToInsert, { ordered: false });
        print("成功插入 " + tagsToInsert.length + " 個標籤");
    } catch (e) {
        // 忽略重複鍵錯誤
        if (e.code === 11000) {
            print("部分標籤已存在，已跳過重複項目");
        } else {
            throw e;
        }
    }
}
