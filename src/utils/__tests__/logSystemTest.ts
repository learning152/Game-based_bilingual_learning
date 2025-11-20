import { Logger, LogLevel, getLogger } from '../logManager';
import { logViewer } from '../logViewer';
import { realtimeLogViewer } from '../realtimeLogViewer';
import { logSearchIndex } from '../logSearchIndex';
import { LogCompressor } from '../logCompressor';
import { LogAlertManager } from '../logAlertManager';
import { performanceMonitor } from '../performanceMonitor';
import * as fs from 'fs';
import * as path from 'path';

const TEST_LOG_DIR = './test-logs';
const TEST_INDEX_PATH = path.join(TEST_LOG_DIR, '.search-index.json');

describe('日志系统集成测试', () => {
  let logger: Logger;
  let compressor: LogCompressor;
  let alertManager: LogAlertManager;

  beforeAll(async () => {
    // 创建测试日志目录
    if (!fs.existsSync(TEST_LOG_DIR)) {
      fs.mkdirSync(TEST_LOG_DIR);
    }

    // 初始化测试用的日志管理器
    logger = getLogger({
      level: LogLevel.DEBUG,
      category: 'test',
      logDir: TEST_LOG_DIR
    });

    // 初始化压缩器
    compressor = new LogCompressor({
      logDir: TEST_LOG_DIR,
      maxUncompressedAge: 1, // 1天后压缩
      compressionLevel: 6,
      deleteOriginal: true
    });

    // 初始化告警管理器
    alertManager = new LogAlertManager(path.join(TEST_LOG_DIR, 'alert-rules.json'));

    // 初始化搜索索引
    await logSearchIndex.buildIndex(true);
  });

  afterAll(() => {
    // 清理测试日志目录
    if (fs.existsSync(TEST_LOG_DIR)) {
      fs.rmdirSync(TEST_LOG_DIR, { recursive: true });
    }
  });

  test('日志记录功能', () => {
    logger.info('测试信息日志');
    logger.warn('测试警告日志');
    logger.error('测试错误日志');

    const logs = fs.readdirSync(TEST_LOG_DIR).filter(file => file.endsWith('.log'));
    expect(logs.length).toBeGreaterThan(0);
  });

  test('日志压缩功能', async () => {
    // 创建一个旧的日志文件进行测试
    const oldLogPath = path.join(TEST_LOG_DIR, 'old_test.log');
    fs.writeFileSync(oldLogPath, '这是一个测试日志文件内容');

    // 将文件的修改时间设置为2天前
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    fs.utimesSync(oldLogPath, twoDaysAgo, twoDaysAgo);

    await compressor.compressOldLogs();

    expect(fs.existsSync(`${oldLogPath}.gz`)).toBeTruthy();
    expect(fs.existsSync(oldLogPath)).toBeFalsy();
  });

  test('日志告警功能', () => {
    const testRule = {
      id: 'test-rule',
      name: '测试规则',
      description: '测试错误日志告警',
      level: LogLevel.ERROR,
      threshold: 1,
      timeWindow: 60000, // 1分钟
      cooldown: 300000, // 5分钟
      enabled: true
    };

    alertManager.addRule(testRule);

    let alertTriggered = false;
    alertManager.onAlert((alert) => {
      alertTriggered = true;
      expect(alert.ruleId).toBe('test-rule');
    });

    const errorLog = {
      timestamp: new Date(),
      level: LogLevel.ERROR,
      levelName: 'ERROR',
      category: 'test',
      message: '测试错误日志',
      rawContent: '[2025-11-20T22:15:00.000Z] [ERROR] [test] 测试错误日志'
    };

    alertManager.processLog(errorLog);
    
    expect(alertTriggered).toBeTruthy();
  });

  test('日志查看功能', async () => {
    const result = await logViewer.queryLogs({
      category: 'test',
      level: LogLevel.INFO,
      limit: 10
    });

    expect(result.logs.length).toBeGreaterThan(0);
    expect(result.logs[0].category).toBe('test');
    expect(result.logs[0].level).toBeGreaterThanOrEqual(LogLevel.INFO);
  });

  test('实时日志查看功能', (done) => {
    const realtime = realtimeLogViewer;
    realtime.updateOptions({
      logDir: TEST_LOG_DIR,
      category: 'test',
      minLevel: LogLevel.INFO
    });

    let logReceived = false;
    realtime.on('logs', (logs) => {
      logReceived = true;
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].category).toBe('test');
      realtime.stop();
      done();
    });

    realtime.start();

    // 写入一条新日志
    setTimeout(() => {
      logger.info('实时日志测试');
    }, 100);

    // 如果5秒内没有收到日志，测试失败
    setTimeout(() => {
      if (!logReceived) {
        realtime.stop();
        done(new Error('未收到实时日志'));
      }
    }, 5000);
  });

  test('日志搜索索引功能', async () => {
    // 写入一些测试日志
    logger.info('搜索测试日志 1');
    logger.warn('搜索测试日志 2');
    logger.error('搜索测试日志 3');

    // 重建索引
    await logSearchIndex.buildIndex(true);

    const searchResult = await logSearchIndex.search({
      keywords: ['搜索测试'],
      level: LogLevel.WARN,
      limit: 10
    });

    expect(searchResult.entries.length).toBeGreaterThan(0);
    expect(searchResult.entries[0].level).toBeGreaterThanOrEqual(LogLevel.WARN);
    expect(searchResult.entries[0].message).toContain('搜索测试');
  });

  test('性能监控功能', () => {
    performanceMonitor.startOperation('测试操作');
    
    // 模拟一些操作
    for (let i = 0; i < 1000000; i++) {
      Math.sqrt(i);
    }

    performanceMonitor.endOperation('测试操作', { testMetadata: 'performance test' });

    const metrics = performanceMonitor.getMetrics();
    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics[0].operation).toBe('测试操作');
    expect(metrics[0].duration).toBeGreaterThan(0);
    expect(metrics[0].metadata).toHaveProperty('testMetadata', 'performance test');
  });
});