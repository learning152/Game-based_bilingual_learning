import { Challenge } from './Challenge';
import { dataStorage } from '../utils/dataStorage';

/**
 * 游戏关卡数据模型
 * 区别于Course中的Level，这是完整的游戏关卡系统
 */
export interface GameLevel {
  id: string;
  name: string; // 添加 name 属性
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: 'english' | 'chinese';
  icon?: string;
  stages: GameStage[];
  unlockConditions: UnlockCondition[];
  rewards: Reward[];
  estimatedTime: number; // 预计完成时间（分钟）
  tags: string[]; // 标签，如 ['vocabulary', 'grammar']
  createdAt: string;
  updatedAt: string;
}

export interface GameStage {
  id: string;
  title: string;
  description: string;
  challenges: Challenge[];
  minScore: number; // 通过所需最低分数（0-100）
  order: number; // 阶段顺序
}

export interface UnlockCondition {
  type: 'level' | 'score' | 'challenge' | 'achievement';
  target: string; // 目标ID
  value: number; // 所需值（如分数）
  description: string; // 条件描述
}

export interface Reward {
  type: 'points' | 'achievement' | 'unlock' | 'badge';
  value: string | number;
  description: string; // 奖励描述
}

export interface UserLevelProgress {
  userId: string;
  levelId: string;
  isUnlocked: boolean;
  currentStage: number;
  completedStages: string[];
  completedChallenges: string[];
  totalScore: number; // 总得分
  bestScore: number; // 最佳得分
  stars: number; // 星级评分 (1-3)
  attempts: number; // 尝试次数
  timeSpent: number; // 总用时（秒）
  firstCompletedAt?: string; // 首次完成时间
  lastPlayed: string; // 最后游戏时间
  achievements: string[]; // 获得的成就ID
}

/**
 * 关卡完成结果
 */
export interface LevelCompletionResult {
  levelId: string;
  stageId: string;
  userId: string;
  score: number;
  timeSpent: number;
  stars: number;
  completedChallenges: string[];
  newAchievements: string[];
  unlockedLevels: string[];
  isLevelCompleted: boolean;
  completedAt: string;
}

/**
 * 游戏关卡管理器
 */
export class GameLevelManager {
  private static readonly LEVEL_CATEGORY = 'game-levels';
  private static readonly PROGRESS_CATEGORY = 'level-progress';

  // ===== 关卡数据管理 =====
  
  /**
   * 创建新关卡
   */
  static createLevel(level: GameLevel): boolean {
    return dataStorage.writeData(this.LEVEL_CATEGORY, level.id, level);
  }

  /**
   * 获取关卡信息
   */
  static getLevel(levelId: string): GameLevel | null {
    return dataStorage.readData<GameLevel>(this.LEVEL_CATEGORY, levelId);
  }

  /**
   * 更新关卡信息
   */
  static updateLevel(level: GameLevel): boolean {
    level.updatedAt = new Date().toISOString();
    return dataStorage.writeData(this.LEVEL_CATEGORY, level.id, level);
  }

  /**
   * 删除关卡
   */
  static deleteLevel(levelId: string): boolean {
    return dataStorage.deleteData(this.LEVEL_CATEGORY, levelId);
  }

  /**
   * 列出所有关卡
   */
  static listLevels(): string[] {
    return dataStorage.listFiles(this.LEVEL_CATEGORY);
  }

  /**
   * 获取所有关卡对象
   * @returns 所有关卡对象的数组
   */
  static getAllLevels(): GameLevel[] {
    const levelIds = this.listLevels();
    const levels: GameLevel[] = [];

    for (const levelId of levelIds) {
      const level = this.getLevel(levelId);
      if (level) {
        levels.push(level);
      }
    }

    return levels;
  }

  /**
   * 获取指定难度和语言的关卡
   */
  static getLevelsByFilter(
    difficulty?: 'beginner' | 'intermediate' | 'advanced',
    language?: 'english' | 'chinese'
  ): GameLevel[] {
    const levelIds = this.listLevels();
    const levels: GameLevel[] = [];

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
  }

  // ===== 用户进度管理 =====

  /**
   * 创建或更新用户关卡进度
   */
  static updateUserProgress(progress: UserLevelProgress): boolean {
    const progressId = `${progress.userId}_${progress.levelId}`;
    progress.lastPlayed = new Date().toISOString();
    return dataStorage.writeData(this.PROGRESS_CATEGORY, progressId, progress);
  }

  /**
   * 获取用户关卡进度
   */
  static getUserProgress(userId: string, levelId: string): UserLevelProgress | null {
    const progressId = `${userId}_${levelId}`;
    return dataStorage.readData<UserLevelProgress>(this.PROGRESS_CATEGORY, progressId);
  }

  /**
   * 获取用户所有关卡进度
   */
  static getAllUserProgress(userId: string): UserLevelProgress[] {
    const allProgress = dataStorage.listFiles(this.PROGRESS_CATEGORY);
    const userProgress: UserLevelProgress[] = [];

    for (const progressFile of allProgress) {
      if (progressFile.startsWith(`${userId}_`)) {
        const progress = dataStorage.readData<UserLevelProgress>(this.PROGRESS_CATEGORY, progressFile);
        if (progress) {
          userProgress.push(progress);
        }
      }
    }

    return userProgress;
  }

  /**
   * 初始化用户关卡进度
   */
  static initializeUserProgress(userId: string, levelId: string): UserLevelProgress {
    const existingProgress = this.getUserProgress(userId, levelId);
    if (existingProgress) {
      return existingProgress;
    }

    // 检查解锁条件
    const isUnlocked = this.checkLevelUnlocked(userId, levelId);

    const newProgress: UserLevelProgress = {
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
  }

  // ===== 关卡解锁逻辑 =====

  /**
   * 检查关卡是否解锁
   */
  static checkLevelUnlocked(userId: string, levelId: string): boolean {
    const level = this.getLevel(levelId);
    if (!level) return false;

    // 检查所有解锁条件
    for (const condition of level.unlockConditions) {
      if (!this.checkUnlockCondition(userId, condition)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查单个解锁条件
   */
  private static checkUnlockCondition(userId: string, condition: UnlockCondition): boolean {
    switch (condition.type) {
      case 'level':
        // 需要完成指定关卡
        const targetProgress = this.getUserProgress(userId, condition.target);
        return (targetProgress?.stars ?? 0) >= condition.value;

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
  }

  /**
   * 更新关卡解锁状态
   */
  static updateLevelUnlockStatus(userId: string): string[] {
    const allLevels = this.listLevels();
    const newlyUnlockedLevels: string[] = [];

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
  }

  // ===== 关卡完成处理 =====

  /**
   * 处理关卡完成
   */
  static processLevelCompletion(
    userId: string, 
    levelId: string, 
    stageId: string,
    score: number, 
    timeSpent: number,
    completedChallenges: string[]
  ): LevelCompletionResult {
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
    const stars = this.calculateStars(score, level.stages.find(s => s.id === stageId)?.minScore || 60);
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

    const result: LevelCompletionResult = {
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

    return result;
  }

  /**
   * 计算星级评分
   */
  private static calculateStars(score: number, minScore: number): number {
    if (score < minScore) return 0;
    if (score < minScore + 20) return 1;
    if (score < minScore + 35) return 2;
    return 3;
  }

  // ===== 数据备份与恢复 =====

  /**
   * 备份关卡数据
   */
  static backupLevel(levelId: string): string | null {
    return dataStorage.createBackup(this.LEVEL_CATEGORY, levelId);
  }

  /**
   * 备份用户进度
   */
  static backupUserProgress(userId: string, levelId: string): string | null {
    const progressId = `${userId}_${levelId}`;
    return dataStorage.createBackup(this.PROGRESS_CATEGORY, progressId);
  }

  /**
   * 恢复关卡数据
   */
  static restoreLevel(backupFilename: string, levelId: string): boolean {
    return dataStorage.restoreFromBackup(backupFilename, this.LEVEL_CATEGORY, levelId);
  }

  /**
   * 恢复用户进度
   */
  static restoreUserProgress(backupFilename: string, userId: string, levelId: string): boolean {
    const progressId = `${userId}_${levelId}`;
    return dataStorage.restoreFromBackup(backupFilename, this.PROGRESS_CATEGORY, progressId);
  }
}