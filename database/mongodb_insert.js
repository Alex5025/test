// MongoDB 新增 Templates 資料（類似 SQL 指令）
// 使用 UXD_MCP 資料庫

use UXD_MCP;

// ==============================
// 建立集合（相當於 CREATE TABLE）
// ==============================

// 建立 tags 集合
db.createCollection("tags");

// 建立 templates 集合
db.createCollection("templates");

// ==============================
// 插入資料（相當於 INSERT INTO）
// ==============================

// INSERT INTO tags (tag_name, created_at) VALUES ...
db.tags.insertMany([
  { tag_name: "申請", created_at: new Date() },
  { tag_name: "表單", created_at: new Date() },
  { tag_name: "資料", created_at: new Date() },
  { tag_name: "填寫", created_at: new Date() },
  { tag_name: "輸入", created_at: new Date() },
  { tag_name: "草稿", created_at: new Date() },
  { tag_name: "開戶", created_at: new Date() },
  { tag_name: "信用卡", created_at: new Date() },
  { tag_name: "文件", created_at: new Date() },
  { tag_name: "清單", created_at: new Date() },
  { tag_name: "追蹤", created_at: new Date() },
  { tag_name: "日期", created_at: new Date() },
  { tag_name: "狀態", created_at: new Date() },
  { tag_name: "審核", created_at: new Date() },
  { tag_name: "流程", created_at: new Date() },
  { tag_name: "傳遞", created_at: new Date() },
  { tag_name: "顯示", created_at: new Date() },
  { tag_name: "下載", created_at: new Date() },
  { tag_name: "內容", created_at: new Date() },
  { tag_name: "審查", created_at: new Date() },
  { tag_name: "放行", created_at: new Date() },
  { tag_name: "展示", created_at: new Date() }
]);

// INSERT INTO templates (template_name, tags, created_at) VALUES ...
db.templates.insertMany([
  {
    template_name: "資訊輸入模板",
    tags: ["申請", "表單", "資料", "填寫", "輸入", "草稿", "開戶", "信用卡", "文件"],
    created_at: new Date()
  },
  {
    template_name: "流程檢查模板", 
    tags: ["清單", "追蹤", "日期", "狀態", "審核", "流程", "傳遞"],
    created_at: new Date()
  },
  {
    template_name: "資訊展示模板",
    tags: ["顯示", "狀態", "下載", "內容", "審核", "審查", "放行", "展示", "資料"],
    created_at: new Date()
  }
]);

// ==============================
// 建立索引（相當於 CREATE INDEX）
// ==============================

// CREATE UNIQUE INDEX ON tags (tag_name)
db.tags.createIndex({ "tag_name": 1 }, { unique: true });

// CREATE UNIQUE INDEX ON templates (template_name)
db.templates.createIndex({ "template_name": 1 }, { unique: true });

// CREATE INDEX ON templates (tags)
db.templates.createIndex({ "tags": 1 });

// ==============================
// 驗證資料（相當於 SELECT）
// ==============================

// SELECT COUNT(*) FROM tags;
print("標籤數量:", db.tags.countDocuments());

// SELECT COUNT(*) FROM templates;
print("模板數量:", db.templates.countDocuments());

// SELECT tag_name FROM tags ORDER BY tag_name;
print("\n所有標籤:");
db.tags.find({}, {tag_name: 1, _id: 0}).sort({tag_name: 1}).forEach(
  function(doc) { print("- " + doc.tag_name); }
);

// SELECT template_name, tags FROM templates ORDER BY template_name;
print("\n所有模板:");
db.templates.find({}, {template_name: 1, tags: 1, _id: 0}).sort({template_name: 1}).forEach(
  function(doc) { 
    print("模板:", doc.template_name);
    print("標籤:", doc.tags.join(", "));
    print("---");
  }
);

// ==============================
// MCP 測試查詢
// ==============================

print("\n=== MCP 功能測試 ===");

// 1. 撈取所有標籤（給 LLM 推薦用）
print("\n1. 所有可用標籤:");
var allTags = db.tags.find({}, {tag_name: 1, _id: 0}).sort({tag_name: 1}).toArray();
print(JSON.stringify(allTags.map(t => t.tag_name)));

// 2. 根據標籤找最佳匹配模板
print("\n2. 標籤匹配測試 ['顯示', '狀態', '資料']:");
var inputTags = ['顯示', '狀態', '資料'];
var matchResults = db.templates.aggregate([
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
    $project: {
      template_name: 1,
      match_count: 1,
      matched_tags: {
        $setIntersection: ["$tags", inputTags]
      },
      _id: 0
    }
  }
]).toArray();

matchResults.forEach(function(result) {
  print("模板:", result.template_name);
  print("匹配數:", result.match_count);
  print("匹配標籤:", result.matched_tags.join(", "));
  print("---");
});

print("\n資料庫初始化完成！");
print("可以使用以下指令查看:");
print("- show dbs");
print("- show collections"); 
print("- db.templates.find()");
print("- db.tags.find()");