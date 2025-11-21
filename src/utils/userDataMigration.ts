import { UserManager, User } from '../models/User';
import { getLogger } from './logger';

const logger = getLogger();

/**
 * 用户数据迁移工具
 * 用于将旧版本的用户数据升级到新版本
 */
export class UserDataMigration {
  /**
   * 迁移单个用户数据
   */
  static migrateUser(userId: string): boolean {
    try {
      const user = UserManager.getUser(userId);
      
      if (!user) {
        logger.warn('用户不存在，无法迁移', { userId });
        return false;
      }

      // 检查用户数据是否需要迁移
      const needsMigration = !user.gameLevels || !user.achievements || !user.stats;
      
      if (!needsMigration) {
        logger.info('用户数据已是最新版本，无需迁移', { userId });
        return true;
      }

      // 创建默认值
      const migratedUser: User = {
        ...user,
        gameLevels: user.gameLevels || {
          unlockedLevelIds: [],
          completedLevelIds: [],
        },
        achievements: user.achievements || {
          unlockedAchievements: [],
        },
        stats: user.stats || {
          totalScore: 0,
          correctAnswers: 0,
          totalAttempts: 0,
          totalTimeSpent: 0,
          streak: {
            current: 0,
            longest: 0,
          },
        },
      };

      // 保存迁移后的数据
      const success = UserManager.updateUser(migratedUser);
      
      if (success) {
        logger.info('用户数据迁移成功', { 
          userId,
          migratedFields: {
            gameLevels: !!migratedUser.gameLevels,
            achievements: !!migratedUser.achievements,
            stats: !!migratedUser.stats,
          }
        });
      } else {
        logger.error('用户数据迁移失败', { userId });
      }
      
      return success;
    } catch (error) {
      logger.error('用户数据迁移过程发生异常', { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * 批量迁移所有用户数据
   */
  static migrateAllUsers(): {
    total: number;
    success: number;
    failed: number;
    details: Array<{ userId: string; success: boolean; error?: string }>;
  } {
    const result = {
      total: 0,
      success: 0,
      failed: 0,
      details: [] as Array<{ userId: string; success: boolean; error?: string }>
    };

    try {
      const userIds = UserManager.listUsers();
      result.total = userIds.length;

      logger.info('开始批量迁移用户数据', { totalUsers: result.total });

      for (const userId of userIds) {
        try {
          const success = this.migrateUser(userId);
          
          if (success) {
            result.success++;
            result.details.push({ userId, success: true });
          } else {
            result.failed++;
            result.details.push({ 
              userId, 
              success: false, 
              error: '迁移失败' 
            });
          }
        } catch (error) {
          result.failed++;
          result.details.push({ 
            userId, 
            success: false, 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      logger.info('批量迁移完成', { 
        total: result.total,
        success: result.success,
        failed: result.failed
      });

      return result;
    } catch (error) {
      logger.error('批量迁移过程发生异常', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return result;
    }
  }

  /**
   * 验证用户数据结构
   */
  static validateUserData(userId: string): {
    isValid: boolean;
    missingFields: string[];
  } {
    const result = {
      isValid: true,
      missingFields: [] as string[]
    };

    try {
      const user = UserManager.getUser(userId);
      
      if (!user) {
        result.isValid = false;
        result.missingFields.push('user_not_found');
        return result;
      }

      // 检查必需字段
      const requiredFields = [
        'id', 'username', 'email', 'createdAt', 'lastLogin',
        'learningProgress', 'gameLevels', 'achievements', 'stats'
      ];

      for (const field of requiredFields) {
        if (!(field in user)) {
          result.isValid = false;
          result.missingFields.push(field);
        }
      }

      // 检查嵌套结构
      if (user.gameLevels) {
        if (!('unlockedLevelIds' in user.gameLevels)) {
          result.isValid = false;
          result.missingFields.push('gameLevels.unlockedLevelIds');
        }
        if (!('completedLevelIds' in user.gameLevels)) {
          result.isValid = false;
          result.missingFields.push('gameLevels.completedLevelIds');
        }
      }

      if (user.achievements) {
        if (!('unlockedAchievements' in user.achievements)) {
          result.isValid = false;
          result.missingFields.push('achievements.unlockedAchievements');
        }
      }

      if (user.stats) {
        const statsFields = ['totalScore', 'correctAnswers', 'totalAttempts', 'totalTimeSpent', 'streak'];
        for (const field of statsFields) {
          if (!(field in user.stats)) {
            result.isValid = false;
            result.missingFields.push(`stats.${field}`);
          }
        }
      }

      return result;
    } catch (error) {
      logger.error('验证用户数据时发生异常', { 
        userId,
        error: error instanceof Error ? error.message : String(error) 
      });
      result.isValid = false;
      result.missingFields.push('validation_error');
      return result;
    }
  }

  /**
   * 创建用户数据备份
   */
  static backupAllUsers(): string[] {
    const backupFiles: string[] = [];
    
    try {
      const userIds = UserManager.listUsers();
      
      logger.info('开始备份所有用户数据', { totalUsers: userIds.length });
      
      for (const userId of userIds) {
        const backupFile = UserManager.backupUser(userId);
        if (backupFile) {
          backupFiles.push(backupFile);
        }
      }

      logger.info('用户数据备份完成', { 
        totalUsers: userIds.length,
        successCount: backupFiles.length
      });

      return backupFiles;
    } catch (error) {
      logger.error('备份用户数据时发生异常', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return backupFiles;
    }
  }
}

/**
 * 执行用户数据迁移的便捷函数
 */
export function runUserDataMigration(): void {
  console.log('=== 用户数据迁移工具 ===\n');
  
  // 1. 创建备份
  console.log('步骤 1: 创建用户数据备份...');
  const backupFiles = UserDataMigration.backupAllUsers();
  console.log(`✓ 已备份 ${backupFiles.length} 个用户数据文件\n`);
  
  // 2. 执行迁移
  console.log('步骤 2: 执行数据迁移...');
  const migrationResult = UserDataMigration.migrateAllUsers();
  console.log(`✓ 迁移完成:`);
  console.log(`  - 总数: ${migrationResult.total}`);
  console.log(`  - 成功: ${migrationResult.success}`);
  console.log(`  - 失败: ${migrationResult.failed}\n`);
  
  // 3. 验证结果
  console.log('步骤 3: 验证迁移结果...');
  let validCount = 0;
  const userIds = UserManager.listUsers();
  
  for (const userId of userIds) {
    const validation = UserDataMigration.validateUserData(userId);
    if (validation.isValid) {
      validCount++;
    } else {
      console.log(`⚠ 用户 ${userId} 数据验证失败，缺失字段: ${validation.missingFields.join(', ')}`);
    }
  }
  
  console.log(`✓ 验证完成: ${validCount}/${userIds.length} 个用户数据有效\n`);
  
  console.log('=== 迁移完成 ===');
  console.log(`备份文件位置: data/backups/`);
  console.log(`如需回滚，请使用 UserManager.restoreUser() 方法\n`);
}

// 如果直接运行此文件，执行迁移
if (require.main === module) {
  runUserDataMigration();
}