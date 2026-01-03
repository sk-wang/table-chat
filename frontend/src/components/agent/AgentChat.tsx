import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Alert } from 'antd';
import { SendOutlined, StopOutlined, RobotOutlined } from '@ant-design/icons';
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
    error,
    isProcessing,
    sendMessage,
    cancel,
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
          message="Agent Unavailable"
          description="Agent service is not configured. Please set AGENT_API_KEY environment variable in the backend."
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
              Enter your requirements, and Agent will explore the database and generate SQL
            </div>
            <div className="agent-empty-hint">
              Example: Help me query total order amount / Add an index to the user table
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
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={clearError}
          style={{ margin: '0 12px 12px' }}
        />
      )}

      {/* Copy to Editor Button - Removed per user story 2 */}

      {/* Input Area */}
      <div className="agent-input-area">
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your requirements..."
          autoSize={{ minRows: 2, maxRows: 4 }}
          disabled={disabled || isProcessing}
        />

        <div className="agent-input-actions">
          <span className="agent-input-hint">
            ⌘+Enter to send
          </span>
          <div className="agent-input-buttons">
            {isProcessing && (
              <Button
                danger
                size="small"
                icon={<StopOutlined />}
                onClick={cancel}
              >
                Cancel
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
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
