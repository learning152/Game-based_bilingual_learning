/**
 * 日志系统测试验证脚本
 * 用于测试和验证日志系统的各个功能模块
 */
import * as fs from 'fs';
import * as path from 'path';
import { getLogger, getUserLogger, getDataStorageLogger, getAiServiceLogger, LogLevel } from './logManager';
import { logViewer } from './logViewer';
import { logCompressor } from './logCompressor';
import { getAlertManager } from './logAlertManager';
import { performanceMonitor } from './performanceMonitor';
import { realtimeLogViewer } from './realtimeLogViewer';
import { logSearchIndex } from './logSearchIndex';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration: number;
  details?: any;
}

class LogSystemTester {
  private results: TestResult[] = [];
  private testLogDir: string = './test-logs';

  /**
   * 运行所有测试
   */
  public async runAllTests(): Promise<void> {
    console.log('🚀 开始日志系统全面测试...\n');

    // 准备测试环境
    this.prepareTestEnvironment();

    // 运行各个功能模块的测试
    await this.testBasicLogging();
    await this.testLogRotation();
    await this.testLogViewer();
    await this.testLogCompression();
    await this.testAlertSystem();
    await this.testPerformanceMonitoring();
    await this.testRealtimeViewer();
    await this.testSearchIndex();
    await this.testIntegration();

    // 输出测试报告
    this.generateReport();

    // 清理测试环境
    this.cleanupTestEnvironment();
  }

  /**
   * 准备测试环境
   */
  private prepareTestEnvironment(): void {
    if (!fs.existsSync(this.testLogDir)) {
      fs.mkdirSync(this.testLogDir, { recursive: true });
    }
    console.log('✅ 测试环境准备完成');
  }

  /**
   * 清理测试环境
   */
  private cleanupTestEnvironment(): void {
    try {
      if (fs.existsSync(this.testLogDir)) {
        fs.rmSync(this.testLogDir, { recursive: true, force: true });
      }
      console.log('🧹 测试环境清理完成');
    } catch (error) {
      console.error('清理测试环境失败:', error);
    }
  }

  /**
   * 测试基础日志功能
   */
  private async testBasicLogging(): Promise<void> {
    const testName = '基础日志功能测试';
    const startTime = Date.now();

    try {
      // 创建测试日志器
      const testLogger = getLogger({ 
        category: 'test', 
        logDir: this.testLogDir,
        level: LogLevel.DEBUG
      });

      // 测试各级别日志记录
      testLogger.debug('这是一条调试日志', { testId: 1 });
      testLogger.info('这是一条信息日志', { testId: 2 });
      testLogger.warn('这是一条警告日志', { testId: 3 });
      testLogger.error('这是一条错误日志', { testId: 4 });
      testLogger.fatal('这是一条致命错误日志', { testId: 5 });

      // 等待日志写入
      await this.sleep(2000);

      // 检查日志文件是否创建
      const logFiles = fs.readdirSync(this.testLogDir).filter(f => f.endsWith('.log'));
      
      if (logFiles.length > 0) {
        const logContent = fs.readFileSync(path.join(this.testLogDir, logFiles[0]), 'utf8');
        const logLines = logContent.split('\n').filter(line => line.trim());
        
        this.addTestResult({
          testName,
          passed: logLines.length >= 5,
          message: `成功记录 ${logLines.length} 条日志`,
          duration: Date.now() - startTime,
          details: { logFiles: logFiles.length, logLines: logLines.length }
        });
      } else {
        this.addTestResult({
          testName,
          passed: false,
          message: '未创建日志文件',
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      this.addTestResult({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  /**
   * 测试日志轮转功能
   */
  private async testLogRotation(): Promise<void> {
    const testName = '日志轮转功能测试';
    const startTime = Date.now();

    try {
      // 创建小文件大小限制的日志器
      const testLogger = getLogger({ 
        category: 'rotation-test', 
        logDir: this.testLogDir,
        maxFileSize: 1024, // 1KB
        bufferSize: 1 // 立即写入
      });

      // 生成大量日志以触发轮转
      for (let i = 0; i < 100; i++) {
        testLogger.info(`大量日志测试 - 第 ${i} 条`, { 
          data: 'x'.repeat(50),
          timestamp: new Date().toISOString()
        });
      }

      // 等待日志写入和轮转
      await this.sleep(3000);

      const logFiles = fs.readdirSync(this.testLogDir)
        .filter(f => f.startsWith('rotation-test') && f.endsWith('.log'));

      this.addTestResult({
        testName,
        passed: logFiles.length > 1,
        message: `创建了 ${logFiles.length} 个日志文件`,
        duration: Date.now() - startTime,
        details: { logFiles }
      });
    } catch (error) {
      this.addTestResult({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  /**
   * 测试日志查看功能
   */
  private async testLogViewer(): Promise<void> {
    const testName = '日志查看功能测试';
    const startTime = Date.now();

    try {
      const viewer = new (require('./logViewer').LogViewer)(this.testLogDir);

      // 查询日志
      const result = await viewer.queryLogs({
        level: LogLevel.INFO,
        limit: 50
      });

      // 获取分类
      const categories = viewer.getCategories();

      // 导出测试
      const exportPath = path.join(this.testLogDir, 'export-test.json');
      const exportSuccess = await viewer.exportLogs(result.logs, exportPath, 'json');

      // 统计分析
      const stats = viewer.analyzeStats(result.logs);

      this.addTestResult({
        testName,
        passed: result.logs.length > 0 && exportSuccess,
        message: `查询到 ${result.total} 条日志，${categories.length} 个分类`,
        duration: Date.now() - startTime,
        details: {
          totalLogs: result.total,
          categories: categories.length,
          exportSuccess,
          statsLevels: Object.keys(stats.levelStats).length
        }
      });
    } catch (error) {
      this.addTestResult({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  /**
   * 测试日志压缩功能
   */
  private async testLogCompression(): Promise<void> {
    const testName = '日志压缩功能测试';
    const startTime = Date.now();

    try {
      // 创建测试日志文件
      const testLogPath = path.join(this.testLogDir, 'compression-test.log');
      const testContent = Array(1000).fill('测试日志内容 - 用于压缩测试').join('\n');
      fs.writeFileSync(testLogPath, testContent);

      const compressor = new (require('./logCompressor').LogCompressor)({
        logDir: this.testLogDir,
        maxUncompressedAge: 0 // 立即压缩
      });

      // 测试单文件压缩
      const compressSuccess = await compressor.compressFile(testLogPath);

      // 检查压缩文件是否存在
      const compressedPath = testLogPath + '.gz';
      const compressedExists = fs.existsSync(compressedPath);

      // 获取压缩统计
      const stats = await compressor.getCompressionStats();

      this.addTestResult({
        testName,
        passed: compressSuccess && compressedExists,
        message: `压缩${compressSuccess ? '成功' : '失败'}，压缩率: ${stats.compressionRatio.toFixed(2)}%`,
        duration: Date.now() - startTime,
        details: stats
      });
    } catch (error) {
      this.addTestResult({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  /**
   * 测试告警系统功能
   */
  private async testAlertSystem(): Promise<void> {
    const testName = '告警系统功能测试';
    const startTime = Date.now();

    try {
      const alertManager = getAlertManager();
      let alertTriggered = false;

      // 设置告警监听器
      const alertListener = () => {
        alertTriggered = true;
      };
      
      alertManager.onAlert(alertListener);

      // 创建测试规则
      alertManager.addRule({
        id: 'test-alert',
        name: '测试告警规则',
        description: '用于测试的告警规则',
        level: LogLevel.ERROR,
        threshold: 2,
        timeWindow: 10000, // 10秒
        cooldown: 5000, // 5秒
        enabled: true
      });

      // 模拟触发告警的日志条目
      const testLogs = [
        {
          timestamp: new Date(),
          level: LogLevel.ERROR,
          levelName: 'ERROR',
          category: 'test',
          message: '测试错误1',
          data: {},
          rawContent: '[2024-11-20] [ERROR] [test] 测试错误1'
        },
        {
          timestamp: new Date(),
          level: LogLevel.ERROR,
          levelName: 'ERROR',
          category: 'test',
          message: '测试错误2',
          data: {},
          rawContent: '[2024-11-20] [ERROR] [test] 测试错误2'
        }
      ];

      // 处理日志条目
      testLogs.forEach(log => alertManager.processLog(log));

      // 等待告警处理
      await this.sleep(1000);

      // 获取活跃告警
      const activeAlerts = alertManager.getActiveAlerts();

      alertManager.offAlert(alertListener);

      this.addTestResult({
        testName,
        passed: alertTriggered && activeAlerts.length > 0,
        message: `告警${alertTriggered ? '已触发' : '未触发'}，活跃告警: ${activeAlerts.length} 个`,
        duration: Date.now() - startTime,
        details: { alertTriggered, activeAlerts: activeAlerts.length }
      });
    } catch (error) {
      this.addTestResult({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  /**
   * 测试性能监控功能
   */
  private async testPerformanceMonitoring(): Promise<void> {
    const testName = '性能监控功能测试';
    const startTime = Date.now();

    try {
      // 测试操作计时
      performanceMonitor.startOperation('测试操作');
      
      // 模拟一些操作
      await this.sleep(100);
      
      performanceMonitor.endOperation('测试操作', { testData: 'test' });

      // 获取指标
      const metrics = performanceMonitor.getMetrics();
      const avgTime = performanceMonitor.getAverageOperationTime('测试操作');

      // 记录资源使用情况
      performanceMonitor.logResourceUsage();

      // 生成报告
      const report = performanceMonitor.generateReport();

      this.addTestResult({
        testName,
        passed: metrics.length > 0 && avgTime > 0,
        message: `记录了 ${metrics.length} 个性能指标，平均耗时: ${avgTime.toFixed(2)}ms`,
        duration: Date.now() - startTime,
        details: { 
          metricsCount: metrics.length, 
          avgTime,
          reportLength: report.length 
        }
      });
    } catch (error) {
      this.addTestResult({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  /**
   * 测试实时日志查看功能
   */
  private async testRealtimeViewer(): Promise<void> {
    const testName = '实时日志查看功能测试';
    const startTime = Date.now();

    try {
      const rtViewer = new (require('./realtimeLogViewer').RealtimeLogViewer)({
        logDir: this.testLogDir,
        minLevel: LogLevel.INFO
      });

      let logsReceived = 0;

      // 设置日志监听器
      rtViewer.on('logs', (logs: any[]) => {
        logsReceived += logs.length;
      });

      // 启动实时监控
      rtViewer.start();

      // 等待一下确保监控已开始
      await this.sleep(500);

      // 创建新日志
      const testLogger = getLogger({ 
        category: 'realtime-test', 
        logDir: this.testLogDir,
        bufferSize: 1
      });

      testLogger.info('实时日志测试1');
      testLogger.info('实时日志测试2');

      // 等待日志被捕获
      await this.sleep(2000);

      // 停止监控
      rtViewer.stop();

      this.addTestResult({
        testName,
        passed: logsReceived >= 2,
        message: `接收到 ${logsReceived} 条实时日志`,
        duration: Date.now() - startTime,
        details: { logsReceived }
      });
    } catch (error) {
      this.addTestResult({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  /**
   * 测试搜索索引功能
   */
  private async testSearchIndex(): Promise<void> {
    const testName = '搜索索引功能测试';
    const startTime = Date.now();

    try {
      const searchIndex = new (require('./logSearchIndex').LogSearchIndex)(this.testLogDir);

      // 构建索引
      await searchIndex.buildIndex(true);

      // 搜索测试
      const searchResult = await searchIndex.search({
        keywords: ['测试'],
        level: LogLevel.INFO,
        limit: 50
      });

      // 获取统计信息
      const stats = searchIndex.getStats();

      this.addTestResult({
        testName,
        passed: stats.totalEntries > 0,
        message: `索引了 ${stats.totalEntries} 条日志，搜索到 ${searchResult.total} 条结果`,
        duration: Date.now() - startTime,
        details: {
          totalEntries: stats.totalEntries,
          searchResults: searchResult.total,
          searchTime: searchResult.searchTime,
          categories: stats.categories.length
        }
      });
    } catch (error) {
      this.addTestResult({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  /**
   * 测试系统集成功能
   */
  private async testIntegration(): Promise<void> {
    const testName = '系统集成功能测试';
    const startTime = Date.now();

    try {
      // 测试不同类型的日志器
      const appLogger = getLogger({ category: 'app', logDir: this.testLogDir });
      const userLogger = getUserLogger();
      const dataLogger = getDataStorageLogger();
      const aiLogger = getAiServiceLogger();

      // 记录各种类型的日志
      appLogger.info('应用日志测试');
      userLogger.info('用户操作日志测试');
      dataLogger.info('数据存储日志测试');
      aiLogger.info('AI服务日志测试');

      // 等待写入
      await this.sleep(2000);

      // 检查是否都有相应的日志文件
      const logFiles = fs.readdirSync('./logs').filter(f => f.endsWith('.log'));
      const categories = new Set(logFiles.map(f => f.split('_')[0]));

      this.addTestResult({
        testName,
        passed: categories.size >= 4,
        message: `创建了 ${categories.size} 个分类的日志文件`,
        duration: Date.now() - startTime,
        details: {
          logFiles: logFiles.length,
          categories: Array.from(categories)
        }
      });
    } catch (error) {
      this.addTestResult({
        testName,
        passed: false,
        message: `测试失败: ${error}`,
        duration: Date.now() - startTime
      });
    }
  }

  /**
   * 添加测试结果
   */
  private addTestResult(result: TestResult): void {
    this.results.push(result);
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.testName}: ${result.message} (${result.duration}ms)`);
  }

  /**
   * 生成测试报告
   */
  private generateReport(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = (passedTests / totalTests * 100).toFixed(1);

    console.log('\n📊 日志系统测试报告');
    console.log('=' .repeat(50));
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过数量: ${passedTests}`);
    console.log(`失败数量: ${failedTests}`);
    console.log(`成功率: ${successRate}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ 失败的测试:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`   - ${result.testName}: ${result.message}`);
      });
    }

    console.log('\n⏱️  性能统计:');
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`总耗时: ${totalDuration}ms`);
    console.log(`平均耗时: ${(totalDuration / totalTests).toFixed(1)}ms`);
    
    console.log('\n🎯 测试结论:');
    if (successRate === '100.0') {
      console.log('🎉 所有测试通过！日志系统运行正常。');
    } else if (parseFloat(successRate) >= 80) {
      console.log('⚠️  大部分功能正常，少数问题需要修复。');
    } else {
      console.log('🚨 存在较多问题，需要仔细检查和修复。');
    }
  }

  /**
   * 休眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建测试器实例
export const logSystemTester = new LogSystemTester();

// 导出快速测试函数
export async function runLogSystemTests(): Promise<void> {
  await logSystemTester.runAllTests();
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runLogSystemTests().catch(console.error);
}