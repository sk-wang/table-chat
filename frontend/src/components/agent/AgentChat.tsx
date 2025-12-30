import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input, Button, Space, Alert, Typography } from 'antd';
import { SendOutlined, StopOutlined, CopyOutlined, RobotOutlined } from '@ant-design/icons';
import { AgentMessage } from './AgentMessage';
import { ThinkingIndicator } from './ThinkingIndicator';
import { apiClient } from '../../services/api';
import type {
  AgentMessage as AgentMessageType,
  AgentStatus,
  ThinkingEventData,
  ToolCallEventData,
  MessageEventData,
  SQLEventData,
  ErrorEventData,
  DoneEventData,
} from '../../types/agent';

const { TextArea } = Input;
const { Text } = Typography;

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
  const [messages, setMessages] = useState<AgentMessageType[]>([]);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [thinkingMessage, setThinkingMessage] = useState<string>('');
  const [thinkingStatus, setThinkingStatus] = useState<'analyzing' | 'planning' | 'generating'>('analyzing');
  const [generatedSQL, setGeneratedSQL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timeout duration (2 minutes)
  const TIMEOUT_MS = 120000;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const addMessage = useCallback((message: AgentMessageType) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateToolCallMessage = useCallback((toolCallData: ToolCallEventData) => {
    setMessages(prev => {
      // Find existing tool call message or create new one
      const existingIndex = prev.findIndex(
        m => m.role === 'tool' && m.toolCall?.id === toolCallData.id
      );

      if (existingIndex >= 0) {
        // Update existing
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          toolCall: {
            id: toolCallData.id,
            name: toolCallData.tool,
            input: toolCallData.input,
            output: toolCallData.output,
            status: toolCallData.status,
            durationMs: toolCallData.durationMs,
          },
        };
        return updated;
      } else {
        // Add new
        return [
          ...prev,
          {
            id: `tool-${toolCallData.id}`,
            role: 'tool' as const,
            content: '',
            timestamp: Date.now(),
            toolCall: {
              id: toolCallData.id,
              name: toolCallData.tool,
              input: toolCallData.input,
              output: toolCallData.output,
              status: toolCallData.status,
              durationMs: toolCallData.durationMs,
            },
          },
        ];
      }
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || !dbName || status !== 'idle') return;

    const userMessage: AgentMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now(),
    };

    addMessage(userMessage);
    setPrompt('');
    setStatus('thinking');
    setThinkingMessage('正在分析您的需求...');
    setError(null);
    setGeneratedSQL(null);

    const handlers = {
      onThinking: (data: ThinkingEventData) => {
        setStatus('thinking');
        setThinkingMessage(data.message);
        setThinkingStatus(data.status);
      },
      onToolCall: (data: ToolCallEventData) => {
        setStatus('tool_running');
        updateToolCallMessage(data);
        if (data.status === 'running') {
          setThinkingMessage(`正在执行 ${data.tool}...`);
        }
      },
      onMessage: (data: MessageEventData) => {
        setStatus('responding');
        setThinkingMessage('');
        addMessage({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          timestamp: Date.now(),
        });
      },
      onSQL: (data: SQLEventData) => {
        setGeneratedSQL(data.sql);
        if (data.explanation) {
          addMessage({
            id: `sql-${Date.now()}`,
            role: 'assistant',
            content: `生成的 SQL:\n\`\`\`sql\n${data.sql}\n\`\`\`\n\n${data.explanation || ''}`,
            timestamp: Date.now(),
          });
        }
      },
      onError: (data: ErrorEventData) => {
        setStatus('error');
        setThinkingMessage('');
        setError(data.error + (data.detail ? `: ${data.detail}` : ''));
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      },
      onDone: (_data: DoneEventData) => {
        setStatus('completed');
        setThinkingMessage('');
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        // Reset to idle after a short delay
        setTimeout(() => setStatus('idle'), 500);
      },
    };

    abortControllerRef.current = apiClient.agentQuery(dbName, { prompt: userMessage.content }, handlers);

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setStatus('error');
        setThinkingMessage('');
        setError('请求超时，请重试。Agent 响应时间超过 2 分钟限制。');
      }
    }, TIMEOUT_MS);
  }, [prompt, dbName, status, addMessage, updateToolCallMessage]);

  const handleCancel = useCallback(() => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // Abort request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('cancelled');
    setThinkingMessage('');
    setTimeout(() => setStatus('idle'), 500);
  }, []);

  const handleCopyToEditor = useCallback(() => {
    if (generatedSQL && onSQLGenerated) {
      onSQLGenerated(generatedSQL);
    }
  }, [generatedSQL, onSQLGenerated]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isProcessing = status !== 'idle' && status !== 'completed' && status !== 'error' && status !== 'cancelled';

  if (agentUnavailable) {
    return (
      <Alert
        message="Agent 功能不可用"
        description="Agent 服务未配置。请在后端设置 AGENT_API_BASE 和 AGENT_API_KEY 环境变量以使用 Claude Agent SDK。"
        type="warning"
        showIcon
        icon={<RobotOutlined />}
        style={{ marginBottom: 16 }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Messages List */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '12px 8px',
          background: '#1a1a1a',
          borderRadius: 8,
          marginBottom: 12,
          minHeight: 200,
        }}
      >
        {messages.length === 0 && status === 'idle' && (
          <div style={{ textAlign: 'center', padding: 40, color: '#808080' }}>
            <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <Text style={{ display: 'block', color: '#808080' }}>
              输入您的需求，Agent 将探索数据库并生成 SQL
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              例如：帮我查询订单总金额 / 给用户表加个索引
            </Text>
          </div>
        )}

        {messages.map(message => (
          <AgentMessage key={message.id} message={message} />
        ))}

        {/* Thinking Indicator */}
        {thinkingMessage && (
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
          onClose={() => setError(null)}
          style={{ marginBottom: 12 }}
        />
      )}

      {/* Copy to Editor Button */}
      {generatedSQL && (
        <div style={{ marginBottom: 12 }}>
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={handleCopyToEditor}
            style={{ background: '#80CBC4', borderColor: '#80CBC4', color: '#1a1a1a' }}
          >
            复制到 SQL 编辑器
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div>
        <Space direction="vertical" style={{ width: '100%' }}>
          <TextArea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="描述您的需求，Agent 将探索数据库并生成 SQL..."
            autoSize={{ minRows: 2, maxRows: 4 }}
            disabled={disabled || isProcessing}
            style={{
              background: '#2b2b2b',
              borderColor: '#3c3f41',
              color: '#a9b7c6',
              fontSize: 14,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              按 Ctrl+Enter 发送
            </Text>
            <Space>
              {isProcessing && (
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={handleCancel}
                >
                  取消
                </Button>
              )}
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmit}
                loading={isProcessing}
                disabled={disabled || !prompt.trim() || isProcessing}
                style={{ background: '#80CBC4', borderColor: '#80CBC4', color: '#1a1a1a' }}
              >
                发送
              </Button>
            </Space>
          </div>
        </Space>
      </div>
    </div>
  );
};

