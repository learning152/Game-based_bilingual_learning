import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import { DailyProgress, CourseStats } from '../utils/learningStats';

const { Title, Text } = Typography;

interface LearningChartsProps {
  dailyProgress: DailyProgress[];
  courseStats: CourseStats[];
}

/**
 * 学习数据可视化组件
 * 使用纯CSS实现简单的图表效果
 */
const LearningCharts: React.FC<LearningChartsProps> = ({ dailyProgress, courseStats }) => {
  
  // 计算最大值用于归一化
  const maxScore = Math.max(...dailyProgress.map(d => d.score), 1);
  const maxStudyTime = Math.max(...dailyProgress.map(d => d.studyTime), 1);
  
  return (
    <div className="learning-charts">
      <Row gutter={[16, 16]}>
        {/* 每日得分趋势图 */}
        <Col span={12}>
          <Card title="每日得分趋势" size="small">
            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
              {dailyProgress.slice(0, 14).reverse().map((day, index) => {
                const height = (day.score / maxScore) * 160;
                return (
                  <div
                    key={day.date}
                    style={{
                      flex: 1,
                      height: `${height}px`,
                      backgroundColor: '#1890ff',
                      borderRadius: '2px 2px 0 0',
                      position: 'relative',
                      minHeight: '4px'
                    }}
                    title={`${new Date(day.date).toLocaleDateString()}: ${day.score}分`}
                  >
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '10px',
                        color: '#666',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {new Date(day.date).getMonth() + 1}/{new Date(day.date).getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: 'center', marginTop: '25px' }}>
              <Text type="secondary">最近14天得分变化</Text>
            </div>
          </Card>
        </Col>

        {/* 每日学习时长趋势图 */}
        <Col span={12}>
          <Card title="每日学习时长" size="small">
            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
              {dailyProgress.slice(0, 14).reverse().map((day, index) => {
                const height = (day.studyTime / maxStudyTime) * 160;
                return (
                  <div
                    key={day.date}
                    style={{
                      flex: 1,
                      height: `${height}px`,
                      backgroundColor: '#52c41a',
                      borderRadius: '2px 2px 0 0',
                      position: 'relative',
                      minHeight: '4px'
                    }}
                    title={`${new Date(day.date).toLocaleDateString()}: ${Math.round(day.studyTime)}分钟`}
                  >
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: '-20px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '10px',
                        color: '#666',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {new Date(day.date).getMonth() + 1}/{new Date(day.date).getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: 'center', marginTop: '25px' }}>
              <Text type="secondary">最近14天学习时长变化（分钟）</Text>
            </div>
          </Card>
        </Col>

        {/* 课程完成率饼状图 */}
        <Col span={12}>
          <Card title="课程完成率" size="small">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0' }}>
              {courseStats.map((course, index) => {
                const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'];
                const color = colors[index % colors.length];
                
                return (
                  <div key={course.courseId} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <Text>{course.courseName}</Text>
                      <Text>{Math.round(course.completionRate)}%</Text>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div
                        style={{
                          width: `${course.completionRate}%`,
                          height: '100%',
                          backgroundColor: color,
                          borderRadius: '4px',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {courseStats.length === 0 && (
              <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                暂无课程数据
              </div>
            )}
          </Card>
        </Col>

        {/* 学习活跃度热力图 */}
        <Col span={12}>
          <Card title="学习活跃度" size="small">
            <div style={{ padding: '10px 0' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '2px',
                marginBottom: '10px'
              }}>
                {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                  <div
                    key={day}
                    style={{
                      textAlign: 'center',
                      fontSize: '10px',
                      color: '#666',
                      padding: '2px'
                    }}
                  >
                    {day}
                  </div>
                ))}
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '2px'
              }}>
                {Array.from({ length: 28 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - 27 + i);
                  const dateStr = date.toISOString().split('T')[0];
                  
                  const dayProgress = dailyProgress.find(d => d.date === dateStr);
                  const intensity = dayProgress ? Math.min(dayProgress.score / 50, 1) : 0;
                  
                  const getColor = (intensity: number) => {
                    if (intensity === 0) return '#f0f0f0';
                    if (intensity < 0.25) return '#c6e48b';
                    if (intensity < 0.5) return '#7bc96f';
                    if (intensity < 0.75) return '#239a3b';
                    return '#196127';
                  };
                  
                  return (
                    <div
                      key={i}
                      style={{
                        width: '16px',
                        height: '16px',
                        backgroundColor: getColor(intensity),
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                      title={`${date.toLocaleDateString()}: ${dayProgress?.score || 0}分`}
                    />
                  );
                })}
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginTop: '10px',
                fontSize: '10px',
                color: '#666'
              }}>
                <span>较少</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
                    <div
                      key={i}
                      style={{
                        width: '10px',
                        height: '10px',
                        backgroundColor: intensity === 0 ? '#f0f0f0' : 
                          intensity < 0.25 ? '#c6e48b' :
                          intensity < 0.5 ? '#7bc96f' :
                          intensity < 0.75 ? '#239a3b' : '#196127',
                        borderRadius: '1px'
                      }}
                    />
                  ))}
                </div>
                <span>较多</span>
              </div>
            </div>
          </Card>
        </Col>

        {/* 学习效率分析 */}
        <Col span={24}>
          <Card title="学习效率分析" size="small">
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '24px', color: '#1890ff', fontWeight: 'bold' }}>
                    {dailyProgress.length > 0 
                      ? Math.round(dailyProgress.reduce((sum, d) => sum + d.score, 0) / dailyProgress.length)
                      : 0
                    }
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>日均得分</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '24px', color: '#52c41a', fontWeight: 'bold' }}>
                    {dailyProgress.length > 0 
                      ? Math.round(dailyProgress.reduce((sum, d) => sum + d.studyTime, 0) / dailyProgress.length)
                      : 0
                    }
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>日均学习时长(分钟)</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '24px', color: '#faad14', fontWeight: 'bold' }}>
                    {dailyProgress.length > 0 
                      ? (dailyProgress.reduce((sum, d) => sum + d.levelsCompleted, 0) / 
                         dailyProgress.reduce((sum, d) => sum + d.studyTime, 0) * 60).toFixed(1)
                      : '0.0'
                    }
                  </div>
                  <div style={{ color: '#666', fontSize: '12px' }}>关卡/小时</div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LearningCharts;