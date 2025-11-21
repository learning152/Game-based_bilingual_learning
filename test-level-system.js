/**
 * 关卡系统测试脚本
 * 用于验证关卡数据模型、关卡管理器和用户进度功能
 */

// 导入依赖
const fs = require('fs');
const path = require('path');

// 模拟dataStorage接口实现，用于测试
const dataStorage = {
  readData(category, id) {
    try {
      const filePath = path.join(__dirname, 'data', category, `${id}.json`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error(`读取文件错误: ${error.message}`);
    }
    return null;
  },
  
  writeData(category, id, data) {
    try {
      const dirPath = path.join(__dirname, 'data', category);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      const filePath = path.join(dirPath, `${id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`写入文件错误: ${error.message}`);
      return false;
    }
  },
  
  deleteData(category, id) {
    try {
      const filePath = path.join(__dirname, 'data', category, `${id}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch (error) {
      console.error(`删除文件错误: ${error.message}`);
    }
    return false;
  },
  
  listFiles(category) {
    try {
      const dirPath = path.join(__dirname, 'data', category);
      if (fs.existsSync(dirPath)) {
        return fs.readdirSync(dirPath)
          .filter(file => file.endsWith('.json'))
          .map(file => file.replace('.json', ''));
      }
    } catch (error) {
      console.error(`列举文件错误: ${error.message}`);
    }
    return [];
  },
  
  createBackup(category, id) {
    try {
      const filePath = path.join(__dirname, 'data', category, `${id}.json`);
      if (fs.existsSync(filePath)) {
        const backupDir = path.join(__dirname, 'data', 'backups');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const backupFilename = `${id}_${timestamp}.json`;
        const backupPath = path.join(backupDir, backupFilename);
        
        fs.copyFileSync(filePath, backupPath);
        return backupFilename;
      }
    } catch (error) {
      console.error(`创建备份错误: ${error.message}`);
    }
    return null;
  },
  
  restoreFromBackup(backupFilename, category, id) {
    try {
      const backupPath = path.join(__dirname, 'data', 'backups', backupFilename);
      if (fs.existsSync(backupPath)) {
        const targetDir = path.join(__dirname, 'data', category);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        const targetPath = path.join(targetDir, `${id}.json`);
        fs.copyFileSync(backupPath, targetPath);
        return true;
      }
    } catch (error) {
      console.error(`恢复备份错误: ${error.message}`);
    }
    return false;
  }
};

// 为了测试目的，重新定义GameLevelManager
const GameLevelManager = {
  LEVEL_CATEGORY: 'game-levels',
  PROGRESS_CATEGORY: 'level-progress',
  
  createLevel(level) {
    return dataStorage.writeData(this.LEVEL_CATEGORY, level.id, level);
  },
  
  getLevel(levelId) {
    return dataStorage.readData(this.LEVEL_CATEGORY, levelId);
  },
  
  listLevels() {
    return dataStorage.listFiles(this.LEVEL_CATEGORY);
  },
  
  getLevelsByFilter(difficulty, language) {
    const levelIds = this.listLevels();
    const levels = [];
    
    for (const levelId of levelIds) {
      const level = this.getLevel(levelId);
      if (level) {
        let matches = true;
        if (difficulty && level.difficulty !== difficulty) matches = false;
        if (language && level.language !== language) matches = false;
        
        if (matches) {
          levels.push(level);
        }
      }
    }
    
    return levels;
  },
  
  updateUserProgress(progress) {
    const progressId = `${progress.userId}_${progress.levelId}`;
    progress.lastPlayed = new Date().toISOString();
    return dataStorage.writeData(this.PROGRESS_CATEGORY, progressId, progress);
  },
  
  getUserProgress(userId, levelId) {
    const progressId = `${userId}_${levelId}`;
    return dataStorage.readData(this.PROGRESS_CATEGORY, progressId);
  },
  
  getAllUserProgress(userId) {
    const allProgress = dataStorage.listFiles(this.PROGRESS_CATEGORY);
    const userProgress = [];
    
    for (const progressFile of allProgress) {
      if (progressFile.startsWith(`${userId}_`)) {
        const progress = dataStorage.readData(this.PROGRESS_CATEGORY, progressFile);
        if (progress) {
          userProgress.push(progress);
        }
      }
    }
    
    return userProgress;
  },
  
  initializeUserProgress(userId, levelId) {
    const existingProgress = this.getUserProgress(userId, levelId);
    if (existingProgress) {
      return existingProgress;
    }
    
    // 检查关卡解锁条件
    const isUnlocked = this.checkLevelUnlocked(userId, levelId);
    
    const newProgress = {
      userId,
      levelId,
      isUnlocked,
      currentStage: 0,
      completedStages: [],
      completedChallenges: [],
      totalScore: 0,
      bestScore: 0,
      stars: 0,
      attempts: 0,
      timeSpent: 0,
      lastPlayed: new Date().toISOString(),
      achievements: []
    };
    
    this.updateUserProgress(newProgress);
    return newProgress;
  },
  
  checkLevelUnlocked(userId, levelId) {
    const level = this.getLevel(levelId);
    if (!level) return false;
    
    // 对于第一个关卡，默认解锁
    if (level.unlockConditions.length === 0 || 
        (level.unlockConditions.length === 1 && level.unlockConditions[0].target === '')) {
      return true;
    }
    
    // 检查所有解锁条件
    for (const condition of level.unlockConditions) {
      if (!this.checkUnlockCondition(userId, condition)) {
        return false;
      }
    }
    
    return true;
  },
  
  checkUnlockCondition(userId, condition) {
    // 如果是空条件，直接返回true
    if (!condition.target && condition.value === 0) {
      return true;
    }
    
    switch (condition.type) {
      case 'level':
        // 需要完成指定关卡
        const targetProgress = this.getUserProgress(userId, condition.target);
        return targetProgress?.stars >= condition.value;
        
      case 'score':
        // 需要达到指定总分
        const allProgress = this.getAllUserProgress(userId);
        const totalScore = allProgress.reduce((sum, progress) => sum + progress.totalScore, 0);
        return totalScore >= condition.value;
        
      case 'achievement':
        // 需要获得指定成就
        const userAchievements = this.getAllUserProgress(userId)
          .flatMap(progress => progress.achievements);
        return userAchievements.includes(condition.target);
        
      default:
        return true;
    }
  },
  
  updateLevelUnlockStatus(userId) {
    const allLevels = this.listLevels();
    const newlyUnlockedLevels = [];
    
    for (const levelId of allLevels) {
      const progress = this.getUserProgress(userId, levelId);
      const shouldBeUnlocked = this.checkLevelUnlocked(userId, levelId);
      
      if (shouldBeUnlocked && progress && !progress.isUnlocked) {
        progress.isUnlocked = true;
        this.updateUserProgress(progress);
        newlyUnlockedLevels.push(levelId);
      }
    }
    
    return newlyUnlockedLevels;
  },
  
  processLevelCompletion(userId, levelId, stageId, score, timeSpent, completedChallenges) {
    const level = this.getLevel(levelId);
    if (!level) {
      throw new Error(`关卡不存在: ${levelId}`);
    }
    
    const progress = this.getUserProgress(userId, levelId) || this.initializeUserProgress(userId, levelId);
    
    // 更新进度数据
    progress.attempts++;
    progress.timeSpent += timeSpent;
    progress.totalScore += score;
    progress.bestScore = Math.max(progress.bestScore, score);
    
    // 添加完成的挑战
    for (const challengeId of completedChallenges) {
      if (!progress.completedChallenges.includes(challengeId)) {
        progress.completedChallenges.push(challengeId);
      }
    }
    
    // 添加完成的阶段
    if (!progress.completedStages.includes(stageId)) {
      progress.completedStages.push(stageId);
    }
    
    // 计算星级
    const minScore = level.stages.find(s => s.id === stageId)?.minScore || 60;
    const stars = this.calculateStars(score, minScore);
    progress.stars = Math.max(progress.stars, stars);
    
    // 检查是否完成整个关卡
    const isLevelCompleted = progress.completedStages.length === level.stages.length;
    if (isLevelCompleted && !progress.firstCompletedAt) {
      progress.firstCompletedAt = new Date().toISOString();
    }
    
    // 保存进度
    this.updateUserProgress(progress);
    
    // 检查新解锁的关卡
    const unlockedLevels = this.updateLevelUnlockStatus(userId);
    
    return {
      levelId,
      stageId,
      userId,
      score,
      timeSpent,
      stars,
      completedChallenges,
      newAchievements: [], // TODO: 实现成就系统
      unlockedLevels,
      isLevelCompleted,
      completedAt: new Date().toISOString()
    };
  },
  
  calculateStars(score, minScore) {
    if (score < minScore) return 0;
    if (score < minScore + 20) return 1;
    if (score < minScore + 35) return 2;
    return 3;
  },
  
  backupLevel(levelId) {
    return dataStorage.createBackup(this.LEVEL_CATEGORY, levelId);
  },
  
  backupUserProgress(userId, levelId) {
    const progressId = `${userId}_${levelId}`;
    return dataStorage.createBackup(this.PROGRESS_CATEGORY, progressId);
  },
  
  restoreLevel(backupFilename, levelId) {
    return dataStorage.restoreFromBackup(backupFilename, this.LEVEL_CATEGORY, levelId);
  },
  
  restoreUserProgress(backupFilename, userId, levelId) {
    const progressId = `${userId}_${levelId}`;
    return dataStorage.restoreFromBackup(backupFilename, this.PROGRESS_CATEGORY, progressId);
  }
};

console.log('=== 关卡系统测试开始 ===\n');

// 测试用户ID
const testUserId = 'test_user_001';

// 1. 测试关卡列表获取
console.log('1. 测试关卡列表获取');
try {
  const allLevels = GameLevelManager.listLevels();
  console.log(`✓ 找到 ${allLevels.length} 个关卡:`, allLevels);
} catch (error) {
  console.error('✗ 关卡列表获取失败:', error.message);
}
console.log('');

// 2. 测试读取关卡数据
console.log('2. 测试读取关卡数据');
try {
  const level1 = GameLevelManager.getLevel('chinese-beginner-level-1');
  if (level1) {
    console.log(`✓ 成功读取关卡: ${level1.title}`);
    console.log(`  - 难度: ${level1.difficulty}`);
    console.log(`  - 语言: ${level1.language}`);
    console.log(`  - 阶段数: ${level1.stages.length}`);
    console.log(`  - 预计时间: ${level1.estimatedTime}分钟`);
  } else {
    console.log('✗ 关卡数据不存在');
  }
} catch (error) {
  console.error('✗ 读取关卡数据失败:', error.message);
}
console.log('');

// 3. 测试初始化用户进度
console.log('3. 测试初始化用户进度');
try {
  const progress = GameLevelManager.initializeUserProgress(testUserId, 'chinese-beginner-level-1');
  console.log('✓ 成功初始化用户进度:');
  console.log(`  - 用户ID: ${progress.userId}`);
  console.log(`  - 关卡ID: ${progress.levelId}`);
  console.log(`  - 是否解锁: ${progress.isUnlocked}`);
  console.log(`  - 当前阶段: ${progress.currentStage}`);
  console.log(`  - 星级: ${progress.stars}`);
} catch (error) {
  console.error('✗ 初始化用户进度失败:', error.message);
}
console.log('');

// 4. 测试关卡完成处理
console.log('4. 测试关卡完成处理');
try {
  const completionResult = GameLevelManager.processLevelCompletion(
    testUserId,
    'chinese-beginner-level-1',
    'chinese-beginner-level-1-stage-1',
    85, // 得分
    300, // 用时（秒）
    ['greeting-challenge-1', 'greeting-challenge-2'] // 完成的挑战
  );
  console.log('✓ 成功处理关卡完成:');
  console.log(`  - 得分: ${completionResult.score}`);
  console.log(`  - 用时: ${completionResult.timeSpent}秒`);
  console.log(`  - 星级: ${completionResult.stars}`);
  console.log(`  - 关卡是否完成: ${completionResult.isLevelCompleted}`);
  console.log(`  - 新解锁关卡: ${completionResult.unlockedLevels.join(', ') || '无'}`);
} catch (error) {
  console.error('✗ 关卡完成处理失败:', error.message);
}
console.log('');

// 5. 测试获取用户所有进度
console.log('5. 测试获取用户所有进度');
try {
  const allProgress = GameLevelManager.getAllUserProgress(testUserId);
  console.log(`✓ 用户共有 ${allProgress.length} 个关卡进度:`);
  allProgress.forEach((progress, index) => {
    console.log(`  ${index + 1}. ${progress.levelId}`);
    console.log(`     - 总得分: ${progress.totalScore}`);
    console.log(`     - 最佳得分: ${progress.bestScore}`);
    console.log(`     - 星级: ${progress.stars}`);
    console.log(`     - 完成阶段: ${progress.completedStages.length}`);
  });
} catch (error) {
  console.error('✗ 获取用户进度失败:', error.message);
}
console.log('');

// 6. 测试关卡筛选
console.log('6. 测试关卡筛选');
try {
  const beginnerLevels = GameLevelManager.getLevelsByFilter('beginner', 'chinese');
  console.log(`✓ 找到 ${beginnerLevels.length} 个初级汉语关卡:`);
  beginnerLevels.forEach((level, index) => {
    console.log(`  ${index + 1}. ${level.title}`);
  });
} catch (error) {
  console.error('✗ 关卡筛选失败:', error.message);
}
console.log('');

// 7. 测试关卡解锁检查
console.log('7. 测试关卡解锁检查');
try {
  const isLevel1Unlocked = GameLevelManager.checkLevelUnlocked(testUserId, 'chinese-beginner-level-1');
  const isLevel2Unlocked = GameLevelManager.checkLevelUnlocked(testUserId, 'english-beginner-level-1');
  console.log(`✓ 关卡解锁状态:`);
  console.log(`  - chinese-beginner-level-1: ${isLevel1Unlocked ? '已解锁' : '未解锁'}`);
  console.log(`  - english-beginner-level-1: ${isLevel2Unlocked ? '已解锁' : '未解锁'}`);
} catch (error) {
  console.error('✗ 关卡解锁检查失败:', error.message);
}
console.log('');

// 8. 测试数据备份
console.log('8. 测试数据备份');
try {
  const backupPath = GameLevelManager.backupUserProgress(testUserId, 'chinese-beginner-level-1');
  if (backupPath) {
    console.log(`✓ 成功备份用户进度: ${backupPath}`);
  } else {
    console.log('✗ 备份失败');
  }
} catch (error) {
  console.error('✗ 数据备份失败:', error.message);
}
console.log('');

console.log('=== 关卡系统测试完成 ===');