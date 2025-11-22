import { UserManager, User } from '../models/User';
import { GameLevelManager, GameLevel } from '../models/Level';
import { AchievementManager, Achievement } from '../models/Achievement';
import { dataStorage } from './dataStorage';
import { getLogger } from './logger';

// 获取 logger 实例
const logger = getLogger();

export interface GameLevelProgress {
  userId: string;
  levelId: string;
  stars: number;
  highestScore: number;
  totalScore: number;
  attempts: number;
  completedAt: string | null;
  lastPlayedAt: string;
  achievements: string[];
  timeSpent: number;
}


/**
 * 用户游戏进度管理器
 * 负责管理用户的关卡进度、成就和统计数据
 */
export class UserGameProgressManager {
  private static initializedUsers: Set<string> = new Set();

  /**
   * 解锁用户的起始关卡
   * @param userId 用户ID
   * @returns 解锁的关卡ID数组
   */
  static initializeUserProgress(userId: string): string[] {
    if (this.initializedUsers.has(userId)) {
      return [];
    }

    try {
      const user = UserManager.getUser(userId);
      if (!user) {
        logger.error('初始化用户进度失败：用户不存在', { userId });
        return [];
      }

      this.initializedUsers.add(userId);

      // 获取所有无需解锁条件的起始关卡
      const allLevels = GameLevelManager.getAllLevels();
      const startingLevels = allLevels.filter(level => 
        level.unlockConditions.length === 0 || 
        level.unlockConditions.some(condition => condition.type === 'level' && condition.target === '' && condition.value === 0)
      );

      if (startingLevels.length === 0) {
        logger.warn('没有找到起始关卡', { userId });
        return [];
      }

      // 确保用户数据包含游戏关卡字段
      if (!user.gameLevels) {
        user.gameLevels = {
          unlockedLevelIds: [],
          completedLevelIds: []
        };
      }

      // 添加起始关卡到已解锁列表
      const startingLevelIds = startingLevels.map(level => level.id);
      const newlyUnlockedLevelIds = startingLevelIds.filter(id => 
        !user.gameLevels.unlockedLevelIds.includes(id)
      );
      
      if (newlyUnlockedLevelIds.length > 0) {
        user.gameLevels.unlockedLevelIds = [
          ...user.gameLevels.unlockedLevelIds,
          ...newlyUnlockedLevelIds
        ];

        // 更新用户数据
        UserManager.updateUser(user);
        
        logger.info('已初始化用户起始关卡', { 
          userId, 
          unlockedLevelCount: newlyUnlockedLevelIds.length,
          unlockedLevelIds: newlyUnlockedLevelIds
        });
      } else if (newlyUnlockedLevelIds.length === 0) {
        logger.info('用户已有起始关卡，无需初始化', { 
          userId, 
          existingLevelCount: user.gameLevels.unlockedLevelIds.length 
        });
      }

      return newlyUnlockedLevelIds;
    } catch (error) {
      logger.error('初始化用户进度时发生异常', { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * 检查并解锁用户可达成的新关卡
   * @param userId 用户ID
   * @returns 新解锁的关卡ID数组
   */
  static checkAndUnlockNewLevels(userId: string): string[] {
    try {
      const user = UserManager.getUser(userId);
      if (!user || !user.gameLevels) {
        logger.error('检查解锁关卡失败：用户不存在或数据不完整', { userId });
        return [];
      }

      const allLevels = GameLevelManager.getAllLevels();
      const unlockedLevelIds = user.gameLevels.unlockedLevelIds || [];
      const completedLevelIds = user.gameLevels.completedLevelIds || [];
      
      // 获取尚未解锁的关卡
      const lockedLevels = allLevels.filter(level => 
        !unlockedLevelIds.includes(level.id)
      );

      if (lockedLevels.length === 0) {
        logger.info('用户已解锁所有关卡', { userId });
        return [];
      }

      // 计算用户总分
      const totalScore = user.stats?.totalScore || 0;

      // 检查每个锁定的关卡是否满足解锁条件
      const newlyUnlockedLevels: GameLevel[] = [];

      for (const level of lockedLevels) {
        // 检查是否满足所有解锁条件
        const conditionsMet = level.unlockConditions.every(condition => {
          switch (condition.type) {
            case 'level':
              // 检查指定关卡是否完成，或者达到一定星级
              if (!condition.target) return true; // 如果没有指定目标关卡，则条件自动满足
              
              // 获取目标关卡的进度
              const targetLevelProgress = dataStorage.readData<GameLevelProgress>(
                'level-progress',
                `${userId}_${condition.target}`
              );

              if (!targetLevelProgress) return false;
              return targetLevelProgress.stars >= condition.value;
            
            case 'score':
              // 检查总分是否达到要求
              return totalScore >= condition.value;
            
            case 'achievement':
              // 检查是否获得了指定成就
              return user.achievements?.unlockedAchievements.includes(condition.target) || false;
            
            default:
              logger.warn('未知的解锁条件类型', { 
                userId, 
                levelId: level.id,
                conditionType: condition.type 
              });
              return false;
          }
        });

        if (conditionsMet) {
          newlyUnlockedLevels.push(level);
        }
      }

      if (newlyUnlockedLevels.length === 0) {
        logger.info('没有新解锁的关卡', { userId });
        return [];
      }

      // 更新用户的已解锁关卡列表
      const newlyUnlockedLevelIds = newlyUnlockedLevels.map(level => level.id);
      user.gameLevels.unlockedLevelIds = [
        ...user.gameLevels.unlockedLevelIds,
        ...newlyUnlockedLevelIds
      ];

      // 更新用户数据
      UserManager.updateUser(user);

      logger.info('用户解锁了新关卡', { 
        userId, 
        newlyUnlockedCount: newlyUnlockedLevelIds.length,
        newlyUnlockedLevelIds
      });

      return newlyUnlockedLevelIds;
    } catch (error) {
      logger.error('检查解锁关卡时发生异常', { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * 更新关卡完成状态
   * @param userId 用户ID
   * @param levelId 关卡ID
   * @param stars 获得的星星数（0-3）
   * @param score 本次获得的分数
   * @returns 是否更新成功
   */
  static updateLevelCompletion(
    userId: string,
    levelId: string,
    stars: number,
    score: number,
    timeSpent: number
  ): boolean {
    try {
      const user = UserManager.getUser(userId);
      if (!user || !user.gameLevels) {
        logger.error('更新关卡完成状态失败：用户不存在或数据不完整', { userId, levelId });
        return false;
      }

      // 验证关卡是否存在
      const level = GameLevelManager.getLevel(levelId);
      if (!level) {
        logger.error('更新关卡完成状态失败：关卡不存在', { userId, levelId });
        return false;
      }

      // 验证关卡是否已解锁
      if (!user.gameLevels.unlockedLevelIds.includes(levelId)) {
        logger.warn('尝试更新未解锁的关卡进度', { userId, levelId });
        return false;
      }

      // 读取当前关卡进度
      const progressKey = `${userId}_${levelId}`;
      let levelProgress: GameLevelProgress = dataStorage.readData('level-progress', progressKey) || {
        userId,
        levelId,
        stars: 0,
        highestScore: 0,
        totalScore: 0,
        attempts: 0,
        completedAt: null,
        lastPlayedAt: new Date().toISOString(),
        achievements: [],
        timeSpent: 0
      };

      // 更新进度数据
      const isNewRecord = score > levelProgress.highestScore;
      const isFirstCompletion = levelProgress.stars === 0 && stars > 0;
      
      // 如果获得了更多星星，更新星星数
      if (stars > levelProgress.stars) {
        levelProgress.stars = stars;
      }

      // 更新统计数据
      levelProgress.highestScore = Math.max(levelProgress.highestScore, score);
      levelProgress.totalScore += score;
      levelProgress.attempts += 1;
      levelProgress.lastPlayedAt = new Date().toISOString();
      levelProgress.timeSpent += timeSpent;
      
      // 如果是首次完成，记录完成时间
      if (isFirstCompletion) {
        levelProgress.completedAt = new Date().toISOString();
        
        // 将关卡添加到已完成列表（如果尚未添加）
        if (!user.gameLevels.completedLevelIds.includes(levelId)) {
          user.gameLevels.completedLevelIds.push(levelId);
        }
      }

      // 保存关卡进度
      dataStorage.writeData('level-progress', progressKey, levelProgress);

      // 更新用户统计数据
      if (!user.stats) {
        user.stats = {
          totalScore: 0,
          correctAnswers: 0,
          totalAttempts: 0,
          totalTimeSpent: 0,
          streak: { current: 0, longest: 0 }
        };
      }
      user.stats.totalScore += score;
      user.stats.totalAttempts += 1;
      user.stats.totalTimeSpent += timeSpent;

      // 更新用户数据
      UserManager.updateUser(user);

      // 创建关卡备份
      dataStorage.createBackup('level-progress', progressKey);

      logger.info('更新关卡完成状态成功', { 
        userId, 
        levelId, 
        stars, 
        score,
        isNewRecord,
        isFirstCompletion,
        totalScore: user.stats.totalScore
      });

      return true;
    } catch (error) {
      logger.error('更新关卡完成状态时发生异常', { 
        userId, 
        levelId,
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * 获取用户的关卡进度
   * @param userId 用户ID
   * @param levelId 关卡ID
   */
  static getLevelProgress(userId: string, levelId: string): any {
    try {
      const progressKey = `${userId}_${levelId}`;
      return dataStorage.readData('level-progress', progressKey);
    } catch (error) {
      logger.error('获取关卡进度时发生异常', { 
        userId, 
        levelId,
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * 获取用户的所有关卡进度
   * @param userId 用户ID
   */
  static getAllLevelProgress(userId: string): any[] {
    try {
      const user = UserManager.getUser(userId);
      if (!user || !user.gameLevels) {
        logger.error('获取所有关卡进度失败：用户不存在或数据不完整', { userId });
        return [];
      }

      const progressList = [];
      for (const levelId of user.gameLevels.unlockedLevelIds) {
        const progress = this.getLevelProgress(userId, levelId);
        if (progress) {
          progressList.push(progress);
        }
      }

      return progressList;
    } catch (error) {
      logger.error('获取所有关卡进度时发生异常', { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * 解锁成就
   * @param userId 用户ID
   * @param achievementId 成就ID
   * @returns 是否成功解锁
   */
  static unlockAchievement(userId: string, achievementId: string): boolean {
    try {
      const user = UserManager.getUser(userId);
      if (!user) {
        logger.error('解锁成就失败：用户不存在', { userId, achievementId });
        return false;
      }

      // 验证成就是否存在
      const achievement = AchievementManager.getAchievement(achievementId);
      if (!achievement) {
        logger.error('解锁成就失败：成就不存在', { userId, achievementId });
        return false;
      }

      // 确保用户数据包含成就字段
      if (!user.achievements) {
        user.achievements = {
          unlockedAchievements: []
        };
      }

      // 检查成就是否已解锁
      if (user.achievements.unlockedAchievements.includes(achievementId)) {
        logger.info('成就已解锁，无需重复解锁', { userId, achievementId });
        return true;
      }

      // 添加成就到已解锁列表
      user.achievements.unlockedAchievements.push(achievementId);
      user.achievements.lastUnlockedAt = new Date().toISOString();

      // 更新用户数据
      const success = UserManager.updateUser(user);

      if (success) {
        logger.info('成就解锁成功', { userId, achievementId, achievementTitle: achievement.title });
      } else {
        logger.error('成就解锁失败：无法更新用户数据', { userId, achievementId });
      }

      return success;
    } catch (error) {
      logger.error('解锁成就时发生异常', { 
        userId, 
        achievementId,
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * 检查用户是否满足某个成就的解锁条件
   * @param userId 用户ID
   * @param achievementId 成就ID
   * @returns 是否满足解锁条件
   */
  static checkAchievementEligibility(userId: string, achievementId: string): boolean {
    try {
      const user = UserManager.getUser(userId);
      if (!user) {
        logger.error('检查成就条件失败：用户不存在', { userId, achievementId });
        return false;
      }

      const achievement = AchievementManager.getAchievement(achievementId);
      if (!achievement) {
        logger.error('检查成就条件失败：成就不存在', { userId, achievementId });
        return false;
      }

      // 如果成就已解锁，直接返回true
      if (user.achievements?.unlockedAchievements.includes(achievementId)) {
        return true;
      }

      // 根据成就类型检查条件
      switch (achievement.type) {
        case 'level_completion':
          // 检查是否完成了指定关卡
          return user.gameLevels?.completedLevelIds.includes(achievement.criteria) || false;
        
        case 'score':
          // 检查总分是否达到要求
          return (user.stats?.totalScore || 0) >= parseInt(achievement.criteria, 10);
        
        case 'streak':
          // 检查连续学习天数
          return (user.stats?.streak?.current || 0) >= parseInt(achievement.criteria, 10);
        
        case 'collection':
          // 检查是否解锁了所有指定关卡
          const requiredLevels = achievement.criteria.split(',').map(id => id.trim());
          return requiredLevels.every(levelId => user.gameLevels?.completedLevelIds.includes(levelId) || false);
        
        default:
          logger.warn('未知的成就类型', { userId, achievementId, achievementType: achievement.type });
          return false;
      }
    } catch (error) {
      logger.error('检查成就条件时发生异常', { 
        userId, 
        achievementId,
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * 检查并解锁用户可达成的所有成就
   * @param userId 用户ID
   * @returns 新解锁的成就ID数组
   */
  static checkAndUnlockAchievements(userId: string): string[] {
    try {
      const user = UserManager.getUser(userId);
      if (!user) {
        logger.error('检查解锁成就失败：用户不存在', { userId });
        return [];
      }

      const allAchievements = AchievementManager.getAllAchievements();
      const unlockedAchievements = user.achievements?.unlockedAchievements || [];
      
      // 获取尚未解锁的成就
      const lockedAchievements = allAchievements.filter(achievement => 
        !unlockedAchievements.includes(achievement.id)
      );

      if (lockedAchievements.length === 0) {
        logger.info('用户已解锁所有成就', { userId });
        return [];
      }

      // 检查每个锁定的成就是否满足解锁条件
      const newlyUnlockedAchievementIds: string[] = [];

      for (const achievement of lockedAchievements) {
        const isEligible = this.checkAchievementEligibility(userId, achievement.id);
        
        if (isEligible) {
          const success = this.unlockAchievement(userId, achievement.id);
          if (success) {
            newlyUnlockedAchievementIds.push(achievement.id);
          }
        }
      }

      if (newlyUnlockedAchievementIds.length > 0) {
        logger.info('用户解锁了新成就', { 
          userId, 
          newlyUnlockedCount: newlyUnlockedAchievementIds.length,
          newlyUnlockedAchievementIds
        });
      }

      return newlyUnlockedAchievementIds;
    } catch (error) {
      logger.error('检查解锁成就时发生异常', { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return [];
    }
  }

  /**
   * 获取用户的游戏统计数据
   * @param userId 用户ID
   */
  static getUserGameStats(userId: string): any {
    try {
      const user = UserManager.getUser(userId);
      if (!user) {
        logger.error('获取用户游戏统计失败：用户不存在', { userId });
        return null;
      }

      const levelProgress = this.getAllLevelProgress(userId);
      
      // 计算额外统计数据
      const totalLevels = GameLevelManager.getAllLevels().length;
      const completedLevels = user.gameLevels?.completedLevelIds.length || 0;
      const unlockedLevels = user.gameLevels?.unlockedLevelIds.length || 0;
      const totalAchievements = AchievementManager.getAllAchievements().length;
      const unlockedAchievements = user.achievements?.unlockedAchievements.length || 0;
      
      // 计算平均完成时间（秒）
      const totalTimeSpent = levelProgress.reduce((sum, progress) => sum + (progress.timeSpent || 0), 0);
      const averageTimePerLevel = completedLevels > 0 ? totalTimeSpent / completedLevels : 0;
      
      // 计算平均分数
      const totalScore = levelProgress.reduce((sum, progress) => sum + (progress.totalScore || 0), 0);
      const averageScorePerLevel = completedLevels > 0 ? totalScore / completedLevels : 0;
      
      // 计算最高分关卡
      let highestScoringLevel = null;
      let highestScore = -1;
      
      for (const progress of levelProgress) {
        if (progress.highestScore > highestScore) {
          highestScore = progress.highestScore;
          highestScoringLevel = progress.levelId;
        }
      }
      
      // 获取语言分布
      const languageProgress: Record<string, number> = {};
      const levels = GameLevelManager.getAllLevels();
      
      for (const levelId of user.gameLevels?.completedLevelIds || []) {
        const level = levels.find(l => l.id === levelId);
        if (level) {
          const lang = level.language;
          languageProgress[lang] = (languageProgress[lang] || 0) + 1;
        }
      }

      return {
        totalScore: user.stats?.totalScore || 0,
        totalLevels,
        completedLevels,
        unlockedLevels,
        completionRate: totalLevels > 0 ? (completedLevels / totalLevels) * 100 : 0,
        totalAchievements,
        unlockedAchievements,
        achievementRate: totalAchievements > 0 ? (unlockedAchievements / totalAchievements) * 100 : 0,
        streak: {
          current: user.stats?.streak?.current || 0,
          longest: user.stats?.streak?.longest || 0
        },
        totalTimeSpent,
        averageTimePerLevel,
        averageScorePerLevel,
        highestScoringLevel,
        highestScore,
        correctAnswers: user.stats?.correctAnswers || 0,
        totalAttempts: user.stats?.totalAttempts || 0,
        accuracy: user.stats?.totalAttempts > 0 ? 
          ((user.stats.correctAnswers / user.stats.totalAttempts) * 100) : 0,
        languageProgress
      };
    } catch (error) {
      logger.error('获取用户游戏统计时发生异常', { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }
}

export default UserGameProgressManager;