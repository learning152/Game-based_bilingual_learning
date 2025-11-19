/**
 * AI服务连接模块
 * 用于封装与AI服务提供商的API交互
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

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
    this.config = this.loadConfig();
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
    try {
      // 尝试从文件加载配置
      if (fs.existsSync(this.configPath)) {
        const configContent = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(configContent) as AIServiceConfig;
      }

      // 文件不存在，使用环境变量或默认值
      return {
        provider: this.getEnvVariable('AI_SERVICE_PROVIDER', AIServiceProvider.BAIDU_WENXIN) as AIServiceProvider,
        apiKey: this.getEnvVariable('AI_SERVICE_API_KEY', ''),
        apiEndpoint: this.getEnvVariable('AI_SERVICE_ENDPOINT', 'https://qianfan.baidubce.com/v2'),
        model: this.getEnvVariable('AI_SERVICE_MODEL', 'ernie-3.5-8k'),
        maxRetries: parseInt(this.getEnvVariable('AI_SERVICE_MAX_RETRIES', '3')),
        timeout: parseInt(this.getEnvVariable('AI_SERVICE_TIMEOUT', '15000')),
      };
    } catch (error) {
      console.error('加载AI服务配置失败:', error);
      
      // 返回默认配置
      return {
        provider: AIServiceProvider.LOCAL,
        apiKey: '',
        apiEndpoint: '',
        model: 'local-fallback',
        maxRetries: 1,
        timeout: 5000,
      };
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
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
      this.config = config;
      
      // 更新API客户端
      this.client = axios.create({
        baseURL: this.config.apiEndpoint,
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });
      
      return true;
    } catch (error) {
      console.error('保存AI服务配置失败:', error);
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
    if (this.config.provider === AIServiceProvider.LOCAL) {
      return { success: true, message: '本地服务模式，无需测试连接' };
    }
    
    try {
      // 简单的连接测试
      const testParams: AIRequestParams = {
        prompt: '你好，这是一个测试连接请求。请回复"连接成功"。',
        maxTokens: 10
      };
      
      const response = await this.generateContent(testParams);
      
      if (response.success) {
        return {
          success: true,
          message: `连接测试成功。响应内容: ${response.content}`
        };
      } else {
        return {
          success: false,
          message: `连接测试失败: ${response.error}`
        };
      }
    } catch (error) {
      console.error('连接测试失败:', error);
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
    
    // 重试计数器
    let retries = 0;
    
    // 根据提供商格式化请求体
    const requestBody = this.formatRequestByProvider(params);
    
    while (retries <= this.config.maxRetries) {
      try {
        // 如果是本地服务，使用降级策略
        if (this.config.provider === AIServiceProvider.LOCAL) {
          console.log('使用本地降级服务生成内容');
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

        // 请求AI服务
        const response = await this.client.post(apiEndpoint, requestBody);
        
        // 解析响应
        const aiResponse = this.parseResponseByProvider(response.data);
        console.log(`AI内容生成成功，耗时: ${Date.now() - startTime}ms`);
        
        return aiResponse;
      } catch (error) {
        retries++;
        console.error(`AI内容生成请求失败(第${retries}次尝试):`, error);
        
        // 最后一次重试也失败
        if (retries > this.config.maxRetries) {
          console.error('所有重试均失败，启用本地降级服务');
          // 使用本地降级服务
          return await this.generateLocalFallbackContent(params);
        }
        
        // 等待一段时间后重试
        const delay = Math.pow(2, retries) * 1000; // 指数退避策略
        console.log(`等待${delay}ms后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // 不应该走到这里，但为了类型安全
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
    console.log('使用本地降级服务生成内容:', params.prompt);
    
    // 提取关键词并生成基本回复
    const prompt = params.prompt.toLowerCase();
    let response = '';
    
    // 简单的关键词匹配
    if (prompt.includes('翻译') || prompt.includes('translate')) {
      if (prompt.includes('中文') || prompt.includes('chinese')) {
        response = '这是一个简单的中文翻译示例。（本地降级服务）';
      } else if (prompt.includes('英文') || prompt.includes('english')) {
        response = 'This is a simple English translation example. (Local fallback service)';
      } else {
        response = '这是一个翻译示例。This is a translation example. (Local fallback service)';
      }
    }
    else if (prompt.includes('单词') || prompt.includes('word')) {
      response = 'apple, banana, orange, computer, book（本地降级服务提供的简单单词列表）';
    }
    else if (prompt.includes('句子') || prompt.includes('sentence')) {
      response = 'This is a sample sentence. Here is another sample sentence. I like learning languages.（本地降级服务提供的示例句子）';
    }
    else if (prompt.includes('对话') || prompt.includes('conversation')) {
      response = 'A: Hello, how are you?\nB: I\'m fine, thank you. And you?\nA: I\'m good too.（本地降级服务提供的对话示例）';
    }
    else {
      response = '这是本地降级服务提供的默认回复。由于无法连接AI服务，功能受限。';
    }
    
    return {
      success: true,
      content: response,
      usage: {
        promptTokens: params.prompt.length / 4, // 粗略估计
        completionTokens: response.length / 4,  // 粗略估计
        totalTokens: (params.prompt.length + response.length) / 4
      }
    };
  }
}