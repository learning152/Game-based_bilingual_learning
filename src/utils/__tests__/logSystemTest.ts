import { getAppLogger, getUserLogger, getDataStorageLogger, getAiServiceLogger, getPerformanceLogger, LogLevel } from '../logManager';
import devLogger, { DevLogLevel, logError, logWarn, logUserAction, getErrorStats } from '../devLogger';

describe('日志系统测试', () => {
  const originalConsoleLog = console.log;
  let consoleOutput: string[] = [];

  beforeEach(() => {
    consoleOutput = [];
    console.log = jest.fn((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  test('应用日志记录器功能测试', () => {
    const appLogger = getAppLogger();
    appLogger.info('这是一条信息日志');
    appLogger.warn('这是一条警告日志');
    appLogger.error('这是一条错误日志');

    expect(consoleOutput).toHaveLength(1);
    expect(consoleOutput[0]).toContain('[ERROR]');
    expect(consoleOutput[0]).toContain('这是一条错误日志');
  });

  test('用户日志记录器功能测试', () => {
    const userLogger = getUserLogger();
    userLogger.info('用户登录');
    userLogger.warn('用户尝试访问未授权页面');
    userLogger.error('用户会话异常结束');

    expect(consoleOutput).toHaveLength(1);
    expect(consoleOutput[0]).toContain('[ERROR]');
    expect(consoleOutput[0]).toContain('用户会话异常结束');
  });

  test('数据存储日志记录器功能测试', () => {
    const dataLogger = getDataStorageLogger();
    dataLogger.info('数据库连接成功');
    dataLogger.warn('查询性能下降');
    dataLogger.error('数据库连接丢失');

    expect(consoleOutput).toHaveLength(1);
    expect(consoleOutput[0]).toContain('[ERROR]');
    expect(consoleOutput[0]).toContain('数据库连接丢失');
  });

  test('AI服务日志记录器功能测试', () => {
    const aiLogger = getAiServiceLogger();
    aiLogger.info('AI模型加载完成');
    aiLogger.warn('AI响应时间超过阈值');
    aiLogger.error('AI服务异常');

    expect(consoleOutput).toHaveLength(1);
    expect(consoleOutput[0]).toContain('[ERROR]');
    expect(consoleOutput[0]).toContain('AI服务异常');
  });

  test('性能监控日志记录器功能测试', () => {
    const perfLogger = getPerformanceLogger();
    perfLogger.info('页面加载完成');
    perfLogger.warn('API响应时间过长');
    perfLogger.error('内存使用率超过90%');

    expect(consoleOutput).toHaveLength(3);
    expect(consoleOutput[0]).toContain('[INFO]');
    expect(consoleOutput[1]).toContain('[WARN]');
    expect(consoleOutput[2]).toContain('[ERROR]');
  });

  test('开发环境简化日志工具功能测试', () => {
    devLogger.setLevel(DevLogLevel.INFO);

    devLogger.info('开发信息日志');
    devLogger.warn('开发警告日志');
    devLogger.error('开发错误日志');
    devLogger.fatal('开发致命错误日志');

    expect(consoleOutput).toHaveLength(4);
    expect(consoleOutput[0]).toContain('[INFO]');
    expect(consoleOutput[1]).toContain('[WARN]');
    expect(consoleOutput[2]).toContain('[ERROR]');
    expect(consoleOutput[3]).toContain('[FATAL]');

    logError('快捷错误日志');
    logWarn('快捷警告日志');
    logUserAction('用户点击按钮', 'user123');

    expect(consoleOutput).toHaveLength(7);
    expect(consoleOutput[4]).toContain('[ERROR]');
    expect(consoleOutput[5]).toContain('[WARN]');
    expect(consoleOutput[6]).toContain('[USER]');

    const stats = getErrorStats();
    expect(stats.errors).toBe(2);
    expect(stats.warnings).toBe(2);
  });
});