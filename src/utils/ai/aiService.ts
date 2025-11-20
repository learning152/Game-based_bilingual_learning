/**
 * AI服务连接模块
 * 用于封装与AI服务提供商的API交互
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { getAiServiceLogger } from '../logManager';

// 获取AI服务日志记录器
const aiLogger = getAiServiceLogger();

// AI服务提供商类型
export enum AIServiceProvider {
  OPENAI = 'openai',
  BAIDU_WENXIN = 'baidu_wenxin', // 百度文心一言
  LOCAL = 'local', // 本地降级服务
}

// AI服务配置接口
export interface AIServiceConfig {
  provider: AIServiceProvider;
  apiKey: string;
  apiEndpoint: string;
  model: string;
  maxRetries: number;
  timeout: number;
}

// AI请求参数接口
export interface AIRequestParams {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// AI响应接口
export interface AIResponse {
  success: boolean;
  content: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * AI服务类
 * 封装与AI服务提供商的交互逻辑
 */
export class AIService {
  private config: AIServiceConfig;
  private client: AxiosInstance;
  private configPath: string;
  private static instance: AIService;

  /**
   * 获取单例实例
   */
  public static getInstance(configPath: string = './config/ai-service.json'): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService(configPath);
    }
    return AIService.instance;
  }

  /**
   * 构造函数
   * @param configPath AI服务配置文件路径
   */
  private constructor(configPath: string) {
    this.configPath = configPath;
    aiLogger.info('初始化AI服务', { configPath });
    this.config = this.loadConfig();
    
    aiLogger.debug('创建API客户端', { 
      provider: this.config.provider,
      endpoint: this.config.apiEndpoint,
      model: this.config.model
    });
    
    this.client = axios.create({
      baseURL: this.config.apiEndpoint,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      }
    });
  }

  /**
   * 加载AI服务配置
   * @returns AI服务配置对象
   */
  private loadConfig(): AIServiceConfig {
    aiLogger.debug('开始加载AI服务配置', { configPath: this.configPath });
    
    try {
      // 尝试从文件加载配置
      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, 'utf-8');
        const config = JSON.parse(configContent) as AIServiceConfig;
        aiLogger.info('从配置文件加载成功', { 
          provider: config.provider,
          model: config.model,
          configPath: this.configPath
        });
        return config;
      }

      aiLogger.warn('配置文件不存在，使用环境变量或默认值', { configPath: this.configPath });
      
      // 文件不存在，使用环境变量或默认值
      const config = {
        provider: this.getEnvVariable('AI_SERVICE_PROVIDER', AIServiceProvider.BAIDU_WENXIN) as AIServiceProvider,
        apiKey: this.getEnvVariable('AI_SERVICE_API_KEY', ''),
        apiEndpoint: this.getEnvVariable('AI_SERVICE_ENDPOINT', 'https://qianfan.baidubce.com/v2'),
        model: this.getEnvVariable('AI_SERVICE_MODEL', 'ernie-3.5-8k'),
        maxRetries: parseInt(this.getEnvVariable('AI_SERVICE_MAX_RETRIES', '3')),
        timeout: parseInt(this.getEnvVariable('AI_SERVICE_TIMEOUT', '15000')),
      };
      
      aiLogger.info('使用环境变量配置AI服务', { 
        provider: config.provider,
        model: config.model
      });
      
      return config;
    } catch (error) {
      aiLogger.error('加载AI服务配置失败', {
        configPath: this.configPath,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // 返回默认配置
      const fallbackConfig = {
        provider: AIServiceProvider.LOCAL,
        apiKey: '',
        apiEndpoint: '',
        model: 'local-fallback',
        maxRetries: 1,
        timeout: 5000,
      };
      
      aiLogger.warn('使用本地降级配置', { 
        provider: fallbackConfig.provider,
        model: fallbackConfig.model
      });
      
      return fallbackConfig;
    }
  }

  /**
   * 获取环境变量值，如不存在则返回默认值
   * @param name 环境变量名
   * @param defaultValue 默认值
   * @returns 环境变量值或默认值
   */
  private getEnvVariable(name: string, defaultValue: string): string {
    return process.env[name] || defaultValue;
  }

  /**
   * 保存AI服务配置到文件
   * @param config AI服务配置
   * @returns 是否保存成功
   */
  public saveConfig(config: AIServiceConfig): boolean {
    aiLogger.info('尝试保存AI服务配置', { 
      provider: config.provider,
      model: config.model,
      configPath: this.configPath
    });
    
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        aiLogger.debug('创建配置目录', { configDir });
      }
      
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      this.config = config;
      
      // 更新API客户端
      aiLogger.debug('更新API客户端', {
        endpoint: config.apiEndpoint,
        timeout: config.timeout
      });
      
      this.client = axios.create({
        baseURL: this.config.apiEndpoint,
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      
      aiLogger.info('AI服务配置保存成功', { configPath: this.configPath });
      return true;
    } catch (error) {
      aiLogger.error('保存AI服务配置失败', {
        configPath: this.configPath,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return false;
    }
  }

  /**
   * 获取当前AI服务配置
   * @returns 当前AI服务配置
   */
  public getConfig(): AIServiceConfig {
    return { ...this.config };
  }

  /**
   * 测试AI服务连接
   * @returns 连接测试结果
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    aiLogger.info('开始测试AI服务连接', { 
      provider: this.config.provider,
      endpoint: this.config.apiEndpoint,
      model: this.config.model
    });
    
    if (this.config.provider === AIServiceProvider.LOCAL) {
      aiLogger.info('本地服务模式，无需测试连接');
      return { success: true, message: '本地服务模式，无需测试连接' };
    }
    
    try {
      // 简单的连接测试
      const testParams: AIRequestParams = {
        prompt: '你好，这是一个测试连接请求。请回复"连接成功"。',
        maxTokens: 10
      };
      
      aiLogger.debug('发送测试请求', { prompt: testParams.prompt });
      const response = await this.generateContent(testParams);
      const duration = Date.now() - startTime;
      
      if (response.success) {
        aiLogger.info('连接测试成功', { 
          responseContent: response.content,
          duration: `${duration}ms`
        });
        
        return {
          success: true,
          message: `连接测试成功。响应内容: ${response.content}`
        };
      } else {
        aiLogger.error('连接测试失败', { 
          error: response.error,
          duration: `${duration}ms`
        });
        
        return {
          success: false,
          message: `连接测试失败: ${response.error}`
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      aiLogger.error('连接测试发生异常', {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return {
        success: false,
        message: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 生成内容
   * @param params 请求参数
   * @returns AI响应
   */
  public async generateContent(params: AIRequestParams): Promise<AIResponse> {
    // 记录开始时间，用于计算请求时间
    const startTime = Date.now();
    
    // 打印安全过滤后的请求参数
    const promptFirstChars = params.prompt.length > 50 ? 
      params.prompt.substring(0, 50) + '...' : params.prompt;
    
    aiLogger.info('开始生成AI内容', { 
      provider: this.config.provider,
      model: this.config.model,
      promptPreview: promptFirstChars,
      promptLength: params.prompt.length,
      maxTokens: params.maxTokens,
      temperature: params.temperature
    });
    
    // 重试计数器
    let retries = 0;
    
    // 根据提供商格式化请求体
    const requestBody = this.formatRequestByProvider(params);
    aiLogger.debug('格式化请求体', { 
      provider: this.config.provider,
      requestBodySize: JSON.stringify(requestBody).length
    });
    
    while (retries <= this.config.maxRetries) {
      try {
        // 如果是本地服务，使用降级策略
        if (this.config.provider === AIServiceProvider.LOCAL) {
          aiLogger.info('使用本地降级服务生成内容');
          return await this.generateLocalFallbackContent(params);
        }

        // 根据提供商选择API端点
        let apiEndpoint = '';
        switch (this.config.provider) {
          case AIServiceProvider.OPENAI:
            apiEndpoint = '/chat/completions';
            break;
          case AIServiceProvider.BAIDU_WENXIN:
            apiEndpoint = '/chat/completions';
            break;
          default:
            apiEndpoint = '/chat/completions';
        }
        
        aiLogger.debug('发送API请求', { 
          endpoint: apiEndpoint,
          attempt: retries + 1
        });

        // 请求AI服务
        const response = await this.client.post(apiEndpoint, requestBody);
        
        // 解析响应
        const aiResponse = this.parseResponseByProvider(response.data);
        const duration = Date.now() - startTime;
        
        aiLogger.info('AI内容生成成功', { 
          responseLength: aiResponse.content.length,
          duration: `${duration}ms`,
          usage: aiResponse.usage
        });
        
        return aiResponse;
      } catch (error) {
        retries++;
        
        aiLogger.error(`AI内容生成请求失败`, {
          attempt: retries,
          provider: this.config.provider,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        
        // 最后一次重试也失败
        if (retries > this.config.maxRetries) {
          aiLogger.warn('所有重试均失败，启用本地降级服务', {
            maxRetries: this.config.maxRetries,
            provider: this.config.provider
          });
          
          // 使用本地降级服务
          return await this.generateLocalFallbackContent(params);
        }
        
        // 等待一段时间后重试
        const delay = Math.pow(2, retries) * 1000; // 指数退避策略
        aiLogger.debug(`等待后重试`, {
          delay: `${delay}ms`,
          nextAttempt: retries + 1
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // 不应该走到这里，但为了类型安全
    aiLogger.error('意外逻辑错误：请求处理异常', {
      retries,
      maxRetries: this.config.maxRetries
    });
    
    return {
      success: false,
      content: '',
      error: '意外错误：请求处理逻辑错误'
    };
  }

  /**
   * 根据提供商格式化请求体
   * @param params 请求参数
   * @returns 格式化后的请求体
   */
  private formatRequestByProvider(params: AIRequestParams): any {
    switch (this.config.provider) {
      case AIServiceProvider.OPENAI:
        return {
          model: this.config.model,
          messages: [{ role: 'user', content: params.prompt }],
          max_tokens: params.maxTokens || 1000,
          temperature: params.temperature || 0.7,
          top_p: params.topP || 1.0,
          frequency_penalty: params.frequencyPenalty || 0.0,
          presence_penalty: params.presencePenalty || 0.0
        };
        
      case AIServiceProvider.BAIDU_WENXIN:
        return {
          model: this.config.model || 'ernie-3.5-8k',
          messages: [{ role: 'user', content: params.prompt }],
          temperature: params.temperature || 0.7,
          top_p: params.topP || 1.0,
          max_tokens: params.maxTokens || 1000,
          extra_body: {
            web_search: {
              enable: false,
              enable_citation: false,
              enable_trace: false
            }
          }
        };
        
      default:
        return {
          prompt: params.prompt,
          max_tokens: params.maxTokens || 1000
        };
    }
  }
  
  /**
   * 根据提供商解析响应
   * @param responseData 响应数据
   * @returns 统一格式的AI响应
   */
  private parseResponseByProvider(responseData: any): AIResponse {
    switch (this.config.provider) {
      case AIServiceProvider.OPENAI:
        return {
          success: true,
          content: responseData.choices[0].message.content,
          usage: {
            promptTokens: responseData.usage.prompt_tokens,
            completionTokens: responseData.usage.completion_tokens,
            totalTokens: responseData.usage.total_tokens
          }
        };
        
      case AIServiceProvider.BAIDU_WENXIN:
        return {
          success: true,
          content: responseData.choices[0].message.content,
          usage: {
            promptTokens: responseData.usage?.prompt_tokens || 0,
            completionTokens: responseData.usage?.completion_tokens || 0,
            totalTokens: responseData.usage?.total_tokens || 0
          }
        };
        
      default:
        return {
          success: true,
          content: responseData.text || responseData.content || '',
          usage: responseData.usage
        };
    }
  }

  /**
   * 生成本地降级内容（当AI服务不可用时使用）
   * @param params 请求参数
   * @returns AI响应
   */
  private async generateLocalFallbackContent(params: AIRequestParams): Promise<AIResponse> {
    // 这里实现一个简单的规则引擎，根据提示词提供基本的回复
    const startTime = Date.now();
    const promptPreview = params.prompt.length > 50 ? 
      params.prompt.substring(0, 50) + '...' : params.prompt;
    
    aiLogger.info('使用本地降级服务生成内容', { 
      promptPreview,
      promptLength: params.prompt.length
    });
    
    // 提取关键词并生成基本回复
    const prompt = params.prompt.toLowerCase();
    let response = '';
    
    // 简单的关键词匹配
    if (prompt.includes('翻译') || prompt.includes('translate')) {
      if (prompt.includes('中文') || prompt.includes('chinese')) {
        response = '这是一个简单的中文翻译示例。（本地降级服务）';
        aiLogger.debug('触发中文翻译规则');
      } else if (prompt.includes('英文') || prompt.includes('english')) {
        response = 'This is a simple English translation example. (Local fallback service)';
        aiLogger.debug('触发英文翻译规则');
      } else {
        response = '这是一个翻译示例。This is a translation example. (Local fallback service)';
        aiLogger.debug('触发通用翻译规则');
      }
    }
    else if (prompt.includes('单词') || prompt.includes('word')) {
      response = 'apple, banana, orange, computer, book（本地降级服务提供的简单单词列表）';
      aiLogger.debug('触发单词列表规则');
    }
    else if (prompt.includes('句子') || prompt.includes('sentence')) {
      response = 'This is a sample sentence. Here is another sample sentence. I like learning languages.（本地降级服务提供的示例句子）';
      aiLogger.debug('触发句子示例规则');
    }
    else if (prompt.includes('对话') || prompt.includes('conversation')) {
      response = 'A: Hello, how are you?\nB: I\'m fine, thank you. And you?\nA: I\'m good too.（本地降级服务提供的对话示例）';
      aiLogger.debug('触发对话示例规则');
    }
    else {
      response = '这是本地降级服务提供的默认回复。由于无法连接AI服务，功能受限。';
      aiLogger.debug('触发默认回复规则');
    }
    
    const usage = {
      promptTokens: params.prompt.length / 4, // 粗略估计
      completionTokens: response.length / 4,  // 粗略估计
      totalTokens: (params.prompt.length + response.length) / 4
    };
    
    const duration = Date.now() - startTime;
    aiLogger.info('本地降级内容生成完成', { 
      responseLength: response.length,
      duration: `${duration}ms`,
      usage
    });
    
    return {
      success: true,
      content: response,
      usage
    };
  }
}