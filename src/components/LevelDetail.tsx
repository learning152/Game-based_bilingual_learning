import React, { useState, useEffect } from 'react';
import { GameLevel, UserLevelProgress, GameLevelManager } from '../models/Level';
import StageProgress from './StageProgress';

interface LevelDetailProps {
  levelId: string;
  userId: string;
}

const LevelDetail: React.FC<LevelDetailProps> = ({ levelId, userId }) => {
  const [level, setLevel] = useState<GameLevel | null>(null);
  const [progress, setProgress] = useState<UserLevelProgress | null>(null);

  useEffect(() => {
    // 加载关卡详情
    const loadedLevel = GameLevelManager.getLevel(levelId);
    if (loadedLevel) {
      setLevel(loadedLevel);
    }

    // 加载用户进度
    const userProgress = GameLevelManager.getUserProgress(userId, levelId);
    if (userProgress) {
      setProgress(userProgress);
    } else {
      // 如果没有进度，初始化一个新的进度
      const initialProgress = GameLevelManager.initializeUserProgress(userId, levelId);
      setProgress(initialProgress);
    }
  }, [levelId, userId]);

  if (!level) {
    return <div>加载中...</div>;
  }

  return (
    <div className="level-detail">
      <h2>{level.title}</h2>
      <p>{level.description}</p>
      <div className="level-info">
        <span>难度: {level.difficulty}</span>
        <span>语言: {level.language}</span>
        <span>预计时间: {level.estimatedTime}分钟</span>
      </div>
      {progress && (
        <div className="user-progress">
          <h3>你的进度</h3>
          <p>总得分: {progress.totalScore}</p>
          <p>最佳得分: {progress.bestScore}</p>
          <p>完成次数: {progress.attempts}</p>
          <p>总用时: {Math.floor(progress.timeSpent / 60)}分钟</p>
          <div className="stars">
            {[1, 2, 3].map((star) => (
              <span key={star} className={star <= progress.stars ? 'filled' : ''}>★</span>
            ))}
          </div>
        </div>
      )}
      <StageProgress stages={level.stages} progress={progress} />
      <div className="level-rewards">
        <h3>奖励</h3>
        <ul>
          {level.rewards.map((reward, index) => (
            <li key={index}>
              {reward.type}: {reward.value} - {reward.description}
            </li>
          ))}
        </ul>
      </div>
      <div className="level-tags">
        <h3>标签</h3>
        {level.tags.map((tag, index) => (
          <span key={index} className="tag">{tag}</span>
        ))}
      </div>
      {!progress?.isUnlocked && (
        <div className="unlock-conditions">
          <h3>解锁条件</h3>
          <ul>
            {level.unlockConditions.map((condition, index) => (
              <li key={index}>
                {condition.description} ({condition.type}: {condition.value})
              </li>
            ))}
          </ul>
        </div>
      )}
      {progress?.isUnlocked && (
        <button className="start-level-btn" onClick={() => console.log('开始关卡', levelId)}>
          开始关卡
        </button>
      )}
    </div>
  );
};

export default LevelDetail;