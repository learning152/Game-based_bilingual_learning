/**
 * AI内容生成管理器
 * 整合AI服务、内容生成器和缓存系统，提供统一的内容生成接口
 */
import { AIService } from './aiService';
import { ContentGenerator, ContentGenerationRequest, ContentGenerationResponse, GeneratedContentItem, ContentType, Language, DifficultyLevel } from './contentGenerator';
import { ContentCache, ContentCacheConfig } from './contentCache';
import { dataStorage } from '../dataStorage';

// AI内容管理器配置
export interface AIContentManagerConfig {
  enableAI: boolean;                // 是否启用AI服务
  cacheConfig: ContentCacheConfig;  // 缓存配置
  defaultFallback: boolean;         // 是否使用默认降级内容
}

/**
 * AI内容生成管理器
 * 统一管理AI内容生成的各个环节
 */
export class AIContentManager {
  private contentGenerator: ContentGenerator;
  private contentCache: ContentCache;
  private config: AIContentManagerConfig;
  private static instance: AIContentManager;

  /**
   * 获取单例实例
   */
  public static getInstance(config?: AIContentManagerConfig): AIContentManager {
    if (!AIContentManager.instance) {
      AIContentManager.instance = new AIContentManager(config);
    } else if (config) {
      AIContentManager.instance.updateConfig(config);
    }
    return AIContentManager.instance;
  }

  /**
   * 构造函数
   * @param config AI内容管理器配置
   */
  private constructor(config?: AIContentManagerConfig) {
    this.config = config || {
      enableAI: true,
      cacheConfig: {
        enabled: true,
        cachePath: './data/ai_cache',
        expirationTime: 7 * 24 * 60 * 60 * 1000, // 7天
        maxCacheSize: 100 * 1024 * 1024, // 100MB
      },
      defaultFallback: true
    };

    this.contentGenerator = ContentGenerator.getInstance();
    this.contentCache = ContentCache.getInstance(this.config.cacheConfig);

    console.log('AI内容生成管理器初始化完成');
  }

  /**
   * 更新配置
   * @param config 新配置
   */
  public updateConfig(config: Partial<AIContentManagerConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.cacheConfig) {
      this.contentCache.updateConfig(config.cacheConfig);
    }
    
    console.log('AI内容管理器配置已更新');
  }

  /**
   * 获取当前配置
   * @returns 当前配置
   */
  public getConfig(): AIContentManagerConfig {
    return { ...this.config };
  }

  /**
   * 生成学习内容
   * @param request 内容生成请求
   * @returns 内容生成响应
   */
  public async generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResponse> {
    try {
      console.log('开始生成学习内容:', request);

      // 首先尝试从缓存获取
      if (this.config.cacheConfig.enabled) {
        const cachedItems = this.contentCache.getFromCache(request);
        if (cachedItems && cachedItems.length > 0) {
          console.log(`从缓存获取到 ${cachedItems.length} 个内容项`);
          return {
            success: true,
            items: cachedItems
          };
        }
      }

      // 缓存未命中，使用AI生成内容
      if (this.config.enableAI) {
        const response = await this.contentGenerator.generateContent(request);
        
        if (response.success && response.items.length > 0) {
          // 验证内容质量
          const validation = this.contentGenerator.validateContent(response.items);
          if (validation.valid) {
            // 保存到缓存
            if (this.config.cacheConfig.enabled) {
              this.contentCache.saveToCache(request, response.items);
            }
            
            console.log(`AI生成内容成功: ${response.items.length} 个项目`);
            return response;
          } else {
            console.warn('AI生成内容质量验证失败:', validation.message);
            // 使用降级方案
            return this.generateFallbackContent(request);
          }
        } else {
          console.warn('AI生成内容失败:', response.error);
          // 使用降级方案
          return this.generateFallbackContent(request);
        }
      } else {
        console.log('AI服务已禁用，使用降级方案');
        return this.generateFallbackContent(request);
      }
    } catch (error) {
      console.error('生成学习内容时发生错误:', error);
      
      // 发生错误时使用降级方案
      if (this.config.defaultFallback) {
        return this.generateFallbackContent(request);
      } else {
        return {
          success: false,
          items: [],
          error: error instanceof Error ? error.message : '内容生成失败'
        };
      }
    }
  }

  /**
   * 生成降级内容（当AI服务不可用时使用）
   * @param request 内容生成请求
   * @returns 内容生成响应
   */
  private generateFallbackContent(request: ContentGenerationRequest): ContentGenerationResponse {
    console.log('使用降级方案生成内容:', request.contentType);
    
    const count = request.count || 5;
    const items: GeneratedContentItem[] = [];
    
    // 根据内容类型生成基础内容
    switch (request.contentType) {
      case ContentType.WORD:
        for (let i = 0; i < count; i++) {
          items.push({
            id: `fallback_word_${Date.now()}_${i}`,
            type: ContentType.WORD,
            content: this.getFallbackWords()[i % this.getFallbackWords().length],
            translation: this.getFallbackWordTranslations()[i % this.getFallbackWordTranslations().length],
            hint: '这是降级服务提供的示例单词',
            difficulty: request.difficulty
          });
        }
        break;
        
      case ContentType.TRANSLATION:
        for (let i = 0; i < count; i++) {
          const phrases = this.getFallbackTranslationPhrases();
          const translations = this.getFallbackTranslations();
          items.push({
            id: `fallback_translation_${Date.now()}_${i}`,
            type: ContentType.TRANSLATION,
            content: phrases[i % phrases.length],
            translation: translations[i % translations.length],
            hint: '这是降级服务提供的翻译练习',
            difficulty: request.difficulty
          });
        }
        break;
        
      case ContentType.SENTENCE:
        for (let i = 0; i < count; i++) {
          const sentences = this.getFallbackSentences();
          items.push({
            id: `fallback_sentence_${Date.now()}_${i}`,
            type: ContentType.SENTENCE,
            content: sentences[i % sentences.length],
            translation: '这是一个示例句子的翻译',
            hint: '这是降级服务提供的示例句子',
            difficulty: request.difficulty
          });
        }
        break;
        
      default:
        // 默认生成简单的学习内容
        for (let i = 0; i < count; i++) {
          items.push({
            id: `fallback_default_${Date.now()}_${i}`,
            type: request.contentType,
            content: `示例内容 ${i + 1}`,
            translation: `Sample content ${i + 1}`,
            hint: '这是降级服务提供的默认内容',
            difficulty: request.difficulty
          });
        }
    }
    
    console.log(`降级方案生成了 ${items.length} 个内容项`);
    
    return {
      success: true,
      items: items
    };
  }

  /**
   * 获取降级单词列表
   */
  private getFallbackWords(): string[] {
    return [
      'hello', 'world', 'computer', 'learning', 'language',
      'apple', 'book', 'water', 'house', 'friend',
      'family', 'school', 'teacher', 'student', 'study'
    ];
  }

  /**
   * 获取降级单词翻译列表
   */
  private getFallbackWordTranslations(): string[] {
    return [
      '你好', '世界', '电脑', '学习', '语言',
      '苹果', '书', '水', '房子', '朋友',
      '家庭', '学校', '老师', '学生', '研究'
    ];
  }

  /**
   * 获取降级翻译短语列表
   */
  private getFallbackTranslationPhrases(): string[] {
    return [
      '你好，很高兴见到你',
      '今天天气很好',
      '我正在学习英语',
      '这本书很有趣',
      '我们去公园吧'
    ];
  }

  /**
   * 获取降级翻译列表
   */
  private getFallbackTranslations(): string[] {
    return [
      'Hello, nice to meet you',
      'The weather is very good today',
      'I am learning English',
      'This book is very interesting',
      'Let\'s go to the park'
    ];
  }

  /**
   * 获取降级句子列表
   */
  private getFallbackSentences(): string[] {
    return [
      'This is a sample sentence for learning.',
      'I like to read books in my free time.',
      'Learning a new language takes patience.',
      'Practice makes perfect in language learning.',
      'Communication is the key to understanding.'
    ];
  }

  /**
   * 清除特定请求的缓存
   * @param request 内容生成请求
   * @returns 是否清除成功
   */
  public clearCache(request: ContentGenerationRequest): boolean {
    if (!this.config.cacheConfig.enabled) {
      console.log('缓存未启用，无需清除');
      return false;
    }
    
    return this.contentCache.invalidateCache(request);
  }

  /**
   * 清除所有缓存
   * @returns 是否清除成功
   */
  public clearAllCache(): boolean {
    if (!this.config.cacheConfig.enabled) {
      console.log('缓存未启用，无需清除');
      return false;
    }
    
    return this.contentCache.clearAllCache();
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计信息
   */
  public getCacheStats() {
    if (!this.config.cacheConfig.enabled) {
      return null;
    }
    
    return this.contentCache.getStats();
  }

  /**
   * 测试AI服务连接
   * @returns 连接测试结果
   */
  public async testAIConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const aiService = AIService.getInstance();
      return await aiService.testConnection();
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '连接测试失败'
      };
    }
  }

  /**
   * 为现有课程生成AI增强内容
   * @param courseId 课程ID
   * @returns 生成结果
   */
  public async enhanceCourseWithAI(courseId: string): Promise<{ success: boolean; message: string; itemsGenerated?: number }> {
    try {
      console.log(`开始为课程 ${courseId} 生成AI增强内容`);
      
      // 从数据存储中获取课程信息
      const courseData = dataStorage.readData('courses', courseId);
      if (!courseData) {
        return { success: false, message: '课程不存在' };
      }
      
      // 安全地访问课程属性
      const course = courseData as any;
      const courseLanguage = course.language === 'english' ? Language.ENGLISH : Language.CHINESE;
      const courseTitle = course.title || '基础学习';
      
      // 根据课程信息生成内容请求
      const requests: ContentGenerationRequest[] = [
        {
          contentType: ContentType.WORD,
          language: courseLanguage,
          difficulty: DifficultyLevel.BEGINNER,
          topic: courseTitle,
          count: 10
        },
        {
          contentType: ContentType.TRANSLATION,
          language: courseLanguage,
          difficulty: DifficultyLevel.BEGINNER,
          topic: courseTitle,
          count: 5
        }
      ];
      
      let totalGenerated = 0;
      
      for (const request of requests) {
        const response = await this.generateContent(request);
        if (response.success) {
          totalGenerated += response.items.length;
          
          // 将生成的内容保存为新的课程文件
          const lessonId = `ai_enhanced_${courseId}_${request.contentType}_${Date.now()}`;
          const lessonContent = JSON.stringify(response.items);
          
          const lesson = {
            id: lessonId,
            title: `AI增强内容 - ${request.contentType}`,
            content: lessonContent,
            difficulty: request.difficulty,
            type: 'vocabulary',
            language: courseLanguage === Language.ENGLISH ? 'english' : 'chinese'
          };
          
          dataStorage.writeData('lessons', lessonId, lesson);
          console.log(`保存AI增强课程: ${lessonId}`);
        }
      }
      
      return {
        success: true,
        message: `成功为课程 ${courseId} 生成AI增强内容`,
        itemsGenerated: totalGenerated
      };
    } catch (error) {
      console.error('生成AI增强课程失败:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '生成失败'
      };
    }
  }
}