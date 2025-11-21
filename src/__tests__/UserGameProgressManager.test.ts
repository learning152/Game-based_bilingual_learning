import { UserGameProgressManager } from '../utils/userGameProgressManager';
import { UserManager } from '../models/User';
import { GameLevelManager } from '../models/Level';
import { AchievementManager } from '../models/Achievement';
import { dataStorage } from '../utils/dataStorage';

// 模拟依赖模块
jest.mock('../models/User', () => ({
  UserManager: {
    getUser: jest.fn(),
    updateUser: jest.fn()
  }
}));

jest.mock('../models/Level', () => ({
  GameLevelManager: {
    getAllLevels: jest.fn(),
    getLevel: jest.fn()
  }
}));

jest.mock('../models/Achievement', () => ({
  AchievementManager: {
    getAchievement: jest.fn(),
    getAllAchievements: jest.fn()
  }
}));

jest.mock('../utils/dataStorage', () => ({
  dataStorage: {
    readData: jest.fn(),
    writeData: jest.fn(),
    createBackup: jest.fn()
  }
}));

jest.mock('../utils/logger', () => ({
  getLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

describe('UserGameProgressManager 测试', () => {
  const mockUser = {
    id: 'test-user',
    email: 'test@example.com',
    username: 'testuser',
    gameLevels: {
      unlockedLevelIds: ['level-1'],
      completedLevelIds: []
    },
    achievements: {
      unlockedAchievements: []
    },
    stats: {
      totalScore: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      totalTimeSpent: 0,
      streak: { current: 0, longest: 0 }
    }
  };

  const mockLevel = {
    id: 'level-1',
    name: '测试关卡',
    title: '测试关卡标题',
    description: '测试关卡描述',
    difficulty: 'beginner' as const,
    language: 'chinese' as const,
    stages: [],
    unlockConditions: [],
    rewards: [],
    estimatedTime: 10,
    tags: ['test'],
    createdAt: '2025-11-21T00:00:00Z',
    updatedAt: '2025-11-21T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('初始化用户进度', () => {
    test('成功初始化起始关卡', () => {
      (UserManager.getUser as jest.Mock).mockReturnValue(mockUser);
      (GameLevelManager.getAllLevels as jest.Mock).mockReturnValue([mockLevel]);
      (UserManager.updateUser as jest.Mock).mockReturnValue(true);

      const result = UserGameProgressManager.initializeUserProgress('test-user');

      expect(result).toEqual(expect.any(Array));
      expect(UserManager.getUser).toHaveBeenCalledWith('test-user');
      expect(GameLevelManager.getAllLevels).toHaveBeenCalled();
    });

    test('用户不存在时返回空数组', () => {
      (UserManager.getUser as jest.Mock).mockReturnValue(null);

      const result = UserGameProgressManager.initializeUserProgress('invalid-user');

      expect(result).toEqual([]);
    });
  });

  describe('关卡解锁检查', () => {
    test('检查并解锁新关卡', () => {
      const userWithProgress = {
        ...mockUser,
        gameLevels: {
          unlockedLevelIds: ['level-1'],
          completedLevelIds: ['level-1']
        }
      };

      const level2 = {
        ...mockLevel,
        id: 'level-2',
        unlockConditions: [
          {
            type: 'level' as const,
            target: 'level-1',
            value: 1,
            description: '完成level-1'
          }
        ]
      };

      (UserManager.getUser as jest.Mock).mockReturnValue(userWithProgress);
      (GameLevelManager.getAllLevels as jest.Mock).mockReturnValue([mockLevel, level2]);
      (dataStorage.readData as jest.Mock).mockReturnValue({
        userId: 'test-user',
        levelId: 'level-1',
        stars: 3,
        highestScore: 100
      });
      (UserManager.updateUser as jest.Mock).mockReturnValue(true);

      const result = UserGameProgressManager.checkAndUnlockNewLevels('test-user');

      expect(result).toEqual(['level-2']);
      expect(UserManager.updateUser).toHaveBeenCalled();
    });

    test('没有满足条件的新关卡时返回空数组', () => {
      (UserManager.getUser as jest.Mock).mockReturnValue(mockUser);
      (GameLevelManager.getAllLevels as jest.Mock).mockReturnValue([mockLevel]);

      const result = UserGameProgressManager.checkAndUnlockNewLevels('test-user');

      expect(result).toEqual([]);
    });
  });

  describe('关卡完成状态更新', () => {
    test('成功更新关卡完成状态', () => {
      (UserManager.getUser as jest.Mock).mockReturnValue(mockUser);
      (GameLevelManager.getLevel as jest.Mock).mockReturnValue(mockLevel);
      (dataStorage.readData as jest.Mock).mockReturnValue(null);
      (dataStorage.writeData as jest.Mock).mockReturnValue(true);
      (dataStorage.createBackup as jest.Mock).mockReturnValue('backup.json');
      (UserManager.updateUser as jest.Mock).mockReturnValue(true);

      const result = UserGameProgressManager.updateLevelCompletion(
        'test-user',
        'level-1',
        3,
        100,
        300
      );

      expect(result).toBe(true);
      expect(dataStorage.writeData).toHaveBeenCalled();
      expect(UserManager.updateUser).toHaveBeenCalled();
      expect(dataStorage.createBackup).toHaveBeenCalled();
    });

    test('未解锁关卡时更新失败', () => {
      const userWithoutLevel = {
        ...mockUser,
        gameLevels: {
          unlockedLevelIds: [],
          completedLevelIds: []
        }
      };

      (UserManager.getUser as jest.Mock).mockReturnValue(userWithoutLevel);
      (GameLevelManager.getLevel as jest.Mock).mockReturnValue(mockLevel);

      const result = UserGameProgressManager.updateLevelCompletion(
        'test-user',
        'level-1',
        3,
        100,
        300
      );

      expect(result).toBe(false);
      expect(dataStorage.writeData).not.toHaveBeenCalled();
    });
  });

  describe('成就解锁', () => {
    test('成功解锁成就', () => {
      const mockAchievement = {
        id: 'achievement-1',
        title: '测试成就',
        description: '测试成就描述',
        type: 'progress' as const,
        criteria: 'test',
        icon: '🏆',
        createdAt: '2025-11-21T00:00:00Z'
      };

      (UserManager.getUser as jest.Mock).mockReturnValue(mockUser);
      (AchievementManager.getAchievement as jest.Mock).mockReturnValue(mockAchievement);
      (UserManager.updateUser as jest.Mock).mockReturnValue(true);

      const result = UserGameProgressManager.unlockAchievement('test-user', 'achievement-1');

      expect(result).toBe(true);
      expect(UserManager.updateUser).toHaveBeenCalled();
    });

    test('成就已解锁时不重复解锁', () => {
      const userWithAchievement = {
        ...mockUser,
        achievements: {
          unlockedAchievements: ['achievement-1']
        }
      };

      const mockAchievement = {
        id: 'achievement-1',
        title: '测试成就',
        description: '测试成就描述',
        type: 'progress' as const,
        criteria: 'test',
        icon: '🏆',
        createdAt: '2025-11-21T00:00:00Z'
      };

      (UserManager.getUser as jest.Mock).mockReturnValue(userWithAchievement);
      (AchievementManager.getAchievement as jest.Mock).mockReturnValue(mockAchievement);

      const result = UserGameProgressManager.unlockAchievement('test-user', 'achievement-1');

      expect(result).toBe(true);
      expect(UserManager.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('获取游戏统计数据', () => {
    test('成功获取用户游戏统计', () => {
      const userWithStats = {
        ...mockUser,
        gameLevels: {
          unlockedLevelIds: ['level-1'],
          completedLevelIds: ['level-1']
        },
        stats: {
          totalScore: 100,
          correctAnswers: 10,
          totalAttempts: 15,
          totalTimeSpent: 300,
          streak: { current: 5, longest: 10 }
        }
      };

      (UserManager.getUser as jest.Mock).mockReturnValue(userWithStats);
      (GameLevelManager.getAllLevels as jest.Mock).mockReturnValue([mockLevel]);
      (AchievementManager.getAllAchievements as jest.Mock).mockReturnValue([]);
      (dataStorage.readData as jest.Mock).mockReturnValue({
        userId: 'test-user',
        levelId: 'level-1',
        stars: 3,
        highestScore: 100,
        totalScore: 100,
        timeSpent: 300
      });

      const result = UserGameProgressManager.getUserGameStats('test-user');

      expect(result).toBeDefined();
      expect(result.totalScore).toBe(100);
      expect(result.completedLevels).toBe(1);
      expect(result.completionRate).toBeGreaterThan(0);
    });

    test('用户不存在时返回null', () => {
      (UserManager.getUser as jest.Mock).mockReturnValue(null);

      const result = UserGameProgressManager.getUserGameStats('invalid-user');

      expect(result).toBeNull();
    });
  });
});