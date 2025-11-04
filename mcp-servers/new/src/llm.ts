export interface LLMService {
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

使用者需求：${naturalLanguage}

可用標籤清單：
${availableTags.join(', ')}

請從上述標籤清單中，選出 10 個最能符合使用者需求的標籤。
只需回傳標籤名稱，以 JSON 陣列格式回傳，例如：["標籤1", "標籤2", "標籤3"]

注意：
1. 只能從提供的標籤清單中選擇
2. 最多選擇 10 個標籤
3. 優先選擇與使用者需求最相關的標籤
4. 只回傳 JSON 陣列，不要有其他文字`;

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

      return Array.isArray(selectedTags) ? selectedTags : [];
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
   * 智能標籤選擇（不使用 API）
   * 根據關鍵字和實際資料庫中的標籤進行智能匹配
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
      if (input.includes(tagLower)) {
        score += 100;
      }
      
      if (tagLower.includes(input) && input.length > 1) {
        score += 80;
      }

      // 2. 分詞部分匹配
      const inputWords = input.split(/[\s,，、]+/).filter(w => w.length > 1);
      for (const word of inputWords) {
        if (word.length > 1) {
          if (tagLower.includes(word)) {
            score += 50;
          } else if (word.includes(tagLower)) {
            score += 40;
          }
          // 首字匹配
          if (tagLower.startsWith(word)) {
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

    // 按分數排序並取前 10 個
    selectedTags.sort((a, b) => b.score - a.score);
    const topTags = selectedTags.slice(0, 10).map(item => item.tag);

    // 如果沒有匹配的標籤，使用基本的關鍵字匹配
    if (topTags.length === 0) {
      return this.fallbackTagSelection(naturalLanguage, availableTags);
    }

    console.error(`Intelligent tag selection: found ${topTags.length} tags`);
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
