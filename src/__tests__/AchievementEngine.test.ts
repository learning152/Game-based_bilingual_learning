import { AchievementEngine } from '../utils/achievementEngine';
import { AchievementManager } from '../models/Achievement';
import { GameLevelManager, LevelCompletionResult } from '../models/Level';

// 模拟依赖模块
jest.mock('../models/Achievement', () => ({
  AchievementManager: {
    getUserAchievements: jest.fn(),
    getAchievement: jest.fn(),
    unlockAchievement: jest.fn(),
    createAchievement: jest.fn()
  }
}));

jest.mock('../models/Level', () => ({
  GameLevelManager: {
    getAllUserProgress: jest.fn()
  }
}));

jest.mock('../utils/logger', () => ({
  getLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  })
}));

describe('成就系统测试', () => {
  // 重置所有模拟函数
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('成就解锁处理', () => {
    test('处理关卡完成事件解锁成就', async () => {
      // 模拟数据
      const mockLevelCompletion: LevelCompletionResult = {
        levelId: 'test-level-1',
        stageId: 'stage-1',
        userId: 'test-user',
        score: 100,
        timeSpent: 50,
        stars: 3,
        completedChallenges: ['challenge-1'],
        newAchievements: [],
        unlockedLevels: [],
        isLevelCompleted: true,
        completedAt: '2025-11-21T10:00:00Z'
      };

      // 模拟用户已有成就
      (AchievementManager.getUserAchievements as jest.Mock).mockReturnValue([
        { userId: 'test-user', achievementId: 'first_level_complete', unlockedAt: '2025-11-21T09:00:00Z' }
      ]);

      // 模拟关卡进度
      (GameLevelManager.getAllUserProgress as jest.Mock).mockReturnValue([
        {
          userId: 'test-user',
          levelId: 'test-level-1',
          isUnlocked: true,
          currentStage: 1,
          completedStages: ['stage-1'],
          completedChallenges: ['challenge-1'],
          totalScore: 100,
          bestScore: 100,
          stars: 3,
          attempts: 1,
          timeSpent: 50,
          lastPlayed: '2025-11-21T10:00:00Z',
          achievements: []
        }
      ]);

      // 成就解锁成功
      (AchievementManager.unlockAchievement as jest.Mock).mockReturnValue(true);

      // 执行测试
      const result = await AchievementEngine.processLevelCompletion(mockLevelCompletion);

      // 验证结果
      expect(result).toEqual(expect.any(Array)); // 应当返回新解锁成就的数组
      expect(AchievementManager.getUserAchievements).toHaveBeenCalledWith('test-user');
      expect(GameLevelManager.getAllUserProgress).toHaveBeenCalledWith('test-user');
      
      // 因为满分，应该解锁"完美主义者"成就
      // 因为速度快，应该解锁"速度挑战者"成就
      // 因为首次尝试，应该解锁"一次通关"成就
      expect(AchievementManager.unlockAchievement).toHaveBeenCalled();
    });
  });

  describe('成就进度计算', () => {
    test('获取用户成就进度', () => {
      // 模拟用户已有成就
      (AchievementManager.getUserAchievements as jest.Mock).mockReturnValue([
        { userId: 'test-user', achievementId: 'first_level_complete', unlockedAt: '2025-11-21T09:00:00Z' }
      ]);

      // 模拟成就信息
      (AchievementManager.getAchievement as jest.Mock).mockImplementation((id) => {
        if (id === 'first_level_complete') {
          return {
            id: 'first_level_complete',
            title: '初学者',
            description: '完成你的第一个关卡',
            type: 'progress',
            criteria: '完成任意一个关卡',
            icon: '??',
            createdAt: '2025-11-21T09:00:00Z'
          };
        }
        return null;
      });

      // 模拟用户关卡进度
      (GameLevelManager.getAllUserProgress as jest.Mock).mockReturnValue([
        {
          userId: 'test-user',
          levelId: 'test-level-1',
          isUnlocked: true,
          currentStage: 1,
          completedStages: ['stage-1'],
          completedChallenges: ['challenge-1'],
          totalScore: 100,
          bestScore: 100,
          stars: 3,
          attempts: 1,
          timeSpent: 50,
          lastPlayed: '2025-11-21T10:00:00Z',
          achievements: ['first_level_complete']
        },
        {
          userId: 'test-user',
          levelId: 'test-level-2',
          isUnlocked: true,
          currentStage: 1,
          completedStages: ['stage-1'],
          completedChallenges: ['challenge-1'],
          totalScore: 80,
          bestScore: 80,
          stars: 2,
          attempts: 1,
          timeSpent: 120,
          lastPlayed: '2025-11-21T11:00:00Z',
          achievements: []
        }
      ]);

      // 执行测试
      const progress = AchievementEngine.getUserAchievementProgress('test-user');
      
      // 验证结果
      expect(progress).toEqual(expect.any(Array));
      expect(progress.length).toBeGreaterThan(0);
      
      // 检查已解锁成就的进度
      const firstLevelAchievement = progress.find(p => p.achievementId === 'first_level_complete');
      expect(firstLevelAchievement).toBeDefined();
      expect(firstLevelAchievement?.isUnlocked).toBe(true);
      expect(firstLevelAchievement?.progress).toBe(100);
      
      // 检查其他成就的进度计算
      const levelMasterAchievement = progress.find(p => p.achievementId === 'level_master');
      expect(levelMasterAchievement).toBeDefined();
      expect(levelMasterAchievement?.progress).toBeGreaterThan(0);
      expect(levelMasterAchievement?.progress).toBeLessThan(100);
    });
  });

  describe('成就系统初始化', () => {
    test('创建默认成就', () => {
      // 模拟成就创建成功
      (AchievementManager.createAchievement as jest.Mock).mockReturnValue(true);

      // 执行测试
      const result = AchievementEngine.createDefaultAchievements();
      
      // 验证结果
      expect(result).toBe(true);
      expect(AchievementManager.createAchievement).toHaveBeenCalledTimes(7); // 7个默认成就
    });
  });

  describe('成就重新计算', () => {
    test('重新计算用户成就', async () => {
      // 模拟用户已有成就和关卡进度
      (AchievementManager.getUserAchievements as jest.Mock).mockReturnValue([]);
      
      (GameLevelManager.getAllUserProgress as jest.Mock).mockReturnValue([
        {
          userId: 'test-user',
          levelId: 'test-level-1',
          isUnlocked: true,
          currentStage: 1,
          completedStages: ['stage-1'],
          completedChallenges: ['challenge-1'],
          totalScore: 100,
          bestScore: 100,
          stars: 3,
          attempts: 1,
          timeSpent: 50,
          lastPlayed: '2025-11-21T10:00:00Z',
          achievements: []
        }
      ]);
      
      // 模拟成就解锁成功
      (AchievementManager.unlockAchievement as jest.Mock).mockReturnValue(true);
      
      // 执行测试
      const result = await AchievementEngine.recalculateUserAchievements('test-user');
      
      // 验证结果
      expect(result).toEqual(expect.any(Array));
      expect(AchievementManager.getUserAchievements).toHaveBeenCalledWith('test-user');
      expect(GameLevelManager.getAllUserProgress).toHaveBeenCalledWith('test-user');
      expect(AchievementManager.unlockAchievement).toHaveBeenCalled();
    });
  });
});