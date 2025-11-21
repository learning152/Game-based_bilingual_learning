import { UserManager } from '../models/User';
import { UserProgress } from '../models/Progress';
import { UserLevelProgress } from '../models/Level';
import { UserAchievement } from '../models/Achievement';
import { getLogger } from './logManager';
import { dataStorage } from './dataStorage';
import { LogSearchIndex } from './logSearchIndex';
import fs from 'fs';
import path from 'path';

export class DataExportManager {
  private static readonly CATEGORY = 'data_export';

  /**
   * 导出用户数据，包括用户信息、学习进度、关卡进度和成就
   * @param userId 用户ID
   * @returns 包含JSON和CSV格式的用户数据
   */
  static async exportUserData(userId: string): Promise<{ json: string, csv: string }> {
    try {
      const user = await UserManager.getUserById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      const userProgress = await this.getUserProgress(userId);
      const userLevelProgress = await this.getUserLevelProgress(userId);
      const userAchievements = await this.getUserAchievements(userId);

      const exportData = {
        user,
        progress: userProgress,
        levelProgress: userLevelProgress,
        achievements: userAchievements
      };

      const jsonExport = JSON.stringify(exportData, null, 2);
      const csvExport = this.convertToCSV(exportData);

      const logger = getLogger({ category: DataExportManager.CATEGORY });
      logger.info(`用户 ${userId} 的数据已成功导出`);

      return { json: jsonExport, csv: csvExport };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const logger = getLogger({ category: DataExportManager.CATEGORY });
      logger.error(`导出用户 ${userId} 数据时发生错误: ${errorMessage}`);
      throw new Error(`导出用户数据失败: ${errorMessage}`);
    }
  }

  /**
   * 导出与用户相关的日志记录
   * @param userId 用户ID
   * @param startDate 开始日期，可选，格式为YYYY-MM-DD
   * @param endDate 结束日期，可选，格式为YYYY-MM-DD
   * @returns 包含JSON格式的日志数据
   */
  static async exportUserLogs(userId: string, startDate?: string, endDate?: string): Promise<string> {
    try {
      const logSearchIndex = new LogSearchIndex();
      const logs = await logSearchIndex.search({
        keywords: [userId],
        startTime: startDate ? new Date(startDate) : undefined,
        endTime: endDate ? new Date(endDate) : undefined
      });

      const jsonExport = JSON.stringify(logs, null, 2);
      const logger = getLogger({ category: DataExportManager.CATEGORY });
      logger.info(`用户 ${userId} 的日志数据已成功导出`);

      return jsonExport;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const logger = getLogger({ category: DataExportManager.CATEGORY });
      logger.error(`导出用户 ${userId} 日志数据时发生错误: ${errorMessage}`);
      throw new Error(`导出用户日志数据失败: ${errorMessage}`);
    }
  }

  /**
   * 重置用户游戏进度，在重置前会自动备份数据
   * @param userId 用户ID
   */
  static async resetUserProgress(userId: string): Promise<void> {
    try {
      // 在重置之前备份用户数据
      const backupData = await this.exportUserData(userId);
      const backupFileName = `backup_${userId}_${new Date().toISOString()}.json`;
      // 这里需要实现一个保存备份文件的函数
      await this.saveBackupFile(backupFileName, backupData.json);

      // 重置用户进度
      await UserManager.resetUserProgress(userId);
      // 重置用户关卡进度
      await this.resetUserLevelProgress(userId);
      // 重置用户成就
      await this.resetUserAchievements(userId);

      const logger = getLogger({ category: DataExportManager.CATEGORY });
      logger.info(`用户 ${userId} 的进度已重置，备份文件: ${backupFileName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const logger = getLogger({ category: DataExportManager.CATEGORY });
      logger.error(`重置用户 ${userId} 进度时发生错误: ${errorMessage}`);
      throw new Error(`重置用户进度失败: ${errorMessage}`);
    }
  }

  private static async getUserProgress(userId: string): Promise<UserProgress | null> {
    return dataStorage.readData('user-progress', userId) || null;
  }

  private static async getUserLevelProgress(userId: string): Promise<UserLevelProgress[]> {
    const levelProgressFiles = dataStorage.listFiles('level-progress');
    const userLevelProgress: UserLevelProgress[] = [];

    for (const file of levelProgressFiles) {
      const progress = dataStorage.readData<UserLevelProgress>('level-progress', file);
      if (progress && progress.userId === userId) {
        userLevelProgress.push(progress);
      }
    }

    return userLevelProgress;
  }

  private static async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    return dataStorage.readData('user-achievements', userId) || [];
  }

  private static async resetUserLevelProgress(userId: string): Promise<void> {
    const levelProgressFiles = dataStorage.listFiles('level-progress');
    
    for (const file of levelProgressFiles) {
      const progress = dataStorage.readData('level-progress', file);
      if (progress && (progress as any).userId === userId) {
        dataStorage.deleteData('level-progress', file);
      }
    }
  }

  private static async resetUserAchievements(userId: string): Promise<void> {
    dataStorage.deleteData('user-achievements', userId);
  }

  private static async saveBackupFile(fileName: string, content: string): Promise<void> {
    const backupDir = path.join(process.cwd(), 'data', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const filePath = path.join(backupDir, fileName);
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  private static convertToCSV(data: any): string {
    const headers = Object.keys(data);
    const csvRows = [headers.join(',')];

    const processValue = (value: any): string => {
      if (typeof value === 'object') {
        return JSON.stringify(value).replace(/"/g, '""');
      }
      return String(value).replace(/"/g, '""');
    };

    const dataRow = headers.map(header => `"${processValue(data[header])}"`).join(',');
    csvRows.push(dataRow);

    return csvRows.join('\n');
  }
}