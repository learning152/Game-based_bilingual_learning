import React from 'react';
import { Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { HomeOutlined, BookOutlined, TrophyOutlined, UserOutlined, PlayCircleOutlined, RocketOutlined } from '@ant-design/icons';

const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <Menu mode="horizontal" selectedKeys={[location.pathname]}>
      <Menu.Item key="/" icon={<HomeOutlined />}>
        <Link to="/">首页</Link>
      </Menu.Item>
      <Menu.Item key="/courses" icon={<BookOutlined />}>
        <Link to="/courses">课程</Link>
      </Menu.Item>
      <Menu.Item key="/game" icon={<PlayCircleOutlined />}>
        <Link to="/game">单词游戏</Link>
      </Menu.Item>
      <Menu.Item key="/levels" icon={<RocketOutlined />}>
        <Link to="/levels">关卡挑战</Link>
      </Menu.Item>
      <Menu.Item key="/achievements" icon={<TrophyOutlined />}>
        <Link to="/achievements">成就</Link>
      </Menu.Item>
      <Menu.Item key="/profile" icon={<UserOutlined />}>
        <Link to="/profile">个人中心</Link>
      </Menu.Item>
    </Menu>
  );
};

export default Navigation;