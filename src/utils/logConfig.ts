/**
 * 日志系统配置文件
 * 提供集中式日志级别管理和配置
 */
import { LogLevel } from './logManager';
import { DevLogLevel } from './devLogger';

// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

// 应用环境配置
export const AppConfig = {
  // 全局日志级别配置
  logLevels: {
    app: isDev ? LogLevel.WARN : LogLevel.ERROR,     // 应用主日志
    user: isDev ? LogLevel.INFO : LogLevel.ERROR,    // 用户操作日志
    data: isDev ? LogLevel.WARN : LogLevel.ERROR,    // 数据操作日志
    ai: isDev ? LogLevel.INFO : LogLevel.ERROR,      // AI服务日志
    performance: isDev ? LogLevel.INFO : LogLevel.WARN, // 性能日志
  },
  
  // 开发日志配置
  devLog: {
    enabled: isDev,
    level: isDev ? DevLogLevel.INFO : DevLogLevel.ERROR,
    enableConsole: isDev,
    highlightErrors: true,
  },
  
  // 日志文件配置
  logFiles: {
    maxFileSize: 5 * 1024 * 1024,  // 单文件最大5MB
    maxFiles: 7,                   // 每类日志最多保留7个文件
    bufferSize: 30,                // 缓冲30条记录后写入
    flushInterval: 3000,           // 3秒强制刷新一次
  },
  
  // 日志压缩配置
  compression: {
    enabled: true,
    maxAge: 3,                    // 3天后压缩
    compressionLevel: 6,          // 压缩级别(0-9)
    autoCompress: true,           // 自动压缩
    compressInterval: 24,         // 24小时执行一次
  }
};

// 获取日志级别配置
export function getLogLevelConfig(category: string): LogLevel {
  const levelKey = category as keyof typeof AppConfig.logLevels;
  return AppConfig.logLevels[levelKey] || LogLevel.ERROR;
}

// 获取开发日志配置
export function getDevLogConfig() {
  return AppConfig.devLog;
}

// 获取日志文件配置
export function getLogFileConfig() {
  return AppConfig.logFiles;
}

// 获取压缩配置
export function getCompressionConfig() {
  return AppConfig.compression;
}

// 检查是否启用特定日志类别的详细记录
export function isVerboseLoggingEnabled(category: string): boolean {
  const levelKey = category as keyof typeof AppConfig.logLevels;
  const level = AppConfig.logLevels[levelKey] || LogLevel.ERROR;
  return level <= LogLevel.INFO;
}

// 配置初始化函数
export function initializeLogConfig() {
  // 在这里可以进行更复杂的配置初始化，如从配置文件或环境变量中读取
  console.log(`日志系统初始化: ${isDev ? '开发模式' : '生产模式'}`);
  
  if (isDev) {
    console.log(`开发日志级别: ${DevLogLevel[AppConfig.devLog.level]}`);
  }
}

export default AppConfig;