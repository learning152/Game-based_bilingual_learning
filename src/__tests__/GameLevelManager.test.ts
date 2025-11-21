import { GameLevelManager, GameLevel, UserLevelProgress, LevelCompletionResult } from '../models/Level';
import { dataStorage } from '../utils/dataStorage';
import { setupCommonMocks, createMockLevel, createMockLevelProgress, createMockLevelCompletion } from './testHelpers';

jest.mock('../utils/dataStorage');
jest.mock('../utils/logger');

describe('GameLevelManager', () => {
  let mockLevel: GameLevel;
  let mockLevelProgress: UserLevelProgress;
  let mockLevelCompletion: LevelCompletionResult;

  beforeEach(() => {
    const mocks = setupCommonMocks();
    mockLevel = mocks.mockLevel;
    mockLevelProgress = mocks.mockLevelProgress;
    mockLevelCompletion = createMockLevelCompletion(mockLevelProgress.userId, mockLevelProgress.levelId);
    
    // 重置所有的mock
    jest.clearAllMocks();
  });

  describe('关卡数据管理', () => {
    test('创建新关卡', () => {
      (dataStorage.writeData as jest.Mock).mockReturnValue(true);
      const result = GameLevelManager.createLevel(mockLevel);
      expect(result).toBe(true);
      expect(dataStorage.writeData).toHaveBeenCalledWith('game-levels', mockLevel.id, mockLevel);
    });

    test('获取关卡信息', () => {
      (dataStorage.readData as jest.Mock).mockReturnValue(mockLevel);
      const result = GameLevelManager.getLevel(mockLevel.id);
      expect(result).toEqual(mockLevel);
      expect(dataStorage.readData).toHaveBeenCalledWith('game-levels', mockLevel.id);
    });

    test('更新关卡信息', () => {
      (dataStorage.writeData as jest.Mock).mockReturnValue(true);
      const updatedLevel = { ...mockLevel, title: '更新后的标题' };
      const result = GameLevelManager.updateLevel(updatedLevel);
      expect(result).toBe(true);
      expect(dataStorage.writeData).toHaveBeenCalledWith('game-levels', mockLevel.id, expect.objectContaining({
        title: '更新后的标题',
        updatedAt: expect.any(String),
      }));
    });

    test('删除关卡', () => {
      (dataStorage.deleteData as jest.Mock).mockReturnValue(true);
      const result = GameLevelManager.deleteLevel(mockLevel.id);
      expect(result).toBe(true);
      expect(dataStorage.deleteData).toHaveBeenCalledWith('game-levels', mockLevel.id);
    });
  });

  describe('用户进度管理', () => {
    test('更新用户进度', () => {
      (dataStorage.writeData as jest.Mock).mockReturnValue(true);
      const result = GameLevelManager.updateUserProgress(mockLevelProgress);
      expect(result).toBe(true);
      expect(dataStorage.writeData).toHaveBeenCalledWith('level-progress', `${mockLevelProgress.userId}_${mockLevelProgress.levelId}`, expect.objectContaining({
        lastPlayed: expect.any(String),  // 修正：应该是lastPlayed而不是lastPlayedAt
      }));
    });

    test('获取用户进度', () => {
      (dataStorage.readData as jest.Mock).mockReturnValue(mockLevelProgress);
      const result = GameLevelManager.getUserProgress(mockLevelProgress.userId, mockLevelProgress.levelId);
      expect(result).toEqual(mockLevelProgress);
      expect(dataStorage.readData).toHaveBeenCalledWith('level-progress', `${mockLevelProgress.userId}_${mockLevelProgress.levelId}`);
    });

    test('初始化用户进度', () => {
      // 首先模拟getLevel返回关卡数据
      (dataStorage.readData as jest.Mock)
        .mockReturnValueOnce(null)  // getUserProgress返回null
        .mockReturnValueOnce(mockLevel);  // getLevel返回关卡数据

      (dataStorage.writeData as jest.Mock).mockReturnValue(true);
      
      const result = GameLevelManager.initializeUserProgress(mockLevelProgress.userId, mockLevelProgress.levelId);
      expect(result).toEqual(expect.objectContaining({
        userId: mockLevelProgress.userId,
        levelId: mockLevelProgress.levelId,
        isUnlocked: expect.any(Boolean),
        lastPlayed: expect.any(String),  // GameLevel.ts中使用的是lastPlayed而不是lastPlayedAt
      }));
      expect(dataStorage.writeData).toHaveBeenCalled();
    });
  });

  describe('关卡解锁逻辑', () => {
    test('检查关卡解锁状态', () => {
      // 模拟getLevel返回关卡数据（关卡没有解锁条件）
      (dataStorage.readData as jest.Mock).mockReturnValue(mockLevel);
      const result = GameLevelManager.checkLevelUnlocked(mockLevelProgress.userId, mockLevelProgress.levelId);
      expect(result).toBe(true);
    });

    test('更新关卡解锁状态', () => {
      // 模拟listLevels返回关卡ID列表
      (dataStorage.listFiles as jest.Mock)
        .mockReturnValueOnce([mockLevel.id])  // listLevels
        .mockReturnValueOnce([`${mockLevelProgress.userId}_${mockLevelProgress.levelId}`]);  // getAllUserProgress
      
      // 模拟getUserProgress和getLevel的返回
      (dataStorage.readData as jest.Mock)
        .mockReturnValueOnce(mockLevelProgress)  // getUserProgress
        .mockReturnValueOnce(mockLevel);  // getLevel (checkLevelUnlocked)
      
      const result = GameLevelManager.updateLevelUnlockStatus(mockLevelProgress.userId);
      expect(result).toEqual([]);
      expect(dataStorage.writeData).not.toHaveBeenCalled();
    });
  });

  describe('关卡完成处理', () => {
    test('处理关卡完成', () => {
      // 设置mock调用序列
      (dataStorage.readData as jest.Mock)
        .mockReturnValueOnce(mockLevel)  // getLevel
        .mockReturnValueOnce(mockLevelProgress)  // getUserProgress
        .mockReturnValueOnce(mockLevel);  // updateLevelUnlockStatus中的checkLevelUnlocked->getLevel

      (dataStorage.writeData as jest.Mock).mockReturnValue(true);
      
      (dataStorage.listFiles as jest.Mock)
        .mockReturnValueOnce([mockLevel.id])  // updateLevelUnlockStatus中的listLevels
        .mockReturnValueOnce([`${mockLevelProgress.userId}_${mockLevelProgress.levelId}`]);  // updateLevelUnlockStatus中的getAllUserProgress

      const result = GameLevelManager.processLevelCompletion(
        mockLevelProgress.userId,
        mockLevelProgress.levelId,
        mockLevel.stages[0].id,
        80,
        300,
        ['challenge-1']
      );

      expect(result).toEqual(expect.objectContaining({
        levelId: mockLevelProgress.levelId,
        stageId: mockLevel.stages[0].id,
        userId: mockLevelProgress.userId,
        score: 80,
        timeSpent: 300,
        stars: expect.any(Number),
        completedChallenges: ['challenge-1'],
        isLevelCompleted: expect.any(Boolean),
        completedAt: expect.any(String),
      }));

      // 验证更新用户进度的调用
      expect(dataStorage.writeData).toHaveBeenCalled();
    });

    test('处理关卡完成 - 关卡不存在', () => {
      (dataStorage.readData as jest.Mock).mockReturnValue(null);

      expect(() => {
        GameLevelManager.processLevelCompletion(
          mockLevelProgress.userId,
          'non-existent-level',
          'stage-1',
          80,
          300,
          ['challenge-1']
        );
      }).toThrow('关卡不存在: non-existent-level');
    });
  });

  describe('数据备份与恢复', () => {
    test('备份关卡数据', () => {
      (dataStorage.createBackup as jest.Mock).mockReturnValue('backup_file.json');
      const result = GameLevelManager.backupLevel(mockLevel.id);
      expect(result).toBe('backup_file.json');
      expect(dataStorage.createBackup).toHaveBeenCalledWith('game-levels', mockLevel.id);
    });

    test('恢复关卡数据', () => {
      (dataStorage.restoreFromBackup as jest.Mock).mockReturnValue(true);
      const result = GameLevelManager.restoreLevel('backup_file.json', mockLevel.id);
      expect(result).toBe(true);
      expect(dataStorage.restoreFromBackup).toHaveBeenCalledWith('backup_file.json', 'game-levels', mockLevel.id);
    });
  });
});