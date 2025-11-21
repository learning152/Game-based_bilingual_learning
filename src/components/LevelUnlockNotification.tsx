import React, { useState, useEffect } from 'react';
import { 
  Card, Typography, Button, 
  Modal, List, Space, Tag, Divider, Row, Col, Progress
} from 'antd';
import { Link } from 'react-router-dom';
import { TrophyOutlined, LockOutlined } from '@ant-design/icons';
import { GameLevel, UnlockCondition } from '../models/Level';
// import { logger } from '../utils/logger';
import { getLogger } from '../utils/logger';

// 获取 logger 实例
const logger = getLogger();

interface LevelUnlockNotificationProps {
  unlockedLevelIds: string[];
  onClose: () => void;
}

/**
 * 关卡解锁通知组件
 * 用于在用户解锁新关卡时显示提示
 */
export const LevelUnlockNotification: React.FC<LevelUnlockNotificationProps> = ({
  unlockedLevelIds,
  onClose
}) => {
  const [open, setOpen] = useState(unlockedLevelIds.length > 0);
  const [unlockedLevels, setUnlockedLevels] = useState<GameLevel[]>([]);

  useEffect(() => {
    // 当有新的解锁关卡时，获取关卡详情
    if (unlockedLevelIds.length > 0) {
      loadLevelDetails();
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [unlockedLevelIds]);

  // 加载关卡详情
  const loadLevelDetails = () => {
    import('../models/Level').then(({ GameLevelManager }) => {
      const levels = unlockedLevelIds
        .map(id => GameLevelManager.getLevel(id))
        .filter((level): level is GameLevel => level !== null);
      
      setUnlockedLevels(levels);
      logger.info('加载解锁关卡详情', { count: levels.length });
    });
  };

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  if (!open || unlockedLevels.length === 0) return null;

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={800}
      bodyStyle={{
        background: 'linear-gradient(to bottom right, #f5f7fa, #e4e8f0)',
        borderRadius: 16,
        padding: 24
      }}
    >
      <Typography.Title level={2} style={{ textAlign: 'center', color: '#1890ff', marginBottom: 24 }}>
        🎉 新关卡已解锁！
      </Typography.Title>
      
      <Typography.Paragraph style={{ textAlign: 'center', marginBottom: 24 }}>
        恭喜你！你的学习进度已经解锁了以下新关卡:
      </Typography.Paragraph>

      <Row gutter={[16, 16]}>
        {unlockedLevels.map((level) => (
          <Col span={24} key={level.id}>
            <Card
              hoverable
              style={{
                marginBottom: 16,
                borderRadius: 8,
                transition: 'all 0.3s',
                border: '1px solid rgba(0, 0, 0, 0.05)',
              }}
            >
              <Space align="start" style={{ width: '100%' }}>
                <Typography.Title level={2} style={{ margin: 0 }}>
                  {level.icon || '🌟'}
                </Typography.Title>
                <div style={{ flex: 1 }}>
                  <Typography.Title level={4} style={{ marginBottom: 8 }}>
                    {level.title}
                  </Typography.Title>
                  
                  <Space wrap style={{ marginBottom: 8 }}>
                    <Tag color={
                      level.difficulty === 'beginner' ? 'success' : 
                      level.difficulty === 'intermediate' ? 'processing' : 
                      'error'
                    }>
                      {level.difficulty} 难度
                    </Tag>
                    <Tag>{level.language === 'chinese' ? '中文' : '英文'}</Tag>
                    <Tag>{`${level.estimatedTime} 分钟`}</Tag>
                  </Space>
                </div>
              </Space>

              <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
                {level.description}
              </Typography.Paragraph>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <Button
                  type="primary"
                  onClick={() => {
                    handleClose();
                    // 使用 window.location 进行导航，因为我们在 Modal 内部
                    window.location.href = `/level/${level.id}`;
                  }}
                >
                  开始学习
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Button onClick={handleClose}>
          稍后再看
        </Button>
      </div>
    </Modal>
  );
};

/**
 * 关卡解锁指南组件
 * 用于显示关卡的解锁条件和指导用户如何解锁
 */
interface LevelUnlockGuideProps {
  levelId: string; // 目标关卡ID
  userId: string; // 当前用户ID
  showProgress?: boolean; // 是否显示解锁进度
}

export const LevelUnlockGuide: React.FC<LevelUnlockGuideProps> = ({
  levelId,
  userId,
  showProgress = true
}) => {
  const [level, setLevel] = useState<GameLevel | null>(null);
  const [progress, setProgress] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLevelAndProgress();
  }, [levelId, userId]);

  const loadLevelAndProgress = async () => {
    setLoading(true);
    
    try {
      const { GameLevelManager } = await import('../models/Level');
      const levelData = GameLevelManager.getLevel(levelId);
      setLevel(levelData);
      
      if (levelData && showProgress) {
        // 计算每个条件的完成进度
        const progressData = calculateUnlockProgress(levelData.unlockConditions, userId);
        setProgress(progressData);
      }
    } catch (err) {
      logger.error('加载关卡解锁指南数据出错', { error: err, levelId });
    } finally {
      setLoading(false);
    }
  };

  // 计算解锁条件的进度
  const calculateUnlockProgress = (
    conditions: UnlockCondition[], 
    userId: string
  ): {[key: string]: number} => {
    const progress: {[key: string]: number} = {};
    
    try {
      const { GameLevelManager } = require('../models/Level');
      
      for (const condition of conditions) {
        let value = 0;
        
        switch (condition.type) {
          case 'level':
            // 获取目标关卡的进度
            const levelProgress = GameLevelManager.getUserProgress(userId, condition.target);
            value = levelProgress ? (levelProgress.stars / condition.value) * 100 : 0;
            break;
            
          case 'score':
            // 获取用户总分
            const allProgress = GameLevelManager.getAllUserProgress(userId);
            const totalScore = allProgress.reduce((sum: any, p: { totalScore: any; }) => sum + p.totalScore, 0);
            value = (totalScore / condition.value) * 100;
            break;
            
          case 'achievement':
            // 检查是否获得了指定成就
            const userAchievements = GameLevelManager.getAllUserProgress(userId)
              .flatMap((p: { achievements: any; }) => p.achievements);
            value = userAchievements.includes(condition.target) ? 100 : 0;
            break;
            
          default:
            value = 0;
        }
        
        // 限制进度值在0-100之间
        progress[`${condition.type}_${condition.target}`] = Math.min(100, Math.max(0, value));
      }
    } catch (err) {
      logger.error('计算解锁进度时发生错误', { error: err, userId });
    }
    
    return progress;
  };

  const getConditionIcon = (type: string): string => {
    switch (type) {
      case 'level': return '🏆';
      case 'score': return '💯';
      case 'achievement': return '🎖️';
      case 'challenge': return '⚔️';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <Typography>加载解锁指南...</Typography>
      </div>
    );
  }

  if (!level) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <Typography style={{ color: '#ff4d4f' }}>无法加载关卡数据</Typography>
      </div>
    );
  }

  return (
    <Card>
      <div style={{ padding: 16 }}>
        <Typography.Title level={5} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔒</span>
          <span>如何解锁此关卡</span>
        </Typography.Title>
        
        <Divider style={{ margin: '16px 0' }} />
        
        <List
          itemLayout="horizontal"
          dataSource={level.unlockConditions}
          renderItem={(condition, index) => {
            const key = `${condition.type}_${condition.target}`;
            const progressValue = progress[key] || 0;
            const isCompleted = progressValue >= 100;
            
            return (
              <List.Item
                key={index}
                actions={[
                  isCompleted && <Tag color="success" key="status">完成</Tag>
                ]}
              >
                <List.Item.Meta
                  avatar={<span style={{ fontSize: 20, minWidth: 32, display: 'inline-block' }}>{getConditionIcon(condition.type)}</span>}
                  title={condition.description}
                  description={
                    showProgress && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Progress 
                          percent={Math.round(progressValue)} 
                          size="small"
                          strokeColor={isCompleted ? '#52c41a' : '#1890ff'}
                          style={{ flex: 1, margin: 0 }}
                        />
                        <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                          {Math.round(progressValue)}%
                        </span>
                      </div>
                    )
                  }
                />
              </List.Item>
            );
          }}
        />
      </div>
    </Card>
  );
};

export default {
  LevelUnlockNotification,
  LevelUnlockGuide
};