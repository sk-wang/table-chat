import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Space, Alert } from 'antd';
import { SendOutlined, StopOutlined, CopyOutlined, RobotOutlined } from '@ant-design/icons';
import { AgentMessage } from './AgentMessage';
import { ThinkingIndicator } from './ThinkingIndicator';
import { useAgentChat } from '../../hooks/useAgentChat';
import './styles.css';

const { TextArea } = Input;

interface AgentChatProps {
  dbName: string;
  disabled?: boolean;
  agentUnavailable?: boolean;
  onSQLGenerated?: (sql: string) => void;
}

export const AgentChat: React.FC<AgentChatProps> = ({
  dbName,
  disabled = false,
  agentUnavailable = false,
  onSQLGenerated,
}) => {
  const [prompt, setPrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    status,
    messages,
    streamingText,
    thinkingMessage,
    thinkingStatus,
    generatedSQL,
    error,
    isProcessing,
    sendMessage,
    cancel,
    copyToEditor,
    clearError,
  } = useAgentChat({ dbName, onSQLGenerated });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingMessage, streamingText]);

  const handleSubmit = useCallback(() => {
    if (!prompt.trim() || disabled || isProcessing) return;
    sendMessage(prompt.trim());
    setPrompt('');
  }, [prompt, disabled, isProcessing, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (agentUnavailable) {
    return (
      <div className="agent-chat-container">
        <Alert
          message="Agent 功能不可用"
          description="Agent 服务未配置。请在后端设置 AGENT_API_KEY 环境变量。"
          type="warning"
          showIcon
          icon={<RobotOutlined />}
          style={{ margin: 16 }}
        />
      </div>
    );
  }

  return (
    <div className="agent-chat-container">
      {/* Messages List */}
      <div className="agent-chat-messages">
        {messages.length === 0 && status === 'idle' && (
          <div className="agent-empty-state">
            <RobotOutlined className="agent-empty-icon" />
            <div className="agent-empty-title">
              输入您的需求，Agent 将探索数据库并生成 SQL
            </div>
            <div className="agent-empty-hint">
              例如：帮我查询订单总金额 / 给用户表加个索引
            </div>
          </div>
        )}

        {messages.map(message => (
          <AgentMessage key={message.id} message={message} />
        ))}

        {/* Streaming Text */}
        {streamingText && (
          <div className="agent-message agent-message-assistant">
            <div className="agent-message-bubble">
              {streamingText}
              <span className="streaming-cursor" />
            </div>
          </div>
        )}

        {/* Thinking Indicator */}
        {thinkingMessage && !streamingText && (
          <ThinkingIndicator
            data={{ status: thinkingStatus, message: thinkingMessage }}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          closable
          onClose={clearError}
          style={{ margin: '0 12px 12px' }}
        />
      )}

      {/* Copy to Editor Button */}
      {generatedSQL && (
        <div className="sql-action-button" style={{ padding: '0 12px 12px' }}>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={copyToEditor}
            block
          >
            复制到 SQL 编辑器
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="agent-input-area">
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="描述您的需求..."
          autoSize={{ minRows: 2, maxRows: 4 }}
          disabled={disabled || isProcessing}
        />

        <div className="agent-input-actions">
          <span className="agent-input-hint">
            ⌘+Enter 发送
          </span>
          <div className="agent-input-buttons">
            {isProcessing && (
              <Button
                danger
                size="small"
                icon={<StopOutlined />}
                onClick={cancel}
              >
                取消
              </Button>
            )}
            <Button
              type="primary"
              size="small"
              icon={<SendOutlined />}
              onClick={handleSubmit}
              loading={isProcessing}
              disabled={disabled || !prompt.trim() || isProcessing}
            >
              发送
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
