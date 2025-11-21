import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameLevel, GameLevelManager, UserLevelProgress } from '../models/Level';

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

  useEffect(() => {
    // 加载所有关卡
    const allLevels = GameLevelManager.getLevelsByFilter();
    setLevels(allLevels);

    // 模拟用户ID，实际应用中应从用户会话获取
    const userId = 'test_user';

    // 加载用户进度
    const progress = GameLevelManager.getAllUserProgress(userId);
    const progressMap = progress.reduce((acc, curr) => {
      acc[curr.levelId] = curr;
      return acc;
    }, {} as Record<string, UserLevelProgress>);
    setUserProgress(progressMap);
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