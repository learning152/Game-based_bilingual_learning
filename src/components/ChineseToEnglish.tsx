import React, { useState, useEffect } from 'react';
import { Input, Button, Space, message, Typography, Rate } from 'antd';
import { SoundOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface ChineseToEnglishProps {
  chinesePhrase: string;
  englishTranslation: string;
  hint?: string;
  audioUrl?: string;
  onComplete?: (score: number) => void;
}

const ChineseToEnglish: React.FC<ChineseToEnglishProps> = ({
  chinesePhrase,
  englishTranslation,
  hint,
  audioUrl,
  onComplete
}) => {
  const [userInput, setUserInput] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(() => {
    setUserInput('');
    setIsCorrect(null);
    setAttempts(0);
  }, [chinesePhrase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  const handleSubmit = () => {
    setAttempts(attempts + 1);
    if (userInput.toLowerCase().trim() === englishTranslation.toLowerCase().trim()) {
      setIsCorrect(true);
      const newScore = Math.max(5 - attempts, 1);
      setScore(newScore);
      message.success('回答正确！');
      
      if (onComplete) {
        onComplete(newScore);
      }
    } else {
      setIsCorrect(false);
      message.error('回答错误，请重试。');
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(error => {
        console.error('音频播放失败:', error);
        message.error('音频播放失败，请稍后重试。');
      });
    } else {
      message.warning('该短语暂无音频。');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', textAlign: 'center' }}>
      <Title level={3}>中译英挑战</Title>
      <Text>请将下面的中文短语翻译成英语：</Text>
      <div style={{ margin: '20px 0', fontSize: '18px', fontWeight: 'bold' }}>
        {chinesePhrase}
      </div>
      {hint && <Text>提示：{hint}</Text>}
      <div style={{ margin: '20px 0' }}>
        <Input
          placeholder="请输入英语翻译"
          value={userInput}
          onChange={handleInputChange}
          style={{ width: 300 }}
          disabled={isCorrect === true}
        />
      </div>
      <Space>
        <Button onClick={handleSubmit} disabled={isCorrect === true}>
          提交
        </Button>
        <Button icon={<SoundOutlined />} onClick={playAudio}>
          发音
        </Button>
      </Space>
      {isCorrect !== null && (
        <div style={{ marginTop: 20 }}>
          <Text>{isCorrect ? '正确！' : '错误，请重试。'}</Text>
          {isCorrect && (
            <div>
              <Text>你的得分：</Text>
              <Rate disabled defaultValue={score} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChineseToEnglish;