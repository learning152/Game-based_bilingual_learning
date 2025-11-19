/**
 * AI生成内容缓存系统
 * 用于缓存AI生成的内容，减少API调用，提高响应速度
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { GeneratedContentItem, ContentGenerationRequest } from './contentGenerator';

// 缓存配置接口
export interface ContentCacheConfig {
  enabled: boolean;              // 是否启用缓存
  cachePath: string;             // 缓存目录路径
  expirationTime: number;        // 缓存过期时间（毫秒）
  maxCacheSize: number;          // 最大缓存大小（字节）
}

// 缓存项接口
interface CacheItem {
  key: string;
  items: GeneratedContentItem[];
  createdAt: number;
  request: ContentGenerationRequest;
}

// 缓存统计接口
export interface CacheStats {
  totalItems: number;
  cacheHits: number;
  cacheMisses: number;
  totalSize: number;
  oldestItemAge: number;
}

/**
 * 内容缓存管理器
 */
export class ContentCache {
  private config: ContentCacheConfig;
  private stats: CacheStats;
  private static instance: ContentCache;

  /**
   * 获取单例实例
   */
  public static getInstance(config?: ContentCacheConfig): ContentCache {
    if (!ContentCache.instance) {
      ContentCache.instance = new ContentCache(config);
    } else if (config) {
      ContentCache.instance.updateConfig(config);
    }
    return ContentCache.instance;
  }

  /**
   * 构造函数
   * @param config 缓存配置
   */
  private constructor(config?: ContentCacheConfig) {
    this.config = config || {
      enabled: true,
      cachePath: path.join('./data', 'ai_cache'),
      expirationTime: 7 * 24 * 60 * 60 * 1000, // 7天
      maxCacheSize: 100 * 1024 * 1024, // 100MB
    };
    
    this.stats = {
      totalItems: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalSize: 0,
      oldestItemAge: 0
    };
    
    this.initializeCache();
  }

  /**
   * 更新缓存配置
   * @param config 新的缓存配置
   */
  public updateConfig(config: Partial<ContentCacheConfig>): void {
    this.config = { ...this.config, ...config };
    this.initializeCache();
  }

  /**
   * 初始化缓存目录
   */
  private initializeCache(): void {
    if (!this.config.enabled) {
      console.log('内容缓存系统已禁用');
      return;
    }
    
    try {
      // 确保缓存目录存在
      if (!fs.existsSync(this.config.cachePath)) {
        fs.mkdirSync(this.config.cachePath, { recursive: true });
        console.log(`创建缓存目录: ${this.config.cachePath}`);
      }
      
      // 加载缓存统计信息
      this.loadCacheStats();
      
      // 清理过期缓存
      this.cleanExpiredCache();
      
      console.log('内容缓存系统初始化完成');
    } catch (error) {
      console.error('缓存系统初始化失败:', error);
      this.config.enabled = false; // 禁用缓存
    }
  }

  /**
   * 加载缓存统计信息
   */
  private loadCacheStats(): void {
    try {
      let totalSize = 0;
      let oldestTime = Date.now();
      let totalItems = 0;
      
      const files = fs.readdirSync(this.config.cachePath);
      
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.config.cachePath, file);
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
          oldestTime = Math.min(oldestTime, stats.mtimeMs);
          totalItems++;
        }
      });
      
      this.stats = {
        totalItems,
        cacheHits: 0,
        cacheMisses: 0,
        totalSize,
        oldestItemAge: Date.now() - oldestTime
      };
      
      console.log(`缓存统计: ${totalItems}个项目, 总大小: ${(totalSize/1024/1024).toFixed(2)}MB`);
    } catch (error) {
      console.error('加载缓存统计信息失败:', error);
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    if (!this.config.enabled) return;
    
    try {
      const now = Date.now();
      const files = fs.readdirSync(this.config.cachePath);
      let deletedCount = 0;
      
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.config.cachePath, file);
          const stats = fs.statSync(filePath);
          
          // 检查是否过期
          if (now - stats.mtimeMs > this.config.expirationTime) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
      });
      
      if (deletedCount > 0) {
        console.log(`已清理 ${deletedCount} 个过期缓存项`);
        this.loadCacheStats(); // 重新加载统计信息
      }
      
      // 如果缓存总大小超过限制，清理最旧的缓存
      if (this.stats.totalSize > this.config.maxCacheSize) {
        this.cleanOldestCache();
      }
    } catch (error) {
      console.error('清理过期缓存失败:', error);
    }
  }

  /**
   * 清理最旧的缓存，直到总大小低于限制
   */
  private cleanOldestCache(): void {
    try {
      const files = fs.readdirSync(this.config.cachePath)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.config.cachePath, file);
          const stats = fs.statSync(filePath);
          return {
            file,
            filePath,
            mtime: stats.mtimeMs,
            size: stats.size
          };
        })
        .sort((a, b) => a.mtime - b.mtime); // 按修改时间排序
      
      let deletedCount = 0;
      let deletedSize = 0;
      
      while (this.stats.totalSize - deletedSize > this.config.maxCacheSize && files.length > 0) {
        const oldestFile = files.shift();
        if (oldestFile) {
          fs.unlinkSync(oldestFile.filePath);
          deletedCount++;
          deletedSize += oldestFile.size;
        }
      }
      
      if (deletedCount > 0) {
        console.log(`已清理 ${deletedCount} 个最旧的缓存项，释放 ${(deletedSize/1024/1024).toFixed(2)}MB 空间`);
        this.stats.totalSize -= deletedSize;
        this.stats.totalItems -= deletedCount;
      }
    } catch (error) {
      console.error('清理旧缓存失败:', error);
    }
  }

  /**
   * 生成缓存键
   * @param request 内容生成请求
   * @returns 缓存键
   */
  private generateCacheKey(request: ContentGenerationRequest): string {
    // 移除可能变化但不影响内容生成结果的字段
    const { context, ...essentialParams } = request;
    
    // 将对象转换为排序后的JSON字符串
    const requestString = JSON.stringify(essentialParams, Object.keys(essentialParams).sort());
    
    // 使用SHA256生成哈希
    return crypto.createHash('sha256').update(requestString).digest('hex');
  }

  /**
   * 获取缓存路径
   * @param cacheKey 缓存键
   * @returns 缓存文件路径
   */
  private getCachePath(cacheKey: string): string {
    return path.join(this.config.cachePath, `${cacheKey}.json`);
  }

  /**
   * 从缓存中获取内容
   * @param request 内容生成请求
   * @returns 缓存的内容项数组，如果缓存未命中则返回null
   */
  public getFromCache(request: ContentGenerationRequest): GeneratedContentItem[] | null {
    if (!this.config.enabled) return null;
    
    try {
      const cacheKey = this.generateCacheKey(request);
      const cachePath = this.getCachePath(cacheKey);
      
      if (!fs.existsSync(cachePath)) {
        this.stats.cacheMisses++;
        return null;
      }
      
      const stats = fs.statSync(cachePath);
      const now = Date.now();
      
      // 检查是否过期
      if (now - stats.mtimeMs > this.config.expirationTime) {
        fs.unlinkSync(cachePath); // 删除过期缓存
        this.stats.cacheMisses++;
        return null;
      }
      
      // 读取缓存
      const cacheContent = fs.readFileSync(cachePath, 'utf-8');
      const cacheItem: CacheItem = JSON.parse(cacheContent);
      
      // 更新缓存访问时间
      fs.utimesSync(cachePath, new Date(), new Date());
      
      this.stats.cacheHits++;
      console.log(`缓存命中: ${cacheKey}`);
      
      return cacheItem.items;
    } catch (error) {
      console.error('从缓存获取内容失败:', error);
      this.stats.cacheMisses++;
      return null;
    }
  }

  /**
   * 将内容保存到缓存
   * @param request 内容生成请求
   * @param items 生成的内容项数组
   * @returns 是否保存成功
   */
  public saveToCache(request: ContentGenerationRequest, items: GeneratedContentItem[]): boolean {
    if (!this.config.enabled) return false;
    
    try {
      const cacheKey = this.generateCacheKey(request);
      const cachePath = this.getCachePath(cacheKey);
      
      const cacheItem: CacheItem = {
        key: cacheKey,
        items,
        createdAt: Date.now(),
        request
      };
      
      // 将缓存项写入文件
      const cacheContent = JSON.stringify(cacheItem, null, 2);
      fs.writeFileSync(cachePath, cacheContent, 'utf-8');
      
      // 更新统计信息
      const fileSize = Buffer.byteLength(cacheContent);
      this.stats.totalSize += fileSize;
      this.stats.totalItems++;
      
      console.log(`缓存保存: ${cacheKey}, 大小: ${(fileSize/1024).toFixed(2)}KB`);
      
      return true;
    } catch (error) {
      console.error('保存内容到缓存失败:', error);
      return false;
    }
  }

  /**
   * 清除特定请求的缓存
   * @param request 内容生成请求
   * @returns 是否清除成功
   */
  public invalidateCache(request: ContentGenerationRequest): boolean {
    if (!this.config.enabled) return false;
    
    try {
      const cacheKey = this.generateCacheKey(request);
      const cachePath = this.getCachePath(cacheKey);
      
      if (fs.existsSync(cachePath)) {
        const stats = fs.statSync(cachePath);
        fs.unlinkSync(cachePath);
        
        // 更新统计信息
        this.stats.totalSize -= stats.size;
        this.stats.totalItems--;
        
        console.log(`缓存已清除: ${cacheKey}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('清除缓存失败:', error);
      return false;
    }
  }

  /**
   * 清除所有缓存
   * @returns 是否清除成功
   */
  public clearAllCache(): boolean {
    if (!this.config.enabled) return false;
    
    try {
      const files = fs.readdirSync(this.config.cachePath);
      
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.config.cachePath, file));
        }
      });
      
      // 重置统计信息
      this.stats = {
        totalItems: 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalSize: 0,
        oldestItemAge: 0
      };
      
      console.log('所有缓存已清除');
      return true;
    } catch (error) {
      console.error('清除所有缓存失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计信息
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }
}