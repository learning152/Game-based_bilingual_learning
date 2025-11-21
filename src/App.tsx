import React from 'react';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { ConfigProvider, Layout } from 'antd';
import { theme } from './styles/theme';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Courses from './pages/Courses';
import Game from './pages/Game';
import LevelSelectionPage from './pages/LevelSelection';
import LevelDetailPage from './pages/LevelDetailPage';

const { Header, Content, Footer } = Layout;

const App: React.FC = () => {
  return (
    <ConfigProvider theme={theme}>
      <Router>
        <Layout style={{ minHeight: '100vh' }}>
          <Header style={{ padding: 0, background: '#fff' }}>
            <Navigation />
          </Header>
          <Content style={{ padding: '24px' }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/game" element={<Game />} />
              <Route path="/levels" element={<LevelSelectionPage />} />
              <Route path="/level-detail/:levelId" element={<LevelDetailPage />} />
              <Route path="/" element={<Navigate to="/profile" replace />} />
            </Routes>
          </Content>
          <Footer style={{ textAlign: 'center' }}>
            &copy; 2025 双语学习闯关平台. All rights reserved.
          </Footer>
        </Layout>
      </Router>
    </ConfigProvider>
  );
};

export default App;