-- ===============================================
-- PostgreSQL 模板標籤系統 - 建立表格與插入資料
-- 只建立兩張表格：tags 和 templates (JSONB 設計)
-- ===============================================

-- 刪除現有表格（如果存在）
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

-- ===============================================
-- 建立表格
-- ===============================================

-- 1. 建立標籤表格
CREATE TABLE tags(
    id SERIAL NOT NULL,
    tag_name varchar(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- 2. 建立模板表格（JSONB 設計）
CREATE TABLE templates(
    id SERIAL NOT NULL,
    template_name varchar(100) NOT NULL,
    tags jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);

-- ===============================================
-- 建立索引
-- ===============================================

-- 標籤表格索引
CREATE UNIQUE INDEX tags_tag_name_key ON public.tags USING btree (tag_name);
CREATE INDEX idx_tags_tag_name ON public.tags USING btree (tag_name);

-- 模板表格索引（JSONB 設計）
CREATE UNIQUE INDEX templates_template_name_key ON public.templates USING btree (template_name);
CREATE INDEX idx_templates_name ON public.templates USING btree (template_name);
CREATE INDEX idx_templates_tags ON public.templates USING gin (tags);

-- ===============================================
-- 插入資料
-- ===============================================

-- 插入標籤資料
INSERT INTO tags (tag_name) VALUES 
('申請'),
('表單'),
('資料'),
('填寫'),
('輸入'),
('草稿'),
('開戶'),
('信用卡'),
('文件'),
('清單'),
('追蹤'),
('日期'),
('狀態'),
('審核'),
('流程'),
('傳遞'),
('顯示'),
('下載'),
('內容'),
('審查'),
('放行'),
('展示')
ON CONFLICT (tag_name) DO NOTHING;

-- 插入模板資料（JSONB 格式）
INSERT INTO templates (template_name, tags) VALUES 
('資訊輸入模板', '["申請", "表單", "資料", "填寫", "輸入", "草稿", "開戶", "信用卡", "文件"]'),
('流程檢查模板', '["清單", "追蹤", "日期", "狀態", "審核", "流程", "傳遞"]'),
('資訊展示模板', '["顯示", "狀態", "下載", "內容", "審核", "審查", "放行", "展示", "資料"]')
ON CONFLICT (template_name) DO NOTHING;

-- ===============================================
-- 驗證資料插入結果
-- ===============================================

-- 查看標籤數量
SELECT COUNT(*) as tag_count FROM tags;

-- 查看模板數量
SELECT COUNT(*) as template_count FROM templates;

-- 查看每個模板的標籤
SELECT template_name, jsonb_array_length(tags) as tag_count 
FROM templates 
ORDER BY template_name;

-- 顯示所有標籤
SELECT tag_name FROM tags ORDER BY tag_name;

-- 顯示模板和標籤
SELECT template_name, tags 
FROM templates 
ORDER BY template_name;

-- ===============================================
-- 測試查詢（MCP 功能）
-- ===============================================

-- 1. 撈取所有標籤（給 LLM 推薦用）
SELECT tag_name FROM tags ORDER BY tag_name;

-- 2. 根據輸入標籤找最佳匹配模板（JSONB 版本）
SELECT 
    template_name,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements_text(tags) as tag
        WHERE tag = ANY(ARRAY['申請', '表單', '資料', '填寫', '輸入'])
    ) as match_count,
    jsonb_array_length(tags) as total_template_tags
FROM templates
WHERE tags ?| ARRAY['申請', '表單', '資料', '填寫', '輸入']
ORDER BY match_count DESC;

-- 3. 標籤使用統計
SELECT 
    tag_value,
    COUNT(*) as usage_count 
FROM templates, jsonb_array_elements_text(tags) as tag_value
GROUP BY tag_value 
ORDER BY usage_count DESC, tag_value;

-- 4. 模板匹配詳細分析
SELECT 
    template_name,
    tags,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements_text(tags) as tag
        WHERE tag = ANY(ARRAY['顯示', '狀態', '資料', '追蹤', '流程'])
    ) as match_count,
    (
        SELECT ARRAY(
            SELECT tag
            FROM jsonb_array_elements_text(tags) as tag
            WHERE tag = ANY(ARRAY['顯示', '狀態', '資料', '追蹤', '流程'])
        )
    ) as matched_tags
FROM templates
WHERE tags ?| ARRAY['顯示', '狀態', '資料', '追蹤', '流程']
ORDER BY match_count DESC;

COMMIT;