/**
 * 实时日志查看工具
 * 提供日志文件的实时监控和流式读取功能
 */
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { ParsedLogEntry, LogLevel } from './logManager';
import { logViewer } from './logViewer';

interface RealtimeLogOptions {
  logDir: string;          // 日志目录
  category?: string;       // 日志类别
  minLevel?: LogLevel;     // 最低日志级别
  keywords?: string[];     // 过滤关键词
  maxLines?: number;       // 最大读取行数（缓冲区大小）
  pollInterval?: number;   // 轮询间隔（毫秒）
}

/**
 * 实时日志查看器类
 */
export class RealtimeLogViewer extends EventEmitter {
  private options: RealtimeLogOptions;
  private watchedFile: string | null = null;
  private watcher: fs.FSWatcher | null = null;
  private filePosition: number = 0;
  private buffer: ParsedLogEntry[] = [];
  private pollTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * 构造函数
   * @param options 实时日志选项
   */
  constructor(options: Partial<RealtimeLogOptions> = {}) {
    super();
    
    this.options = {
      logDir: './logs',
      minLevel: LogLevel.INFO,
      maxLines: 1000,
      pollInterval: 1000,
      ...options
    };
  }

  /**
   * 获取最新的日志文件
   * @returns 日志文件路径
   */
  private getLatestLogFile(): string | null {
    try {
      if (!fs.existsSync(this.options.logDir)) {
        return null;
      }

      let files = fs.readdirSync(this.options.logDir)
        .filter(file => file.endsWith('.log'));

      // 根据类别过滤
      if (this.options.category) {
        files = files.filter(file => file.startsWith(`${this.options.category}_`));
      }

      if (files.length === 0) {
        return null;
      }

      // 按修改时间排序（最新的在前）
      const sortedFiles = files
        .map(file => ({
          name: file,
          path: path.join(this.options.logDir, file),
          mtime: fs.statSync(path.join(this.options.logDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.mtime - a.mtime);

      return sortedFiles[0].path;
    } catch (error) {
      console.error('获取最新日志文件失败:', error);
      return null;
    }
  }

  /**
   * 开始监控日志文件
   */
  public start(): void {
    if (this.isRunning) {
      console.log('实时日志监控已经在运行中');
      return;
    }

    this.isRunning = true;

    // 获取最新的日志文件
    const latestFile = this.getLatestLogFile();
    if (!latestFile) {
      console.warn('未找到符合条件的日志文件');
      this.emit('error', new Error('未找到符合条件的日志文件'));
      return;
    }

    this.watchFile(latestFile);
    this.startPolling();

    console.log(`开始监控日志文件: ${latestFile}`);
    this.emit('start', latestFile);
  }

  /**
   * 停止监控日志文件
   */
  public stop(): void {
    this.isRunning = false;

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.watchedFile = null;
    this.filePosition = 0;

    console.log('停止日志监控');
    this.emit('stop');
  }

  /**
   * 监控指定的日志文件
   * @param filePath 文件路径
   */
  private watchFile(filePath: string): void {
    // 关闭之前的监控
    if (this.watcher) {
      this.watcher.close();
    }

    this.watchedFile = filePath;
    this.filePosition = this.getFileSize(filePath);

    // 设置文件监控
    try {
      this.watcher = fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
          this.readNewContent();
        }
      });

      // 监控目录，检测是否有新的日志文件创建
      const dirPath = path.dirname(filePath);
      fs.watch(dirPath, (eventType, filename) => {
        if (eventType === 'rename' && filename && filename.endsWith('.log')) {
          // 检查是否应该切换到新文件
          this.checkForFileRotation();
        }
      });
    } catch (error) {
      console.error('设置文件监控失败:', error);
      this.emit('error', error);
    }
  }

  /**
   * 检查是否需要切换到新的日志文件
   */
  private checkForFileRotation(): void {
    const latestFile = this.getLatestLogFile();
    if (latestFile && latestFile !== this.watchedFile) {
      console.log(`日志文件已轮转，切换到新文件: ${latestFile}`);
      this.watchFile(latestFile);
      this.emit('rotation', latestFile);
    }
  }

  /**
   * 获取文件大小
   * @param filePath 文件路径
   * @returns 文件大小（字节）
   */
  private getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      console.error(`获取文件大小失败: ${filePath}`, error);
      return 0;
    }
  }

  /**
   * 读取文件新增的内容
   */
  private readNewContent(): void {
    if (!this.watchedFile) return;

    try {
      const currentSize = this.getFileSize(this.watchedFile);
      
      // 检查文件是否被截断（如手动清空或日志轮转）
      if (currentSize < this.filePosition) {
        this.filePosition = 0;
        this.emit('truncate', this.watchedFile);
      }

      // 如果文件有新内容
      if (currentSize > this.filePosition) {
        const stream = fs.createReadStream(this.watchedFile, {
          start: this.filePosition,
          end: currentSize - 1
        });

        let content = '';

        stream.on('data', (chunk) => {
          content += chunk.toString();
        });

        stream.on('end', () => {
          this.filePosition = currentSize;
          this.processNewContent(content);
        });

        stream.on('error', (error) => {
          console.error('读取文件流失败:', error);
          this.emit('error', error);
        });
      }
    } catch (error) {
      console.error('读取新内容失败:', error);
      this.emit('error', error);
    }
  }

  /**
   * 处理新的日志内容
   * @param content 新内容
   */
  private processNewContent(content: string): void {
    if (!content.trim()) return;

    const lines = content.split('\n').filter(line => line.trim() !== '');
    const parsedEntries: ParsedLogEntry[] = [];

    for (const line of lines) {
      try {
        // 借用 logViewer 的解析方法
        const parsedLine = this.parseLine(line);
        
        if (parsedLine) {
          // 根据选项过滤
          if (this.shouldIncludeEntry(parsedLine)) {
            parsedEntries.push(parsedLine);
            this.buffer.push(parsedLine);
          }
        }
      } catch (error) {
        console.error('处理日志行失败:', error, line);
      }
    }

    // 保持缓冲区大小在限制内
    if (this.buffer.length > this.options.maxLines!) {
      this.buffer = this.buffer.slice(this.buffer.length - this.options.maxLines!);
    }

    // 有新的日志条目，触发事件
    if (parsedEntries.length > 0) {
      this.emit('logs', parsedEntries);
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
   * 判断日志条目是否应该包含在结果中
   * @param entry 日志条目
   * @returns 是否应该包含
   */
  private shouldIncludeEntry(entry: ParsedLogEntry): boolean {
    // 级别过滤
    if (entry.level < (this.options.minLevel ?? LogLevel.DEBUG)) {
      return false;
    }

    // 关键词过滤
    if (this.options.keywords && this.options.keywords.length > 0) {
      const content = `${entry.message} ${JSON.stringify(entry.data || {})}`.toLowerCase();
      return this.options.keywords.some(keyword => 
        content.includes(keyword.toLowerCase())
      );
    }

    return true;
  }

  /**
   * 启动轮询定时器
   * 主要用于检测文件轮转和变更，作为文件监控的补充
   */
  private startPolling(): void {
    this.pollTimer = setInterval(() => {
      if (!this.isRunning) return;

      // 检查文件是否存在
      if (this.watchedFile && !fs.existsSync(this.watchedFile)) {
        console.log('监控的文件已不存在，尝试切换到新文件');
        this.checkForFileRotation();
        return;
      }

      // 检查是否有新内容（某些情况下文件监控可能失效）
      this.readNewContent();
      
      // 检查是否有新的日志文件
      this.checkForFileRotation();
    }, this.options.pollInterval);
  }

  /**
   * 获取当前缓冲区中的所有日志
   * @returns 日志条目数组
   */
  public getBuffer(): ParsedLogEntry[] {
    return [...this.buffer];
  }

  /**
   * 清空缓冲区
   */
  public clearBuffer(): void {
    this.buffer = [];
    this.emit('clear');
  }

  /**
   * 更改过滤选项
   * @param options 新的选项
   */
  public updateOptions(options: Partial<RealtimeLogOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
    
    // 如果分类变更，需要重新获取文件
    if (options.category !== undefined) {
      const wasRunning = this.isRunning;
      if (wasRunning) {
        this.stop();
      }
      
      if (wasRunning) {
        this.start();
      }
    }
    
    console.log('实时日志选项已更新');
    this.emit('options-updated', this.options);
  }
}

// 创建默认的实时日志查看器实例
export const realtimeLogViewer = new RealtimeLogViewer();

// 使用示例：
/*
// 开始监控应用日志
realtimeLogViewer.updateOptions({
  category: 'app',
  minLevel: LogLevel.INFO
});

realtimeLogViewer.onLogs((logs) => {
  logs.forEach(log => {
    console.log(`[${log.timestamp.toLocaleString()}] [${log.levelName}] ${log.message}`);
  });
});

realtimeLogViewer.start();

// 停止监控
// realtimeLogViewer.stop();
*/