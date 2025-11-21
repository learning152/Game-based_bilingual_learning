import { DataExportManager } from '../utils/dataExportManager';
import { UserManager } from '../models/User';
import { dataStorage } from '../utils/dataStorage';
import fs from 'fs';
import path from 'path';

jest.mock('../models/User', () => ({
  UserManager: {
    getUserById: jest.fn(),
    resetUserProgress: jest.fn()
  }
}));

jest.mock('../utils/dataStorage', () => ({
  dataStorage: {
    readData: jest.fn(),
    deleteData: jest.fn(),
    listFiles: jest.fn()
  }
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined)
  },
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}));

describe('DataExportManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUserId = 'test-user-123';
  const mockUser = {
    id: mockUserId,
    username: 'TestUser',
    email: 'test@example.com',
    createdAt: '2025-11-01T00:00:00.000Z',
    lastLogin: '2025-11-20T00:00:00.000Z',
    learningProgress: { english: 30, chinese: 20 },
    gameLevels: { unlockedLevelIds: [], completedLevelIds: [] },
    achievements: { unlockedAchievements: [] },
    stats: { totalScore: 100, correctAnswers: 50, totalAttempts: 60, totalTimeSpent: 3600, streak: { current: 3, longest: 5 } }
  };

  describe('exportUserData', () => {
    it('should export user data in JSON and CSV formats', async () => {
      // 设置模拟返回值
      (UserManager.getUserById as jest.Mock).mockResolvedValue(mockUser);
      (dataStorage.readData as jest.Mock)
        .mockReturnValueOnce({}) // 用户进度
        .mockReturnValueOnce([]); // 用户成就
      (dataStorage.listFiles as jest.Mock).mockReturnValue(['level1', 'level2']);
      
      // 当查询关卡进度时，模拟一个匹配的关卡和一个不匹配的关卡
      (dataStorage.readData as jest.Mock)
        .mockReturnValueOnce({ userId: mockUserId, levelId: 'level1', score: 80 })
        .mockReturnValueOnce({ userId: 'another-user', levelId: 'level2', score: 90 });

      const result = await DataExportManager.exportUserData(mockUserId);

      expect(result).toHaveProperty('json');
      expect(result).toHaveProperty('csv');
      expect(typeof result.json).toBe('string');
      expect(typeof result.csv).toBe('string');
      
      const jsonData = JSON.parse(result.json);
      expect(jsonData).toHaveProperty('user');
      expect(jsonData.user.id).toBe(mockUserId);
      expect(jsonData).toHaveProperty('progress');
      expect(jsonData).toHaveProperty('levelProgress');
      expect(jsonData).toHaveProperty('achievements');
    });

    it('should throw error if user not found', async () => {
      (UserManager.getUserById as jest.Mock).mockResolvedValue(null);
      
      await expect(DataExportManager.exportUserData(mockUserId))
        .rejects.toThrow('用户不存在');
    });
  });

  describe('resetUserProgress', () => {
    it('should reset user progress and create backup', async () => {
      // 模拟导出数据成功
      const mockExportData = { json: '{}', csv: '' };
      jest.spyOn(DataExportManager, 'exportUserData').mockResolvedValue(mockExportData);

      // 设置模拟返回值
      (UserManager.resetUserProgress as jest.Mock).mockResolvedValue(true);
      (dataStorage.listFiles as jest.Mock).mockReturnValue(['level1', 'level2']);
      (dataStorage.readData as jest.Mock)
        .mockReturnValueOnce({ userId: mockUserId, levelId: 'level1' })
        .mockReturnValueOnce({ userId: 'another-user', levelId: 'level2' });

      await DataExportManager.resetUserProgress(mockUserId);

      // 检查是否创建了备份
      expect(fs.promises.writeFile).toHaveBeenCalled();
      
      // 检查是否重置了用户进度
      expect(UserManager.resetUserProgress).toHaveBeenCalledWith(mockUserId);
      
      // 检查是否删除了用户关卡进度
      expect(dataStorage.deleteData).toHaveBeenCalledWith('level-progress', 'level1');
      expect(dataStorage.deleteData).toHaveBeenCalledWith('user-achievements', mockUserId);
    });
  });
});