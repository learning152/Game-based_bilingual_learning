import React, { useState, useEffect } from 'react';
import { Input, Button, Space, message, Typography, Rate, Tag, Tooltip } from 'antd';
import { SoundOutlined, QuestionCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface EnglishToChineseProps {
  englishPhrase: string;
  chineseTranslation: string;
  pinyin?: string; // 拼音辅助
  hint?: string;
  audioUrl?: string;
  onComplete?: (score: number) => void;
}

const EnglishToChinese: React.FC<EnglishToChineseProps> = ({
  englishPhrase,
  chineseTranslation,
  pinyin,
  hint,
  audioUrl,
  onComplete
}) => {
  const [userInput, setUserInput] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [showPinyin, setShowPinyin] = useState(false);
  const [characterFeedback, setCharacterFeedback] = useState<Array<{char: string, status: 'correct' | 'incorrect' | 'missing'}>>([]);

  useEffect(() => {
    setUserInput('');
    setIsCorrect(null);
    setAttempts(0);
    setShowPinyin(false);
    setCharacterFeedback([]);
  }, [englishPhrase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setUserInput(input);
    
    // 实时字符级别反馈
    if (input && !isCorrect) {
      analyzeCharacters(input);
    } else {
      setCharacterFeedback([]);
    }
  };

  // 中文字符级别判断机制
  const analyzeCharacters = (input: string) => {
    const expectedChars = chineseTranslation.trim().split('');
    const inputChars = input.trim().split('');
    const feedback: Array<{char: string, status: 'correct' | 'incorrect' | 'missing'}> = [];

    for (let i = 0; i < Math.max(expectedChars.length, inputChars.length); i++) {
      if (i < inputChars.length) {
        if (i < expectedChars.length) {
          feedback.push({
            char: inputChars[i],
            status: inputChars[i] === expectedChars[i] ? 'correct' : 'incorrect'
          });
        } else {
          feedback.push({
            char: inputChars[i],
            status: 'incorrect' // 多余的字符
          });
        }
      } else if (i < expectedChars.length) {
        feedback.push({
          char: expectedChars[i],
          status: 'missing' // 缺失的字符
        });
      }
    }

    setCharacterFeedback(feedback);
  };

  const handleSubmit = () => {
    setAttempts(attempts + 1);
    const normalizedInput = userInput.trim().replace(/\s+/g, '');
    const normalizedAnswer = chineseTranslation.trim().replace(/\s+/g, '');
    
    if (normalizedInput === normalizedAnswer) {
      setIsCorrect(true);
      const newScore = Math.max(5 - attempts, 1);
      setScore(newScore);
      message.success('回答正确！');
      setCharacterFeedback([]);
      
      if (onComplete) {
        onComplete(newScore);
      }
    } else {
      setIsCorrect(false);
      message.error('回答错误，请重试。注意查看字符提示。');
      analyzeCharacters(userInput);
    }
  };

  const togglePinyin = () => {
    setShowPinyin(!showPinyin);
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(error => {
        console.error('音频播放失败:', error);
        message.error('音频播放失败，请稍后重试。');
      });
    } else {
      // 使用浏览器语音合成API作为降级方案
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(englishPhrase);
        utterance.lang = 'en-US';
        utterance.rate = 0.8; // 语速稍慢
        window.speechSynthesis.speak(utterance);
      } else {
        message.warning('该短语暂无音频。');
      }
    }
  };

  const getCharacterColor = (status: 'correct' | 'incorrect' | 'missing') => {
    switch (status) {
      case 'correct':
        return '#52c41a'; // 绿色
      case 'incorrect':
        return '#ff4d4f'; // 红色
      case 'missing':
        return '#faad14'; // 橙色
      default:
        return '#000000';
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: 'auto', textAlign: 'center', padding: '20px' }}>
      <Title level={3}>英译中挑战</Title>
      <Text>请将下面的英语短语翻译成中文：</Text>
      
      <div style={{ 
        margin: '20px 0', 
        fontSize: '20px', 
        fontWeight: 'bold',
        padding: '15px',
        backgroundColor: '#f0f2f5',
        borderRadius: '8px'
      }}>
        {englishPhrase}
      </div>

      {hint && (
        <div style={{ marginBottom: '15px' }}>
          <Text type="secondary">💡 提示：{hint}</Text>
        </div>
      )}

      {pinyin && (
        <div style={{ marginBottom: '15px' }}>
          <Tooltip title="点击查看/隐藏拼音提示">
            <Button 
              size="small" 
              icon={<QuestionCircleOutlined />}
              onClick={togglePinyin}
            >
              拼音提示
            </Button>
          </Tooltip>
          {showPinyin && (
            <div style={{ marginTop: '10px' }}>
              <Tag color="blue">{pinyin}</Tag>
            </div>
          )}
        </div>
      )}

      <div style={{ margin: '20px 0' }}>
        <Input
          placeholder="请输入中文翻译"
          value={userInput}
          onChange={handleInputChange}
          style={{ width: '100%', fontSize: '16px' }}
          disabled={isCorrect === true}
          size="large"
        />
      </div>

      {/* 字符级别反馈显示 */}
      {characterFeedback.length > 0 && !isCorrect && (
        <div style={{ 
          margin: '15px 0', 
          padding: '10px',
          backgroundColor: '#fafafa',
          borderRadius: '8px',
          textAlign: 'left'
        }}>
          <Text strong>字符分析：</Text>
          <div style={{ marginTop: '8px', fontSize: '18px' }}>
            {characterFeedback.map((item, index) => (
              <span
                key={index}
                style={{
                  color: getCharacterColor(item.status),
                  margin: '0 2px',
                  fontWeight: item.status === 'missing' ? 'normal' : 'bold',
                  textDecoration: item.status === 'missing' ? 'underline' : 'none',
                  opacity: item.status === 'missing' ? 0.5 : 1
                }}
              >
                {item.char}
              </span>
            ))}
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px' }}>
            <Text type="secondary">
              <span style={{ color: '#52c41a' }}>●</span> 正确 
              <span style={{ color: '#ff4d4f', marginLeft: '10px' }}>●</span> 错误 
              <span style={{ color: '#faad14', marginLeft: '10px' }}>●</span> 缺失
            </Text>
          </div>
        </div>
      )}

      <Space size="middle">
        <Button 
          type="primary"
          onClick={handleSubmit} 
          disabled={isCorrect === true || !userInput.trim()}
          size="large"
        >
          提交
        </Button>
        <Button 
          icon={<SoundOutlined />} 
          onClick={playAudio}
          size="large"
        >
          发音
        </Button>
      </Space>

      {isCorrect !== null && (
        <div style={{ marginTop: 25 }}>
          <Text style={{ fontSize: '16px' }}>
            {isCorrect ? '✅ 正确！' : '❌ 错误，请重试。'}
          </Text>
          {isCorrect && (
            <div style={{ marginTop: '15px' }}>
              <Text>你的得分：</Text>
              <div>
                <Rate disabled defaultValue={score} />
              </div>
              <div style={{ marginTop: '10px' }}>
                <Text type="secondary">正确答案：{chineseTranslation}</Text>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnglishToChinese;