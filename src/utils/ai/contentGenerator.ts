/**
 * 内容生成器模块
 * 用于生成各类学习内容（单词、短语、句子、练习题等）
 */
import { AIService, AIRequestParams, AIResponse } from './aiService';

// 内容类型枚举
export enum ContentType {
  WORD = 'word',                    // 单词
  PHRASE = 'phrase',                // 短语
  SENTENCE = 'sentence',            // 句子
  TRANSLATION = 'translation',      // 翻译练习
  CONVERSATION = 'conversation',    // 对话
  GRAMMAR = 'grammar',              // 语法练习
}

// 难度级别枚举
export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

// 语言类型枚举
export enum Language {
  ENGLISH = 'english',
  CHINESE = 'chinese',
}

// 内容生成请求参数
export interface ContentGenerationRequest {
  contentType: ContentType;
  language: Language;
  difficulty: DifficultyLevel;
  topic?: string;                   // 主题（可选）
  count?: number;                   // 生成数量（默认5个）
  context?: string;                 // 上下文信息（可选）
}

// 生成的内容项
export interface GeneratedContentItem {
  id: string;
  type: ContentType;
  content: string;
  translation?: string;
  hint?: string;
  difficulty: DifficultyLevel;
  metadata?: {
    [key: string]: any;
  };
}

// 内容生成响应
export interface ContentGenerationResponse {
  success: boolean;
  items: GeneratedContentItem[];
  error?: string;
}

/**
 * 内容生成器类
 * 负责根据请求参数生成学习内容
 */
export class ContentGenerator {
  private aiService: AIService;
  private static instance: ContentGenerator;

  /**
   * 获取单例实例
   */
  public static getInstance(): ContentGenerator {
    if (!ContentGenerator.instance) {
      ContentGenerator.instance = new ContentGenerator();
    }
    return ContentGenerator.instance;
  }

  /**
   * 构造函数
   */
  private constructor() {
    this.aiService = AIService.getInstance();
  }

  /**
   * 生成学习内容
   * @param request 内容生成请求
   * @returns 内容生成响应
   */
  public async generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResponse> {
    try {
      console.log('开始生成学习内容:', request);
      
      // 构建提示词
      const prompt = this.buildPrompt(request);
      
      // 调用AI服务生成内容
      const aiParams: AIRequestParams = {
        prompt: prompt,
        maxTokens: this.calculateMaxTokens(request),
        temperature: 0.7,
      };
      
      const aiResponse: AIResponse = await this.aiService.generateContent(aiParams);
      
      if (!aiResponse.success) {
        return {
          success: false,
          items: [],
          error: aiResponse.error || '内容生成失败'
        };
      }
      
      // 解析AI响应，提取内容
      const items = this.parseAIResponse(aiResponse.content, request);
      
      console.log(`成功生成 ${items.length} 个内容项`);
      
      return {
        success: true,
        items: items
      };
    } catch (error) {
      console.error('内容生成过程中出现错误:', error);
      return {
        success: false,
        items: [],
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 构建提示词
   * @param request 内容生成请求
   * @returns 提示词字符串
   */
  private buildPrompt(request: ContentGenerationRequest): string {
    const count = request.count || 5;
    const topic = request.topic || '日常生活';
    const context = request.context || '';
    
    let prompt = '';
    
    switch (request.contentType) {
      case ContentType.WORD:
        prompt = this.buildWordPrompt(request.language, request.difficulty, topic, count, context);
        break;
        
      case ContentType.PHRASE:
        prompt = this.buildPhrasePrompt(request.language, request.difficulty, topic, count, context);
        break;
        
      case ContentType.SENTENCE:
        prompt = this.buildSentencePrompt(request.language, request.difficulty, topic, count, context);
        break;
        
      case ContentType.TRANSLATION:
        prompt = this.buildTranslationPrompt(request.language, request.difficulty, topic, count, context);
        break;
        
      case ContentType.CONVERSATION:
        prompt = this.buildConversationPrompt(request.language, request.difficulty, topic, count, context);
        break;
        
      case ContentType.GRAMMAR:
        prompt = this.buildGrammarPrompt(request.language, request.difficulty, topic, count, context);
        break;
        
      default:
        prompt = `请生成 ${count} 个适合${this.getDifficultyText(request.difficulty)}学习者的${topic}相关的学习内容。`;
    }
    
    return prompt;
  }

  /**
   * 构建单词类型的提示词
   */
  private buildWordPrompt(language: Language, difficulty: DifficultyLevel, topic: string, count: number, context: string): string {
    const difficultyText = this.getDifficultyText(difficulty);
    const languageText = language === Language.ENGLISH ? '英语' : '中文';
    
    return `请生成 ${count} 个适合${difficultyText}${languageText}学习者的${topic}主题单词。
要求：
1. 每个单词需提供${languageText === '英语' ? '中文' : '英文'}翻译
2. 提供简短的使用提示或例句
3. 标注难度级别
4. 按JSON数组格式输出，每个单词包含：word（单词）, translation（翻译）, hint（提示）, difficulty（难度）
${context ? `\n补充背景：${context}` : ''}

示例格式：
[
  {
    "word": "apple",
    "translation": "苹果",
    "hint": "一种常见的红色或绿色水果",
    "difficulty": "beginner"
  }
]`;
  }

  /**
   * 构建短语类型的提示词
   */
  private buildPhrasePrompt(language: Language, difficulty: DifficultyLevel, topic: string, count: number, context: string): string {
    const difficultyText = this.getDifficultyText(difficulty);
    const languageText = language === Language.ENGLISH ? '英语' : '中文';
    
    return `请生成 ${count} 个适合${difficultyText}${languageText}学习者的${topic}主题常用短语。
要求：
1. 每个短语提供${languageText === '英语' ? '中文' : '英文'}翻译
2. 提供使用场景说明
3. 标注难度级别
4. 按JSON数组格式输出
${context ? `\n补充背景：${context}` : ''}`;
  }

  /**
   * 构建句子类型的提示词
   */
  private buildSentencePrompt(language: Language, difficulty: DifficultyLevel, topic: string, count: number, context: string): string {
    const difficultyText = this.getDifficultyText(difficulty);
    const languageText = language === Language.ENGLISH ? '英语' : '中文';
    
    return `请生成 ${count} 个适合${difficultyText}${languageText}学习者的${topic}主题实用句子。
要求：
1. 句子需符合实际使用场景
2. 提供${languageText === '英语' ? '中文' : '英文'}翻译
3. 标注难度级别
4. 按JSON数组格式输出
${context ? `\n补充背景：${context}` : ''}`;
  }

  /**
   * 构建翻译类型的提示词
   */
  private buildTranslationPrompt(language: Language, difficulty: DifficultyLevel, topic: string, count: number, context: string): string {
    const difficultyText = this.getDifficultyText(difficulty);
    const sourceLanguage = language === Language.ENGLISH ? '中文' : '英文';
    const targetLanguage = language === Language.ENGLISH ? '英语' : '中文';
    
    return `请生成 ${count} 个适合${difficultyText}学习者的${topic}主题翻译练习题。
要求：
1. 提供${sourceLanguage}原文
2. 提供标准${targetLanguage}译文
3. 可选择性提供翻译提示
4. 按JSON数组格式输出，每项包含：source（原文）, target（译文）, hint（提示，可选）
${context ? `\n补充背景：${context}` : ''}`;
  }

  /**
   * 构建对话类型的提示词
   */
  private buildConversationPrompt(language: Language, difficulty: DifficultyLevel, topic: string, count: number, context: string): string {
    const difficultyText = this.getDifficultyText(difficulty);
    const languageText = language === Language.ENGLISH ? '英语' : '中文';
    
    return `请生成 ${count} 组适合${difficultyText}${languageText}学习者的${topic}主题对话练习。
要求：
1. 每组对话包含2-4轮对话
2. 对话内容贴近实际场景
3. 提供对话的翻译和使用场景说明
4. 按JSON数组格式输出
${context ? `\n补充背景：${context}` : ''}`;
  }

  /**
   * 构建语法类型的提示词
   */
  private buildGrammarPrompt(language: Language, difficulty: DifficultyLevel, topic: string, count: number, context: string): string {
    const difficultyText = this.getDifficultyText(difficulty);
    const languageText = language === Language.ENGLISH ? '英语' : '中文';
    
    return `请生成 ${count} 个适合${difficultyText}${languageText}学习者的${topic}相关语法练习题。
要求：
1. 包含语法知识点说明
2. 提供练习题和答案
3. 提供解析说明
4. 按JSON数组格式输出
${context ? `\n补充背景：${context}` : ''}`;
  }

  /**
   * 获取难度级别的中文文本
   */
  private getDifficultyText(difficulty: DifficultyLevel): string {
    switch (difficulty) {
      case DifficultyLevel.BEGINNER:
        return '初级';
      case DifficultyLevel.INTERMEDIATE:
        return '中级';
      case DifficultyLevel.ADVANCED:
        return '高级';
      default:
        return '初级';
    }
  }

  /**
   * 计算最大token数
   */
  private calculateMaxTokens(request: ContentGenerationRequest): number {
    const count = request.count || 5;
    const baseTokens = 200; // 每个内容项的基础token数
    return baseTokens * count + 500; // 额外500用于格式化
  }

  /**
   * 解析AI响应，提取内容
   * @param responseContent AI返回的内容
   * @param request 原始请求
   * @returns 生成的内容项数组
   */
  private parseAIResponse(responseContent: string, request: ContentGenerationRequest): GeneratedContentItem[] {
    try {
      // 尝试直接解析JSON
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0]);
        return parsedData.map((item: any, index: number) => ({
          id: `${request.contentType}_${Date.now()}_${index}`,
          type: request.contentType,
          content: item.word || item.phrase || item.sentence || item.source || item.content || '',
          translation: item.translation || item.target || '',
          hint: item.hint || '',
          difficulty: request.difficulty,
          metadata: item
        }));
      }
      
      // 如果无法解析JSON，尝试按行分割
      console.warn('无法解析JSON格式，尝试按行分割内容');
      const lines = responseContent.split('\n').filter(line => line.trim().length > 0);
      
      return lines.slice(0, request.count || 5).map((line, index) => ({
        id: `${request.contentType}_${Date.now()}_${index}`,
        type: request.contentType,
        content: line.trim(),
        translation: '',
        hint: '',
        difficulty: request.difficulty,
        metadata: {}
      }));
    } catch (error) {
      console.error('解析AI响应失败:', error);
      return [];
    }
  }

  /**
   * 验证生成的内容质量
   * @param items 生成的内容项
   * @returns 验证结果
   */
  public validateContent(items: GeneratedContentItem[]): { valid: boolean; message: string } {
    if (items.length === 0) {
      return { valid: false, message: '未生成任何内容' };
    }
    
    // 检查每个内容项是否有有效内容
    const invalidItems = items.filter(item => !item.content || item.content.trim().length === 0);
    if (invalidItems.length > 0) {
      return { valid: false, message: `有 ${invalidItems.length} 个内容项为空` };
    }
    
    return { valid: true, message: '内容验证通过' };
  }
}