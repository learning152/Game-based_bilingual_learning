import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Space, Progress, message, Divider } from 'antd';
import { HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import WordCompletion from '../components/WordCompletion';
import ChineseToEnglish from '../components/ChineseToEnglish';
import { CourseManager, Level } from '../models/Course';
import { ProgressManager, UserProgress, GameSession } from '../models/Progress';

const { Title, Text } = Typography;

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
    // 检查用户登录状态
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      message.warning('请先登录！');
      navigate('/login');
      return;
    }

    // 加载关卡和用户进度
    loadLevelsAndProgress(currentUser);
  }, [navigate]);

  const loadLevelsAndProgress = (userId: string) => {
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
      initializeGame(currentLevel);
    }
  };

  const initializeGame = (level: Level) => {
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
  };

  const handleItemCompleted = (score: number) => {
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
    }

    // 重新加载用户进度
    const updatedProgress = ProgressManager.getProgress(userProgress.userId, userProgress.courseId);
    if (updatedProgress) {
      setUserProgress(updatedProgress);
    }

    setGameStarted(false);
  };

  const restartGame = () => {
    if (currentLevel) {
      initializeGame(currentLevel);
    }
  };

  const goHome = () => {
    navigate('/');
  };

  const selectLevel = (levelId: string) => {
    const selectedLevel = levels.find(level => level.id === levelId);
    if (selectedLevel && userProgress) {
      const isUnlocked = ProgressManager.isLevelUnlocked(userProgress.userId, userProgress.courseId, levelId);
      if (isUnlocked) {
        setCurrentLevel(selectedLevel);
        initializeGame(selectedLevel);
      } else {
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