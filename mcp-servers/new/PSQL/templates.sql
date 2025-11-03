INSERT INTO dbo.templates (
    template_id,
    json_data_function,
    json_data_situation,
    json_data_business,
    json_data_layout,
    update_id,
    update_timestamp
) VALUES (
             '列表-基礎',
             '["搜尋","查詢","待處理","已處理","狀態","篩選","操作","查看","日期","數字","金額","敘述","動作","排序"]',
             '["情境","案件","進度","管理","交易","紀錄","流程","追蹤","審查","審核","監控"]',
             '["業務","銀行","金融","經辦","信貸","客服","風險控管","合規","稽核","交易","授信","審核","客戶","申訴","營運","投信","人事","財務","理財","外匯","內控","帳務","人員"]',
             '["佈局","資料列表","表格","清單"]',
             'system',
             CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'
         );
INSERT INTO dbo.templates (
    template_id,
    json_data_function,
    json_data_situation,
    json_data_business,
    json_data_layout,
    update_id,
    update_timestamp
) VALUES (
             '列表-進階',
             '["搜尋","查詢","篩選","狀態","重置","展開","勾選","多選","批次處理","多項操作","操作","匯出","新增","備註","移動","查看","��態篩選","草稿","排序"]',
             '["情境","案件","進度","管理","交易","紀錄","流程","追蹤","審查","審核","監控","報表"]',
             '["業務","銀行","金融","經辦","信貸","客服","風險控管","合規","稽核","交易","授信","審核","客戶","申訴","營運","投信","人事","財務","理財","外匯","內控","帳務","人員"]',
             '["佈局","資料列表","表格","篩選區","欄位設定","分頁","清單"]',
             'system',
             CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'
         );
INSERT INTO dbo.templates (
    template_id,
    json_data_function,
    json_data_situation,
    json_data_business,
    json_data_layout,
    update_id,
    update_timestamp
) VALUES (
             '列表-全區搜尋',
             '["搜尋","查詢","狀態","篩選","查看","操作","分類","分頁","案件量","草稿","模式切換","數值區間","分級","標籤","多條件","大範圍","數據","總覽","排序"]',
             '["情境","案件","進度","管理","交易","紀錄","流程","追蹤","審查","審核","監控","報表","區間","分級"]',
             '["業務","銀行","金融","經辦","信貸","客服","風險控管","合規","稽核","交易","授信","審核","客戶","申訴","營運","投信","人事","財務","理財","外匯","內控","帳務","人員"]',
             '["佈局","資料列表","表格","多標籤","導航","清單"]',
             'system',
             CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'
         );
INSERT INTO dbo.templates (
    template_id,
    json_data_function,
    json_data_situation,
    json_data_business,
    json_data_layout,
    update_id,
    update_timestamp
) VALUES (
             '表單-基礎',
             '["輸入","豋錄","編輯","填寫","儲存","送出","取消","單選","多選","選擇","下拉","選項","選單","選取","必填","日期","時間"]',
             '["資料新增","資料修改/變更","申請","申報","註冊","創建","登錄","提交","記錄"]',
             '["業務","銀行","金融","經辦","信貸","客服","風險控管","合規","稽核","交易","授信","審核","客戶","申訴","營運","投信","人事","財務","理財","外匯","內控","帳務","人員","開戶","個資"]',
             '["表單","資料表","單頁"]',
             'system',
             CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'
         );
INSERT INTO dbo.templates (
    template_id,
    json_data_function,
    json_data_situation,
    json_data_business,
    json_data_layout,
    update_id,
    update_timestamp
) VALUES (
             '表單-進階',
             '["輸入","豋錄","編輯","填寫","儲存","送出","取消","提醒","警示","單選","多選","選擇","下拉","選項","選單","選取","必填","日期","時間","備註","意見","批註","附件","檔案","上傳","草稿","多層級","分層","多項目"]',
             '["資料新增","資料修改/變更","資料收集","申請","申報","創建","登錄","提交","發起","流程","簽核流程","傳遞流程","重複新增"]',
             '["業務","銀行","金融","經辦","信貸","客服","風險控管","合規","稽核","交易","授信","審核","客戶","申訴","營運","投信","人事","財務","理財","外匯","內控","帳務","人員","開戶","個資"]',
             '["表單","資料表","卡片","多區塊"]',
             'system',
             CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'
         );
INSERT INTO dbo.templates (
    template_id,
    json_data_function,
    json_data_situation,
    json_data_business,
    json_data_layout,
    update_id,
    update_timestamp
) VALUES (
             '步驟表單-基礎',
             '["輸入","豋錄","編輯","填寫","儲存","送出","取消","上一步","下一步","步驟","引導","狀態","操作","單選","多選","選擇","下拉","選項","選單","選取","必填","提醒","警示","預覽"]',
             '["資料收集","申請","申報","創建","登錄","提交","發起","分步驟填寫","進度","多層級","多步驟","引導","流程化"]',
             '["業務","銀行","金融","經辦","信貸","客服","風險控管","合規","稽核","交易","授信","審核","客戶","申訴","營運","投信","人事","財務","理財","外匯","內控","帳務","人員","開戶","個資"]',
             '["表單","分步"]',
             'system',
             CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'
         );
INSERT INTO dbo.templates (
    template_id,
    json_data_function,
    json_data_situation,
    json_data_business,
    json_data_layout,
    update_id,
    update_timestamp
) VALUES (
             '步驟表單-基礎多項目',
             '["輸入","豋錄","編輯","填寫","儲存","送出","取消","上一步","下一步","步驟","引導","單選","選擇","下拉","選項","選單","選取","必填","預覽","多項目","新增","刪除"]',
             '["資料收集","申請","申報","創建","登錄","提交","發起","分步驟填寫","進度","多步驟","引導","流程化","項目增刪","多筆新增","重複新增"]',
             '["業務","銀行","金融","經辦","信貸","客服","風險控管","合規","稽核","交易","授信","審核","客戶","申訴","營運","投信","人事","財務","理財","外匯","內控","帳務","人員","開戶","個資"]',
             '["表單","分步"]',
             'system',
             CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'
         );
INSERT INTO dbo.templates (
    template_id,
    json_data_function,
    json_data_situation,
    json_data_business,
    json_data_layout,
    update_id,
    update_timestamp
) VALUES (
             '步驟表單-進階',
             '["輸入","豋錄","編輯","填寫","儲存","送出","取消","上一步","下一步","步驟","引導","新增","刪除","審核","結案","預覽","備註","意見","批註","附件","檔案","上傳","草稿"]',
             '["資料收集","申請","申報","創建","登錄","提交","流程","發起","分步驟填寫","進度","多步驟","引導","報告"]',
             '["業務","銀行","金融","經辦","信貸","客服","風險控管","合規","稽核","交易","授信","審核","客戶","申訴","營運","投信","人事","財務","理財","外匯","內控","帳務","人員","開戶","個資"]',
             '["表單","分步"]',
             'system',
             CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'
         );
INSERT INTO dbo.templates (
    template_id,
    json_data_function,
    json_data_situation,
    json_data_business,
    json_data_layout,
    update_id,
    update_timestamp
) VALUES (
             '詳情-基礎',
             '["審核","核決","同意","退回","操作","審查","追蹤","展示","上傳","下載","查看","意見","檔案","附件","送出"]',
             '["案件","處理","流程","追蹤","審核決策","資料檢視","交易稽核","文件總攬","簽核流程","傳遞流程","資料查核"]',
             '["業務","銀行","金融","經辦","信貸","客服","風險控管","合規","稽核","交易","授信","審核","客戶","申訴","營運","投信","人事","財務","理財","外匯","內控","帳務","人員","開戶","個資"]',
             '["詳情","卡片","資料檢視","資料查核"]',
             'system',
             CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'
         );
INSERT INTO dbo.templates (
    template_id,
    json_data_function,
    json_data_situation,
    json_data_business,
    json_data_layout,
    update_id,
    update_timestamp
) VALUES (
             '詳情-審核',
             '["審核","核決","同意","退回","操作","審查","追蹤","展示","上傳","下載","查看","意見必填","檔案","附件","送出"]',
             '["案件","處理","流程","追蹤","審核決策","資料檢視","交易稽核","文件總攬","簽核流程","傳遞流程","資料查核"]',
             '["業務","銀行","金融","經辦","信貸","客服","風險控管","合規","稽核","交易","授信","審核","客戶","申訴","營運","投信","人事","財務","理財","外匯","內控","帳務","人員","開戶","個資"]',
             '["詳情","卡片","資料檢視","資料查核"]',
             'system',
             CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'
         );
INSERT INTO dbo.templates (
    template_id,
    json_data_function,
    json_data_situation,
    json_data_business,
    json_data_layout,
    update_id,
    update_timestamp
) VALUES (
             '設定-層級型',
             '["配置","設定","定義","調整","儲存","取消","單選","多選","開關","階層","導航","分類","層級","管理","導覽"]',
             '["後台","系統","參數設定","選項定義","功能調整","階層設定"]',
             '["業務","銀行","金融","系統管理","資訊處","資訊安全","IT","行政"]',
             '["設定","條列","清單","選項"]',
             'system',
             CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'
         );
INSERT INTO dbo.templates (
    template_id,
    json_data_function,
    json_data_situation,
    json_data_business,
    json_data_layout,
    update_id,
    update_timestamp
) VALUES (
             '設定-清單型',
             '["配置","設定","定義","調整","儲存","取消","選取","單選","多選","開關","階層","導航","分類","類型","層級","啟用","停用","切換","新增","啟用日","結束日"]',
             '["角色","權限","管理","控制","參數","後台","系統","帳號","功能"]',
             '["業務","銀行","金融","系統管理","資訊處","資訊安全","IT","行政","人事"]',
             '["列表","表格","卡片"]',
             'system',
             CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Taipei'
         );
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