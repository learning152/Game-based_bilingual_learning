# 基于游戏的双语学习系统

## 项目简介
这是一个基于游戏的双语学习系统，旨在通过有趣的互动方式帮助用户提高语言能力。

## 技术栈
- **前端框架**: React + TypeScript
- **构建工具**: Webpack
- **样式**: CSS + 主题系统
- **数据存储**: 本地JSON文件
- **AI集成**: 支持多种AI服务提供商
- **日志系统**: 完整的日志记录、管理和分析系统

## 项目特性
- 🎮 游戏化学习体验
- 🌐 双语学习支持（中英文）
- 📊 学习进度追踪
- 🏆 成就系统
- 🤖 AI内容生成
- 📝 完整的日志记录系统
- 🔍 实时性能监控

## 日志系统使用说明

我们的项目集成了一个企业级的日志系统，提供完整的日志记录、管理、分析和监控功能。系统包含以下核心组件：

### 1. 基础日志记录

#### 1.1 获取日志记录器
系统提供了多种预配置的日志记录器：

```typescript
import { 
  getAppLogger,      // 应用主日志
  getUserLogger,     // 用户操作日志
  getDataStorageLogger, // 数据存储日志
  getAiServiceLogger,   // AI服务日志
  LogLevel 
} from './utils/logManager';

// 使用预配置的日志记录器
const logger = getUserLogger();

// 或创建自定义日志记录器
import { getLogger } from './utils/logManager';
const customLogger = getLogger({ 
  category: 'yourModule',
  level: LogLevel.INFO 
});
```

#### 1.2 记录不同级别的日志
```typescript
// 调试信息 - 开发阶段使用
logger.debug('用户输入验证', { email: 'user@example.com' });

// 普通信息 - 记录正常操作
logger.info('用户登录成功', { userId: '123', duration: '200ms' });

// 警告信息 - 需要注意的情况
logger.warn('API响应缓慢', { endpoint: '/api/data', duration: '5000ms' });

// 错误信息 - 可恢复的错误
logger.error('数据保存失败', { error: error.message, userId: '123' });

// 致命错误 - 严重的系统错误
logger.fatal('数据库连接失败', { error: error.stack });
```

### 2. 日志查看与分析

#### 2.1 基础日志查询
```typescript
import { logViewer, LogLevel } from './utils/logViewer';

// 查询特定条件的日志
const result = await logViewer.queryLogs({
  category: 'user',           // 日志类别
  level: LogLevel.INFO,       // 最低日志级别
  startTime: new Date('2025-11-01'), // 开始时间
  endTime: new Date('2025-11-20'),   // 结束时间
  keywords: ['登录', '注册'],  // 关键词搜索
  page: 1,                    // 页码
  pageSize: 50               // 每页数量
});

console.log(`查询到 ${result.total} 条日志`);
console.log('日志内容:', result.logs);
```

#### 2.2 日志导出功能
```typescript
// 导出为JSON格式（结构化数据）
await logViewer.exportLogs(result.logs, './export/logs.json', 'json');

// 导出为CSV格式（便于Excel分析）
await logViewer.exportLogs(result.logs, './export/logs.csv', 'csv');

// 导出为TXT格式（纯文本）
await logViewer.exportLogs(result.logs, './export/logs.txt', 'txt');
```

#### 2.3 统计分析功能
```typescript
const stats = logViewer.analyzeStats(result.logs);

console.log('日志级别分布:', stats.levelStats);
console.log('模块分布:', stats.categoryStats);
console.log('24小时分布:', stats.hourlyDistribution);
console.log('Top 10错误:', stats.topErrors);
```

### 3. 日志压缩与存储管理

#### 3.1 自动压缩功能
系统会自动对旧日志文件进行gzip压缩，节省存储空间。现在支持并行压缩，提高了处理大量日志文件的效率：

```typescript
import { logCompressor } from './utils/logCompressor';

// 手动触发压缩（现在支持并行处理）
await logCompressor.compressOldLogs();

// 压缩特定文件
await logCompressor.compressFile('./logs/app_2025-11-19_0.log');

// 获取压缩统计信息
const stats = await logCompressor.getCompressionStats();
console.log('压缩统计:', stats);
```

#### 3.2 压缩配置
```typescript
// 自定义压缩配置
const customCompressor = new LogCompressor({
  logDir: './logs',              // 日志目录
  maxUncompressedAge: 7,         // 未压缩文件保留天数
  compressionLevel: 6,           // 压缩级别 (0-9)
  deleteOriginal: true,          // 压缩后删除原文件
  maxConcurrency: 3              // 最大并发压缩数量
});
```

#### 3.3 并行压缩性能
并行压缩功能通过控制并发数，可以显著提高压缩效率，特别是在处理大量日志文件时：

- 自动调整并发数：系统会根据`maxConcurrency`设置自动调整并发压缩的文件数。
- 进度显示：压缩过程中会显示实时进度，方便监控。
- 详细统计：完成后会输出压缩耗时、成功/失败文件数等统计信息。

示例输出：
```
找到 100 个需要压缩的文件，开始并行压缩...
压缩进度: 30/100 (30.0%)
压缩进度: 60/100 (60.0%)
压缩进度: 90/100 (90.0%)
压缩进度: 100/100 (100.0%)
并行压缩耗时: 5.23秒
成功: 98, 失败: 2
批量压缩完成，成功压缩 98/100 个文件
```

通过调整`maxConcurrency`，可以根据系统资源和需求平衡压缩速度和资源占用。

### 4. 智能日志告警

#### 4.1 配置告警规则
```typescript
import { LogAlertManager, LogLevel } from './utils/logAlertManager';

const alertManager = new LogAlertManager();

// 添加错误日志告警规则
alertManager.addRule({
  id: 'error-alert',
  name: '错误日志告警',
  description: '当错误日志频繁出现时触发告警',
  level: LogLevel.ERROR,
  threshold: 10,              // 触发阈值：10次
  timeWindow: 60000,          // 时间窗口：1分钟
  cooldown: 300000,           // 冷却时间：5分钟
  enabled: true
});

// 添加特定关键词告警
alertManager.addRule({
  id: 'critical-keyword-alert',
  name: '关键词告警',  
  description: '监控包含特定关键词的日志',
  level: LogLevel.WARN,
  keywords: ['数据库错误', '网络超时', '内存不足'],
  threshold: 5,
  timeWindow: 300000,         // 5分钟
  cooldown: 600000,           // 10分钟
  enabled: true
});
```

#### 4.2 监听告警事件
```typescript
// 监听告警事件
alertManager.on('alert', (alert) => {
  console.log(`🚨 触发告警: ${alert.ruleName}`);
  console.log(`📊 统计: ${alert.count} 次，级别: ${alert.level}`);
  console.log(`📝 相关日志: ${alert.logs.length} 条`);
  
  // 这里可以集成邮件、短信、钉钉等通知方式
  sendNotification(alert);
});

// 开始监控
alertManager.startMonitoring();
```

#### 4.3 告警管理
```typescript
// 获取所有告警规则
const rules = alertManager.getRules();

// 禁用特定规则
alertManager.disableRule('error-alert');

// 清除已解决的告警
alertManager.clearResolvedAlerts();

// 获取活跃告警
const activeAlerts = alertManager.getActiveAlerts();
```

### 5. 性能监控与分析

#### 5.1 操作性能监控
```typescript
import { performanceMonitor } from './utils/performanceMonitor';

// 监控单个操作
performanceMonitor.startOperation('数据加载');
try {
  const data = await loadUserData();
  performanceMonitor.endOperation('数据加载', { 
    dataSize: data.length,
    userId: currentUser.id
  });
} catch (error) {
  performanceMonitor.endOperation('数据加载', { 
    error: error.message,
    failed: true
  });
}
```

#### 5.2 批量操作监控
```typescript
// 监控批量操作
const operations = ['登录验证', 'AI内容生成', '数据保存'];

for (const op of operations) {
  performanceMonitor.startOperation(op);
  await performOperation(op);
  performanceMonitor.endOperation(op);
}

// 获取性能统计
const metrics = performanceMonitor.getMetrics();
console.log('操作耗时统计:', metrics.operationStats);
console.log('平均响应时间:', metrics.averageResponseTime);
console.log('慢查询列表:', metrics.slowOperations);
```

#### 5.3 性能报告生成
```typescript
// 生成性能报告
const report = await performanceMonitor.generateReport({
  startTime: new Date('2025-11-20'),
  endTime: new Date(),
  includeDetails: true
});

console.log('性能报告:', report);

// 导出性能数据
await performanceMonitor.exportMetrics('./reports/performance.json');
```

### 6. 实时日志监控

#### 6.1 启动实时监控
```typescript
import { RealtimeLogViewer } from './utils/realtimeLogViewer';

const realtimeViewer = new RealtimeLogViewer({
  logDir: './logs',
  categories: ['user', 'ai', 'data'], // 监控的日志类别
  levels: [LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR], // 监控的级别
  bufferSize: 100,      // 缓冲区大小
  updateInterval: 1000  // 更新间隔（毫秒）
});

// 监听新日志
realtimeViewer.on('logs', (logs) => {
  logs.forEach(log => {
    console.log(`[${log.timestamp}] [${log.level}] ${log.message}`);
  });
});

// 监听错误事件
realtimeViewer.on('error', (error) => {
  console.error('实时日志监控错误:', error);
});

// 开始监控
realtimeViewer.start();
```

#### 6.2 过滤与筛选
```typescript
// 设置日志过滤器
realtimeViewer.setFilter({
  keywords: ['登录', '错误'],      // 关键词过滤
  excludeKeywords: ['DEBUG'],     // 排除关键词
  minLevel: LogLevel.INFO,        // 最低级别
  categories: ['user', 'ai']      // 指定类别
});

// 动态调整监控配置
realtimeViewer.updateConfig({
  updateInterval: 500,  // 更频繁的更新
  bufferSize: 200      // 更大的缓冲区
});
```

### 7. 高性能日志搜索

#### 7.1 建立搜索索引
```typescript
import { logSearchIndex } from './utils/logSearchIndex';

// 为所有日志文件建立索引
await logSearchIndex.buildIndex();

// 为特定时间范围建立索引
await logSearchIndex.buildIndex({
  startDate: new Date('2025-11-01'),
  endDate: new Date('2025-11-20'),
  categories: ['user', 'ai']
});

// 获取索引统计信息
const indexStats = await logSearchIndex.getIndexStats();
console.log('索引统计:', indexStats);
```

#### 7.2 高级搜索功能
```typescript
// 复杂条件搜索
const searchResult = await logSearchIndex.search({
  keywords: ['API调用', '超时'],        // 多关键词
  excludeKeywords: ['成功'],           // 排除词
  level: LogLevel.ERROR,               // 日志级别
  categories: ['ai', 'data'],          // 多类别
  startTime: new Date('2025-11-20'),   // 时间范围
  endTime: new Date(),
  fuzzy: true,                         // 模糊匹配
  limit: 1000                          // 结果限制
});

console.log(`搜索到 ${searchResult.total} 条匹配的日志`);
console.log('搜索耗时:', searchResult.duration, 'ms');
```

#### 7.3 搜索结果处理
```typescript
// 高亮搜索结果
const highlightedResults = logSearchIndex.highlightResults(
  searchResult.logs, 
  ['API调用', '超时']
);

// 按时间聚合结果
const aggregated = logSearchIndex.aggregateByTime(
  searchResult.logs, 
  'hour' // 可选: 'minute', 'hour', 'day'
);

// 导出搜索结果
await logSearchIndex.exportSearchResults(
  searchResult, 
  './search-results.json'
);
```

### 8. 日志文件结构

所有日志文件按类别和日期自动组织：

```
./logs/
├── app_2025-11-20_0.log          # 应用主日志
├── app_2025-11-20_0.log.gz       # 压缩的历史日志
├── user_2025-11-20_0.log         # 用户操作日志
├── data_2025-11-20_0.log         # 数据存储日志
├── ai_2025-11-20_0.log           # AI服务日志
├── performance_2025-11-20_0.log  # 性能监控日志
└── alert-rules.json              # 告警规则配置
```

## 环境配置

### Node.js 环境
项目使用 Conda 管理 Node.js 环境：

```bash
# 激活 Node.js 环境
conda activate node22

# 安装依赖
npm install

# 启动开发服务器
npm start

# 构建生产版本
npm run build
```

### 环境变量配置
在项目根目录创建 `.env` 文件：

```env
# AI服务配置
AI_PROVIDER=openai
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.openai.com

# 日志配置
LOG_LEVEL=INFO
LOG_DIR=./logs
ENABLE_LOG_COMPRESSION=true
ENABLE_LOG_ALERTS=true
```

## 使用指南

### 快速开始
1. 克隆项目并安装依赖
2. 激活 Node.js 环境：`conda activate node22`
3. 配置环境变量（可选）
4. 启动开发服务器：`npm start`
5. 打开浏览器访问：`http://localhost:3000`

### 开发建议
- **日志记录**: 在关键操作和错误处理点添加适当的日志记录
- **性能监控**: 对耗时操作使用性能监控工具
- **告警配置**: 根据业务需求配置合适的告警规则
- **定期分析**: 使用日志分析工具定期检查系统状态
- **安全考虑**: 避免在日志中记录敏感信息（密码、密钥等）

### 最佳实践
1. **分类记录**: 不同模块使用对应的日志记录器
2. **级别控制**: 生产环境建议使用 INFO 级别以上
3. **结构化数据**: 使用对象形式记录结构化信息
4. **异常处理**: 记录错误时包含堆栈信息和上下文
5. **性能考虑**: 避免在高频调用中记录过多调试信息

## 故障排除

### 常见问题
1. **日志文件权限错误**: 确保应用有写入 `./logs` 目录的权限
2. **索引构建失败**: 检查日志文件格式和磁盘空间
3. **告警不生效**: 验证告警规则配置和监控是否启动
4. **性能监控数据缺失**: 确保正确调用了开始和结束方法

### 调试模式
启用调试模式获取更详细的日志信息：

```typescript
import { getLogger, LogLevel } from './utils/logManager';

const debugLogger = getLogger({ 
  category: 'debug', 
  level: LogLevel.DEBUG 
});
```

## 技术文档

更多详细的技术文档和API参考，请查看：
- [日志系统详细使用指南](./.comate/文档/日志系统使用指南.md)
- [项目需求文档](./.comate/文档/项目需求文档.md)
- [数据库设计文档](./.comate/文档/数据库设计文档.md)
- [流程图文档](./.comate/文档/流程图文档.md)

## 贡献指南

在贡献代码前，请：
1. 阅读项目规范：`./.comate/rules/my-custom-rule.mdr`
2. 查看执行计划：`./.comate/plan/` 目录下的相关文档
3. 遵循既有的代码风格和架构设计
4. 为新功能添加适当的日志记录和测试

---

**最后更新**: 2025-11-20  
**维护者**: Zulu AI助手  
**版本**: 2.0.0