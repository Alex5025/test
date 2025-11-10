export interface LLMService {
  /**
   * 從所有可用的 tags 中選擇 10 個與自然語言輸入最相關的 tag
   * 使用 LLM 的能力直接理解自然語言，從 tags 中智能選出最相關的 10 個
   * @param naturalLanguage 使用者輸入的自然語言
   * @param availableTags 所有可用的 tags（從資料庫獲得）
   * @param tagsByGroup 依群組分類的 tags（可選）
   * @returns 嚴格返回 10 個最相關的 tags
   */
  selectRelevantTags(naturalLanguage: string, availableTags: string[], tagsByGroup?: Map<string, string[]>): Promise<string[]>;
}

export class OpenAIService implements LLMService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
    this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  async selectRelevantTags(naturalLanguage: string, availableTags: string[], tagsByGroup?: Map<string, string[]>): Promise<string[]> {
    // 如果沒有設定 API Key 或是測試環境，直接使用智能匹配
    if (!this.apiKey || this.apiKey === 'test_key_for_development' || this.apiKey === 'your_api_key_here') {
      console.error('Using intelligent fallback (no API Key)');
      return this.intelligentTagSelection(naturalLanguage, availableTags, tagsByGroup);
    }

    const prompt = `你是一個專業的 UI/UX 模板推薦系統。

使用者輸入的自然語言需求：${naturalLanguage}

可用的標籤清單（共 ${availableTags.length} 個）：
${availableTags.join(', ')}

任務：從上述標籤清單中，精確選出 10 個與使用者需求最相關的標籤。

要求：
1. 嚴格只能從提供的標籤清單中選擇
2. 必須選擇恰好 10 個標籤（如果可用標籤少於 10 個，則全選）
3. 按相關性從高到低排序
4. 只回傳 JSON 陣列格式，例如：["標籤1", "標籤2", "標籤3", ..., "標籤10"]
5. 不要包含任何其他文字或說明`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: '你是一個專業的 UI/UX 標籤選擇助手，只回傳 JSON 格式的標籤陣列。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '[]';
      
      // 嘗試解析 JSON
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const selectedTags = JSON.parse(cleanContent);

      // 確保返回的是陣列且最多 10 個
      if (Array.isArray(selectedTags)) {
        return selectedTags.slice(0, 10);
      }
      return [];
    } catch (error) {
      console.error('Error calling LLM API, using intelligent fallback:', error);
      return this.intelligentTagSelection(naturalLanguage, availableTags, tagsByGroup);
    }
  }

  private fallbackTagSelection(naturalLanguage: string, availableTags: string[]): string[] {
    // 簡單的關鍵字匹配作為備選方案
    const keywords = naturalLanguage.toLowerCase().split(/\s+/);
    const matchedTags = availableTags.filter(tag => 
      keywords.some(keyword => tag.toLowerCase().includes(keyword))
    );
    
    return matchedTags.slice(0, 10);
  }

  /**
   * 智能標籤選擇（不使用外部 API）
   * 純粹基於 LLM 的自然語言理解能力，從資料庫的 tags 中選出最相關的 10 個
   * @returns 嚴格返回 10 個最相關的 tags
   */
  private intelligentTagSelection(naturalLanguage: string, availableTags: string[], tagsByGroup?: Map<string, string[]>): string[] {
    const input = naturalLanguage.toLowerCase();
    const selectedTags: Array<{ tag: string; score: number }> = [];

    // 使用資料庫的標籤分組，如果沒有則從可用標籤動態建立
    const tagsByCategory = tagsByGroup || this.categorizeAvailableTags(availableTags);
    
    console.error(`[DEBUG] Input: "${input}"`);
    console.error(`[DEBUG] Available tags: ${availableTags.length}`);
    console.error(`[DEBUG] Tag categories: ${Array.from(tagsByCategory.keys()).join(', ')}`);
    for (const [cat, tags] of tagsByCategory.entries()) {
      console.error(`[DEBUG]   ${cat}: ${tags.length} tags`);
    }
    
    // 建立動態關鍵字映射
    const semanticRules = this.buildSemanticRules(input, tagsByCategory);
    console.error(`[DEBUG] Semantic rules created: ${semanticRules.size} categories matched`);

    // 為每個標籤計算相關性分數
    for (const tag of availableTags) {
      let score = 0;
      const tagLower = tag.toLowerCase();

      // 1. 直接完全匹配（最高分）
      if (input.includes(tagLower) && tagLower.length > 0) {
        score += 100;
      }
      
      if (tagLower.includes(input) && input.length > 1) {
        score += 80;
      }

      // 2. 分詞部分匹配（更細緻的中文字符匹配）
      const inputWords = input.split(/[\s,，、]+/).filter(w => w.length > 0);
      
      // 處理中文：拆成單字或雙字詞
      const inputChars: string[] = [];
      for (const word of inputWords) {
        // 加入完整詞
        inputChars.push(word);
        // 拆成單字
        for (let i = 0; i < word.length; i++) {
          inputChars.push(word[i]);
          // 雙字詞
          if (i < word.length - 1) {
            inputChars.push(word.substring(i, i + 2));
          }
        }
      }
      
      // 去重
      const uniqueInputTokens = [...new Set(inputChars)].filter(t => t.length > 0);
      
      for (const token of uniqueInputTokens) {
        if (token.length > 0) {
          // 完全匹配
          if (tagLower === token) {
            score += 90;
          }
          // tag 包含 token
          else if (tagLower.includes(token)) {
            score += 50;
          }
          // token 包含 tag
          else if (token.includes(tagLower) && tagLower.length > 1) {
            score += 40;
          }
          // 首字匹配
          else if (tagLower.startsWith(token) || token.startsWith(tagLower)) {
            score += 20;
          }
        }
      }

      // 3. 語義規則匹配（從動態規則中）
      for (const [category, relatedTags] of semanticRules.entries()) {
        if (relatedTags.includes(tag)) {
          score += 40;
        }
      }

      // 4. 類別相關性加分
      for (const [category, tags] of tagsByCategory.entries()) {
        if (tags.includes(tag)) {
          // 如果類別關鍵字在輸入中出現
          const categoryLower = category.toLowerCase();
          if (input.includes(categoryLower)) {
            score += 30;
          }
        }
      }

      if (score > 0) {
        selectedTags.push({ tag, score });
      }
    }
    
    console.error(`Found ${selectedTags.length} tags with scores`);

    // 按分數排序
    selectedTags.sort((a, b) => b.score - a.score);
    
    // 嚴格確保選出 10 個 tags
    if (selectedTags.length < 10) {
      console.error(`[DEBUG] Only ${selectedTags.length} tags found, expanding to reach 10...`);
      
      // 找出已選 tags 所屬的類別
      const usedCategories = new Set<string>();
      for (const st of selectedTags) {
        for (const [category, tags] of tagsByCategory.entries()) {
          if (tags.includes(st.tag)) {
            usedCategories.add(category);
          }
        }
      }
      
      console.error(`[DEBUG] Used categories: ${Array.from(usedCategories).join(', ')}`);
      
      // 從相同類別中補足 tags
      for (const category of usedCategories) {
        if (selectedTags.length >= 10) break;
        const categoryTags = tagsByCategory.get(category) || [];
        for (const tag of categoryTags) {
          if (!selectedTags.find(st => st.tag === tag)) {
            selectedTags.push({ tag, score: 5 });
            if (selectedTags.length >= 10) break;
          }
        }
      }
      
      // 如果還不夠 10 個，從所有類別中補足
      if (selectedTags.length < 10) {
        console.error(`[DEBUG] Still need more tags, adding from all categories...`);
        for (const [category, tags] of tagsByCategory.entries()) {
          if (selectedTags.length >= 10) break;
          for (const tag of tags) {
            if (!selectedTags.find(st => st.tag === tag)) {
              selectedTags.push({ tag, score: 3 });
              if (selectedTags.length >= 10) break;
            }
          }
        }
      }
      
      // 重新排序
      selectedTags.sort((a, b) => b.score - a.score);
      console.error(`[DEBUG] After expansion: ${selectedTags.length} tags`);
    }
    
    // 去重
    let uniqueTags = Array.from(new Set(selectedTags.map(item => item.tag)));
    console.error(`[DEBUG] After dedup: ${uniqueTags.length} unique tags`);
    
    // 嚴格確保有 10 個 tags：如果不足，從 availableTags 中依序補足
    if (uniqueTags.length < 10) {
      console.error(`[DEBUG] 不足 10 個，從 availableTags 補足...`);
      for (const tag of availableTags) {
        if (!uniqueTags.includes(tag)) {
          uniqueTags.push(tag);
          console.error(`[DEBUG] 補足: ${tag} (目前 ${uniqueTags.length} 個)`);
          if (uniqueTags.length >= 10) break;
        }
      }
    }
    
    // 嚴格取前 10 個
    const topTags = uniqueTags.slice(0, 10);
    
    // 最終確認：如果 availableTags 總數不足 10 個，返回全部
    if (topTags.length < 10 && availableTags.length < 10) {
      console.error(`[DEBUG] availableTags 總數不足 10 個，返回全部 ${availableTags.length} 個 tags`);
      return availableTags;
    }

    console.error(`[DEBUG] ✅ 嚴格選出 ${topTags.length} 個 tags`);
    console.error(`[DEBUG] 選出的 tags: ${topTags.join(', ')}`);
    return topTags;
  }

  /**
   * 將可用標籤按照類別分組（備用方法，當資料庫沒有提供分組時使用）
   * 這個方法僅在資料庫標籤分組不可用時作為後備方案
   */
  private categorizeAvailableTags(availableTags: string[]): Map<string, string[]> {
    // 如果沒有資料庫分組，返回簡單的未分類標籤
    const categories = new Map<string, string[]>();
    categories.set('全部', availableTags);
    return categories;
  }

  /**
   * 根據使用者輸入和分類標籤建立語義規則
   */
  private buildSemanticRules(input: string, tagsByCategory: Map<string, string[]>): Map<string, string[]> {
    const rules = new Map<string, string[]>();
    const inputWords = input.split(/[\s,，、]+/).filter(w => w.length > 1);
    
    console.error(`[DEBUG] Input words: ${inputWords.join(', ')}`);
    
    // 分析使用者輸入，找出相關的標籤
    for (const [category, tags] of tagsByCategory.entries()) {
      const relatedTags: string[] = [];
      
      for (const tag of tags) {
        const tagLower = tag.toLowerCase();
        let matched = false;
        
        // 完全匹配
        if (input.includes(tagLower)) {
          relatedTags.push(tag);
          matched = true;
        } else {
          // 檢查每個輸入單詞
          for (const word of inputWords) {
            if (word.length > 1) {
              if (tagLower.includes(word) || word.includes(tagLower)) {
                relatedTags.push(tag);
                matched = true;
                break;
              }
            }
          }
        }
        
        if (matched && relatedTags.length < 20) {
          console.error(`[DEBUG] Matched "${tag}" in category "${category}"`);
        }
      }
      
      if (relatedTags.length > 0) {
        rules.set(category, relatedTags);
        console.error(`[DEBUG] Category "${category}" has ${relatedTags.length} matched tags`);
      }
    }

    return rules;
  }
}
