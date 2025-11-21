import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import LevelDetail from '../components/LevelDetail';

const LevelDetailPage: React.FC = () => {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();

  if (!levelId) {
    return <div>无效的关卡ID</div>;
  }

  // 模拟用户ID，实际应用中应从认证系统获取
  const userId = 'test_user_001';

  return (
    <div className="level-detail-page">
      <Button 
        type="link" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/levels')}
        style={{ marginBottom: 20 }}
      >
        返回关卡列表
      </Button>
      <LevelDetail levelId={levelId} userId={userId} />
    </div>
  );
};

export default LevelDetailPage;