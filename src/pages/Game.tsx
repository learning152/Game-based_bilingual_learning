import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, Progress, message, Divider } from 'antd';
import { HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import WordCompletion from '../components/WordCompletion';
import ChineseToEnglish from '../components/ChineseToEnglish';
import { CourseManager, Level } from '../models/Course';
import { ProgressManager, UserProgress, GameSession } from '../models/Progress';
import { getUserLogger } from '../utils/logManager';
import { performanceMonitor } from '../utils/performanceMonitor';

const { Title, Text } = Typography;
const logger = getUserLogger();

interface GameWord {
  id: string;
  word: string;
  hint: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  audioUrl?: string;
}

interface ChineseToEnglishWord {
  id: string;
  chinesePhrase: string;
  englishTranslation: string;
  hint?: string;
  audioUrl?: string;
}

type GameItem = GameWord | ChineseToEnglishWord;

// 示例单词数据
const sampleWords: GameWord[] = [
  {
    id: '1',
    word: 'apple',
    hint: '一种红色或绿色的水果',
    category: 'food',
    difficulty: 'easy'
  },
  {
    id: '2',
    word: 'computer',
    hint: '用于计算和处理信息的电子设备',
    category: 'technology',
    difficulty: 'medium'
  },
  {
    id: '3',
    word: 'beautiful',
    hint: '形容外观很吸引人的形容词',
    category: 'adjective',
    difficulty: 'hard'
  },
  {
    id: '4',
    word: 'school',
    hint: '学生学习知识的地方',
    category: 'place',
    difficulty: 'easy'
  },
  {
    id: '5',
    word: 'friendship',
    hint: '朋友之间的深厚关系',
    category: 'emotion',
    difficulty: 'hard'
  }
];

const Game: React.FC = () => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [gameItems, setGameItems] = useState<GameItem[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [completedItems, setCompletedItems] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [levels, setLevels] = useState<Level[]>([]);
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    logger.info('进入游戏页面');
    performanceMonitor.startOperation('GamePageLoad');

    // 检查用户登录状态
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      logger.warn('未登录用户尝试访问游戏页面', { redirectTo: '/login' });
      message.warning('请先登录！');
      navigate('/login');
      return;
    }

    logger.info('用户登录状态验证通过，开始加载游戏', { userId: currentUser });
    // 加载关卡和用户进度
    loadLevelsAndProgress(currentUser);

    return () => {
      performanceMonitor.endOperation('GamePageLoad');
      logger.info('离开游戏页面');
    };
  }, [navigate]);

  const loadLevelsAndProgress = (userId: string) => {
    logger.info('开始加载关卡和用户进度', { userId });
    performanceMonitor.startOperation('LoadLevelsAndProgress');
    const loadedLevels = CourseManager.listLevels().map(levelId => CourseManager.getLevel(levelId)!);
    setLevels(loadedLevels);

    const courseId = 'defaultCourse'; // 假设只有一个课程
    let progress = ProgressManager.getProgress(userId, courseId);
    if (!progress) {
      progress = ProgressManager.initializeProgress(userId, courseId, loadedLevels[0].id);
    }
    setUserProgress(progress);

    const currentLevelId = progress.currentLevel;
    const currentLevel = loadedLevels.find(level => level.id === currentLevelId);
    if (currentLevel) {
      setCurrentLevel(currentLevel);
      logger.info('关卡和进度加载完成', { 
        levelsCount: loadedLevels.length, 
        currentLevelId: currentLevel.id,
        userId 
      });
      initializeGame(currentLevel);
    } else {
      logger.error('未找到当前关卡', { currentLevelId, userId });
    }
    performanceMonitor.endOperation('LoadLevelsAndProgress');
  };

  const initializeGame = (level: Level) => {
    logger.info('初始化游戏', { levelId: level.id, levelTitle: level.title });
    performanceMonitor.startOperation('InitializeGame');
    // 从关卡中加载游戏项目
    const levelItems = level.lessons.flatMap(lessonId => {
      const lesson = CourseManager.getLesson(lessonId);
      return lesson ? JSON.parse(lesson.content) as GameItem[] : [];
    });

    // 随机选择5个项目进行游戏
    const shuffledItems = [...levelItems].sort(() => Math.random() - 0.5);
    const selectedItems = shuffledItems.slice(0, 5);
    setGameItems(selectedItems);
    setCurrentWordIndex(0);
    setTotalScore(0);
    setCompletedItems(0);
    setGameStarted(true);
    
    logger.info('游戏初始化完成', { 
      levelId: level.id,
      totalItems: selectedItems.length,
      itemTypes: selectedItems.map(item => 'word' in item ? 'WordCompletion' : 'ChineseToEnglish')
    });
    performanceMonitor.endOperation('InitializeGame');
  };

  const handleItemCompleted = (score: number) => {
    logger.info('用户完成游戏项目', { 
      itemIndex: currentWordIndex, 
      score,
      totalScore: totalScore + score,
      progress: `${completedItems + 1}/${gameItems.length}`
    });
    setTotalScore(prev => prev + score);
    setCompletedItems(prev => prev + 1);
    
    setTimeout(() => {
      if (currentWordIndex < gameItems.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
      } else {
        // 游戏结束
        handleGameComplete();
      }
    }, 2000);
  };

  const handleGameComplete = () => {
    if (!userProgress || !currentLevel) return;

    logger.info('游戏完成，开始计算成绩', { 
      levelId: currentLevel.id,
      totalScore,
      itemsCompleted: gameItems.length
    });
    performanceMonitor.startOperation('GameComplete');

    const averageScore = totalScore / gameItems.length;
    let message_text = '';
    let stars = 0;
    
    if (averageScore >= 4) {
      message_text = '恭喜！你的表现非常出色！';
      stars = 5;
    } else if (averageScore >= 3) {
      message_text = '不错！继续努力！';
      stars = 3;
    } else {
      message_text = '需要多加练习哦！';
      stars = 1;
    }
    
    logger.info('游戏评分完成', { 
      averageScore: averageScore.toFixed(2),
      stars,
      message: message_text
    });
    message.success(message_text);

    // 更新用户进度
    ProgressManager.completeLevelWithScore(
      userProgress.userId,
      userProgress.courseId,
      currentLevel.id,
      totalScore,
      stars
    );

    // 解锁下一关
    const currentLevelIndex = levels.findIndex(level => level.id === currentLevel.id);
    if (currentLevelIndex < levels.length - 1) {
      const nextLevel = levels[currentLevelIndex + 1];
      ProgressManager.unlockLevel(userProgress.userId, userProgress.courseId, nextLevel.id);
      logger.info('解锁下一关卡', { 
        currentLevelId: currentLevel.id,
        nextLevelId: nextLevel.id 
      });
    } else {
      logger.info('已完成所有关卡', { currentLevelId: currentLevel.id });
    }

    // 重新加载用户进度
    const updatedProgress = ProgressManager.getProgress(userProgress.userId, userProgress.courseId);
    if (updatedProgress) {
      setUserProgress(updatedProgress);
    }

    performanceMonitor.endOperation('GameComplete', { 
      totalScore,
      stars,
      averageScore: averageScore.toFixed(2)
    });
    setGameStarted(false);
  };

  const restartGame = () => {
    logger.info('用户重新开始游戏', { levelId: currentLevel?.id });
    if (currentLevel) {
      initializeGame(currentLevel);
    }
  };

  const goHome = () => {
    logger.info('用户返回首页');
    navigate('/');
  };

  const selectLevel = (levelId: string) => {
    logger.info('用户尝试选择关卡', { levelId });
    const selectedLevel = levels.find(level => level.id === levelId);
    if (selectedLevel && userProgress) {
      const isUnlocked = ProgressManager.isLevelUnlocked(userProgress.userId, userProgress.courseId, levelId);
      if (isUnlocked) {
        logger.info('关卡已解锁，开始游戏', { levelId });
        setCurrentLevel(selectedLevel);
        initializeGame(selectedLevel);
      } else {
        logger.warn('用户尝试访问未解锁的关卡', { levelId });
        message.warning('该关卡尚未解锁，请先完成前面的关卡！');
      }
    }
  };

  const currentItem = gameItems[currentWordIndex];
  const progress = (completedItems / gameItems.length) * 100;

  if (!gameStarted && gameItems.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Card style={{ maxWidth: 600, margin: '0 auto' }}>
          <Title level={2}>单词补全闯关</Title>
          <Text>准备开始您的单词学习之旅！</Text>
          <div style={{ marginTop: '30px' }}>
            <Button 
              type="primary" 
              size="large" 
              onClick={() => currentLevel && initializeGame(currentLevel)}
              disabled={!currentLevel}
            >
              开始游戏
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!gameStarted && completedItems === gameItems.length) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <Card style={{ maxWidth: 600, margin: '0 auto' }}>
          <Title level={2}>游戏完成！</Title>
          <div style={{ margin: '20px 0' }}>
            <Text style={{ fontSize: '18px' }}>总得分: {totalScore}/{gameItems.length * 5}</Text>
          </div>
          <div style={{ margin: '20px 0' }}>
            <Text>完成项目: {completedItems}/{gameItems.length}</Text>
          </div>
          <Space size="large" style={{ marginTop: '30px' }}>
            <Button type="primary" icon={<ReloadOutlined />} onClick={restartGame}>
              再玩一次
            </Button>
            <Button icon={<HomeOutlined />} onClick={goHome}>
              返回首页
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <Card style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <Title level={2}>单词补全闯关</Title>
          <Progress 
            percent={Math.round(progress)} 
            status="active"
            style={{ marginBottom: '10px' }}
          />
          <Text>进度: {completedItems}/{gameItems.length} | 总得分: {totalScore}</Text>
        </div>

        <Divider />

        {currentItem && (
          <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center' }}>
            {'word' in currentItem ? (
              <WordCompletion
                key={currentItem.id}
                word={currentItem.word}
                hint={currentItem.hint}
                audioUrl={currentItem.audioUrl}
                onComplete={handleItemCompleted}
              />
            ) : (
              <ChineseToEnglish
                key={currentItem.id}
                chinesePhrase={currentItem.chinesePhrase}
                englishTranslation={currentItem.englishTranslation}
                hint={currentItem.hint}
                audioUrl={currentItem.audioUrl}
                onComplete={handleItemCompleted}
              />
            )}
          </div>
        )}

        <Divider />

        <div style={{ textAlign: 'center' }}>
          <Space>
            <Button onClick={goHome}>
              返回首页
            </Button>
            <Button type="default" onClick={restartGame}>
              重新开始
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default Game;