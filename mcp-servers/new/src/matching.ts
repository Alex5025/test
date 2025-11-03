import { Template } from './database.js';

export interface TemplateMatch {
  templateId: string;
  reliability: number;
  tags: {
    功能?: string[];
    情境?: string[];
    業務?: string[];
    佈局?: string[];
  };
}

export class TemplateMatchingService {
  /**
   * 計算 AI 推薦的標籤與模板的匹配度
   */
  calculateMatches(aiSelectedTags: string[], templates: Template[]): TemplateMatch[] {
    const matches: TemplateMatch[] = [];

    for (const template of templates) {
      // 合併模板的所有標籤
      const allTemplateTags = [
        ...(template.json_data_function || []),
        ...(template.json_data_situation || []),
        ...(template.json_data_business || []),
        ...(template.json_data_layout || [])
      ];

      // 計算匹配數量
      const matchCount = aiSelectedTags.filter(tag => 
        allTemplateTags.includes(tag)
      ).length;

      // 計算可靠度（匹配數量 / AI 推薦標籤總數）
      const reliability = aiSelectedTags.length > 0 
        ? matchCount / aiSelectedTags.length 
        : 0;

      // 只保留有匹配的模板
      if (reliability > 0) {
        matches.push({
          templateId: template.template_id,
          reliability: parseFloat(reliability.toFixed(2)),
          tags: {
            功能: this.filterMatchedTags(aiSelectedTags, template.json_data_function),
            情境: this.filterMatchedTags(aiSelectedTags, template.json_data_situation),
            業務: this.filterMatchedTags(aiSelectedTags, template.json_data_business),
            佈局: this.filterMatchedTags(aiSelectedTags, template.json_data_layout)
          }
        });
      }
    }

    // 按可靠度排序，取前 3 名
    return matches
      .sort((a, b) => b.reliability - a.reliability)
      .slice(0, 3);
  }

  /**
   * 過濾出匹配的標籤
   */
  private filterMatchedTags(aiTags: string[], templateTags?: string[]): string[] | undefined {
    if (!templateTags || templateTags.length === 0) {
      return undefined;
    }

    const matched = aiTags.filter(tag => templateTags.includes(tag));
    return matched.length > 0 ? matched : undefined;
  }
}
