import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { UserManager, User } from '../models/User';
import { getUserLogger } from '../utils/logManager';

// 获取用户操作日志记录器
const userLogger = getUserLogger();

const { Title, Text, Link } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

interface RegisterFormValues {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const navigate = useNavigate();

  const handleLogin = (values: LoginFormValues) => {
    const startTime = Date.now();
    userLogger.info('用户尝试登录', { 
      email: values.email,
      timestamp: new Date().toISOString()
    });

    try {
      // 简单的本地认证逻辑
      const userId = values.email.replace('@', '_').replace('.', '_');
      userLogger.debug('生成用户ID', { userId, email: values.email });
      
      const user = UserManager.getUser(userId);
      
      if (!user) {
        userLogger.warn('登录失败：用户不存在', { 
          email: values.email,
          userId 
        });
        message.error('用户不存在，请先注册！');
        return;
      }

      // 实际项目中应该验证密码，这里简化处理
      const loginDuration = Date.now() - startTime;
      userLogger.info('用户登录成功', { 
        userId,
        username: user.username,
        email: values.email,
        duration: `${loginDuration}ms`,
        timestamp: new Date().toISOString()
      });

      message.success('登录成功！');
      
      // 更新用户最后登录时间和连续登录记录
      const now = new Date();
      const lastLoginDate = new Date(user.lastLogin);
      const isConsecutiveLogin = (
        now.getDate() - lastLoginDate.getDate() === 1 ||
        (now.getDate() === lastLoginDate.getDate() && now.getMonth() === lastLoginDate.getMonth() && now.getFullYear() === lastLoginDate.getFullYear())
      );

      user.lastLogin = now.toISOString();
      if (isConsecutiveLogin) {
        user.stats.streak.current += 1;
        user.stats.streak.longest = Math.max(user.stats.streak.longest, user.stats.streak.current);
      } else {
        user.stats.streak.current = 1;
      }
      user.stats.streak.lastLoginDate = now.toISOString();

      // 更新用户数据
      UserManager.updateUser(user);

      // 存储登录状态到 localStorage
      localStorage.setItem('currentUser', JSON.stringify(user));
      userLogger.debug('登录状态已保存到localStorage，用户数据已更新', { 
        userId,
        lastLogin: user.lastLogin,
        currentStreak: user.stats.streak.current,
        longestStreak: user.stats.streak.longest
      });
      
      // 使用 React Router 导航跳转到个人资料页面
      navigate('/profile');
      userLogger.debug('导航到个人资料页面', { userId });
    } catch (error) {
      userLogger.error('登录过程发生异常', { 
        email: values.email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      message.error('登录失败，请重试！');
      console.error('登录错误:', error);
    }
  };

  const handleRegister = (values: RegisterFormValues) => {
    const startTime = Date.now();
    userLogger.info('用户尝试注册', { 
      username: values.username,
      email: values.email,
      timestamp: new Date().toISOString()
    });

    try {
      const userId = values.email.replace('@', '_').replace('.', '_');
      userLogger.debug('生成新用户ID', { userId, email: values.email });
      
      // 检查用户是否已存在
      const existingUser = UserManager.getUser(userId);
      if (existingUser) {
        userLogger.warn('注册失败：邮箱已被注册', { 
          email: values.email,
          userId 
        });
        message.error('该邮箱已被注册！');
        return;
      }

      // 创建新用户
      const newUser: User = {
        id: userId,
        username: values.username,
        email: values.email,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        learningProgress: {
          english: 0,
          chinese: 0
        },
        gameLevels: {
          unlockedLevelIds: [],
          completedLevelIds: [],
        },
        achievements: {
          unlockedAchievements: [],
        },
        stats: {
          totalScore: 0,
          correctAnswers: 0,
          totalAttempts: 0,
          totalTimeSpent: 0,
          streak: {
            current: 0,
            longest: 0,
          },
        },
      };

      userLogger.debug('准备创建新用户', { 
        userId,
        username: values.username,
        email: values.email 
      });

      const success = UserManager.createUser(newUser);
      
      if (success) {
        const registerDuration = Date.now() - startTime;
        userLogger.info('用户注册成功', { 
          userId,
          username: values.username,
          email: values.email,
          duration: `${registerDuration}ms`,
          timestamp: new Date().toISOString()
        });
        
        message.success('注册成功！请登录');
        setIsRegistering(false);
        registerForm.resetFields();
      } else {
        userLogger.error('用户注册失败：UserManager.createUser返回false', { 
          userId,
          username: values.username,
          email: values.email 
        });
        message.error('注册失败，请重试！');
      }
    } catch (error) {
      userLogger.error('注册过程发生异常', { 
        username: values.username,
        email: values.email,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      message.error('注册失败，请重试！');
      console.error('注册错误:', error);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card 
        style={{ 
          width: 450, 
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: '8px' }}>
            {isRegistering ? '注册账号' : '欢迎回来'}
          </Title>
          <Text type="secondary">
            {isRegistering ? '创建您的学习账号' : '登录双语学习闯关平台'}
          </Text>
        </div>

        {!isRegistering ? (
          <Form
            form={loginForm}
            name="login"
            onFinish={handleLogin}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱！' },
                { type: 'email', message: '请输入有效的邮箱地址！' }
              ]}
            >
              <Input 
                prefix={<MailOutlined />} 
                placeholder="邮箱" 
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码！' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                登录
              </Button>
            </Form.Item>

            <div style={{ textAlign: 'center' }}>
              <Text>还没有账号？</Text>
              <Link onClick={() => setIsRegistering(true)} style={{ marginLeft: '8px' }}>
                立即注册
              </Link>
            </div>
          </Form>
        ) : (
          <Form
            form={registerForm}
            name="register"
            onFinish={handleRegister}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名！' },
                { min: 2, message: '用户名至少2个字符！' }
              ]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="用户名" 
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱！' },
                { type: 'email', message: '请输入有效的邮箱地址！' }
              ]}
            >
              <Input 
                prefix={<MailOutlined />} 
                placeholder="邮箱" 
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码！' },
                { min: 6, message: '密码至少6个字符！' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码！' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致！'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="确认密码"
              />
            </Form.Item>

            <Form.Item>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" htmlType="submit" block>
                  注册
                </Button>
                <Button block onClick={() => setIsRegistering(false)}>
                  返回登录
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  );
};

export default Login;