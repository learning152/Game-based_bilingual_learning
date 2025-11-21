import { dataStorage } from '../utils/dataStorage';

export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  lastLogin: string;
  learningProgress: {
    english: number;
    chinese: number;
  };
  // 游戏关卡和成就相关字段
  gameLevels: {
    unlockedLevelIds: string[];  // 已解锁的关卡ID
    completedLevelIds: string[]; // 已完成的关卡ID
    currentLevelId?: string;     // 当前正在进行的关卡ID
    lastPlayedAt?: string;       // 最后游戏时间
  };
  achievements: {
    unlockedAchievements: string[]; // 已解锁的成就ID
    lastUnlockedAt?: string;        // 最后解锁成就时间
  };
  // 学习统计
  stats: {
    totalScore: number;           // 总分数
    correctAnswers: number;       // 正确回答次数
    totalAttempts: number;        // 总尝试次数
    totalTimeSpent: number;       // 总学习时间(秒)
    streak: {                     // 连续学习记录
      current: number;            // 当前连续天数
      longest: number;            // 最长连续天数
      lastLoginDate?: string;     // 上次登录日期，用于计算连续性
    };
  };
}

export class UserManager {
  private static readonly CATEGORY = 'users';

  static createUser(user: User): boolean {
    return dataStorage.writeData(this.CATEGORY, user.id, user);
  }

  static getUser(userId: string): User | null {
    return dataStorage.readData<User>(this.CATEGORY, userId);
  }

  static updateUser(user: User): boolean {
    return dataStorage.writeData(this.CATEGORY, user.id, user);
  }

  static deleteUser(userId: string): boolean {
    return dataStorage.deleteData(this.CATEGORY, userId);
  }

  static listUsers(): string[] {
    return dataStorage.listFiles(this.CATEGORY);
  }

  static backupUser(userId: string): string | null {
    return dataStorage.createBackup(this.CATEGORY, userId);
  }

  static restoreUser(backupFilename: string, userId: string): boolean {
    return dataStorage.restoreFromBackup(backupFilename, this.CATEGORY, userId);
  }

  static resetUserProgress(userId: string): boolean {
    const user = this.getUser(userId);
    if (!user) {
      return false;
    }

    // 重置学习进度，但保留用户基本信息
    user.learningProgress = {
      english: 0,
      chinese: 0
    };

    // 重置游戏关卡进度
    user.gameLevels = {
      unlockedLevelIds: [],
      completedLevelIds: [],
      currentLevelId: undefined,
      lastPlayedAt: undefined
    };

    // 重置成就
    user.achievements = {
      unlockedAchievements: [],
      lastUnlockedAt: undefined
    };

    // 重置统计数据
    user.stats = {
      totalScore: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      totalTimeSpent: 0,
      streak: {
        current: 0,
        longest: 0,
        lastLoginDate: undefined
      }
    };

    // 更新最后登录时间
    user.lastLogin = new Date().toISOString();

    return this.updateUser(user);
  }

  static getUserById(userId: string): User | null {
    return this.getUser(userId);
  }
}