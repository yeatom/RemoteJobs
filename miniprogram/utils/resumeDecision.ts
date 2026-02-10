import { ui } from './ui';

export type DecisionScenario = 'GENERATE_SCAN' | 'GENERATE_TEXT' | 'REFINE' | 'PROFILE_UPDATE';

export interface DecisionConfig {
  title: string;
  content: string;
  confirmText: string;
  cancelText: string;
  detectedLang: 'chinese' | 'english';
}

export const ResumeDecision = {
  /**
   * Analyze text content to determine language
   * Rule: > 60% Chinese characters (excluding code blocks/symbols) -> Chinese
   */
  analyzeTextLanguage(text: string): 'chinese' | 'english' {
    if (!text) return 'english'; // Default

    // 1. Remove code blocks (```...```)
    let cleanText = text.replace(/```[\s\S]*?```/g, '');
    
    // 2. Remove common special characters/punctuations to focus on words
    cleanText = cleanText.replace(/[0-9\s\r\n`~!@#$%^&*()_+\-=\[\]{};':",./<>?|]/g, '');

    if (cleanText.length === 0) return 'english';

    // 3. Count Chinese characters
    const chineseMatches = cleanText.match(/[\u4e00-\u9fa5]/g);
    const chineseCount = chineseMatches ? chineseMatches.length : 0;
    
    // 4. Calculate ratio
    const ratio = chineseCount / cleanText.length;

    return ratio > 0.6 ? 'chinese' : 'english';
  },

  /**
   * Get Modal Configuration based on scenario and detected language
   */
  getDecisionConfig(scenario: DecisionScenario, detectedLang: 'chinese' | 'english'): DecisionConfig {
    const isCn = detectedLang === 'chinese';
    const langName = isCn ? '中文' : '英文'; // English
    const otherName = isCn ? '英文' : '中文'; // Chinese

    let config: DecisionConfig = {
      title: '',
      content: '',
      confirmText: '', // Right button (Recommended)
      cancelText: '',  // Left button (Alternative)
      detectedLang
    };

    switch (scenario) {
      case 'GENERATE_SCAN': // 1. 截图生成
      case 'GENERATE_TEXT': // 2. 文字生成
        config.title = isCn ? '生成确认' : 'Generation Confirm';
        
        // Content: "Detected [Lang] content. Generate [Lang] resume?"
        if (scenario === 'GENERATE_TEXT') {
            config.content = isCn 
              ? '检测到您的职位要求主要是中文。建议生成中文简历以获得最佳匹配。'
              : 'Detected English content. We recommend generating an English resume.';
        } else {
             config.content = isCn 
              ? '识别到中文简历内容。建议生成中文简历。'
              : 'Detected English resume content. We recommend generating an English resume.';
        }

        // Right (Confirm): Same Lang
        config.confirmText = isCn ? '生成中文版' : 'Gen English';
        // Left (Cancel): Cross Lang
        config.cancelText = isCn ? '生成英文版' : 'Gen Chinese';
        break;

      case 'REFINE': // 3. 简历润色
        config.title = isCn ? '润色模式' : 'Refine Mode';
        config.content = isCn
          ? '检测到中文简历。建议进行中文润色与增强。'
          : 'Detected English resume. We recommend English refinement.';
        
        // Right (Confirm): Same Lang
        config.confirmText = isCn ? '中文润色' : 'Enhance (EN)';
        // Left (Cancel): Cross Lang
        config.cancelText = isCn ? '英文润色' : 'Enhance (CN)';
        break;

      case 'PROFILE_UPDATE': // 4. 更新资料
        config.title = isCn ? '解析成功' : 'Parse Success';
        config.content = isCn
          ? '已提取中文资料。推荐同步更新生成双语档案，以便投递不同外企职位。'
          : 'English profile extracted. Recommend updating both versions for international opportunities.';
        
        // Right (Confirm): Combined
        config.confirmText = isCn ? '更新中英双语' : 'Update Both';
        // Left (Cancel): Single ("仅更新当前语言" - as per user request, mapping strictly to detected isn't exactly "current", but usually aligns or is treated as 'force single')
        // Correction: User said "Left: Only update current language". 
        // But here we rely on detected. If detected is CN, we say "Update CN Only". 
        // Logic: if detected is CN, single update means update CN.
        config.cancelText = isCn ? '仅更新中文' : 'Update EN Only';    
        break;
    }

    return config;
  },

  /**
   * Execute the decision flow: Show Modal -> Wait User Input -> Return Result
   */
  async decide(scenario: DecisionScenario, detectedLang: 'chinese' | 'english'): Promise<string | null> {
    const config = this.getDecisionConfig(scenario, detectedLang);
    
    return new Promise((resolve) => {
      ui.showModal({
        title: config.title,
        content: config.content,
        confirmText: config.confirmText,
        cancelText: config.cancelText,
        showCancel: true,
        success: (res) => {
          if (res.confirm) {
            // Right Button: Always "Recommended/Combined/SameLang"
            if (scenario === 'PROFILE_UPDATE') {
              resolve('combined');
            } else {
              resolve(detectedLang);
            }
          } else if (res.cancel) {
            // Left Button: Always "Alternative/Single/CrossLang"
            if (scenario === 'PROFILE_UPDATE') {
              resolve('single');
            } else {
              // Swap language
              const otherLang = detectedLang === 'english' ? 'chinese' : 'english';
              resolve(otherLang);
            }
          } else {
             // Dismissed
             resolve(null);
          }
        },
        fail: () => resolve(null)
      });
    });
  }
};
