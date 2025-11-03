// 建立 tags 集合
db.createCollection("tags", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["tag_name", "tag_group", "update_id", "update_timestamp"],
            properties: {
                tag_name: {
                    bsonType: "string",
                    maxLength: 20,
                    description: "模板名稱 - 必填"
                },
                tag_group: {
                    bsonType: "string",
                    maxLength: 10,
                    description: "模板群組(業務、情境、功能、佈局) - 必填"
                },
                update_id: {
                    bsonType: "string",
                    maxLength: 20,
                    description: "更新者ID"
                },
                update_timestamp: {
                    bsonType: "date",
                    description: "更新時間戳"
                }
            }
        }
    },
    comment: "所有模板集合"
});

// 建立 tags 的唯一索引 (tag_name + tag_group)
db.tags.createIndex(
    { tag_name: 1, tag_group: 1 },
    { unique: true }
);

// 建立 templates 集合
db.createCollection("templates", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["template_id", "json_data_layout", "update_id", "update_timestamp"],
            properties: {
                template_id: {
                    bsonType: "string",
                    maxLength: 32,
                    description: "模板ID - 必填，主鍵"
                },
                json_data_layout: {
                    bsonType: "array",
                    items: { bsonType: "string" },
                    description: "佈局 - 必填"
                },
                json_data_situation: {
                    bsonType: "array",
                    items: { bsonType: "string" },
                    description: "情境"
                },
                json_data_business: {
                    bsonType: "array",
                    items: { bsonType: "string" },
                    description: "業務"
                },
                json_data_function: {
                    bsonType: "array",
                    items: { bsonType: "string" },
                    description: "功能"
                },
                update_id: {
                    bsonType: "string",
                    maxLength: 20,
                    description: "更新者ID - 必填"
                },
                update_timestamp: {
                    bsonType: "date",
                    description: "更新時間戳 - 必填"
                }
            }
        }
    }
});

// 建立 templates 的主鍵索引
db.templates.createIndex(
    { template_id: 1 },
    { unique: true }
);
