import React, { useState, useEffect, useCallback } from 'react';
import { Card, Typography, Button, Space, Progress, message, Divider, Spin, Row, Col, Modal } from 'antd';
import { HomeOutlined, ReloadOutlined, TrophyOutlined, LoadingOutlined, SaveOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import WordCompletion from '../components/WordCompletion';
import ChineseToEnglish from '../components/ChineseToEnglish';
import EnglishToChinese from '../components/EnglishToChinese';
import { GameLevelManager, GameLevel } from '../models/Level';
import UserGameProgressManager from '../utils/userGameProgressManager';
import { UserManager } from '../models/User';
import { getUserLogger } from '../utils/logManager';
import { performanceMonitor } from '../utils/performanceMonitor';
import { Challenge } from '../models/Challenge';

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
  const [currentChallenge, setCurrentChallenge] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [levels, setLevels] = useState<GameLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<GameLevel | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [isProgressSaved, setIsProgressSaved] = useState<boolean>(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  // 自动保存游戏进度
  const saveGameProgress = useCallback(() => {
    if (!userId || !currentLevel || !gameStarted) return;
    
    try {
      // 创建一个保存点对象
      const savePoint = {
        levelId: currentLevel.id,
        currentWordIndex,
        gameItems,
        totalScore,
        completedItems,
        score,
        lives,
        timeSpent: Math.floor((Date.now() - startTime) / 1000) + timeSpent,
        timestamp: new Date().toISOString()
      };
      
      // 保存到localStorage
      localStorage.setItem(`gameProgress_${userId}`, JSON.stringify(savePoint));
      setIsProgressSaved(true);
      
      logger.info('游戏进度已自动保存', { 
        userId,
        levelId: currentLevel.id, 
        currentWordIndex,
        completedItems,
        totalItems: gameItems.length,
        timestamp: savePoint.timestamp
      });
    } catch (error) {
      logger.error('保存游戏进度失败', { 
        userId,
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }, [userId, currentLevel, gameStarted, currentWordIndex, gameItems, totalScore, completedItems, score, lives, timeSpent, startTime]);
  
  // 手动保存游戏进度
  const handleManualSave = () => {
    saveGameProgress();
    message.success('游戏进度已保存');
  };
  
  // 加载保存的游戏进度
  const loadGameProgress = useCallback(() => {
    if (!userId || !currentLevel) return false;
    
    try {
      const savedProgressStr = localStorage.getItem(`gameProgress_${userId}`);
      if (!savedProgressStr) return false;
      
      const savedProgress = JSON.parse(savedProgressStr);
      
      // 验证保存的进度是否属于当前关卡
      if (savedProgress.levelId !== currentLevel.id) {
        logger.info('找到保存的进度，但属于其他关卡', { 
          userId,
          savedLevelId: savedProgress.levelId,
          currentLevelId: currentLevel.id
        });
        return false;
      }
      
      // 确认保存的游戏项目数组是否合法
      if (!Array.isArray(savedProgress.gameItems) || savedProgress.gameItems.length === 0) {
        logger.warn('保存的游戏项目数据无效', { userId });
        return false;
      }
      
      // 恢复保存的状态
      setGameItems(savedProgress.gameItems);
      setCurrentWordIndex(savedProgress.currentWordIndex);
      setTotalScore(savedProgress.totalScore);
      setCompletedItems(savedProgress.completedItems);
      setScore(savedProgress.score);
      setLives(savedProgress.lives);
      setTimeSpent(savedProgress.timeSpent || 0);
      setGameStarted(true);
      setIsProgressSaved(true);
      
      logger.info('游戏进度已恢复', { 
        userId,
        levelId: currentLevel.id, 
        currentWordIndex: savedProgress.currentWordIndex,
        completedItems: savedProgress.completedItems,
        totalItems: savedProgress.gameItems.length,
        savedAt: savedProgress.timestamp
      });
      
      return true;
    } catch (error) {
      logger.error('加载游戏进度失败', { 
        userId,
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }, [userId, currentLevel]);
  
  // 询问是否恢复保存的进度
  const promptRestoreProgress = useCallback(() => {
    if (!userId || !currentLevel) return;
    
    try {
      const savedProgressStr = localStorage.getItem(`gameProgress_${userId}`);
      if (!savedProgressStr) return;
      
      const savedProgress = JSON.parse(savedProgressStr);
      
      // 验证保存的进度是否属于当前关卡
      if (savedProgress.levelId !== currentLevel.id) return;
      
      // 计算保存时间
      const savedAt = new Date(savedProgress.timestamp);
      const now = new Date();
      const hoursSinceSaved = Math.floor((now.getTime() - savedAt.getTime()) / (1000 * 60 * 60));
      const minutesSinceSaved = Math.floor((now.getTime() - savedAt.getTime()) / (1000 * 60)) % 60;
      
      // 提示用户是否恢复进度
      Modal.confirm({
        title: '发现保存的游戏进度',
        icon: <ExclamationCircleOutlined />,
        content: `发现${hoursSinceSaved > 0 ? `${hoursSinceSaved}小时` : ''}${minutesSinceSaved}分钟前保存的游戏进度，是否恢复？`,
        okText: '恢复进度',
        cancelText: '重新开始',
        onOk() {
          loadGameProgress();
        },
        onCancel() {
          // 删除保存的进度并重新开始游戏
          localStorage.removeItem(`gameProgress_${userId}`);
          setIsProgressSaved(false);
          if (currentLevel) {
            initializeGame(currentLevel);
          }
        },
      });
    } catch (error) {
      logger.error('检查游戏进度失败', { 
        userId,
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }, [userId, currentLevel, loadGameProgress]);
  
  // 设置自动保存定时器
  useEffect(() => {
    // 只有在游戏开始且有用户ID和关卡ID时才启动自动保存
    if (gameStarted && userId && currentLevel) {
      // 清除之前的定时器
      if (intervalId) {
        clearInterval(intervalId);
      }
      
      // 每60秒自动保存一次游戏进度
      const id = setInterval(() => {
        saveGameProgress();
      }, 60000);
      
      setIntervalId(id);
      
      return () => {
        clearInterval(id);
      };
    }
  }, [gameStarted, userId, currentLevel, saveGameProgress, intervalId]);
  
  // 游戏页面加载
  useEffect(() => {
    performanceMonitor.startOperation('GamePageLoad');
    logger.info('游戏页面加载', { timestamp: new Date().toISOString() });
    
    // 检查用户登录状态
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
      logger.warn('未登录用户尝试访问游戏页面', { redirectTo: '/login' });
      message.warning('请先登录！');
      navigate('/login');
      return;
    }

    const currentUser = JSON.parse(currentUserStr);
    setUserId(currentUser.id);
    logger.info('用户登录状态验证通过，开始加载游戏', { userId: currentUser.id });
    
    // 初始化用户关卡进度
    const unlockedLevels = UserGameProgressManager.initializeUserProgress(currentUser.id);
    if (unlockedLevels.length > 0) {
      logger.info('用户起始关卡已初始化', { userId: currentUser.id, unlockedCount: unlockedLevels.length });
    }
    
    // 加载关卡
    loadGameLevels(currentUser.id);

    performanceMonitor.endOperation('GamePageLoad');
    
    // 组件卸载时保存进度
    return () => {
      if (gameStarted && userId && currentLevel) {
        saveGameProgress();
      }
      
      // 清除定时器
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [navigate, saveGameProgress, intervalId]);

  const loadGameLevels = (userId: string) => {
    logger.info('开始加载游戏关卡', { userId });
    performanceMonitor.startOperation('LoadGameLevels');

    try {
      // 获取所有关卡
      const allLevels = GameLevelManager.getAllLevels();
      setLevels(allLevels);

      // 获取用户数据
      const user = UserManager.getUser(userId);
      if (!user || !user.gameLevels) {
        logger.error('加载关卡失败：用户数据不完整', { userId });
        message.error('加载用户数据失败');
        return;
      }

      // 获取用户当前关卡（最后一个已解锁但未完成的关卡）
      let currentLevelToPlay: GameLevel | null = null;
      
      if (user.gameLevels.currentLevelId) {
        // 如果用户有当前关卡记录，直接使用
        currentLevelToPlay = allLevels.find(l => l.id === user.gameLevels.currentLevelId!) || null;
      } else {
        // 否则找第一个未完成的已解锁关卡
        const unlockedButNotCompleted = user.gameLevels.unlockedLevelIds.filter(
          id => !user.gameLevels.completedLevelIds.includes(id)
        );
        
        if (unlockedButNotCompleted.length > 0) {
          currentLevelToPlay = allLevels.find(l => l.id === unlockedButNotCompleted[0]) || null;
        } else if (user.gameLevels.unlockedLevelIds.length > 0) {
          // 如果所有已解锁关卡都完成了，就选第一个已解锁的
          currentLevelToPlay = allLevels.find(l => l.id === user.gameLevels.unlockedLevelIds[0]) || null;
        }
      }

      if (currentLevelToPlay) {
        setCurrentLevel(currentLevelToPlay);
        setStartTime(Date.now());
        logger.info('关卡加载完成', { 
          totalLevels: allLevels.length,
          unlockedLevels: user.gameLevels.unlockedLevelIds.length,
          completedLevels: user.gameLevels.completedLevelIds.length,
          currentLevelId: currentLevelToPlay.id,
          userId 
        });
        
        // 检查是否有保存的进度
        setTimeout(() => {
          promptRestoreProgress();
        }, 500);
      } else {
        logger.warn('没有可玩的关卡', { userId });
        message.warning('没有可用的关卡，请先解锁关卡');
      }

      performanceMonitor.endOperation('LoadGameLevels');
    } catch (error) {
      logger.error('加载关卡时发生异常', { 
        userId, 
        error: error instanceof Error ? error.message : String(error) 
      });
      message.error('加载关卡失败');
    }
  };

  // 将 Challenge 转换为 GameItem 的辅助函数
  const convertChallengeToGameItem = (challenge: Challenge): GameItem | null => {
    // 根据不同的挑战类型转换为对应的游戏项
    if (challenge.type === 'wordCompletion' && challenge.content.type === 'wordCompletion') {
      const wordContent = challenge.content;
      return {
        id: challenge.id,
        word: wordContent.correctAnswer,
        hint: wordContent.hints?.[0] || challenge.description || '',
        category: 'challenge',
        difficulty: challenge.difficulty <= 2 ? 'easy' : challenge.difficulty <= 3 ? 'medium' : 'hard',
        audioUrl: undefined
      } as GameWord;
    } else if (challenge.type === 'translation' && challenge.content.type === 'translation') {
      const translationContent = challenge.content;
      return {
        id: challenge.id,
        chinesePhrase: translationContent.sourceText,
        englishTranslation: translationContent.correctAnswer,
        hint: challenge.description,
        audioUrl: undefined
      } as ChineseToEnglishWord;
    }
    
    // 其他类型的挑战暂时不支持，返回 null
    logger.warn('不支持的挑战类型', { 
      challengeId: challenge.id, 
      type: challenge.type 
    });
    return null;
  };

  const initializeGame = (level: GameLevel) => {
    logger.info('初始化游戏', { levelId: level.id, levelName: level.name });
    performanceMonitor.startOperation('InitializeGame');
    
    // 尝试加载保存的进度
    const hasSavedProgress = loadGameProgress();
    
    if (!hasSavedProgress) {
      // 如果没有保存的进度，正常初始化游戏
      // 从关卡的所有阶段中收集挑战项目
      const levelChallenges: Challenge[] = [];
      if (level.stages && level.stages.length > 0) {
        level.stages.forEach(stage => {
          if (stage.challenges && stage.challenges.length > 0) {
            levelChallenges.push(...stage.challenges);
          }
        });
      }
      
      // 将 Challenge 转换为 GameItem
      const convertedItems: GameItem[] = levelChallenges
        .map(challenge => convertChallengeToGameItem(challenge))
        .filter((item): item is GameItem => item !== null);
      
      // 如果关卡没有有效的挑战项，使用样例数据
      const gameItems = convertedItems.length > 0 ? convertedItems : sampleWords;
  
      // 随机选择5个项目进行游戏
      const shuffledItems = [...gameItems].sort(() => Math.random() - 0.5);
      const selectedItems = shuffledItems.slice(0, 5);
      setGameItems(selectedItems);
      setCurrentWordIndex(0);
      setTotalScore(0);
      setCompletedItems(0);
      setGameStarted(true);
      setStartTime(Date.now());
      setTimeSpent(0);
      setScore(0);
      setLives(3);
      
      logger.info('游戏初始化完成', { 
        levelId: level.id,
        totalItems: selectedItems.length,
        itemTypes: selectedItems.map(item => 'word' in item ? 'WordCompletion' : 'ChineseToEnglish')
      });
    } else {
      // 提示已恢复保存的游戏进度
      message.success('已恢复上次游戏进度');
    }
    
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
    if (!userId || !currentLevel) {
      logger.warn('完成关卡时缺少必要信息', { userId, currentLevel });
      return;
    }

    // 计算游戏时长（秒）
    const gameTimeSpent = Math.floor((Date.now() - startTime) / 1000) + timeSpent;

    logger.info('关卡完成', { 
      userId,
      levelId: currentLevel.id,
      score,
      timeSpent: gameTimeSpent,
      lives
    });

    // 根据得分和生命值计算星级
    let stars = 0;
    if (score >= 90 && lives >= 2) stars = 3;
    else if (score >= 70 && lives >= 1) stars = 2;
    else if (score >= 50) stars = 1;

    logger.debug('星级计算完成', { 
      score, 
      lives,
      stars,
      levelId: currentLevel.id 
    });

    // 更新关卡完成状态
    const updateSuccess = UserGameProgressManager.updateLevelCompletion(
      userId,
      currentLevel.id,
      stars,
      score,
      gameTimeSpent
    );

    if (!updateSuccess) {
      logger.error('更新关卡完成状态失败', { userId, levelId: currentLevel.id });
      message.error('保存进度失败，请重试');
      return;
    }

    // 检查并解锁新关卡
    const newlyUnlockedLevels = UserGameProgressManager.checkAndUnlockNewLevels(userId);
    if (newlyUnlockedLevels.length > 0) {
      logger.info('解锁了新关卡', { 
        userId,
        newlyUnlockedCount: newlyUnlockedLevels.length,
        newlyUnlockedLevelIds: newlyUnlockedLevels
      });
      message.success(`恭喜！解锁了 ${newlyUnlockedLevels.length} 个新关卡！`);
    }

    // 检查并解锁成就
    const newlyUnlockedAchievements = UserGameProgressManager.checkAndUnlockAchievements(userId);
    if (newlyUnlockedAchievements.length > 0) {
      logger.info('解锁了新成就', { 
        userId,
        newlyUnlockedCount: newlyUnlockedAchievements.length,
        newlyUnlockedAchievementIds: newlyUnlockedAchievements
      });
      message.success({
        content: `🎉 解锁了 ${newlyUnlockedAchievements.length} 个新成就！`,
        icon: <TrophyOutlined style={{ color: '#faad14' }} />
      });
    }

    message.success(`恭喜完成关卡！获得 ${stars} 颗星 ⭐`);

    // 重置游戏状态
    setScore(0);
    setLives(3);
    setCurrentChallenge(0);
    setStartTime(Date.now());
    setTimeSpent(0);
    
    // 清除保存的进度
    localStorage.removeItem(`gameProgress_${userId}`);
    setIsProgressSaved(false);
    
    // 重新加载关卡数据
    loadGameLevels(userId);
    
    logger.info('游戏状态已重置，准备下一关卡', { userId });
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

  const handleLevelSelect = (levelId: string) => {
    if (!userId) {
      logger.warn('选择关卡时用户未登录', { levelId });
      message.warning('请先登录');
      return;
    }

    const user = UserManager.getUser(userId);
    if (!user || !user.gameLevels) {
      logger.error('选择关卡失败：用户数据不完整', { userId, levelId });
      message.error('用户数据加载失败');
      return;
    }

    const selectedLevel = levels.find(level => level.id === levelId);
    if (selectedLevel) {
      const isUnlocked = user.gameLevels.unlockedLevelIds.includes(levelId);
      if (isUnlocked) {
        // 如果当前有游戏进行中，并且有未保存的进度，提示用户保存
        if (gameStarted && currentLevel && currentLevel.id !== levelId && !isProgressSaved) {
          Modal.confirm({
            title: '切换关卡',
            icon: <ExclamationCircleOutlined />,
            content: '当前游戏进度未保存，切换关卡将丢失当前进度，是否继续？',
            okText: '继续切换',
            cancelText: '返回游戏',
            onOk() {
              proceedToSelectLevel(selectedLevel, user);
            }
          });
        } else {
          proceedToSelectLevel(selectedLevel, user);
        }
      } else {
        logger.warn('尝试进入未解锁的关卡', { 
          levelId, 
          userId 
        });
        message.warning('该关卡尚未解锁！');
      }
    } else {
      logger.error('选择的关卡不存在', { levelId, userId });
      message.error('关卡不存在');
    }
  };
  
  // 继续选择关卡的逻辑
  const proceedToSelectLevel = (selectedLevel: GameLevel, user: any) => {
    setCurrentLevel(selectedLevel);
    setScore(0);
    setLives(3);
    setCurrentChallenge(0);
    setStartTime(Date.now());
    setIsProgressSaved(false);
    
    // 清除之前关卡的本地存储进度
    localStorage.removeItem(`gameProgress_${userId}`);
    
    // 更新用户当前关卡
    user.gameLevels.currentLevelId = selectedLevel.id;
    user.gameLevels.lastPlayedAt = new Date().toISOString();
    UserManager.updateUser(user);
    
    logger.info('切换关卡', { 
      levelId: selectedLevel.id, 
      levelName: selectedLevel.name,
      userId 
    });
    
    message.success(`已切换到关卡: ${selectedLevel.name}`);
    
    // 初始化游戏
    initializeGame(selectedLevel);
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
    <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Card style={{ maxWidth: 800, margin: '0 auto', borderRadius: '15px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <Title level={2} style={{ color: '#1890ff' }}>单词补全闯关</Title>
          <Progress 
            percent={Math.round(progress)} 
            status="active"
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
            style={{ marginBottom: '15px' }}
          />
          <Row justify="space-between" align="middle">
            <Col>
              <Text strong>进度: {completedItems}/{gameItems.length}</Text>
            </Col>
            <Col>
              <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>总得分: {totalScore}</Text>
            </Col>
          </Row>
        </div>

        <Divider style={{ margin: '24px 0' }} />

        {currentItem ? (
          <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        ) : (
          <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          </div>
        )}

        <Divider style={{ margin: '24px 0' }} />

        <div style={{ textAlign: 'center' }}>
          <Space size="large">
            <Button icon={<HomeOutlined />} onClick={goHome} size="large">
              返回首页
            </Button>
            <Button icon={<SaveOutlined />} onClick={handleManualSave} size="large">
              保存进度
            </Button>
            <Button type="primary" icon={<ReloadOutlined />} onClick={restartGame} size="large">
              重新开始
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default Game;