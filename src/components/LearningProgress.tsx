import React, { useEffect, useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Typography, Space, Divider, Tabs, Empty } from 'antd';
import { 
  TrophyOutlined, 
  ClockCircleOutlined, 
  StarOutlined, 
  BookOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { LearningStatsManager, LearningStats, Achievement } from '../utils/learningStats';
import LearningCharts from './LearningCharts';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface LearningProgressProps {
  userId: string;
  courseId?: string; // 可选，如果提供则只显示特定课程的统计
}

const LearningProgress: React.FC<LearningProgressProps> = ({ userId, courseId }) => {
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 获取用户学习统计数据
  useEffect(() => {
    if (userId) {
      setLoading(true);
      try {
        const userStats = LearningStatsManager.getUserStats(userId);
        setStats(userStats);
        
        // 获取成就数据
        const userAchievements = LearningStatsManager.getAchievements(userId);
        setAchievements(userAchievements);
      } catch (error) {
        console.error("获取学习统计数据失败:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [userId]);
  
  // 如果指定了courseId，筛选相关数据
  const filteredStats = useMemo(() => {
    if (!stats || !courseId) return stats;
    
    const courseStat = stats.courseStats.find(c => c.courseId === courseId);
    if (!courseStat) return stats;
    
    return {
      ...stats,
      totalScore: courseStat.totalScore,
      totalLevelsCompleted: courseStat.levelsCompleted,
      totalLevelsUnlocked: courseStat.levelsTotal,
      completionRate: courseStat.completionRate,
      averageStars: courseStat.averageStars,
      courseStats: [courseStat]
    };
  }, [stats, courseId]);

  // 最近会话表格列配置
  const sessionColumns = [
    {
      title: '日期',
      dataIndex: 'startTime',
      key: 'date',
      render: (text: string) => new Date(text).toLocaleDateString()
    },
    {
      title: '关卡',
      dataIndex: 'levelId',
      key: 'level'
    },
    {
      title: '得分',
      dataIndex: 'score',
      key: 'score'
    },
    {
      title: '正确率',
      dataIndex: 'correctAnswers',
      key: 'accuracy',
      render: (correct: number, record: any) => 
        `${Math.round((correct / record.totalQuestions) * 100)}%`
    },
    {
      title: '状态',
      dataIndex: 'completed',
      key: 'status',
      render: (completed: boolean) => 
        completed ? <Text type="success">完成</Text> : <Text type="warning">未完成</Text>
    }
  ];
  
  if (!stats) {
    return (
      <Card loading={loading} title="学习进度">
        {!loading && (
          <Empty description="暂无学习记录" />
        )}
      </Card>
    );
  }

  return (
    <div className="learning-progress">
      <Tabs defaultActiveKey="overview" style={{ marginBottom: 24 }}>
        <TabPane tab="总览" key="overview">
          <Row gutter={[16, 16]}>
            {/* 核心指标卡片 */}
            <Col span={24}>
              <Card title="学习进度摘要" bordered={false}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic 
                      title="总分数" 
                      value={filteredStats?.totalScore || 0} 
                      prefix={<TrophyOutlined />} 
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="完成关卡" 
                      value={filteredStats?.totalLevelsCompleted || 0}
                      suffix={`/${filteredStats?.totalLevelsUnlocked || 0}`} 
                      prefix={<CheckCircleOutlined />} 
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="平均星级" 
                      value={filteredStats?.averageStars || 0}
                      suffix="/5" 
                      prefix={<StarOutlined />} 
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="学习天数" 
                      value={filteredStats?.studyDays || 0} 
                      prefix={<ClockCircleOutlined />} 
                    />
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* 进度条 */}
            <Col span={12}>
              <Card title="课程完成进度" bordered={false}>
                <Progress 
                  percent={Math.round(filteredStats?.completionRate || 0)} 
                  status="active" 
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Text>已完成 {filteredStats?.totalLevelsCompleted || 0} 个关卡，共 {filteredStats?.totalLevelsUnlocked || 0} 个</Text>
                </div>
              </Card>
            </Col>

            {/* 学习时间 */}
            <Col span={12}>
              <Card title="学习时间统计" bordered={false}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic 
                      title="总学习时间" 
                      value={filteredStats?.totalStudyTime || 0} 
                      suffix="分钟" 
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic 
                      title="答题成功率" 
                      value={filteredStats?.successRate || 0} 
                      suffix="%" 
                      precision={1}
                    />
                  </Col>
                </Row>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Text type="secondary">上次学习时间: {filteredStats?.lastStudyDate ? new Date(filteredStats.lastStudyDate).toLocaleString() : '暂无记录'}</Text>
                </div>
              </Card>
            </Col>

            {/* 成就展示 */}
            <Col span={24}>
              <Card title="学习成就" bordered={false}>
                {achievements.length > 0 ? (
                  <Row gutter={[16, 16]}>
                    {achievements.map(achievement => (
                      <Col key={achievement.id} xs={24} sm={12} md={8}>
                        <Card 
                          size="small" 
                          style={{ 
                            background: 'rgba(230, 244, 255, 0.6)',
                            borderRadius: '8px'
                          }}
                        >
                          <Space align="center">
                            <div style={{ fontSize: '24px' }}>{achievement.icon}</div>
                            <div>
                              <Text strong>{achievement.name}</Text>
                              <br />
                              <Text type="secondary">{achievement.description}</Text>
                            </div>
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Empty description="暂无成就" />
                )}
              </Card>
            </Col>

            {/* 最近学习记录 */}
            <Col span={24}>
              <Card title="最近学习记录" bordered={false}>
                <Table 
                  dataSource={filteredStats?.recentSessions || []}
                  columns={sessionColumns}
                  rowKey="sessionId"
                  size="small"
                  pagination={{ pageSize: 5 }}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
        
        <TabPane tab="课程详情" key="courses">
          <Card title="课程学习详情" bordered={false}>
            {filteredStats?.courseStats && filteredStats.courseStats.length > 0 ? (
              <Table
                dataSource={filteredStats.courseStats}
                rowKey="courseId"
                pagination={false}
                columns={[
                  {
                    title: '课程名称',
                    dataIndex: 'courseName',
                    key: 'name',
                  },
                  {
                    title: '完成关卡',
                    key: 'completed',
                    render: (_, record) => `${record.levelsCompleted}/${record.levelsTotal}`
                  },
                  {
                    title: '完成率',
                    dataIndex: 'completionRate',
                    key: 'rate',
                    render: (rate: number) => `${Math.round(rate)}%`
                  },
                  {
                    title: '平均星级',
                    dataIndex: 'averageStars',
                    key: 'stars',
                    render: (stars: number) => (
                      <Space>
                        {stars.toFixed(1)}
                        <StarOutlined style={{ color: '#faad14' }} />
                      </Space>
                    )
                  },
                  {
                    title: '总分数',
                    dataIndex: 'totalScore',
                    key: 'score'
                  },
                  {
                    title: '最近学习',
                    dataIndex: 'lastStudyDate',
                    key: 'date',
                    render: (date: string) => new Date(date).toLocaleDateString()
                  }
                ]}
              />
            ) : (
              <Empty description="暂无课程记录" />
            )}
          </Card>
        </TabPane>
        
        <TabPane tab="学习趋势" key="trends">
          <LearningCharts 
            dailyProgress={filteredStats?.dailyProgress || []}
            courseStats={filteredStats?.courseStats || []}
          />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default LearningProgress;