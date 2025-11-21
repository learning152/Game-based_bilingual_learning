/**
 * 日志管理模块
 * 提供统一的日志记录和管理服务
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 日志级别枚举
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// 解析后的日志条目接口
export interface ParsedLogEntry {
  timestamp: Date;
  level: LogLevel;
  levelName: string;
  category: string;
  message: string;
  data?: any;
  rawContent: string;
}

// 日志记录接口定义
export interface LogRecord {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

// 日志配置接口
export interface LoggerConfig {
  level: LogLevel;        // 日志记录的最低级别
  category: string;       // 日志类别
  maxFileSize: number;    // 单个日志文件最大大小（字节）
  maxFiles: number;       // 保留的日志文件最大数量
  bufferSize: number;     // 缓冲区大小，达到此值时写入文件
  flushInterval: number;  // 强制刷新缓冲区的时间间隔（毫秒）
  logDir: string;         // 日志存储目录
}

/**
 * 日志记录器类
 */
export class Logger {
  private config: LoggerConfig;
  private buffer: LogRecord[] = [];
  private currentFile: string;
  private flushTimer: NodeJS.Timeout | null = null;
  private writePromise: Promise<void> | null = null;
  private isWriting: boolean = false;
  private isFlushing: boolean = false;
  private totalWritten: number = 0;
  private fileIndex: number = 0;

  /**
   * 构造函数
   * @param config 日志配置
   */
  constructor(config: Partial<LoggerConfig> = {}) {
    // 默认配置
    this.config = {
      level: LogLevel.DEBUG,
      category: 'app',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      bufferSize: 50,
      flushInterval: 5000,
      logDir: path.join(__dirname, '..', '..', 'logs'),
      ...config
    };

    // 确保日志目录存在
    this.ensureLogDirectory();
    
    // 设置当前日志文件
    this.currentFile = this.getLogFilePath();
    
    // 初始化定时刷新
    this.startFlushTimer();
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.config.logDir)) {
        fs.mkdirSync(this.config.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('创建日志目录失败:', error);
    }
  }

  /**
   * 获取日志文件路径
   */
  private getLogFilePath(): string {
    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return path.join(this.config.logDir, `${this.config.category}_${dateStr}_${this.fileIndex}.log`);
  }

  /**
   * 启动定时刷新定时器
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        console.error('刷新日志缓冲区失败:', err);
      });
    }, this.config.flushInterval);
  }

  /**
   * 停止日志定时器
   */
  public stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // 确保所有日志都写入磁盘
    this.flush().catch(err => {
      console.error('停止日志服务时刷新缓冲区失败:', err);
    });
  }

  /**
   * 记录调试级别日志
   * @param message 日志消息
   * @param data 附加数据
   */
  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * 记录信息级别日志
   * @param message 日志消息
   * @param data 附加数据
   */
  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * 记录警告级别日志
   * @param message 日志消息
   * @param data 附加数据
   */
  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * 记录错误级别日志
   * @param message 日志消息
   * @param data 附加数据
   */
  public error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * 记录致命错误级别日志
   * @param message 日志消息
   * @param data 附加数据
   */
  public fatal(message: string, data?: any): void {
    this.log(LogLevel.FATAL, message, data);
  }

  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   * @param data 附加数据
   */
private log(level: LogLevel, message: string, data?: any): void {
  // 检查日志级别
  if (level < this.config.level) {
    return;
  }

  const record: LogRecord = {
    timestamp: new Date().toISOString(),
    level,
    category: this.config.category,
    message,
    data
  };

  // 简化用户操作日志记录
  if (this.config.category === 'user' && level < LogLevel.WARN) {
    // 只记录简化的用户操作信息
    record.message = `用户操作: ${message}`;
    delete record.data;
  }

  // 添加到缓冲区
  this.buffer.push(record);

  // 如果缓冲区达到设定大小，则刷新
  if (this.buffer.length >= this.config.bufferSize) {
    this.flush().catch(err => {
      console.error('刷新日志缓冲区失败:', err);
    });
  }
}

  /**
   * 刷新日志缓冲区到磁盘
   */
  public async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.isFlushing) {
      return;
    }

    this.isFlushing = true;
    
    try {
      // 获取当前缓冲区的副本并清空
      const records = [...this.buffer];
      this.buffer = [];
      
      // 等待上一次写入完成
      if (this.writePromise) {
        await this.writePromise;
      }
      
      // 执行写入操作
      this.writePromise = this.writeToFile(records);
      await this.writePromise;
    } catch (error) {
      console.error('刷新日志缓冲区错误:', error);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * 将日志记录写入文件
   * @param records 日志记录数组
   */
private async writeToFile(records: LogRecord[]): Promise<void> {
  if (records.length === 0 || this.isWriting) {
    return;
  }

  this.isWriting = true;

  try {
    // 格式化日志记录
    const logContent = records.map(record => {
      const levelStr = LogLevel[record.level];
      const dataStr = record.data ? JSON.stringify(record.data) : '';
      let logLine = `[${record.timestamp}] [${levelStr}] [${record.category}] ${record.message}`;
      
      // 突出显示异常信息
      if (record.level >= LogLevel.ERROR) {
        logLine = `\x1b[31m${logLine}\x1b[0m`; // 红色文本
      } else if (record.level === LogLevel.WARN) {
        logLine = `\x1b[33m${logLine}\x1b[0m`; // 黄色文本
      }
      
      return `${logLine} ${dataStr}`;
    }).join(os.EOL) + os.EOL;
    
    // 检查日志文件大小是否超限
    let fileSize = 0;
    if (fs.existsSync(this.currentFile)) {
      const stats = fs.statSync(this.currentFile);
      fileSize = stats.size;
    }
    
    // 如果文件大小超过限制，创建新文件
    if (fileSize + this.totalWritten + logContent.length > this.config.maxFileSize) {
      this.fileIndex++;
      this.currentFile = this.getLogFilePath();
      this.totalWritten = 0;
      
      // 检查并删除过多的日志文件
      this.cleanupOldLogFiles();
    }
    
    // 异步写入文件
    await fs.promises.appendFile(this.currentFile, logContent, { encoding: 'utf8' });
    this.totalWritten += logContent.length;
  } catch (error) {
    console.error('写入日志文件错误:', error);
    throw error;
  } finally {
    this.isWriting = false;
  }
}

  /**
   * 清理旧的日志文件
   */
  private cleanupOldLogFiles(): void {
    try {
      const files = fs.readdirSync(this.config.logDir)
        .filter(file => file.startsWith(`${this.config.category}_`))
        .map(file => path.join(this.config.logDir, file));
      
      // 按修改时间排序
      const sortedFiles = files.map(file => ({
        file,
        mtime: fs.statSync(file).mtime.getTime()
      })).sort((a, b) => b.mtime - a.mtime);
      
      // 删除超出数量限制的旧文件
      if (sortedFiles.length > this.config.maxFiles) {
        sortedFiles.slice(this.config.maxFiles).forEach(item => {
          try {
            fs.unlinkSync(item.file);
          } catch (err) {
            console.error(`删除旧日志文件失败: ${item.file}`, err);
          }
        });
      }
    } catch (error) {
      console.error('清理旧日志文件错误:', error);
    }
  }

  /**
   * 获取日志级别名称
   * @param level 日志级别
   * @returns 日志级别名称
   */
  public static getLevelName(level: LogLevel): string {
    return LogLevel[level] || 'UNKNOWN';
  }
}

// 创建单例日志记录器
let appLogger: Logger | null = null;
let userLogger: Logger | null = null;
let dataStorageLogger: Logger | null = null;
let aiServiceLogger: Logger | null = null;

/**
 * 获取应用主日志记录器
 */
export function getAppLogger(): Logger {
  if (!appLogger) {
    appLogger = new Logger({
      category: 'app',
      level: LogLevel.ERROR
    });
  }
  return appLogger;
}

/**
 * 获取用户操作日志记录器
 */
export function getUserLogger(): Logger {
  if (!userLogger) {
    userLogger = new Logger({
      category: 'user',
      level: LogLevel.ERROR
    });
  }
  return userLogger;
}

/**
 * 获取数据存储日志记录器
 */
export function getDataStorageLogger(): Logger {
  if (!dataStorageLogger) {
    dataStorageLogger = new Logger({
      category: 'data',
      level: LogLevel.ERROR
    });
  }
  return dataStorageLogger;
}

/**
 * 获取AI服务日志记录器
 */
export function getAiServiceLogger(): Logger {
  if (!aiServiceLogger) {
    aiServiceLogger = new Logger({
      category: 'ai',
      level: LogLevel.ERROR
    });
  }
  return aiServiceLogger;
}

/**
 * 获取性能监控日志记录器
 */
export function getPerformanceLogger(): Logger {
  return new Logger({
    category: 'performance',
    level: LogLevel.INFO
  });
}

/**
 * 获取自定义日志记录器
 * @param config 日志配置
 * @returns 日志记录器实例
 */
export function getLogger(config: Partial<LoggerConfig> = {}): Logger {
  return new Logger(config);
}

// 导出默认日志记录器
export const logger = getAppLogger();