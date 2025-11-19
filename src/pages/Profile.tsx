import React, { useEffect, useState } from 'react';
import { Card, Typography, Descriptions, Statistic, Row, Col, Button, Avatar, message } from 'antd';
import { UserOutlined, BookOutlined, TrophyOutlined, LineChartOutlined } from '@ant-design/icons';
import { User } from '../models/User';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Profile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 从 localStorage 获取当前用户
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) {
      message.warning('请先登录！');
      navigate('/login');
      return;
    }

    try {
      setUser(JSON.parse(currentUser));
    } catch (error) {
      console.error('解析用户数据失败:', error);
      message.error('获取用户信息失败，请重新登录！');
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    message.success('已退出登录');
    navigate('/login');
  };

  if (!user) {
    return <div>加载中...</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card style={{ marginBottom: '24px', borderRadius: '8px' }}>
        <Row align="middle" gutter={24}>
          <Col>
            <Avatar
              size={80}
              icon={<UserOutlined />}
              style={{ backgroundColor: '#1890ff' }}
            />
          </Col>
          <Col flex="auto">
            <Title level={3}>{user.username}</Title>
            <Text type="secondary">{user.email}</Text>
          </Col>
          <Col>
            <Button type="primary" onClick={handleLogout}>
              退出登录
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title="个人信息" bordered={false} style={{ borderRadius: '8px' }}>
            <Descriptions column={2}>
              <Descriptions.Item label="用户ID">{user.id}</Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {new Date(user.createdAt).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="最后登录">
                {new Date(user.lastLogin).toLocaleDateString()}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: '8px' }}>
            <Statistic
              title="英语学习进度"
              value={user.learningProgress.english}
              suffix="%"
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: '8px' }}>
            <Statistic
              title="中文学习进度"
              value={user.learningProgress.chinese}
              suffix="%"
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} style={{ borderRadius: '8px' }}>
            <Statistic
              title="获得成就数"
              value={0}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="学习数据" style={{ marginTop: '16px', borderRadius: '8px' }}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <LineChartOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />
          <p style={{ marginTop: '16px', color: '#8c8c8c' }}>暂无学习数据</p>
        </div>
      </Card>
    </div>
  );
};

export default Profile;