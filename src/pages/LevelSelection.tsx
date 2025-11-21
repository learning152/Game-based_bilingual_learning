import React from 'react';
import LevelSelection from '../components/LevelSelection';

const LevelSelectionPage: React.FC = () => {
  return (
    <div className="level-selection-page">
      <h1>关卡选择</h1>
      <LevelSelection />
    </div>
  );
};

export default LevelSelectionPage;