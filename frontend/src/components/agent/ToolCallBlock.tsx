import React, { useState } from 'react';
import { Typography, Tag, Button, Tooltip } from 'antd';
import {
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  DownOutlined,
  RightOutlined,
  CopyOutlined,
  DatabaseOutlined,
  TableOutlined,
} from '@ant-design/icons';
import type { ToolCallInfo } from '../../types/agent';

const { Text } = Typography;

interface ToolCallBlockProps {
  toolCall: ToolCallInfo;
  compact?: boolean;
}

const blockStyles: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 8,
  background: '#1a1a2e',
  borderRadius: 8,
  border: '1px solid #2d3748',
  overflow: 'hidden',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  cursor: 'pointer',
  transition: 'background 0.2s',
};

const contentStyles: React.CSSProperties = {
  borderTop: '1px solid #2d3748',
  padding: 0,
  overflow: 'hidden',
  transition: 'max-height 0.3s ease-out',
};

const codeBlockStyles: React.CSSProperties = {
  margin: 0,
  padding: 12,
  background: '#0f172a',
  fontSize: 12,
  color: '#a9b7c6',
  overflow: 'auto',
  maxHeight: 200,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
};

export const ToolCallBlock: React.FC<ToolCallBlockProps> = ({ toolCall, compact = false }) => {
  const [expanded, setExpanded] = useState(!compact);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'running':
        return <LoadingOutlined style={{ color: '#3b82f6' }} spin />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#22c55e' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ef4444' }} />;
    }
  };

  const getStatusColor = (): 'processing' | 'success' | 'error' => {
    switch (toolCall.status) {
      case 'running':
        return 'processing';
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
    }
  };

  const getToolIcon = () => {
    switch (toolCall.name) {
      case 'query_database':
        return <DatabaseOutlined style={{ color: '#80CBC4' }} />;
      case 'get_table_schema':
        return <TableOutlined style={{ color: '#FFC66D' }} />;
      default:
        return <ToolOutlined style={{ color: '#9876AA' }} />;
    }
  };

  const getToolDisplayName = () => {
    switch (toolCall.name) {
      case 'query_database':
        return '执行 SQL 查询';
      case 'get_table_schema':
        return '获取表结构';
      default:
        return toolCall.name;
    }
  };

  const handleCopy = async (text: string, type: 'input' | 'output') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'input') {
        setCopiedInput(true);
        setTimeout(() => setCopiedInput(false), 2000);
      } else {
        setCopiedOutput(true);
        setTimeout(() => setCopiedOutput(false), 2000);
      }
    } catch {
      console.error('Failed to copy');
    }
  };

  const inputText = JSON.stringify(toolCall.input, null, 2);
  const hasOutput = toolCall.output && toolCall.output.length > 0;

  return (
    <div style={blockStyles}>
      {/* Header - clickable to expand/collapse */}
      <div
        style={{
          ...headerStyles,
          background: expanded ? '#1e293b' : 'transparent',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <DownOutlined style={{ color: '#64748b', fontSize: 12 }} />
        ) : (
          <RightOutlined style={{ color: '#64748b', fontSize: 12 }} />
        )}
        
        {getToolIcon()}
        
        <Text strong style={{ color: '#e2e8f0', flex: 1 }}>
          {getToolDisplayName()}
        </Text>
        
        <Tag color={getStatusColor()} style={{ margin: 0 }}>
          {getStatusIcon()}{' '}
          {toolCall.status === 'running' ? '执行中' : toolCall.status === 'completed' ? '完成' : '错误'}
        </Tag>
        
        {toolCall.durationMs !== undefined && toolCall.status !== 'running' && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {toolCall.durationMs}ms
          </Text>
        )}
      </div>

      {/* Collapsible content */}
      {expanded && (
        <div style={contentStyles}>
          {/* Input section */}
          <div style={{ borderBottom: hasOutput ? '1px solid #2d3748' : 'none' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: '#0f172a',
              }}
            >
              <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                输入参数
              </Text>
              <Tooltip title={copiedInput ? '已复制!' : '复制'}>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(inputText, 'input');
                  }}
                  style={{ color: copiedInput ? '#22c55e' : '#64748b' }}
                />
              </Tooltip>
            </div>
            <pre style={codeBlockStyles}>{inputText}</pre>
          </div>

          {/* Output section */}
          {hasOutput && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: '#0f172a',
                }}
              >
                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase' }}>
                  执行结果
                </Text>
                <Tooltip title={copiedOutput ? '已复制!' : '复制'}>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(toolCall.output || '', 'output');
                    }}
                    style={{ color: copiedOutput ? '#22c55e' : '#64748b' }}
                  />
                </Tooltip>
              </div>
              <pre style={{ ...codeBlockStyles, maxHeight: 300 }}>{toolCall.output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

