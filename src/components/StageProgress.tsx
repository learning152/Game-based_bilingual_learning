import React from 'react';
import { GameStage, UserLevelProgress } from '../models/Level';

interface StageProgressProps {
  stages: GameStage[];
  progress: UserLevelProgress | null;
}

/**
 * 阶段进度指示器组件
 * 显示关卡中各阶段的完成情况
 */
const StageProgress: React.FC<StageProgressProps> = ({ stages, progress }) => {
  const completedStages = progress?.completedStages || [];
  const currentStage = progress?.currentStage || 0;

  return (
    <div className="stage-progress">
      <h4>阶段进度</h4>
      <div className="stage-dots">
        {stages.map((stage, index) => {
          // 确定阶段状态：已完成、当前、待完成
          const isCompleted = completedStages.includes(stage.id);
          const isCurrent = index === currentStage;
          
          let statusClass = 'pending';
          if (isCompleted) statusClass = 'completed';
          else if (isCurrent) statusClass = 'current';

          return (
            <div key={stage.id} className="stage-dot-container">
              <div 
                className={`stage-dot ${statusClass}`} 
                title={stage.title}
              >
                {index + 1}
              </div>
              {index < stages.length - 1 && (
                <div className={`stage-line ${isCompleted ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="stage-labels">
        {stages.map((stage, index) => (
          <div key={stage.id} className="stage-label">
            {stage.title}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StageProgress;