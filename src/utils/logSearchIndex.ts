/**
 * 日志搜索索引工具
 * 提供高效的日志搜索和索引功能
 */
import * as fs from 'fs';
import * as path from 'path';
import { LogLevel, ParsedLogEntry } from './logManager';

interface LogIndex {
  id: string;                    // 日志ID (文件名:行号)
  timestamp: number;             // 时间戳（毫秒）
  level: LogLevel;              // 日志级别
  category: string;             // 分类
  message: string;              // 消息
  data: string;                 // 数据（JSON字符串）
  filePath: string;             // 文件路径
  lineNumber: number;           // 行号
  keywords: string[];           // 提取的关键词
}

interface SearchResult {
  entries: ParsedLogEntry[];
  total: number;
  searchTime: number;
  fromIndex: boolean;
}

interface IndexStats {
  totalEntries: number;
  indexSize: number;
  lastUpdated: Date;
  categories: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
}

/**
 * 日志搜索索引类
 */
export class LogSearchIndex {
  private indexPath: string;
  private logDir: string;
  private index: Map<string, LogIndex> = new Map();
  private keywordIndex: Map<string, Set<string>> = new Map(); // 关键词到日志ID的映射
  private categoryIndex: Map<string, Set<string>> = new Map(); // 分类索引
  private levelIndex: Map<LogLevel, Set<string>> = new Map(); // 级别索引
  private timeIndex: Map<string, Set<string>> = new Map(); // 时间索引（按小时）
  private fileIndex: Map<string, number> = new Map(); // 文件路径到最后修改时间的映射
  private lastIndexUpdate: Date = new Date(0);
  private cache: Map<string, SearchResult> = new Map(); // 搜索结果缓存

  /**
   * 构造函数
   * @param logDir 日志目录
   * @param indexPath 索引文件路径
   */
  constructor(logDir: string = path.join(__dirname, '..', '..', 'logs'), indexPath?: string) {
    this.logDir = logDir;
    this.indexPath = indexPath || path.join(logDir, '.search-index.json');
    this.loadIndex();
  }

  /**
   * 加载索引文件
   */
  private loadIndex(): void {
    try {
      if (fs.existsSync(this.indexPath)) {
        const content = fs.readFileSync(this.indexPath, 'utf8');
        const data = JSON.parse(content);
        
        // 恢复索引数据
        this.index = new Map(data.index || []);
        this.keywordIndex = new Map(
          (data.keywordIndex || []).map(([key, values]: [string, string[]]) => 
            [key, new Set(values)]
          )
        );
        this.categoryIndex = new Map(
          (data.categoryIndex || []).map(([key, values]: [string, string[]]) => 
            [key, new Set(values)]
          )
        );
        this.levelIndex = new Map(
          (data.levelIndex || []).map(([key, values]: [LogLevel, string[]]) => 
            [key, new Set(values)]
          )
        );
        this.timeIndex = new Map(
          (data.timeIndex || []).map(([key, values]: [string, string[]]) => 
            [key, new Set(values)]
          )
        );
        this.lastIndexUpdate = new Date(data.lastIndexUpdate || 0);
        
        console.log(`加载索引完成，共 ${this.index.size} 条记录`);
      }
    } catch (error) {
      console.error('加载索引失败:', error);
      this.resetIndex();
    }
  }

  /**
   * 保存索引文件
   */
  private saveIndex(): void {
    try {
      const data = {
        index: Array.from(this.index.entries()),
        keywordIndex: Array.from(this.keywordIndex.entries()).map(([key, values]) => 
          [key, Array.from(values)]
        ),
        categoryIndex: Array.from(this.categoryIndex.entries()).map(([key, values]) => 
          [key, Array.from(values)]
        ),
        levelIndex: Array.from(this.levelIndex.entries()).map(([key, values]) => 
          [key, Array.from(values)]
        ),
        timeIndex: Array.from(this.timeIndex.entries()).map(([key, values]) => 
          [key, Array.from(values)]
        ),
        lastIndexUpdate: this.lastIndexUpdate.toISOString()
      };

      // 确保目录存在
      const dir = path.dirname(this.indexPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.indexPath, JSON.stringify(data, null, 2));
      console.log(`索引已保存至 ${this.indexPath}`);
    } catch (error) {
      console.error('保存索引失败:', error);
    }
  }

  /**
   * 重置索引
   */
  private resetIndex(): void {
    this.index.clear();
    this.keywordIndex.clear();
    this.categoryIndex.clear();
    this.levelIndex.clear();
    this.timeIndex.clear();
    this.lastIndexUpdate = new Date(0);
  }

  /**
   * 构建或更新索引
   * @param force 是否强制重建索引
   */
  public async buildIndex(force: boolean = false): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log('开始构建日志搜索索引...');
      
      if (force) {
        this.resetIndex();
      }

      // 获取所有日志文件
      const logFiles = this.getLogFiles();
      
      for (const filePath of logFiles) {
        const stats = fs.statSync(filePath);
        const lastModified = stats.mtime.getTime();
        
        // 检查文件是否已经被索引或者有更新
        const fileLastModified = this.fileIndex.get(filePath);
        if (force || !this.fileIndex.has(filePath) || (fileLastModified !== undefined && fileLastModified < lastModified)) {
          await this.indexFile(filePath, force);
          this.fileIndex.set(filePath, lastModified);
        }
      }

      // 移除不再存在的文件的索引
      for (const indexedFile of this.fileIndex.keys()) {
        if (!logFiles.includes(indexedFile)) {
          this.removeFileFromIndex(indexedFile);
        }
      }

      this.lastIndexUpdate = new Date();
      this.saveIndex();
      
      const duration = Date.now() - startTime;
      console.log(`索引构建完成，耗时 ${duration}ms，共索引 ${this.index.size} 条日志`);
    } catch (error) {
      console.error('构建索引失败:', error);
      throw error;
    }
  }

  /**
   * 从索引中移除特定文件的所有条目
   * @param filePath 要移除的文件路径
   */
  private removeFileFromIndex(filePath: string): void {
    const idsToRemove: string[] = [];

    // 查找所有属于该文件的索引条目
    this.index.forEach((value, key) => {
      if (value.filePath === filePath) {
        idsToRemove.push(key);
      }
    });

    // 从所有索引中移除这些条目
    idsToRemove.forEach(id => {
      const entry = this.index.get(id);
      if (entry) {
        this.index.delete(id);
        entry.keywords.forEach(keyword => {
          const keywordSet = this.keywordIndex.get(keyword);
          if (keywordSet) {
            keywordSet.delete(id);
            if (keywordSet.size === 0) {
              this.keywordIndex.delete(keyword);
            }
          }
        });
        const categorySet = this.categoryIndex.get(entry.category);
        if (categorySet) {
          categorySet.delete(id);
          if (categorySet.size === 0) {
            this.categoryIndex.delete(entry.category);
          }
        }
        const levelSet = this.levelIndex.get(entry.level);
        if (levelSet) {
          levelSet.delete(id);
          if (levelSet.size === 0) {
            this.levelIndex.delete(entry.level);
          }
        }
        const timeKey = new Date(entry.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
        const timeSet = this.timeIndex.get(timeKey);
        if (timeSet) {
          timeSet.delete(id);
          if (timeSet.size === 0) {
            this.timeIndex.delete(timeKey);
          }
        }
      }
    });

    this.fileIndex.delete(filePath);
  }

  /**
   * 获取所有日志文件
   */
  private getLogFiles(): string[] {
    try {
      if (!fs.existsSync(this.logDir)) {
        return [];
      }

      return fs.readdirSync(this.logDir)
        .filter(file => file.endsWith('.log'))
        .map(file => path.join(this.logDir, file));
    } catch (error) {
      console.error('获取日志文件失败:', error);
      return [];
    }
  }

  /**
   * 索引单个文件
   * @param filePath 文件路径
   * @param force 是否强制重新索引
   */
  private async indexFile(filePath: string, force: boolean = false): Promise<void> {
    try {
      // 检查文件修改时间
      const stats = fs.statSync(filePath);
      if (!force && stats.mtime <= this.lastIndexUpdate) {
        return; // 文件未修改，跳过
      }

      const content = await fs.promises.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() !== '');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const logEntry = this.parseLine(line);
        
        if (logEntry) {
          const logIndex: LogIndex = {
            id: `${path.basename(filePath)}:${i + 1}`,
            timestamp: logEntry.timestamp.getTime(),
            level: logEntry.level,
            category: logEntry.category,
            message: logEntry.message,
            data: JSON.stringify(logEntry.data || {}),
            filePath,
            lineNumber: i + 1,
            keywords: this.extractKeywords(logEntry)
          };

          this.addToIndex(logIndex);
        }
      }
    } catch (error) {
      console.error(`索引文件失败: ${filePath}`, error);
    }
  }

  /**
   * 添加到索引
   * @param logIndex 日志索引项
   */
  private addToIndex(logIndex: LogIndex): void {
    // 添加到主索引
    this.index.set(logIndex.id, logIndex);

    // 添加到关键词索引
    for (const keyword of logIndex.keywords) {
      if (!this.keywordIndex.has(keyword)) {
        this.keywordIndex.set(keyword, new Set());
      }
      this.keywordIndex.get(keyword)!.add(logIndex.id);
    }

    // 添加到分类索引
    if (!this.categoryIndex.has(logIndex.category)) {
      this.categoryIndex.set(logIndex.category, new Set());
    }
    this.categoryIndex.get(logIndex.category)!.add(logIndex.id);

    // 添加到级别索引
    if (!this.levelIndex.has(logIndex.level)) {
      this.levelIndex.set(logIndex.level, new Set());
    }
    this.levelIndex.get(logIndex.level)!.add(logIndex.id);

    // 添加到时间索引（按小时分组）
    const hourKey = new Date(logIndex.timestamp).toISOString().substring(0, 13); // YYYY-MM-DDTHH
    if (!this.timeIndex.has(hourKey)) {
      this.timeIndex.set(hourKey, new Set());
    }
    this.timeIndex.get(hourKey)!.add(logIndex.id);
  }

  /**
   * 解析日志行
   * @param line 日志行
   */
  private parseLine(line: string): ParsedLogEntry | null {
    try {
      // 解析时间戳
      const timestampMatch = line.match(/\[(.*?)\]/);
      if (!timestampMatch) return null;
      
      const timestamp = new Date(timestampMatch[1]);
      if (isNaN(timestamp.getTime())) return null;

      // 解析日志级别
      const levelMatch = line.match(/\[(\w+)\]\s+\[/);
      if (!levelMatch) return null;
      
      const levelName = levelMatch[1];
      const level = LogLevel[levelName as keyof typeof LogLevel] || LogLevel.INFO;

      // 解析分类
      const categoryMatch = line.match(/\[(\w+)\]\s+/g);
      if (!categoryMatch || categoryMatch.length < 3) return null;
      
      const categoryText = categoryMatch[2].trim();
      const category = categoryText.replace(/[\[\]]/g, '');

      // 提取消息和数据
      const contentPart = line.substring(line.indexOf(categoryText) + categoryText.length).trim();
      
      let message = contentPart;
      let data: any = undefined;
      
      const dataStartIndex = contentPart.indexOf('{');
      if (dataStartIndex > 0) {
        message = contentPart.substring(0, dataStartIndex).trim();
        try {
          const dataJson = contentPart.substring(dataStartIndex);
          data = JSON.parse(dataJson);
        } catch {
          // JSON解析失败，保持原样
        }
      }

      return {
        timestamp,
        level,
        levelName,
        category,
        message,
        data,
        rawContent: line
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 提取关键词
   * @param logEntry 日志条目
   */
  private extractKeywords(logEntry: ParsedLogEntry): string[] {
    const keywords = new Set<string>();

    // 从消息中提取关键词
    const messageWords = logEntry.message
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s]/g, ' ') // 保留字母、数字、中文和空格
      .split(/\s+/)
      .filter(word => word.length > 1); // 过滤单个字符

    messageWords.forEach(word => keywords.add(word));

    // 从数据中提取关键词
    if (logEntry.data) {
      const dataStr = JSON.stringify(logEntry.data).toLowerCase();
      const dataWords = dataStr
        .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1);
      
      dataWords.forEach(word => keywords.add(word));
    }

    // 添加分类和级别作为关键词
    keywords.add(logEntry.category.toLowerCase());
    keywords.add(logEntry.levelName.toLowerCase());

    return Array.from(keywords);
  }

  /**
   * 搜索日志
   * @param query 搜索查询
   */
  public async search(query: {
    keywords?: string[];
    category?: string;
    level?: LogLevel;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<SearchResult> {
    const startTime = Date.now();
    
    try {
      let resultIds = new Set<string>();
      let isFirstFilter = true;

      // 关键词搜索
      if (query.keywords && query.keywords.length > 0) {
        const keywordResults = new Set<string>();
        
        for (const keyword of query.keywords) {
          const ids = this.keywordIndex.get(keyword.toLowerCase()) || new Set();
          if (isFirstFilter) {
            ids.forEach(id => keywordResults.add(id));
            isFirstFilter = false;
          } else {
            // 交集操作
            for (const id of Array.from(keywordResults)) {
              if (!ids.has(id)) {
                keywordResults.delete(id);
              }
            }
          }
        }
        
        resultIds = keywordResults;
      }

      // 分类过滤
      if (query.category) {
        const categoryIds = this.categoryIndex.get(query.category) || new Set();
        if (isFirstFilter) {
          resultIds = categoryIds;
          isFirstFilter = false;
        } else {
          resultIds = new Set(Array.from(resultIds).filter(id => categoryIds.has(id)));
        }
      }

      // 级别过滤
      if (query.level !== undefined) {
        const levelIds = new Set<string>();
        
        // 包含指定级别及以上的所有日志
        for (let level = query.level; level <= LogLevel.FATAL; level++) {
          const ids = this.levelIndex.get(level) || new Set();
          ids.forEach(id => levelIds.add(id));
        }
        
        if (isFirstFilter) {
          resultIds = levelIds;
          isFirstFilter = false;
        } else {
          resultIds = new Set(Array.from(resultIds).filter(id => levelIds.has(id)));
        }
      }

      // 如果没有任何过滤条件，返回所有索引
      if (isFirstFilter) {
        resultIds = new Set(this.index.keys());
      }

      // 时间范围过滤（在内存中进行，因为时间查询较复杂）
      let filteredEntries = Array.from(resultIds)
        .map(id => this.index.get(id)!)
        .filter(logIndex => {
          if (query.startTime && logIndex.timestamp < query.startTime.getTime()) {
            return false;
          }
          if (query.endTime && logIndex.timestamp > query.endTime.getTime()) {
            return false;
          }
          return true;
        });

      // 排序（按时间降序）
      filteredEntries.sort((a, b) => b.timestamp - a.timestamp);

      // 限制数量
      if (query.limit && query.limit > 0) {
        filteredEntries = filteredEntries.slice(0, query.limit);
      }

      // 转换为 ParsedLogEntry 格式
      const entries: ParsedLogEntry[] = filteredEntries.map(logIndex => ({
        timestamp: new Date(logIndex.timestamp),
        level: logIndex.level,
        levelName: LogLevel[logIndex.level],
        category: logIndex.category,
        message: logIndex.message,
        data: logIndex.data ? JSON.parse(logIndex.data) : undefined,
        rawContent: `[${new Date(logIndex.timestamp).toISOString()}] [${LogLevel[logIndex.level]}] [${logIndex.category}] ${logIndex.message}${logIndex.data && logIndex.data !== '{}' ? ' ' + logIndex.data : ''}`
      }));

      const searchTime = Date.now() - startTime;
      
      return {
        entries,
        total: filteredEntries.length,
        searchTime,
        fromIndex: true
      };
    } catch (error) {
      console.error('搜索失败:', error);
      return {
        entries: [],
        total: 0,
        searchTime: Date.now() - startTime,
        fromIndex: true
      };
    }
  }

  /**
   * 获取索引统计信息
   */
  public getStats(): IndexStats {
    const entries = Array.from(this.index.values());
    
    if (entries.length === 0) {
      return {
        totalEntries: 0,
        indexSize: 0,
        lastUpdated: this.lastIndexUpdate,
        categories: [],
        dateRange: {
          start: new Date(),
          end: new Date()
        }
      };
    }

    const timestamps = entries.map(e => e.timestamp);
    const categories = Array.from(new Set(entries.map(e => e.category)));

    return {
      totalEntries: entries.length,
      indexSize: new Blob([JSON.stringify(Array.from(this.index.entries()))]).size,
      lastUpdated: this.lastIndexUpdate,
      categories,
      dateRange: {
        start: new Date(Math.min(...timestamps)),
        end: new Date(Math.max(...timestamps))
      }
    };
  }

  /**
   * 清理索引
   */
  public clearIndex(): void {
    this.resetIndex();
    this.saveIndex();
    console.log('索引已清理');
  }

  /**
   * 定期更新索引
   * @param intervalMinutes 更新间隔（分钟）
   */
  public startAutoUpdate(intervalMinutes: number = 30): NodeJS.Timeout {
    console.log(`启动自动索引更新，间隔: ${intervalMinutes} 分钟`);
    
    return setInterval(async () => {
      try {
        console.log('执行定时索引更新...');
        await this.buildIndex(false);
      } catch (error) {
        console.error('自动索引更新失败:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }
}

// 创建默认搜索索引实例
export const logSearchIndex = new LogSearchIndex();

// 使用示例：
/*
// 构建索引
await logSearchIndex.buildIndex();

// 搜索日志
const result = await logSearchIndex.search({
  keywords: ['用户', '登录'],
  level: LogLevel.INFO,
  startTime: new Date('2024-11-20'),
  limit: 100
});

console.log(`找到 ${result.total} 条日志，搜索耗时 ${result.searchTime}ms`);

// 启动自动更新
const timer = logSearchIndex.startAutoUpdate(30); // 每30分钟更新一次

// 停止自动更新
// clearInterval(timer);
*/