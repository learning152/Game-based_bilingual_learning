/**
 * 日志查看工具
 * 提供日志查询、过滤和分析功能
 */
import * as fs from 'fs';
import * as path from 'path';
import { LogLevel, ParsedLogEntry } from './logManager';

// 日志查询参数接口
export interface LogQueryParams {
  category?: string;        // 日志类别
  level?: LogLevel;         // 最低日志级别
  startTime?: Date;         // 开始时间
  endTime?: Date;           // 结束时间
  keywords?: string[];      // 关键词
  limit?: number;           // 最大返回条数
  page?: number;            // 分页页码
  pageSize?: number;        // 每页条数
}

// 日志查询结果接口
export interface LogQueryResult {
  logs: ParsedLogEntry[];   // 日志条目
  total: number;            // 总条数
  page: number;             // 当前页码
  pageSize: number;         // 每页条数
  totalPages: number;       // 总页数
}

/**
 * 日志查看器类
 */
export class LogViewer {
  private logDir: string;

  /**
   * 构造函数
   * @param logDir 日志目录路径
   */
  constructor(logDir: string = './logs') {
    this.logDir = logDir;
  }

  /**
   * 查询日志
   * @param params 查询参数
   * @returns 查询结果
   */
  public async queryLogs(params: LogQueryParams = {}): Promise<LogQueryResult> {
    const {
      category,
      level = LogLevel.DEBUG,
      startTime,
      endTime,
      keywords = [],
      limit = 1000,
      page = 1,
      pageSize = 50
    } = params;

    // 获取所有日志文件
    const logFiles = this.getLogFiles(category);

    // 读取并解析日志
    let allLogs: ParsedLogEntry[] = [];
    
    for (const file of logFiles) {
      if (allLogs.length >= limit) break;

      const logs = await this.parseLogFile(file, level, startTime, endTime, keywords);
      allLogs = [...allLogs, ...logs];
      
      if (allLogs.length >= limit) {
        allLogs = allLogs.slice(0, limit);
        break;
      }
    }

    // 按时间降序排序
    allLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 计算分页
    const total = allLogs.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, total);
    const pagedLogs = allLogs.slice(start, end);

    return {
      logs: pagedLogs,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  /**
   * 获取日志文件列表
   * @param category 日志类别
   * @returns 日志文件路径数组
   */
  private getLogFiles(category?: string): string[] {
    try {
      if (!fs.existsSync(this.logDir)) {
        return [];
      }

      let files = fs.readdirSync(this.logDir)
        .filter(file => file.endsWith('.log'));

      // 根据类别过滤
      if (category) {
        files = files.filter(file => file.startsWith(`${category}_`));
      }

      // 按修改时间排序（最新的在前）
      return files
        .map(file => ({
          path: path.join(this.logDir, file),
          mtime: fs.statSync(path.join(this.logDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.mtime - a.mtime)
        .map(file => file.path);
    } catch (error) {
      console.error('获取日志文件失败:', error);
      return [];
    }
  }

  /**
   * 解析日志文件
   * @param filePath 文件路径
   * @param minLevel 最低日志级别
   * @param startTime 开始时间
   * @param endTime 结束时间
   * @param keywords 关键词
   * @returns 解析后的日志条目数组
   */
  private async parseLogFile(
    filePath: string,
    minLevel: LogLevel = LogLevel.DEBUG,
    startTime?: Date,
    endTime?: Date,
    keywords: string[] = []
  ): Promise<ParsedLogEntry[]> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() !== '');

      return lines
        .map(line => this.parseLine(line))
        .filter(entry => {
          if (!entry) return false;

          // 级别过滤
          if (entry.level < minLevel) return false;

          // 时间范围过滤
          if (startTime && entry.timestamp < startTime) return false;
          if (endTime && entry.timestamp > endTime) return false;

          // 关键词过滤
          if (keywords.length > 0) {
            const contentLower = entry.rawContent.toLowerCase();
            return keywords.some(keyword => 
              contentLower.includes(keyword.toLowerCase())
            );
          }

          return true;
        }) as ParsedLogEntry[];
    } catch (error) {
      console.error(`解析日志文件失败: ${filePath}`, error);
      return [];
    }
  }

  /**
   * 解析单行日志
   * @param line 日志行文本
   * @returns 解析后的日志条目，解析失败返回null
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
      
      // 尝试从内容中分离消息和JSON数据
      const dataStartIndex = contentPart.indexOf('{');
      
      let message = contentPart;
      let data: any = undefined;
      
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
      console.error('解析日志行失败:', error, line);
      return null;
    }
  }

  /**
   * 获取日志类别列表
   * @returns 类别数组
   */
  public getCategories(): string[] {
    try {
      if (!fs.existsSync(this.logDir)) {
        return [];
      }

      const categorySet = new Set<string>();
      
      fs.readdirSync(this.logDir)
        .filter(file => file.endsWith('.log'))
        .forEach(file => {
          const parts = file.split('_');
          if (parts.length > 0) {
            categorySet.add(parts[0]);
          }
        });

      return Array.from(categorySet);
    } catch (error) {
      console.error('获取日志类别失败:', error);
      return [];
    }
  }

  /**
   * 导出日志到指定文件
   * @param logs 日志条目数组
   * @param outputPath 输出文件路径
   * @param format 输出格式 ('json' | 'csv' | 'txt')
   */
  public async exportLogs(
    logs: ParsedLogEntry[],
    outputPath: string,
    format: 'json' | 'csv' | 'txt' = 'json'
  ): Promise<boolean> {
    try {
      let content = '';
      
      switch (format) {
        case 'json':
          content = JSON.stringify(logs, null, 2);
          break;
        
        case 'csv':
          content = 'Timestamp,Level,Category,Message,Data\n';
          content += logs.map(log => {
            const timestamp = log.timestamp.toISOString();
            const level = log.levelName;
            const category = log.category;
            const message = `"${log.message.replace(/"/g, '""')}"`;
            const data = log.data ? `"${JSON.stringify(log.data).replace(/"/g, '""')}"` : '';
            return `${timestamp},${level},${category},${message},${data}`;
          }).join('\n');
          break;
        
        case 'txt':
        default:
          content = logs.map(log => log.rawContent).join('\n');
          break;
      }

      await fs.promises.writeFile(outputPath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error('导出日志失败:', error);
      return false;
    }
  }

  /**
   * 分析日志统计信息
   * @param logs 日志条目数组
   * @returns 统计信息
   */
  public analyzeStats(logs: ParsedLogEntry[]): {
    levelStats: Record<string, number>;
    categoryStats: Record<string, number>;
    hourlyDistribution: Record<number, number>;
    topErrors: { message: string; count: number }[];
  } {
    const levelStats: Record<string, number> = {};
    const categoryStats: Record<string, number> = {};
    const hourlyDistribution: Record<number, number> = {};
    const errorMessages: Record<string, number> = {};

    logs.forEach(log => {
      // 级别统计
      const levelName = log.levelName;
      levelStats[levelName] = (levelStats[levelName] || 0) + 1;

      // 分类统计
      categoryStats[log.category] = (categoryStats[log.category] || 0) + 1;

      // 小时分布
      const hour = log.timestamp.getHours();
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;

      // 错误消息统计
      if (log.level >= LogLevel.ERROR) {
        const errorKey = log.message.substring(0, 100); // 截取前100个字符作为键
        errorMessages[errorKey] = (errorMessages[errorKey] || 0) + 1;
      }
    });

    // 获取前10个最常见的错误
    const topErrors = Object.entries(errorMessages)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      levelStats,
      categoryStats,
      hourlyDistribution,
      topErrors
    };
  }
}

// 导出单例实例
export const logViewer = new LogViewer();