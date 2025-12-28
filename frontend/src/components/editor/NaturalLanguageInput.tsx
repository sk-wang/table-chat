import React, { useState } from 'react';
import { Input, Button, Space, Alert, Typography } from 'antd';
import { ThunderboltOutlined, RobotOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

interface NaturalLanguageInputProps {
  onGenerate: (prompt: string) => Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  llmUnavailable?: boolean;
}

export const NaturalLanguageInput: React.FC<NaturalLanguageInputProps> = ({
  onGenerate,
  loading = false,
  disabled = false,
  llmUnavailable = false,
}) => {
  const [prompt, setPrompt] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    await onGenerate(prompt.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to generate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  if (llmUnavailable) {
    return (
      <Alert
        message="AI 功能不可用"
        description="LLM 服务未配置或不可用。请检查服务器配置中的 LLM_API_KEY 环境变量。您仍然可以使用 SQL 编辑器直接编写查询。"
        type="warning"
        showIcon
        icon={<RobotOutlined />}
        style={{ marginBottom: 16 }}
      />
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <RobotOutlined style={{ fontSize: 18, color: '#80CBC4' }} />
          <Text strong style={{ color: '#a9b7c6' }}>
            用自然语言描述你的查询需求
          </Text>
        </div>
        
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例如：查询所有年龄大于18岁的用户，按注册时间倒序排列"
          autoSize={{ minRows: 2, maxRows: 4 }}
          disabled={disabled || loading}
          style={{
            background: '#2b2b2b',
            borderColor: '#3c3f41',
            color: '#a9b7c6',
            fontSize: 14,
          }}
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            按 Ctrl+Enter 生成 SQL
          </Text>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleGenerate}
            loading={loading}
            disabled={disabled || !prompt.trim()}
            style={{ background: '#80CBC4', borderColor: '#80CBC4', color: '#1a1a1a' }}
          >
            生成 SQL
          </Button>
        </div>
      </Space>
    </div>
  );
};

