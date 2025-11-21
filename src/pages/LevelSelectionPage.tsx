import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Row, Col, Progress, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { GameLevelManager, GameLevel } from '../models/Level';
import UserGameProgressManager from '../utils/userGameProgressManager';
import { UserManager } from '../models/User';
import { getUserLogger } from '../utils/logManager';

const { Title, Text } = Typography;
const logger = getUserLogger();

interface LevelCardProps {
  level: GameLevel;
  progress: number;
  stars: number;
  isUnlocked: boolean;
  onSelect: (levelId: string) => void;
}

const LevelCard: React.FC<LevelCardProps> = ({ level, progress, stars, isUnlocked, onSelect }) => {
  return (
    <Card
      hoverable={isUnlocked}
      onClick={() => isUnlocked && onSelect(level.id)}
      style={{ marginBottom: 16, opacity: isUnlocked ? 1 : 0.5 }}
    >
      <Title level={4}>{level.name}</Title>
      <Text>{level.description}</Text>
      <Progress percent={progress} />
      <div>
        {[1, 2, 3].map((star) => (
          <span key={star} style={{ color: star <= stars ? 'gold' : 'gray', fontSize: 24 }}>
            ★
          </span>
        ))}
      </div>
      {!isUnlocked && <Text type="warning">未解锁</Text>}
    </Card>
  );
};

const LevelSelectionPage: React.FC = () => {
  const [levels, setLevels] = useState<GameLevel[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, { progress: number; stars: number }>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadLevels = async () => {
      try {
        const allLevels = GameLevelManager.getAllLevels();
        setLevels(allLevels);

        const currentUserStr = localStorage.getItem('currentUser');
        if (!currentUserStr) {
          message.error('用户未登录');
          navigate('/login');
          return;
        }

        const currentUser = JSON.parse(currentUserStr);
        const userId = currentUser.id;

        const user = UserManager.getUser(userId);
        if (!user || !user.gameLevels) {
          message.error('无法加载用户数据');
          return;
        }

        const progress: Record<string, { progress: number; stars: number }> = {};
        allLevels.forEach(level => {
          const levelProgress = UserGameProgressManager.getLevelProgress(userId, level.id);
          if (levelProgress) {
            progress[level.id] = {
              progress: (levelProgress.completedStages?.length || 0) / level.stages.length * 100,
              stars: levelProgress.stars
            };
          } else {
            progress[level.id] = { progress: 0, stars: 0 };
          }
        });

        setUserProgress(progress);

        logger.info('关卡选择页面加载完成', { userId, totalLevels: allLevels.length });
      } catch (error) {
        logger.error('加载关卡数据失败', { error: error instanceof Error ? error.message : String(error) });
        message.error('加载关卡数据失败');
      }
    };

    loadLevels();
  }, [navigate]);

  const handleLevelSelect = (levelId: string) => {
    navigate(`/game/${levelId}`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: '20px' }}>选择关卡</Title>
      <Row gutter={16}>
        {levels.map(level => (
          <Col key={level.id} xs={24} sm={12} md={8} lg={6}>
            <LevelCard
              level={level}
              progress={userProgress[level.id]?.progress || 0}
              stars={userProgress[level.id]?.stars || 0}
              isUnlocked={true} // 这里需要根据实际逻辑判断关卡是否解锁
              onSelect={handleLevelSelect}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default LevelSelectionPage;