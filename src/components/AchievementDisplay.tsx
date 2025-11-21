import React, { useEffect, useState } from 'react';
import { Card, Typography, Row, Col, Progress, Tag, Tooltip, Empty, Space } from 'antd';
import { TrophyOutlined, LockOutlined } from '@ant-design/icons';
import { AchievementManager, Achievement } from '../models/Achievement';
import { AchievementEngine } from '../utils/achievementEngine';
// import { logger } from '../utils/logger';
import { getLogger } from '../utils/logger';

// 获取 logger 实例
const logger = getLogger();

interface AchievementProgress {
  achievementId: string;
  achievement: Achievement | null;
  isUnlocked: boolean;
  progress: number;
  description: string;
}

interface AchievementDisplayProps {
  userId: string;
  onAchievementClick?: (achievementId: string) => void;
}

/**
 * 成就展示组件
 * 显示用户已获得和未获得的成就，包括进度条和详细信息
 */
export const AchievementDisplay: React.FC<AchievementDisplayProps> = ({ 
  userId, 
  onAchievementClick 
}) => {
  const [achievementProgress, setAchievementProgress] = useState<AchievementProgress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      setError(null);

      // 获取用户成就进度
      const progress = AchievementEngine.getUserAchievementProgress(userId);
      setAchievementProgress(progress);

      logger.info('成就数据加载完成', { userId, count: progress.length });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载成就数据失败';
      setError(errorMessage);
      logger.error('加载成就数据失败', { error: err, userId });
    } finally {
      setLoading(false);
    }
  };

  const handleAchievementClick = (achievementId: string) => {
    if (onAchievementClick) {
      onAchievementClick(achievementId);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <Typography.Text>加载成就数据中...</Typography.Text>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <Typography.Text type="danger">{error}</Typography.Text>
      </div>
    );
  }

  // 分离已解锁和未解锁的成就
  const unlockedAchievements = achievementProgress.filter(a => a.isUnlocked);
  const lockedAchievements = achievementProgress.filter(a => !a.isUnlocked);

  return (
    <div style={{ padding: 16 }}>
      <Typography.Title level={2}>
        我的成就
      </Typography.Title>
      
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={4} type="success" style={{ marginBottom: 8 }}>
          已获得成就 ({unlockedAchievements.length}/{achievementProgress.length})
        </Typography.Title>
        <Progress 
          percent={achievementProgress.length > 0 ? Math.round((unlockedAchievements.length / achievementProgress.length) * 100) : 0}
          strokeWidth={10}
          style={{ marginBottom: 16 }}
        />
      </div>

      {/* 已解锁的成就 */}
      {unlockedAchievements.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <Typography.Title level={4} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrophyOutlined />
            <span>已解锁</span>
          </Typography.Title>
          <Row gutter={[16, 16]}>
            {unlockedAchievements.map((item) => (
              <Col xs={24} sm={12} md={8} key={item.achievementId}>
                <AchievementCard 
                  achievement={item} 
                  onClick={() => handleAchievementClick(item.achievementId)}
                />
              </Col>
            ))}
          </Row>
        </div>
      )}

      {/* 未解锁的成就 */}
      {lockedAchievements.length > 0 && (
        <div>
          <Typography.Title level={4} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <LockOutlined />
            <span>待解锁</span>
          </Typography.Title>
          <Row gutter={[16, 16]}>
            {lockedAchievements.map((item) => (
              <Col xs={24} sm={12} md={8} key={item.achievementId}>
                <AchievementCard 
                  achievement={item} 
                  onClick={() => handleAchievementClick(item.achievementId)}
                />
              </Col>
            ))}
          </Row>
        </div>
      )}

      {achievementProgress.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Empty
            description={
              <Typography.Text type="secondary">
                暂无成就数据，开始学习以解锁成就吧！
              </Typography.Text>
            }
          />
        </div>
      )}
    </div>
  );
};

/**
 * 单个成就卡片组件
 */
interface AchievementCardProps {
  achievement: AchievementProgress;
  onClick: () => void;
}

const AchievementCard: React.FC<AchievementCardProps> = ({ achievement, onClick }) => {
  const { achievementId, achievement: achievementData, isUnlocked, progress, description } = achievement;

  return (
    <Tooltip title={description}>
      <Card 
        hoverable
        style={{ 
          cursor: 'pointer',
          opacity: isUnlocked ? 1 : 0.6,
          filter: isUnlocked ? 'none' : 'grayscale(50%)',
          transition: 'all 0.3s ease'
        }}
        onClick={onClick}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <Typography.Text style={{ fontSize: 24 }}>
              {achievementData?.icon || '🎯'}
            </Typography.Text>
            {isUnlocked && (
              <Tag color="success">
                已解锁
              </Tag>
            )}
          </div>

          <Typography.Title level={5} style={{ marginBottom: 8 }}>
            {achievementData?.title || achievementId}
          </Typography.Title>

          <Typography.Paragraph 
            type="secondary" 
            style={{ marginBottom: 16, minHeight: 40 }}
          >
            {achievementData?.description || description}
          </Typography.Paragraph>

          {!isUnlocked && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  进度
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {Math.round(progress)}%
                </Typography.Text>
              </div>
              <Progress 
                percent={progress} 
                size="small"
                strokeWidth={6}
              />
            </div>
          )}

          {isUnlocked && achievementData && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              解锁条件: {achievementData.criteria}
            </Typography.Text>
          )}
        </div>
      </Card>
    </Tooltip>
  );
};

/**
 * 成就通知组件（用于显示新解锁的成就）
 */
interface AchievementNotificationProps {
  achievementId: string;
  onClose: () => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({ 
  achievementId, 
  onClose 
}) => {
  const [achievement, setAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    const data = AchievementManager.getAchievement(achievementId);
    setAchievement(data);

    // 自动关闭通知
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [achievementId, onClose]);

  if (!achievement) return null;

  return (
    <Card 
      style={{ 
        position: 'fixed',
        top: 20,
        right: 20,
        maxWidth: 400,
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Typography.Text style={{ fontSize: 32 }}>
          {achievement.icon}
        </Typography.Text>
        <div style={{ flex: 1 }}>
          <Typography.Title level={5} type="success" style={{ marginBottom: 4 }}>
            🎉 成就解锁！
          </Typography.Title>
          <Typography.Title level={4} style={{ marginBottom: 4 }}>
            {achievement.title}
          </Typography.Title>
          <Typography.Text type="secondary">
            {achievement.description}
          </Typography.Text>
        </div>
      </div>
    </Card>
  );
};

export default AchievementDisplay;