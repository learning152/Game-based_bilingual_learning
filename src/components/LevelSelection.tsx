import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameLevel, GameLevelManager, UserLevelProgress } from '../models/Level';
import { getUserLogger } from '../utils/logManager';

const logger = getUserLogger();

interface LevelCardProps {
  level: GameLevel;
  progress: UserLevelProgress | null;
  onSelect: (levelId: string) => void;
}

const LevelCard: React.FC<LevelCardProps> = ({ level, progress, onSelect }) => {
  const isUnlocked = progress?.isUnlocked ?? false;
  const stars = progress?.stars ?? 0;

  return (
    <div 
      className={`level-card ${isUnlocked ? 'unlocked' : 'locked'}`}
      onClick={() => isUnlocked && onSelect(level.id)}
    >
      <h3>{level.title}</h3>
      <p>{level.description}</p>
      <div className="level-info">
        <span>难度: {level.difficulty}</span>
        <span>语言: {level.language}</span>
        <span>预计时间: {level.estimatedTime}分钟</span>
      </div>
      {isUnlocked ? (
        <div className="level-progress">
          <div className="stars">
            {[1, 2, 3].map((star) => (
              <span key={star} className={star <= stars ? 'filled' : ''}>★</span>
            ))}
          </div>
          <span>完成度: {(progress?.completedStages.length ?? 0) / level.stages.length * 100}%</span>
        </div>
      ) : (
        <div className="lock-info">
          <span>🔒 未解锁</span>
        </div>
      )}
    </div>
  );
};

const LevelSelection: React.FC = () => {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<GameLevel[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, UserLevelProgress>>({});
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // 获取当前登录用户
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
      logger.warn('未登录用户尝试访问关卡选择', {});
      return;
    }

    const currentUser = JSON.parse(currentUserStr);
    const currentUserId = currentUser.id;
    setUserId(currentUserId);

    // 加载关卡数据
    const allLevels = GameLevelManager.getAllLevels();
    setLevels(allLevels);

    // 加载用户进度
    const progress = GameLevelManager.getAllUserProgress(currentUserId);
    const progressMap = progress.reduce((acc, curr) => {
      acc[curr.levelId] = curr;
      return acc;
    }, {} as Record<string, UserLevelProgress>);
    
    setUserProgress(progressMap);

    logger.info('关卡选择页面加载完成', { 
      userId: currentUserId, 
      totalLevels: allLevels.length,
      userProgressCount: progress.length 
    });
  }, []);

  const handleLevelSelect = (levelId: string) => {
    // 导航到关卡详情页
    navigate(`/level-detail/${levelId}`);
  };

  return (
    <div className="level-selection">
      <h2>选择关卡</h2>
      <div className="level-grid">
        {levels.map((level) => (
          <LevelCard
            key={level.id}
            level={level}
            progress={userProgress[level.id]}
            onSelect={handleLevelSelect}
          />
        ))}
      </div>
    </div>
  );
};

export default LevelSelection;