/**
 * 性能监控工具
 * 用于记录和分析系统关键操作的性能指标
 */
import { performance } from 'perf_hooks';
import { getLogger, LogLevel } from './logManager';

const performanceLogger = getLogger({ category: 'performance', level: LogLevel.INFO });

interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private activeOperations: Map<string, number> = new Map();

  /**
   * 开始计时一个操作
   * @param operation 操作名称
   */
  startOperation(operation: string): void {
    const startTime = performance.now();
    this.activeOperations.set(operation, startTime);
    performanceLogger.debug(`开始操作: ${operation}`);
  }

  /**
   * 结束一个操作的计时并记录性能指标
   * @param operation 操作名称
   * @param metadata 相关的元数据
   */
  endOperation(operation: string, metadata?: Record<string, any>): void {
    const endTime = performance.now();
    const startTime = this.activeOperations.get(operation);

    if (startTime === undefined) {
      performanceLogger.warn(`尝试结束未开始的操作: ${operation}`);
      return;
    }

    const duration = endTime - startTime;
    this.activeOperations.delete(operation);

    const metric: PerformanceMetric = {
      operation,
      startTime,
      endTime,
      duration,
      metadata
    };

    this.metrics.push(metric);
    performanceLogger.info(`操作完成: ${operation}`, {
      duration: `${duration.toFixed(2)}ms`,
      ...metadata
    });
  }

  /**
   * 获取所有记录的性能指标
   */
  getMetrics(): PerformanceMetric[] {
    return this.metrics;
  }

  /**
   * 获取特定操作的平均耗时
   * @param operation 操作名称
   */
  getAverageOperationTime(operation: string): number {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    if (operationMetrics.length === 0) return 0;

    const totalTime = operationMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return totalTime / operationMetrics.length;
  }

  /**
   * 获取性能报告
   */
  generateReport(): string {
    let report = "性能监控报告\n";
    report += "================\n\n";

    const operationSummary = new Map<string, { count: number, totalTime: number }>();

    this.metrics.forEach(metric => {
      const summary = operationSummary.get(metric.operation) || { count: 0, totalTime: 0 };
      summary.count++;
      summary.totalTime += metric.duration;
      operationSummary.set(metric.operation, summary);
    });

    operationSummary.forEach((summary, operation) => {
      const avgTime = summary.totalTime / summary.count;
      report += `操作: ${operation}\n`;
      report += `  调用次数: ${summary.count}\n`;
      report += `  平均耗时: ${avgTime.toFixed(2)}ms\n`;
      report += `  总耗时: ${summary.totalTime.toFixed(2)}ms\n\n`;
    });

    return report;
  }

  /**
   * 清除所有记录的指标
   */
  clearMetrics(): void {
    this.metrics = [];
    this.activeOperations.clear();
    performanceLogger.info("性能指标已清除");
  }

  /**
   * 记录资源使用情况
   */
  logResourceUsage(): void {
    const used = process.memoryUsage();
    performanceLogger.info('资源使用情况', {
      rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
      heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
      heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
      external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`,
    });
  }
}

// 创建性能监控实例
export const performanceMonitor = new PerformanceMonitor();

// 使用示例
// performanceMonitor.startOperation('数据库查询');
// // ... 执行数据库查询
// performanceMonitor.endOperation('数据库查询', { queryType: 'SELECT', table: 'users' });

// 定期记录资源使用情况
setInterval(() => {
  performanceMonitor.logResourceUsage();
}, 5 * 60 * 1000); // 每5分钟记录一次