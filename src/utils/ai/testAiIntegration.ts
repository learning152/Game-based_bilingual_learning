import { AIContentManager } from './aiContentManager';
import { ContentType, DifficultyLevel, Language } from './contentGenerator';
import * as fs from 'fs';
import * as path from 'path';

// 测试配置
const TEST_CONFIG = {
  enableConsoleOutput: true,
  saveResultToFile: true,
  outputPath: './test_results',
  runAll: true  // 是否运行所有测试
};

// 日志函数
function log(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  if (!TEST_CONFIG.enableConsoleOutput) return;
  
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  let prefix = '';
  
  switch (type) {
    case 'success':
      prefix = '✅';
      break;
    case 'error':
      prefix = '❌';
      break;
    case 'warning':
      prefix = '⚠️';
      break;
    default:
      prefix = 'ℹ️';
  }
  
  console.log(`${now} ${prefix} ${message}`);
}

// 保存测试结果到文件
function saveResult(testName: string, result: any) {
  if (!TEST_CONFIG.saveResultToFile) return;
  
  try {
    const outputDir = TEST_CONFIG.outputPath;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:T.]/g, '-').substring(0, 19);
    const filename = `${testName}_${timestamp}.json`;
    const filePath = path.join(outputDir, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');
    log(`测试结果已保存至 ${filePath}`, 'info');
  } catch (error) {
    log(`保存测试结果失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
  }
}

// 测试AI服务连接
async function testAIConnection() {
  log('开始测试AI服务连接...', 'info');
  
  try {
    const aiManager = AIContentManager.getInstance();
    const result = await aiManager.testAIConnection();
    
    if (result.success) {
      log(`AI服务连接测试成功: ${result.message}`, 'success');
    } else {
      log(`AI服务连接测试失败: ${result.message}`, 'error');
    }
    
    saveResult('ai_connection_test', result);
    return result.success;
  } catch (error) {
    log(`AI服务连接测试发生异常: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    saveResult('ai_connection_test', { success: false, error: error instanceof Error ? error.message : '未知错误' });
    return false;
  }
}

// 测试内容生成
async function testContentGeneration() {
  log('开始测试内容生成功能...', 'info');
  
  try {
    const aiManager = AIContentManager.getInstance();
    
    const contentTypes = [
      ContentType.WORD,
      ContentType.PHRASE,
      ContentType.SENTENCE,
      ContentType.TRANSLATION
    ];
    
    const results = [];
    
    for (const contentType of contentTypes) {
      log(`测试生成 ${contentType} 类型内容...`, 'info');
      
      const request = {
        contentType: contentType,
        language: Language.CHINESE,
        difficulty: DifficultyLevel.BEGINNER,
        topic: '日常生活',
        count: 3
      };
      
      const response = await aiManager.generateContent(request);
      
      if (response.success && response.items.length > 0) {
        log(`${contentType} 内容生成成功，获得 ${response.items.length} 项`, 'success');
        results.push({
          contentType,
          success: true,
          itemCount: response.items.length,
          items: response.items
        });
      } else {
        log(`${contentType} 内容生成失败: ${response.error || '未知错误'}`, 'error');
        results.push({
          contentType,
          success: false,
          error: response.error
        });
      }
    }
    
    saveResult('content_generation_test', results);
    
    const successCount = results.filter(r => r.success).length;
    return successCount === contentTypes.length;
  } catch (error) {
    log(`内容生成测试发生异常: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    saveResult('content_generation_test', { success: false, error: error instanceof Error ? error.message : '未知错误' });
    return false;
  }
}

// 测试缓存系统
async function testCacheSystem() {
  log('开始测试缓存系统...', 'info');
  
  try {
    const aiManager = AIContentManager.getInstance();
    
    const config = aiManager.getConfig();
    if (!config.cacheConfig.enabled) {
      log('缓存系统已禁用，跳过测试', 'warning');
      return true;
    }
    
    log('执行第一次内容请求（应该从AI服务获取）...', 'info');
    const request = {
      contentType: ContentType.WORD,
      language: Language.CHINESE,
      difficulty: DifficultyLevel.BEGINNER,
      topic: '测试缓存' + Date.now(),
      count: 2
    };
    
    const firstResponse = await aiManager.generateContent(request);
    
    if (!firstResponse.success) {
      log(`第一次请求失败: ${firstResponse.error || '未知错误'}`, 'error');
      saveResult('cache_system_test', { success: false, error: firstResponse.error });
      return false;
    }
    
    const initialStats = aiManager.getCacheStats();
    log(`初始缓存统计: ${JSON.stringify(initialStats)}`, 'info');
    
    log('执行第二次相同内容请求（应该从缓存获取）...', 'info');
    const secondResponse = await aiManager.generateContent(request);
    
    if (!secondResponse.success) {
      log(`第二次请求失败: ${secondResponse.error || '未知错误'}`, 'error');
      saveResult('cache_system_test', { success: false, error: secondResponse.error });
      return false;
    }
    
    const updatedStats = aiManager.getCacheStats();
    log(`更新后缓存统计: ${JSON.stringify(updatedStats)}`, 'info');
    
    const cacheHitIncreased = !!(updatedStats && initialStats && updatedStats.cacheHits > initialStats.cacheHits);
    
    if (cacheHitIncreased) {
      log('缓存命中测试通过', 'success');
    } else {
      log('缓存命中测试失败，缓存未被正确使用', 'error');
    }
    
    aiManager.clearCache(request);
    log('测试缓存已清除', 'info');
    
    const result = {
      success: cacheHitIncreased,
      firstResponse: firstResponse.items.length,
      secondResponse: secondResponse.items.length,
      initialStats,
      updatedStats,
      cacheHitIncreased
    };
    
    saveResult('cache_system_test', result);
    return cacheHitIncreased;
  } catch (error) {
    log(`缓存系统测试发生异常: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    saveResult('cache_system_test', { success: false, error: error instanceof Error ? error.message : '未知错误' });
    return false;
  }
}

// 测试课程AI内容增强
async function testCourseEnhancement() {
  log('开始测试课程AI内容增强功能...', 'info');
  
  try {
    const aiManager = AIContentManager.getInstance();
    
    const courseId = 'chinese-beginner-1';
    log(`测试增强课程: ${courseId}`, 'info');
    
    const result = await aiManager.enhanceCourseWithAI(courseId);
    
    if (result.success) {
      log(`课程AI增强成功: ${result.message}，生成 ${result.itemsGenerated} 项内容`, 'success');
    } else {
      log(`课程AI增强失败: ${result.message}`, 'error');
    }
    
    saveResult('course_enhancement_test', result);
    return result.success;
  } catch (error) {
    log(`课程AI增强测试发生异常: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    saveResult('course_enhancement_test', { success: false, error: error instanceof Error ? error.message : '未知错误' });
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  log('开始运行AI内容生成集成测试...', 'info');
  
  const testResults = {
    aiConnection: false,
    contentGeneration: false,
    cacheSystem: false,
    courseEnhancement: false
  };
  
  testResults.aiConnection = await testAIConnection();
  testResults.contentGeneration = await testContentGeneration();
  testResults.cacheSystem = await testCacheSystem();
  testResults.courseEnhancement = await testCourseEnhancement();
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(Boolean).length;
  
  log(`测试完成: ${passedTests}/${totalTests} 通过`, passedTests === totalTests ? 'success' : 'warning');
  
  saveResult('all_tests_summary', {
    timestamp: new Date().toISOString(),
    results: testResults,
    totalTests,
    passedTests,
    success: passedTests === totalTests
  });
  
  return passedTests === totalTests;
}

// 主函数
async function main() {
  try {
    if (TEST_CONFIG.runAll) {
      await runAllTests();
    } else {
      await testAIConnection();
    }
  } catch (error) {
    log(`测试过程中发生未捕获异常: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
  }
}

// 执行测试
main();