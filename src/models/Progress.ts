import { dataStorage } from '../utils/dataStorage';

export interface LevelProgress {
  levelId: string;
  unlocked: boolean;
  completed: boolean;
  score: number;
  stars: number; // 1-5星评价
  attempts: number;
  lastAttemptAt?: string;
  completedAt?: string;
  highestScore: number; // 最高分数
  totalScore: number; // 累计总分
  lastPlayedAt?: string; // 最后游玩时间
  timeSpent?: number; // 游戏时长(秒)
  achievements?: string[]; // 成就列表
}

export interface UserProgress {
  userId: string;
  courseId: string;
  currentLevel: string;
  totalScore: number;
  levelsProgress: { [levelId: string]: LevelProgress };
  createdAt: string;
  updatedAt: string;
}

export interface GameSession {
  sessionId: string;
  userId: string;
  levelId: string;
  startTime: string;
  endTime?: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  completed: boolean;
}

export class ProgressManager {
  private static readonly PROGRESS_CATEGORY = 'progress';
  private static readonly SESSION_CATEGORY = 'sessions';

  /**
   * 创建用户进度记录
   */
  static createProgress(progress: UserProgress): boolean {
    const progressId = `${progress.userId}_${progress.courseId}`;
    return dataStorage.writeData(this.PROGRESS_CATEGORY, progressId, progress);
  }

  /**
   * 获取用户进度
   */
  static getProgress(userId: string, courseId: string): UserProgress | null {
    const progressId = `${userId}_${courseId}`;
    return dataStorage.readData<UserProgress>(this.PROGRESS_CATEGORY, progressId);
  }

  /**
   * 更新用户进度
   */
  static updateProgress(progress: UserProgress): boolean {
    const progressId = `${progress.userId}_${progress.courseId}`;
    progress.updatedAt = new Date().toISOString();
    return dataStorage.writeData(this.PROGRESS_CATEGORY, progressId, progress);
  }

  /**
   * 初始化用户进度（首次学习某课程时调用）
   */
  static initializeProgress(userId: string, courseId: string, firstLevelId: string): UserProgress {
    const progress: UserProgress = {
      userId,
      courseId,
      currentLevel: firstLevelId,
      totalScore: 0,
      levelsProgress: {
        [firstLevelId]: {
          levelId: firstLevelId,
          unlocked: true,
          completed: false,
          score: 0,
          stars: 0,
          attempts: 0,
          highestScore: 0,
          totalScore: 0,
          timeSpent: 0,
          achievements: [],
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.createProgress(progress);
    return progress;
  }

  /**
   * 解锁关卡
   */
  static unlockLevel(userId: string, courseId: string, levelId: string): boolean {
    const progress = this.getProgress(userId, courseId);
    if (!progress) return false;

    if (!progress.levelsProgress[levelId]) {
      progress.levelsProgress[levelId] = {
        levelId,
        unlocked: true,
        completed: false,
        score: 0,
        stars: 0,
        attempts: 0,
        highestScore: 0,
        totalScore: 0,
        timeSpent: 0,
        achievements: [],
      };
    } else {
      progress.levelsProgress[levelId].unlocked = true;
    }

    return this.updateProgress(progress);
  }

  /**
   * 完成关卡并更新进度
   */
  static completeLevelWithScore(
    userId: string,
    courseId: string,
    levelId: string,
    score: number,
    stars: number
  ): boolean {
    const progress = this.getProgress(userId, courseId);
    if (!progress || !progress.levelsProgress[levelId]) return false;

    const levelProgress = progress.levelsProgress[levelId];
    levelProgress.completed = true;
    levelProgress.score = Math.max(levelProgress.score, score);
    levelProgress.stars = Math.max(levelProgress.stars, stars);
    levelProgress.attempts += 1;
    levelProgress.completedAt = new Date().toISOString();
    levelProgress.lastAttemptAt = new Date().toISOString();

    progress.totalScore += score;

    return this.updateProgress(progress);
  }

  /**
   * 检查关卡是否已解锁
   */
  static isLevelUnlocked(userId: string, courseId: string, levelId: string): boolean {
    const progress = this.getProgress(userId, courseId);
    if (!progress) return false;

    return progress.levelsProgress[levelId]?.unlocked || false;
  }

  /**
   * 检查关卡是否已完成
   */
  static isLevelCompleted(userId: string, courseId: string, levelId: string): boolean {
    const progress = this.getProgress(userId, courseId);
    if (!progress) return false;

    return progress.levelsProgress[levelId]?.completed || false;
  }

  /**
   * 获取关卡进度详情
   */
  static getLevelProgress(userId: string, courseId: string, levelId: string): LevelProgress | null {
    const progress = this.getProgress(userId, courseId);
    if (!progress) return null;

    return progress.levelsProgress[levelId] || null;
  }

  /**
   * 创建游戏会话
   */
  static createSession(session: GameSession): boolean {
    return dataStorage.writeData(this.SESSION_CATEGORY, session.sessionId, session);
  }

  /**
   * 获取游戏会话
   */
  static getSession(sessionId: string): GameSession | null {
    return dataStorage.readData<GameSession>(this.SESSION_CATEGORY, sessionId);
  }

  /**
   * 更新游戏会话
   */
  static updateSession(session: GameSession): boolean {
    return dataStorage.writeData(this.SESSION_CATEGORY, session.sessionId, session);
  }

  /**
   * 结束游戏会话
   */
  static endSession(sessionId: string, score: number, completed: boolean): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;

    session.endTime = new Date().toISOString();
    session.score = score;
    session.completed = completed;

    return this.updateSession(session);
  }

  /**
   * 获取用户所有会话
   */
  static getUserSessions(userId: string): GameSession[] {
    const allSessions = dataStorage.listFiles(this.SESSION_CATEGORY);
    const userSessions: GameSession[] = [];

    for (const sessionFile of allSessions) {
      const session = dataStorage.readData<GameSession>(this.SESSION_CATEGORY, sessionFile);
      if (session && session.userId === userId) {
        userSessions.push(session);
      }
    }

    return userSessions.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
  }

  /**
   * 重置用户进度（保留历史记录）
   */
  static resetProgress(userId: string, courseId: string, firstLevelId: string): boolean {
    // 备份当前进度
    const progressId = `${userId}_${courseId}`;
    const backupFilename = dataStorage.createBackup(this.PROGRESS_CATEGORY, progressId);
    
    if (backupFilename) {
      // 创建新的进度记录
      const newProgress = this.initializeProgress(userId, courseId, firstLevelId);
      return true;
    }
    
    return false;
  }

  /**
   * 导出用户进度数据
   */
  static exportProgress(userId: string): any {
    const allProgress = dataStorage.listFiles(this.PROGRESS_CATEGORY);
    const userProgressData: any[] = [];

    for (const progressFile of allProgress) {
      if (progressFile.startsWith(userId)) {
        const progress = dataStorage.readData<UserProgress>(this.PROGRESS_CATEGORY, progressFile);
        if (progress) {
          userProgressData.push(progress);
        }
      }
    }

    const sessions = this.getUserSessions(userId);

    return {
      exportTime: new Date().toISOString(),
      userId,
      progress: userProgressData,
      sessions,
    };
  }
}