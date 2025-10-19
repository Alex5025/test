-- PostgreSQL 模板標籤系統實作
-- 基於 JSONB 混合架構設計

-- ==========================================
-- 1. 建立資料表結構
-- ==========================================

-- 標籤表（傳統關聯式）
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    tag_name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 模板表（JSONB 格式）
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    tags JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引優化查詢效能
CREATE INDEX IF NOT EXISTS idx_tags_tag_name ON tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_templates_name ON templates(template_name);
CREATE INDEX IF NOT EXISTS idx_templates_tags ON templates USING GIN (tags);

-- ==========================================
-- 2. 插入當前的標籤和模板資料
-- ==========================================

-- 插入所有唯一標籤
INSERT INTO tags (tag_name) VALUES 
('申請'), ('表單'), ('資料'), ('填寫'), ('輸入'),
('草稿'), ('開戶'), ('信用卡'), ('文件'), ('清單'),
('追蹤'), ('日期'), ('狀態'), ('審核'), ('流程'),
('傳遞'), ('顯示'), ('下載'), ('內容'), ('審查'),
('放行'), ('展示')
ON CONFLICT (tag_name) DO NOTHING;

-- 插入模板與標籤關聯（JSONB 格式）
INSERT INTO templates (template_name, tags) VALUES 
('資訊輸入模板', '["申請", "表單", "資料", "填寫", "輸入", "草稿", "開戶", "信用卡", "文件"]'),
('流程檢查模板', '["清單", "追蹤", "日期", "狀態", "審核", "流程", "傳遞"]'),
('資訊展示模板', '["顯示", "狀態", "下載", "內容", "審核", "審查", "放行", "展示", "資料"]')
ON CONFLICT (template_name) DO NOTHING;

-- ==========================================
-- 3. 模板匹配決策功能 SQL 函數
-- ==========================================

-- 函數：根據輸入標籤找出最佳匹配模板
CREATE OR REPLACE FUNCTION find_best_template(input_tags TEXT[])
RETURNS TABLE (
    template_name VARCHAR(100),
    match_count INTEGER,
    total_template_tags INTEGER,
    match_percentage DECIMAL(5,2),
    matched_tags JSONB,
    unmatched_tags JSONB,
    template_tags JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.template_name,
        jsonb_array_length(
            jsonb_path_query_array(t.tags, ('$[*] ? (@ in (' || 
                string_agg('"' || tag || '"', ',') || '))'))
        ) as match_count,
        jsonb_array_length(t.tags) as total_template_tags,
        ROUND(
            jsonb_array_length(
                jsonb_path_query_array(t.tags, ('$[*] ? (@ in (' || 
                    string_agg('"' || tag || '"', ',') || '))'))
            ) * 100.0 / array_length(input_tags, 1), 2
        ) as match_percentage,
        jsonb_path_query_array(t.tags, ('$[*] ? (@ in (' || 
            string_agg('"' || tag || '"', ',') || '))')) as matched_tags,
        to_jsonb(array(SELECT unnest(input_tags) EXCEPT SELECT jsonb_array_elements_text(
            jsonb_path_query_array(t.tags, ('$[*] ? (@ in (' || 
                string_agg('"' || tag || '"', ',') || '))')
            )
        ))) as unmatched_tags,
        t.tags as template_tags
    FROM templates t
    CROSS JOIN (SELECT string_agg('"' || tag || '"', ',') as tag_list FROM unnest(input_tags) as tag) tl
    WHERE t.tags ?| input_tags
    ORDER BY match_count DESC, match_percentage DESC;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. MCP 相關查詢函數
-- ==========================================

-- 撈取所有標籤（供 LLM 使用）
CREATE OR REPLACE FUNCTION get_all_tags()
RETURNS TABLE (tag_name VARCHAR(100)) AS $$
BEGIN
    RETURN QUERY
    SELECT t.tag_name 
    FROM tags t 
    ORDER BY t.tag_name;
END;
$$ LANGUAGE plpgsql;

-- 模板統計資訊
CREATE OR REPLACE FUNCTION get_template_stats()
RETURNS TABLE (
    template_name VARCHAR(100),
    tag_count INTEGER,
    tags_list JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.template_name,
        jsonb_array_length(t.tags) as tag_count,
        t.tags as tags_list
    FROM templates t
    ORDER BY t.template_name;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 5. 測試查詢範例
-- ==========================================

-- 測試：撈取所有標籤
SELECT * FROM get_all_tags();

-- 測試：查看模板統計
SELECT * FROM get_template_stats();

-- 測試：模板匹配（第一組：5個標籤）
SELECT * FROM find_best_template(ARRAY['顯示', '狀態', '資料', '日期', '追蹤']);

-- 測試：模板匹配（第二組：10個標籤）
SELECT * FROM find_best_template(ARRAY['顯示', '狀態', '資料', '追蹤', '審核', '申請', '清單', '展示', '日期', '內容']);

-- ==========================================
-- 6. 詳細匹配分析查詢
-- ==========================================

-- 詳細分析查詢（包含匹配和未匹配標籤的詳細資訊）
WITH input_tags AS (
    SELECT ARRAY['顯示', '狀態', '資料', '日期', '追蹤'] as tags
),
template_matches AS (
    SELECT 
        t.template_name,
        t.tags as template_tags,
        jsonb_path_query_array(
            t.tags, 
            '$[*] ? (@ in ("顯示", "狀態", "資料", "日期", "追蹤"))'
        ) as matched_tags,
        jsonb_array_length(
            jsonb_path_query_array(
                t.tags, 
                '$[*] ? (@ in ("顯示", "狀態", "資料", "日期", "追蹤"))'
            )
        ) as match_count,
        jsonb_array_length(t.tags) as total_tags
    FROM templates t, input_tags i
    WHERE t.tags ?| i.tags
)
SELECT 
    template_name,
    match_count,
    total_tags,
    ROUND(match_count * 100.0 / 5, 2) as match_percentage,
    matched_tags,
    template_tags,
    -- 分析詳情
    CASE 
        WHEN match_count >= 4 THEN '高度匹配'
        WHEN match_count >= 3 THEN '中度匹配' 
        WHEN match_count >= 2 THEN '低度匹配'
        ELSE '不匹配'
    END as match_level
FROM template_matches
ORDER BY match_count DESC, match_percentage DESC;