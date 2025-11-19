import { dataStorage } from '../utils/dataStorage';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  criteria: string;
  icon: string;
  createdAt: string;
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: string;
}

export class AchievementManager {
  private static readonly ACHIEVEMENT_CATEGORY = 'achievements';
  private static readonly USER_ACHIEVEMENT_CATEGORY = 'user_achievements';

  static createAchievement(achievement: Achievement): boolean {
    return dataStorage.writeData(this.ACHIEVEMENT_CATEGORY, achievement.id, achievement);
  }

  static getAchievement(achievementId: string): Achievement | null {
    return dataStorage.readData<Achievement>(this.ACHIEVEMENT_CATEGORY, achievementId);
  }

  static updateAchievement(achievement: Achievement): boolean {
    return dataStorage.writeData(this.ACHIEVEMENT_CATEGORY, achievement.id, achievement);
  }

  static deleteAchievement(achievementId: string): boolean {
    return dataStorage.deleteData(this.ACHIEVEMENT_CATEGORY, achievementId);
  }

  static listAchievements(): string[] {
    return dataStorage.listFiles(this.ACHIEVEMENT_CATEGORY);
  }

  static unlockAchievement(userAchievement: UserAchievement): boolean {
    const filename = `${userAchievement.userId}_${userAchievement.achievementId}`;
    return dataStorage.writeData(this.USER_ACHIEVEMENT_CATEGORY, filename, userAchievement);
  }

  static getUserAchievements(userId: string): UserAchievement[] {
    const userAchievements = dataStorage.listFiles(this.USER_ACHIEVEMENT_CATEGORY)
      .filter(filename => filename.startsWith(userId))
      .map(filename => dataStorage.readData<UserAchievement>(this.USER_ACHIEVEMENT_CATEGORY, filename))
      .filter((achievement): achievement is UserAchievement => achievement !== null);

    return userAchievements;
  }

  static backupAchievements(): string | null {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return dataStorage.createBackup(this.ACHIEVEMENT_CATEGORY, `all_achievements_${timestamp}`);
  }

  static restoreAchievements(backupFilename: string): boolean {
    return dataStorage.restoreFromBackup(backupFilename, this.ACHIEVEMENT_CATEGORY, 'all_achievements');
  }
}