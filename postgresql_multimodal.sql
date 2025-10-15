-- PostgreSQL 多模態模板標籤系統
-- 支援關聯式、JSONB、向量等多種資料儲存方式

-- ===========================================
-- 方案一：傳統關聯式設計（目前使用）
-- ===========================================

-- 建立標籤資料表
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    tag_name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立模板資料表
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    tag_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_name, tag_name)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_tags_tag_name ON tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_templates_template_name ON templates(template_name);
CREATE INDEX IF NOT EXISTS idx_templates_tag_name ON templates(tag_name);

-- ===========================================
-- 方案二：JSONB 混合設計（未來升級選項）
-- ===========================================

-- 模板 JSONB 版本（更靈活的資料結構）
CREATE TABLE IF NOT EXISTS templates_jsonb (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    template_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- JSONB 索引（提升查詢效能）
CREATE INDEX IF NOT EXISTS idx_templates_jsonb_tags ON templates_jsonb USING GIN ((template_data->'tags'));
CREATE INDEX IF NOT EXISTS idx_templates_jsonb_name ON templates_jsonb USING BTREE (template_name);

-- ===========================================
-- 方案三：向量搜尋設計（需要 pgvector 擴展）
-- ===========================================

-- 安裝 pgvector 擴展（需要先安裝 pgvector）
-- CREATE EXTENSION IF NOT EXISTS vector;

-- 標籤向量表（用於語義相似度搜尋）
/*
CREATE TABLE IF NOT EXISTS tag_embeddings (
    id SERIAL PRIMARY KEY,
    tag_name VARCHAR(100) UNIQUE NOT NULL,
    embedding vector(1536), -- OpenAI embedding 維度
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 向量相似度索引
CREATE INDEX IF NOT EXISTS idx_tag_embeddings_vector ON tag_embeddings USING ivfflat (embedding vector_cosine_ops);
*/

-- ===========================================
-- 資料插入（方案一：關聯式）
-- ===========================================

-- 插入所有唯一標籤
INSERT INTO tags (tag_name) VALUES 
('線上申請'), ('卡片申請表單'), ('個人資料填寫'), ('財務資訊'),
('身份驗證'), ('收入證明'), ('信用評估'), ('文件上傳'),
('資格審核'), ('卡片選擇'), ('申請進度'), ('條款同意'),
('安全驗證'), ('申請確認'), ('新戶申請'), ('開戶表單'),
('帳戶設定'), ('客戶資料'), ('風險評估'), ('帳戶類型選擇'),
('初始存款'), ('服務條款'), ('開戶確認'), ('帳戶啟用'),
('流程驗證'), ('狀態檢查'), ('進度追蹤'), ('審核狀態'),
('流程監控'), ('檢查點'), ('驗證步驟'), ('流程完整性'),
('狀態更新'), ('流程控制')
ON CONFLICT (tag_name) DO NOTHING;

-- 插入模板與標籤關聯
INSERT INTO templates (template_name, tag_name) VALUES 
-- 信用卡申請
('信用卡申請', '線上申請'), ('信用卡申請', '卡片申請表單'),
('信用卡申請', '個人資料填寫'), ('信用卡申請', '財務資訊'),
('信用卡申請', '身份驗證'), ('信用卡申請', '收入證明'),
('信用卡申請', '信用評估'), ('信用卡申請', '文件上傳'),
('信用卡申請', '資格審核'), ('信用卡申請', '卡片選擇'),
('信用卡申請', '申請進度'), ('信用卡申請', '條款同意'),
('信用卡申請', '安全驗證'), ('信用卡申請', '申請確認'),
-- 開戶
('開戶', '新戶申請'), ('開戶', '開戶表單'), ('開戶', '帳戶設定'),
('開戶', '客戶資料'), ('開戶', '身份驗證'), ('開戶', '風險評估'),
('開戶', '帳戶類型選擇'), ('開戶', '初始存款'), ('開戶', '服務條款'),
('開戶', '開戶確認'), ('開戶', '帳戶啟用'),
-- 流程檢查
('流程檢查', '流程驗證'), ('流程檢查', '狀態檢查'), ('流程檢查', '進度追蹤'),
('流程檢查', '審核狀態'), ('流程檢查', '流程監控'), ('流程檢查', '檢查點'),
('流程檢查', '驗證步驟'), ('流程檢查', '流程完整性'), ('流程檢查', '狀態更新'),
('流程檢查', '流程控制')
ON CONFLICT (template_name, tag_name) DO NOTHING;

-- ===========================================
-- 資料插入（方案二：JSONB）
-- ===========================================

INSERT INTO templates_jsonb (template_name, template_data) VALUES 
('信用卡申請', '{
    "description": "信用卡線上申請流程",
    "tags": ["線上申請", "卡片申請表單", "個人資料填寫", "財務資訊", "身份驗證", "收入證明", "信用評估", "文件上傳", "資格審核", "卡片選擇", "申請進度", "條款同意", "安全驗證", "申請確認"],
    "category": "金融服務",
    "priority": 1
}'),
('開戶', '{
    "description": "銀行帳戶開戶流程",
    "tags": ["新戶申請", "開戶表單", "帳戶設定", "客戶資料", "身份驗證", "風險評估", "帳戶類型選擇", "初始存款", "服務條款", "開戶確認", "帳戶啟用"],
    "category": "金融服務",
    "priority": 2
}'),
('流程檢查', '{
    "description": "業務流程監控與驗證",
    "tags": ["流程驗證", "狀態檢查", "進度追蹤", "審核狀態", "流程監控", "檢查點", "驗證步驟", "流程完整性", "狀態更新", "流程控制"],
    "category": "流程管理",
    "priority": 3
}')
ON CONFLICT (template_name) DO NOTHING;

-- ===========================================
-- 常用查詢範例
-- ===========================================

-- MCP 撈取所有標籤（方案一）
SELECT tag_name FROM tags ORDER BY tag_name;

-- 根據標籤找模板（方案一）
SELECT template_name, COUNT(*) as match_count 
FROM templates 
WHERE tag_name = ANY(ARRAY['身份驗證', '文件上傳', '申請進度', '條款同意', '安全驗證'])
GROUP BY template_name 
ORDER BY match_count DESC;

-- MCP 撈取所有標籤（方案二：JSONB）
SELECT DISTINCT jsonb_array_elements_text(template_data->'tags') as tag_name 
FROM templates_jsonb 
ORDER BY tag_name;

-- 根據標籤找模板（方案二：JSONB）
SELECT template_name,
       jsonb_array_length(
           jsonb_path_query_array(
               template_data->'tags', 
               '$[*] ? (@ in ("身份驗證", "文件上傳", "申請進度", "條款同意", "安全驗證"))'
           )
       ) as match_count
FROM templates_jsonb
WHERE template_data->'tags' ?| ARRAY['身份驗證', '文件上傳', '申請進度', '條款同意', '安全驗證']
ORDER BY match_count DESC;

-- 查詢模板統計
SELECT template_name, COUNT(*) as tag_count 
FROM templates 
GROUP BY template_name 
ORDER BY template_name;