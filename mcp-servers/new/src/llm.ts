export interface LLMService {
  selectRelevantTags(naturalLanguage: string, availableTags: string[]): Promise<string[]>;
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

  async selectRelevantTags(naturalLanguage: string, availableTags: string[]): Promise<string[]> {
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
      console.error('Error calling LLM API:', error);
      // 如果 LLM 失敗，返回空陣列或使用簡單的關鍵字匹配作為備選方案
      return this.fallbackTagSelection(naturalLanguage, availableTags);
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
}
