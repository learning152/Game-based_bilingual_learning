/**
 * 测试辅助函数和模拟数据
 */

// 创建一个模拟用户对象
export const createMockUser = (id: string = 'test-user') => ({
  id,
  email: `${id}@example.com`,
  username: id,
  gameLevels: {
    unlockedLevelIds: ['level-1'],
    completedLevelIds: []
  },
  achievements: {
    unlockedAchievements: [],
    lastUnlockedAt: null
  },
  stats: {
    totalScore: 0,
    correctAnswers: 0,
    totalAttempts: 0,
    totalTimeSpent: 0,
    streak: { current: 0, longest: 0 }
  }
});

// 创建模拟关卡
export const createMockLevel = (id: string = 'level-1') => ({
  id,
  name: `测试关卡 ${id}`,
  title: `关卡 ${id}`,
  description: `这是测试关卡 ${id}`,
  difficulty: 'beginner' as const,
  language: 'chinese' as const,
  stages: [
    {
      id: `stage-1-${id}`,
      title: '阶段1',
      description: '阶段1描述',
      challenges: [],
      minScore: 60,
      order: 1
    }
  ],
  unlockConditions: [],
  rewards: [],
  estimatedTime: 10,
  tags: ['test'],
  createdAt: '2025-11-21T00:00:00Z',
  updatedAt: '2025-11-21T00:00:00Z'
});

// 创建模拟成就
export const createMockAchievement = (id: string = 'achievement-1') => ({
  id,
  title: `成就 ${id}`,
  description: `这是测试成就 ${id}`,
  type: 'progress' as const,
  criteria: 'test',
  icon: '🏆',
  createdAt: '2025-11-21T00:00:00Z'
});

// 创建模拟用户进度
export const createMockLevelProgress = (userId: string = 'test-user', levelId: string = 'level-1') => ({
  userId,
  levelId,
  isUnlocked: true,
  currentStage: 0,
  completedStages: [],
  completedChallenges: [],
  totalScore: 100,
  bestScore: 100,
  stars: 3,
  attempts: 1,
  timeSpent: 300,
  firstCompletedAt: '2025-11-21T00:00:00Z',
  lastPlayed: '2025-11-21T00:00:00Z',
  achievements: []
});

// 创建模拟关卡完成结果
export const createMockLevelCompletion = (userId: string = 'test-user', levelId: string = 'level-1') => ({
  levelId,
  stageId: 'stage-1',
  userId,
  score: 100,
  timeSpent: 300,
  stars: 3,
  completedChallenges: ['challenge-1'],
  newAchievements: [],
  unlockedLevels: [],
  isLevelCompleted: true,
  completedAt: '2025-11-21T00:00:00Z'
});

// 设置通用模拟
export const setupCommonMocks = () => {
  jest.clearAllMocks();
  
  const mockUser = createMockUser();
  const mockLevel = createMockLevel();
  const mockAchievement = createMockAchievement();
  const mockLevelProgress = createMockLevelProgress();
  
  // 模拟UserManager
  jest.mock('../models/User', () => ({
    UserManager: {
      getUser: jest.fn().mockReturnValue(mockUser),
      updateUser: jest.fn().mockReturnValue(true)
    }
  }));
  
  // 模拟GameLevelManager
  jest.mock('../models/Level', () => ({
    GameLevelManager: {
      getAllLevels: jest.fn().mockReturnValue([mockLevel]),
      getLevel: jest.fn().mockReturnValue(mockLevel),
      getUserProgress: jest.fn().mockReturnValue(mockLevelProgress),
      getAllUserProgress: jest.fn().mockReturnValue([mockLevelProgress])
    }
  }));
  
  // 模拟AchievementManager
  jest.mock('../models/Achievement', () => ({
    AchievementManager: {
      getUserAchievements: jest.fn().mockReturnValue([]),
      getAchievement: jest.fn().mockReturnValue(mockAchievement),
      getAllAchievements: jest.fn().mockReturnValue([mockAchievement]),
      unlockAchievement: jest.fn().mockReturnValue(true),
      createAchievement: jest.fn().mockReturnValue(true)
    }
  }));
  
  // 模拟dataStorage
  jest.mock('../utils/dataStorage', () => ({
    dataStorage: {
      readData: jest.fn().mockReturnValue(mockLevelProgress),
      writeData: jest.fn().mockReturnValue(true),
      listFiles: jest.fn().mockReturnValue(['test-user_level-1']),
      deleteData: jest.fn().mockReturnValue(true),
      createBackup: jest.fn().mockReturnValue('backup_file.json'),
      restoreFromBackup: jest.fn().mockReturnValue(true)
    }
  }));
  
  // 模拟logger
  jest.mock('../utils/logger', () => ({
    getLogger: () => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    })
  }));
  
  return {
    mockUser,
    mockLevel,
    mockAchievement,
    mockLevelProgress
  };
};