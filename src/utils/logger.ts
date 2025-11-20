import fs from 'fs';
import path from 'path';

// 日志级别枚举
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// 日志配置接口
interface LoggerConfig {
  logLevel?: LogLevel;
  logDir?: string;
  maxFileSize?: number; // 单个日志文件最大大小（字节）
  maxFiles?: number; // 保留的日志文件最大数量
  enableAsync?: boolean; // 是否启用异步写入
  bufferSize?: number; // 缓冲区大小
  sensitiveFields?: string[]; // 需要过滤的敏感字段
}

// 日志条目接口
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
}

class Logger {
  private logLevel: LogLevel;
  private logDir: string;
  private currentLogFile: string;
  private maxFileSize: number;
  private maxFiles: number;
  private enableAsync: boolean;
  private bufferSize: number;
  private sensitiveFields: string[];
  private logBuffer: LogEntry[];
  private writeTimer: NodeJS.Timeout | null;

  constructor(config: LoggerConfig = {}) {
    this.logLevel = config.logLevel ?? LogLevel.INFO;
    this.logDir = config.logDir ?? 'logs';
    this.maxFileSize = config.maxFileSize ?? 10 * 1024 * 1024; // 默认10MB
    this.maxFiles = config.maxFiles ?? 7; // 默认保留7个日志文件
    this.enableAsync = config.enableAsync ?? true;
    this.bufferSize = config.bufferSize ?? 100;
    this.sensitiveFields = config.sensitiveFields ?? ['password', 'token', 'secret', 'apiKey'];
    this.logBuffer = [];
    this.writeTimer = null;
    this.currentLogFile = this.getLogFileName();
    this.ensureLogDirectoryExists();
    
    // 如果启用异步写入，设置定时刷新
    if (this.enableAsync) {
      this.startBufferFlush();
    }
  }

  // 获取日志文件名（按日期）
  private getLogFileName(): string {
    const date = new Date();
    return `log_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.log`;
  }

  // 确保日志目录存在
  private ensureLogDirectoryExists(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // 格式化日志消息
  private formatMessage(entry: LogEntry): string {
    let metadataStr = '';
    if (entry.metadata) {
      const filteredMetadata = this.filterSensitiveData(entry.metadata);
      metadataStr = ` | ${JSON.stringify(filteredMetadata)}`;
    }
    return `[${entry.timestamp}] [${entry.level}] ${entry.message}${metadataStr}\n`;
  }

  // 过滤敏感信息
  private filterSensitiveData(data: Record<string, any>): Record<string, any> {
    const filtered = { ...data };
    for (const field of this.sensitiveFields) {
      if (field in filtered) {
        filtered[field] = '***FILTERED***';
      }
    }
    return filtered;
  }

  // 检查并轮换日志文件
  private checkAndRotateLogFile(): void {
    const logFilePath = path.join(this.logDir, this.currentLogFile);
    
    // 检查文件是否需要按日期轮换
    const newFileName = this.getLogFileName();
    if (newFileName !== this.currentLogFile) {
      this.currentLogFile = newFileName;
      this.cleanOldLogs();
      return;
    }

    // 检查文件大小是否超过限制
    if (fs.existsSync(logFilePath)) {
      const stats = fs.statSync(logFilePath);
      if (stats.size >= this.maxFileSize) {
        // 按大小分割日志文件
        const timestamp = Date.now();
        const baseFileName = this.currentLogFile.replace('.log', '');
        const newFileName = `${baseFileName}_${timestamp}.log`;
        fs.renameSync(logFilePath, path.join(this.logDir, newFileName));
        this.cleanOldLogs();
      }
    }
  }

  // 清理旧日志文件
  private cleanOldLogs(): void {
    const files = fs.readdirSync(this.logDir)
      .filter(file => file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: path.join(this.logDir, file),
        time: fs.statSync(path.join(this.logDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // 保留最新的 maxFiles 个文件，删除其他
    if (files.length > this.maxFiles) {
      files.slice(this.maxFiles).forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
  }

  // 启动缓冲区刷新定时器
  private startBufferFlush(): void {
    this.writeTimer = setInterval(() => {
      this.flushBuffer();
    }, 1000); // 每秒刷新一次
  }

  // 刷新缓冲区
  private flushBuffer(): void {
    if (this.logBuffer.length === 0) return;

    this.checkAndRotateLogFile();
    const logFilePath = path.join(this.logDir, this.currentLogFile);
    const messages = this.logBuffer.map(entry => this.formatMessage(entry)).join('');
    
    try {
      fs.appendFileSync(logFilePath, messages);
      this.logBuffer = [];
    } catch (error) {
      console.error('日志写入失败:', error);
    }
  }

  // 写入日志
  private writeLog(level: string, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata
    };

    if (this.enableAsync) {
      // 异步写入：添加到缓冲区
      this.logBuffer.push(entry);
      if (this.logBuffer.length >= this.bufferSize) {
        this.flushBuffer();
      }
    } else {
      // 同步写入
      this.checkAndRotateLogFile();
      const logFilePath = path.join(this.logDir, this.currentLogFile);
      const formattedMessage = this.formatMessage(entry);
      fs.appendFileSync(logFilePath, formattedMessage);
    }
  }

  // 各级别日志方法
  debug(message: string, metadata?: Record<string, any>): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      this.writeLog('DEBUG', message, metadata);
    }
  }

  info(message: string, metadata?: Record<string, any>): void {
    if (this.logLevel <= LogLevel.INFO) {
      this.writeLog('INFO', message, metadata);
    }
  }

  warn(message: string, metadata?: Record<string, any>): void {
    if (this.logLevel <= LogLevel.WARN) {
      this.writeLog('WARN', message, metadata);
    }
  }

  error(message: string, metadata?: Record<string, any>): void {
    if (this.logLevel <= LogLevel.ERROR) {
      this.writeLog('ERROR', message, metadata);
    }
  }

  fatal(message: string, metadata?: Record<string, any>): void {
    if (this.logLevel <= LogLevel.FATAL) {
      this.writeLog('FATAL', message, metadata);
      this.flushBuffer(); // 致命错误立即刷新
    }
  }

  // 设置日志级别
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
    this.info('日志级别已更改', { newLevel: LogLevel[level] });
  }

  // 关闭日志器（刷新缓冲区并清理定时器）
  close(): void {
    if (this.writeTimer) {
      clearInterval(this.writeTimer);
      this.writeTimer = null;
    }
    this.flushBuffer();
  }
}

// 创建全局单例
let globalLogger: Logger | null = null;

export function getLogger(config?: LoggerConfig): Logger {
  if (!globalLogger) {
    globalLogger = new Logger(config);
  }
  return globalLogger;
}

export default Logger;
export { LogLevel };
export type { LoggerConfig, LogEntry };