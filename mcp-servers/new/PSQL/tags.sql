-- 將四類別展開後寫入 tags (使用新欄位命名)；避免重複使用 ON CONFLICT
INSERT INTO dbo.tags (tag_name, tag_group, update_id, update_timestamp)
WITH all_tags AS (
    SELECT jsonb_array_elements_text(t.json_data_business::jsonb) AS tag_name, '業務' AS tag_group FROM dbo.templates t
    UNION ALL
    SELECT jsonb_array_elements_text(t.json_data_function::jsonb), '功能' FROM dbo.templates t
    UNION ALL
    SELECT jsonb_array_elements_text(t.json_data_situation::jsonb), '情境' FROM dbo.templates t
    UNION ALL
    SELECT jsonb_array_elements_text(t.json_data_layout::jsonb), '佈局' FROM dbo.templates t
)
SELECT DISTINCT tag_name, tag_group, 'system' AS update_id, CURRENT_TIMESTAMP AS update_timestamp
FROM all_tags
    ON CONFLICT (tag_name, tag_group) DO NOTHING;