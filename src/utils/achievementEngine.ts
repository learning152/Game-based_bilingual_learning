import { AchievementManager, Achievement, UserAchievement } from '../models/Achievement';
import { GameLevelManager, UserLevelProgress, LevelCompletionResult } from '../models/Level';
import { ProgressManager, UserProgress } from '../models/Progress';
// import { logger } from './logger';
import { getLogger } from './logger';

// 获取 logger 实例
const logger = getLogger();

/**
 * 成就触发条件类型
 */
export interface AchievementCondition {
  type: 'level_complete' | 'score_threshold' | 'consecutive_days' | 'perfect_score' | 'time_challenge' | 'total_levels' | 'streak' | 'first_try';
  value: number;
  target?: string; // 目标关卡ID或其他特定目标
  description: string;
}

/**
 * 成就触发规则
 */
export interface AchievementRule {
  achievementId: string;
  conditions: AchievementCondition[];
  requireAll: boolean; // true: 需要满足所有条件, false: 满足任一条件即可
}

/**
 * 成就解锁引擎
 */
export class AchievementEngine {
  private static rules: AchievementRule[] = [];

  /**
   * 初始化成就规则
   */
  static initializeRules(): void {
    this.rules = [
      // 入门成就
      {
        achievementId: 'first_level_complete',
        conditions: [
          {
            type: 'level_complete',
            value: 1,
            description: '完成第一个关卡'
          }
        ],
        requireAll: true
      },
      
      // 完美主义者
      {
        achievementId: 'perfect_score',
        conditions: [
          {
            type: 'perfect_score',
            value: 100,
            description: '在任意关卡中获得满分'
          }
        ],
        requireAll: true
      },
      
      // 速度挑战者
      {
        achievementId: 'speed_runner',
        conditions: [
          {
            type: 'time_challenge',
            value: 60, // 60秒内完成
            description: '在60秒内完成任意关卡'
          }
        ],
        requireAll: true
      },
      
      // 坚持不懈
      {
        achievementId: 'persistent_learner',
        conditions: [
          {
            type: 'consecutive_days',
            value: 7,
            description: '连续7天学习'
          }
        ],
        requireAll: true
      },
      
      // 关卡征服者
      {
        achievementId: 'level_master',
        conditions: [
          {
            type: 'total_levels',
            value: 10,
            description: '完成10个关卡'
          }
        ],
        requireAll: true
      },
      
      // 一次通关
      {
        achievementId: 'first_try_master',
        conditions: [
          {
            type: 'first_try',
            value: 1,
            description: '首次尝试就通过关卡'
          }
        ],
        requireAll: true
      },
      
      // 连胜记录
      {
        achievementId: 'win_streak',
        conditions: [
          {
            type: 'streak',
            value: 5,
            description: '连续通过5个关卡而不失败'
          }
        ],
        requireAll: true
      }
    ];

    logger.info('成就规则初始化完成', { ruleCount: this.rules.length });
  }

  /**
   * 处理关卡完成事件，检查并解锁成就
   */
  static async processLevelCompletion(result: LevelCompletionResult): Promise<string[]> {
    const newAchievements: string[] = [];
    
    try {
      // 获取用户所有进度数据
      const allProgress = GameLevelManager.getAllUserProgress(result.userId);
      const userAchievements = AchievementManager.getUserAchievements(result.userId);
      const existingAchievementIds = userAchievements.map(ua => ua.achievementId);

      // 检查每个成就规则
      for (const rule of this.rules) {
        // 跳过已获得的成就
        if (existingAchievementIds.includes(rule.achievementId)) {
          continue;
        }

        // 检查是否满足成就条件
        const isUnlocked = this.checkAchievementConditions(
          rule, 
          result, 
          allProgress, 
          userAchievements
        );

        if (isUnlocked) {
          // 解锁成就
          const userAchievement: UserAchievement = {
            userId: result.userId,
            achievementId: rule.achievementId,
            unlockedAt: new Date().toISOString()
          };

          if (AchievementManager.unlockAchievement(userAchievement)) {
            newAchievements.push(rule.achievementId);
            logger.info('成就解锁', { 
              userId: result.userId, 
              achievementId: rule.achievementId 
            });
          }
        }
      }

      return newAchievements;
    } catch (error) {
      logger.error('处理成就解锁时发生错误', { error, userId: result.userId });
      return [];
    }
  }

  /**
   * 检查成就条件是否满足
   */
  private static checkAchievementConditions(
    rule: AchievementRule,
    result: LevelCompletionResult,
    allProgress: UserLevelProgress[],
    userAchievements: UserAchievement[]
  ): boolean {
    const conditionResults = rule.conditions.map(condition => 
      this.checkSingleCondition(condition, result, allProgress, userAchievements)
    );

    return rule.requireAll 
      ? conditionResults.every(r => r) 
      : conditionResults.some(r => r);
  }

  /**
   * 检查单个成就条件
   */
  private static checkSingleCondition(
    condition: AchievementCondition,
    result: LevelCompletionResult,
    allProgress: UserLevelProgress[],
    userAchievements: UserAchievement[]
  ): boolean {
    switch (condition.type) {
      case 'level_complete':
        // 检查完成的关卡数量
        const completedLevels = allProgress.filter(p => 
          p.completedStages.length > 0 && p.stars > 0
        ).length;
        return completedLevels >= condition.value;

      case 'score_threshold':
        // 检查分数阈值
        return result.score >= condition.value;

      case 'perfect_score':
        // 检查是否获得满分
        return result.score >= condition.value;

      case 'time_challenge':
        // 检查是否在规定时间内完成
        return result.timeSpent <= condition.value;

      case 'total_levels':
        // 检查总完成关卡数
        const totalCompleted = allProgress.filter(p => 
          p.stars >= 1
        ).length;
        return totalCompleted >= condition.value;

      case 'first_try':
        // 检查是否首次尝试成功
        const levelProgress = allProgress.find(p => p.levelId === result.levelId);
        return levelProgress?.attempts === 1 && result.stars >= 1;

      case 'streak':
        // 检查连胜记录（这里简化实现，实际需要更复杂的逻辑）
        const recentCompletedLevels = allProgress
          .filter(p => p.stars >= 1)
          .sort((a, b) => new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime())
          .slice(0, condition.value);
        return recentCompletedLevels.length >= condition.value;

      case 'consecutive_days':
        // 检查连续学习天数（需要基于更详细的学习记录）
        // 这里简化实现，实际需要维护详细的学习日历
        const uniqueDays = new Set(
          allProgress.map(p => p.lastPlayed.split('T')[0])
        );
        return uniqueDays.size >= condition.value;

      default:
        return false;
    }
  }

  /**
   * 获取用户可获得的成就进度
   */
  static getUserAchievementProgress(userId: string): Array<{
    achievementId: string;
    achievement: Achievement | null;
    isUnlocked: boolean;
    progress: number; // 0-100 百分比
    description: string;
  }> {
    const allProgress = GameLevelManager.getAllUserProgress(userId);
    const userAchievements = AchievementManager.getUserAchievements(userId);
    const existingAchievementIds = userAchievements.map(ua => ua.achievementId);

    return this.rules.map(rule => {
      const achievement = AchievementManager.getAchievement(rule.achievementId);
      const isUnlocked = existingAchievementIds.includes(rule.achievementId);
      
      let progress = 0;
      if (!isUnlocked && rule.conditions.length > 0) {
        // 计算第一个条件的进度（简化实现）
        const condition = rule.conditions[0];
        progress = this.calculateConditionProgress(condition, allProgress);
      } else if (isUnlocked) {
        progress = 100;
      }

      return {
        achievementId: rule.achievementId,
        achievement,
        isUnlocked,
        progress: Math.min(100, progress),
        description: rule.conditions.map(c => c.description).join(', ')
      };
    });
  }

  /**
   * 计算条件完成进度
   */
  private static calculateConditionProgress(
    condition: AchievementCondition,
    allProgress: UserLevelProgress[]
  ): number {
    switch (condition.type) {
      case 'level_complete':
      case 'total_levels':
        const completedCount = allProgress.filter(p => p.stars >= 1).length;
        return (completedCount / condition.value) * 100;

      case 'streak':
        const recentCompleted = allProgress
          .filter(p => p.stars >= 1)
          .slice(0, condition.value).length;
        return (recentCompleted / condition.value) * 100;

      case 'consecutive_days':
        const uniqueDays = new Set(
          allProgress.map(p => p.lastPlayed.split('T')[0])
        );
        return (uniqueDays.size / condition.value) * 100;

      default:
        return 0;
    }
  }

  /**
   * 批量检查用户成就（用于修复或重新计算）
   */
  static async recalculateUserAchievements(userId: string): Promise<string[]> {
    const newAchievements: string[] = [];
    
    try {
      const allProgress = GameLevelManager.getAllUserProgress(userId);
      const userAchievements = AchievementManager.getUserAchievements(userId);
      const existingAchievementIds = userAchievements.map(ua => ua.achievementId);

      // 为每个已完成的关卡模拟一个完成结果
      for (const progress of allProgress) {
        if (progress.stars > 0) {
          const mockResult: LevelCompletionResult = {
            levelId: progress.levelId,
            stageId: progress.completedStages[0] || 'stage1',
            userId,
            score: progress.bestScore,
            timeSpent: progress.timeSpent / progress.attempts || 0,
            stars: progress.stars,
            completedChallenges: progress.completedChallenges,
            newAchievements: [],
            unlockedLevels: [],
            isLevelCompleted: progress.completedStages.length > 0,
            completedAt: progress.firstCompletedAt || progress.lastPlayed
          };

          const levelAchievements = await this.processLevelCompletion(mockResult);
          newAchievements.push(...levelAchievements);
        }
      }

      return newAchievements;
    } catch (error) {
      logger.error('重新计算用户成就时发生错误', { error, userId });
      return [];
    }
  }

  /**
   * 创建默认成就数据
   */
  static createDefaultAchievements(): boolean {
    const defaultAchievements: Achievement[] = [
      {
        id: 'first_level_complete',
        type: 'progress',
        title: '初学者',
        description: '完成你的第一个关卡',
        criteria: '完成任意一个关卡',
        icon: '??',
        createdAt: new Date().toISOString()
      },
      {
        id: 'perfect_score',
        type: 'progress',
        title: '完美主义者',
        description: '在关卡中获得满分',
        criteria: '在任意关卡中获得100分',
        icon: '⭐',
        createdAt: new Date().toISOString()
      },
      {
        id: 'speed_runner',
        type: 'progress',
        title: '速度挑战者',
        description: '快速完成关卡的高手',
        criteria: '在60秒内完成任意关卡',
        icon: '⚡',
        createdAt: new Date().toISOString()
      },
      {
        id: 'persistent_learner',
        type: 'progress',
        title: '坚持不懈',
        description: '保持学习的好习惯',
        criteria: '连续7天进行学习',
        icon: '📚',
        createdAt: new Date().toISOString()
      },
      {
        id: 'level_master',
        type: 'progress',
        title: '关卡征服者',
        description: '完成大量关卡的学习达人',
        criteria: '完成10个关卡',
        icon: '👑',
        createdAt: new Date().toISOString()
      },
      {
        id: 'first_try_master',
        type: 'progress',
        title: '一次通关',
        description: '首次尝试就成功通过关卡',
        criteria: '首次尝试就通过任意关卡',
        icon: '🎖️',
        createdAt: new Date().toISOString()
      },
      {
        id: 'win_streak',
        type: 'progress',
        title: '连胜记录',
        description: '连续通过多个关卡而不失败',
        criteria: '连续通过5个关卡',
        icon: '🔥',
        createdAt: new Date().toISOString()
      }
    ];

    let allCreated = true;
    for (const achievement of defaultAchievements) {
      if (!AchievementManager.createAchievement(achievement)) {
        allCreated = false;
        logger.error('创建默认成就失败', { achievementId: achievement.id });
      }
    }

    if (allCreated) {
      logger.info('默认成就创建完成', { count: defaultAchievements.length });
    }

    return allCreated;
  }
}

// 初始化成就规则
AchievementEngine.initializeRules();