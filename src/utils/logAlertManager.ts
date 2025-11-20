/**
 * 日志告警管理器
 * 提供日志监控和告警功能
 */
import * as fs from 'fs';
import * as path from 'path';
import { LogLevel, ParsedLogEntry } from './logManager';
import { EventEmitter } from 'events';

// 告警规则接口
export interface AlertRule {
  id: string;                 // 规则ID
  name: string;               // 规则名称
  description: string;        // 规则描述
  level: LogLevel;            // 监控的日志级别
  category?: string;          // 监控的日志类别（可选）
  keywords?: string[];        // 关键词匹配（可选）
  threshold: number;          // 触发阈值（在时间窗口内出现的次数）
  timeWindow: number;         // 时间窗口（毫秒）
  cooldown: number;           // 冷却时间（毫秒），避免频繁告警
  enabled: boolean;           // 是否启用
}

// 告警接口
export interface Alert {
  id: string;                 // 告警ID
  ruleId: string;             // 触发的规则ID
  ruleName: string;           // 规则名称
  message: string;            // 告警消息
  count: number;              // 触发次数
  level: LogLevel;            // 日志级别
  firstOccurrence: Date;      // 首次出现时间
  lastOccurrence: Date;       // 最近出现时间
  resolved: boolean;          // 是否已解决
  logs: ParsedLogEntry[];     // 相关的日志条目
}

// 告警监听器接口
export interface AlertListener {
  (alert: Alert): void;
}

/**
 * 日志告警管理器类
 */
export class LogAlertManager extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private occurrences: Map<string, {count: number, logs: ParsedLogEntry[], lastTrigger: Date}> = new Map();
  private configPath: string;

  /**
   * 构造函数
   * @param configPath 配置文件路径
   */
  constructor(configPath: string = './logs/alert-rules.json') {
    super();
    this.configPath = configPath;
    this.loadRules();
  }

  /**
   * 从文件加载告警规则
   */
  private loadRules(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf8');
        const rules: AlertRule[] = JSON.parse(content);
        rules.forEach(rule => this.rules.set(rule.id, rule));
        console.log(`成功加载 ${rules.length} 条告警规则`);
      } else {
        // 创建默认规则
        this.createDefaultRules();
        this.saveRules();
      }
    } catch (error) {
      console.error('加载告警规则失败:', error);
      this.createDefaultRules();
    }
  }

  /**
   * 创建默认告警规则
   */
  private createDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'error-threshold',
        name: '错误日志阈值告警',
        description: '监控ERROR级别日志数量，短时间内出现多次ERROR时触发告警',
        level: LogLevel.ERROR,
        threshold: 5,
        timeWindow: 5 * 60 * 1000, // 5分钟
        cooldown: 30 * 60 * 1000, // 30分钟
        enabled: true
      },
      {
        id: 'fatal-immediate',
        name: '致命错误即时告警',
        description: '监控FATAL级别日志，出现任何FATAL错误立即触发告警',
        level: LogLevel.FATAL,
        threshold: 1,
        timeWindow: 60 * 1000, // 1分钟
        cooldown: 15 * 60 * 1000, // 15分钟
        enabled: true
      },
      {
        id: 'login-failures',
        name: '登录失败监控',
        description: '监控用户登录失败事件',
        level: LogLevel.WARN,
        category: 'user',
        keywords: ['登录失败', 'login failed'],
        threshold: 3,
        timeWindow: 10 * 60 * 1000, // 10分钟
        cooldown: 60 * 60 * 1000, // 60分钟
        enabled: true
      }
    ];

    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
    console.log('已创建默认告警规则');
  }

  /**
   * 保存告警规则到文件
   */
  public saveRules(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const rulesArray = Array.from(this.rules.values());
      fs.writeFileSync(this.configPath, JSON.stringify(rulesArray, null, 2));
      console.log(`已保存 ${rulesArray.length} 条告警规则至 ${this.configPath}`);
    } catch (error) {
      console.error('保存告警规则失败:', error);
    }
  }

  /**
   * 添加或更新告警规则
   * @param rule 告警规则
   */
  public addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    this.saveRules();
  }

  /**
   * 删除告警规则
   * @param ruleId 规则ID
   * @returns 是否成功删除
   */
  public deleteRule(ruleId: string): boolean {
    const result = this.rules.delete(ruleId);
    if (result) {
      this.saveRules();
    }
    return result;
  }

  /**
   * 获取所有告警规则
   * @returns 规则数组
   */
  public getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 启用告警规则
   * @param ruleId 规则ID
   * @returns 是否成功启用
   */
  public enableRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      this.saveRules();
      return true;
    }
    return false;
  }

  /**
   * 禁用告警规则
   * @param ruleId 规则ID
   * @returns 是否成功禁用
   */
  public disableRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      this.saveRules();
      return true;
    }
    return false;
  }

  /**
   * 处理日志条目
   * @param logEntry 日志条目
   */
  public processLog(logEntry: ParsedLogEntry): void {
    // 检查每条规则
    this.rules.forEach(rule => {
      if (!rule.enabled) return;

      // 检查日志级别
      if (logEntry.level < rule.level) return;

      // 检查日志类别
      if (rule.category && logEntry.category !== rule.category) return;

      // 检查关键词
      if (rule.keywords && rule.keywords.length > 0) {
        const content = `${logEntry.message} ${JSON.stringify(logEntry.data || {})}`.toLowerCase();
        const found = rule.keywords.some(keyword => content.includes(keyword.toLowerCase()));
        if (!found) return;
      }

      // 更新出现次数
      const occurrenceKey = rule.id;
      const now = new Date();
      const occurrence = this.occurrences.get(occurrenceKey) || {
        count: 0,
        logs: [],
        lastTrigger: new Date(0)
      };

      // 清理过期记录
      const timeWindow = now.getTime() - rule.timeWindow;
      occurrence.logs = occurrence.logs.filter(log => 
        log.timestamp.getTime() >= timeWindow
      );

      // 添加新记录
      occurrence.logs.push(logEntry);
      occurrence.count = occurrence.logs.length;
      
      // 检查是否触发告警
      if (
        occurrence.count >= rule.threshold && 
        (now.getTime() - occurrence.lastTrigger.getTime()) > rule.cooldown
      ) {
        // 创建告警
        const alertId = `${rule.id}-${now.getTime()}`;
        const alert: Alert = {
          id: alertId,
          ruleId: rule.id,
          ruleName: rule.name,
          message: `${rule.name}: 检测到 ${occurrence.count} 条${LogLevel[rule.level]}级别日志在过去的${rule.timeWindow / 60000}分钟内`,
          count: occurrence.count,
          level: rule.level,
          firstOccurrence: occurrence.logs[0].timestamp,
          lastOccurrence: logEntry.timestamp,
          resolved: false,
          logs: [...occurrence.logs]
        };

        // 更新最后触发时间
        occurrence.lastTrigger = now;
        this.activeAlerts.set(alertId, alert);
        
        // 发送告警事件
        this.emit('alert', alert);
      }

      this.occurrences.set(occurrenceKey, occurrence);
    });
  }

  /**
   * 获取所有活跃告警
   * @returns 活跃告警数组
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * 获取特定告警
   * @param alertId 告警ID
   * @returns 告警对象
   */
  public getAlert(alertId: string): Alert | undefined {
    return this.activeAlerts.get(alertId);
  }

  /**
   * 解决告警
   * @param alertId 告警ID
   * @param comment 备注信息
   * @returns 是否成功解决
   */
  public resolveAlert(alertId: string, comment?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alert-resolved', { alert, comment });
      return true;
    }
    return false;
  }

  /**
   * 添加告警监听器
   * @param listener 监听函数
   */
  public onAlert(listener: AlertListener): void {
    this.on('alert', listener);
  }

  /**
   * 移除告警监听器
   * @param listener 监听函数
   */
  public offAlert(listener: AlertListener): void {
    this.off('alert', listener);
  }

  /**
   * 添加告警解决监听器
   * @param listener 监听函数
   */
  public onAlertResolved(listener: (data: {alert: Alert, comment?: string}) => void): void {
    this.on('alert-resolved', listener);
  }
  
  /**
   * 获取规则触发统计
   * @returns 规则触发统计信息
   */
  public getRuleStatistics(): Array<{
    ruleId: string;
    ruleName: string;
    occurrences: number;
    lastTriggered?: Date;
  }> {
    const stats: Array<{
      ruleId: string;
      ruleName: string;
      occurrences: number;
      lastTriggered?: Date;
    }> = [];
    
    this.rules.forEach(rule => {
      const occurrence = this.occurrences.get(rule.id);
      if (occurrence) {
        stats.push({
          ruleId: rule.id,
          ruleName: rule.name,
          occurrences: occurrence.count,
          lastTriggered: occurrence.lastTrigger.getTime() > 0 ? occurrence.lastTrigger : undefined
        });
      } else {
        stats.push({
          ruleId: rule.id,
          ruleName: rule.name,
          occurrences: 0
        });
      }
    });
    
    return stats;
  }

  /**
   * 清理已解决的告警
   * @param olderThan 清理多久以前解决的告警（毫秒）
   * @returns 清理的数量
   */
  public cleanResolvedAlerts(olderThan: number = 7 * 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let count = 0;
    
    this.activeAlerts.forEach((alert, alertId) => {
      if (alert.resolved && (now - alert.lastOccurrence.getTime()) > olderThan) {
        this.activeAlerts.delete(alertId);
        count++;
      }
    });
    
    return count;
  }
}

/**
 * 创建默认告警管理器实例
 */
const defaultAlertManager = new LogAlertManager();

/**
 * 获取默认告警管理器
 * @returns 默认告警管理器实例
 */
export function getAlertManager(): LogAlertManager {
  return defaultAlertManager;
}

// 输出示例用法
const alertListener = (alert: Alert) => {
  console.log('===== 告警触发 =====');
  console.log(`告警ID: ${alert.id}`);
  console.log(`告警名称: ${alert.ruleName}`);
  console.log(`告警消息: ${alert.message}`);
  console.log(`触发次数: ${alert.count}`);
  console.log(`首次时间: ${alert.firstOccurrence.toLocaleString()}`);
  console.log(`最近时间: ${alert.lastOccurrence.toLocaleString()}`);
  console.log('=====================');
};

defaultAlertManager.onAlert(alertListener);