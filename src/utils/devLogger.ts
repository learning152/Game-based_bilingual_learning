/**
 * 开发环境简化日志工具
 * 专注于错误和异常的快速识别
 */

export enum DevLogLevel {
  SILENT = 0,    // 静默模式，只记录致命错误
  ERROR = 1,     // 错误模式，记录错误和致命错误
  WARN = 2,      // 警告模式，记录警告、错误和致命错误
  INFO = 3,      // 信息模式，记录所有级别
}

interface DevLogConfig {
  level: DevLogLevel;
  enableConsole: boolean;    // 是否同时输出到控制台
  highlightErrors: boolean;  // 是否高亮显示错误
}

class DevLogger {
  private config: DevLogConfig;
  private errorCount: number = 0;
  private warningCount: number = 0;

  constructor(config: Partial<DevLogConfig> = {}) {
    this.config = {
      level: DevLogLevel.ERROR,
      enableConsole: true,
      highlightErrors: true,
      ...config
    };
  }

  /**
   * 记录信息日志 - 仅在INFO级别时记录
   */
  info(message: string, data?: any): void {
    if (this.config.level >= DevLogLevel.INFO) {
      this.log('INFO', message, data, '\x1b[36m'); // 青色
    }
  }

  /**
   * 记录警告日志 - 在WARN级别及以上时记录
   */
  warn(message: string, data?: any): void {
    if (this.config.level >= DevLogLevel.WARN) {
      this.warningCount++;
      this.log('WARN', message, data, '\x1b[33m'); // 黄色
    }
  }

  /**
   * 记录错误日志 - 在ERROR级别及以上时记录
   */
  error(message: string, data?: any, error?: Error): void {
    if (this.config.level >= DevLogLevel.ERROR) {
      this.errorCount++;
      let errorMessage = message;
      
      if (error) {
        errorMessage += `\n  错误详情: ${error.message}`;
        if (error.stack) {
          errorMessage += `\n  调用栈: ${error.stack}`;
        }
      }
      
      this.log('ERROR', errorMessage, data, '\x1b[31m'); // 红色
    }
  }

  /**
   * 记录致命错误 - 总是记录
   */
  fatal(message: string, data?: any, error?: Error): void {
    this.errorCount++;
    let errorMessage = `[致命错误] ${message}`;
    
    if (error) {
      errorMessage += `\n  错误详情: ${error.message}`;
      if (error.stack) {
        errorMessage += `\n  调用栈: ${error.stack}`;
      }
    }
    
    this.log('FATAL', errorMessage, data, '\x1b[35m'); // 紫色
  }

  /**
   * 记录用户操作（简化版）
   */
  userAction(action: string, userId?: string): void {
    if (this.config.level >= DevLogLevel.INFO) {
      const message = userId ? `用户${userId}执行: ${action}` : `用户操作: ${action}`;
      this.log('USER', message, undefined, '\x1b[32m'); // 绿色
    }
  }

  /**
   * 内部日志记录方法
   */
  private log(level: string, message: string, data?: any, color?: string): void {
    const timestamp = new Date().toLocaleString('zh-CN');
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      logMessage += `\n  数据: ${JSON.stringify(data, null, 2)}`;
    }

    // 控制台输出
    if (this.config.enableConsole) {
      if (this.config.highlightErrors && color) {
        console.log(`${color}${logMessage}\x1b[0m`);
      } else {
        console.log(logMessage);
      }
    }
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): { errors: number; warnings: number } {
    return {
      errors: this.errorCount,
      warnings: this.warningCount
    };
  }

  /**
   * 重置统计计数
   */
  resetStats(): void {
    this.errorCount = 0;
    this.warningCount = 0;
  }

  /**
   * 设置日志级别
   */
  setLevel(level: DevLogLevel): void {
    this.config.level = level;
  }

  /**
   * 创建错误报告摘要
   */
  createErrorSummary(): string {
    const stats = this.getErrorStats();
    return `错误统计: ${stats.errors} 个错误, ${stats.warnings} 个警告`;
  }
}

// 创建全局开发日志实例
export const devLogger = new DevLogger({
  level: DevLogLevel.ERROR,
  enableConsole: true,
  highlightErrors: true
});

// 便捷的全局方法
export const logError = (message: string, data?: any, error?: Error) => {
  devLogger.error(message, data, error);
};

export const logWarn = (message: string, data?: any) => {
  devLogger.warn(message, data);
};

export const logUserAction = (action: string, userId?: string) => {
  devLogger.userAction(action, userId);
};

export const getErrorStats = () => devLogger.getErrorStats();

export default devLogger;