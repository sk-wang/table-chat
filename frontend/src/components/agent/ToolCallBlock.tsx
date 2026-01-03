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

// JetBrains Darcula style
const blockStyles: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 8,
  background: '#3c3f41',
  borderRadius: 6,
  border: '1px solid #515151',
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
  borderTop: '1px solid #515151',
  padding: 0,
  overflow: 'hidden',
  transition: 'max-height 0.3s ease-out',
};

const codeBlockStyles: React.CSSProperties = {
  margin: 0,
  padding: 12,
  background: '#2b2b2b',
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

  // JetBrains Darcula colors
  const getStatusIcon = () => {
    switch (toolCall.status) {
      case 'running':
        return <LoadingOutlined style={{ color: '#6897bb' }} spin />; // Blue
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#629755' }} />; // Green
      case 'error':
        return <CloseCircleOutlined style={{ color: '#cc7832' }} />; // Orange
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
        return <DatabaseOutlined style={{ color: '#6897bb' }} />; // Blue
      case 'get_table_schema':
        return <TableOutlined style={{ color: '#ffc66d' }} />; // Yellow
      case 'list_tables':
        return <TableOutlined style={{ color: '#629755' }} />; // Green
      default:
        return <ToolOutlined style={{ color: '#9876aa' }} />; // Purple
    }
  };

  const getToolDisplayName = () => {
    switch (toolCall.name) {
      case 'query_database':
        return 'Execute SQL Query';
      case 'get_table_schema':
        return 'Get Table Schema';
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
          background: expanded ? '#45494a' : 'transparent',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <DownOutlined style={{ color: '#808080', fontSize: 12 }} />
        ) : (
          <RightOutlined style={{ color: '#808080', fontSize: 12 }} />
        )}
        
        {getToolIcon()}
        
        <Text strong style={{ color: '#a9b7c6', flex: 1 }}>
          {getToolDisplayName()}
        </Text>
        
        <Tag color={getStatusColor()} style={{ margin: 0 }}>
          {getStatusIcon()}{' '}
          {toolCall.status === 'running' ? 'Running' : toolCall.status === 'completed' ? 'Completed' : 'Error'}
        </Tag>
        
        {toolCall.durationMs !== undefined && toolCall.status !== 'running' && (
          <Text type="secondary" style={{ fontSize: 12, color: '#808080' }}>
            {toolCall.durationMs}ms
          </Text>
        )}
      </div>

      {/* Collapsible content */}
      {expanded && (
        <div style={contentStyles}>
          {/* Input section */}
          <div style={{ borderBottom: hasOutput ? '1px solid #515151' : 'none' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: '#313335',
              }}
            >
              <Text style={{ fontSize: 11, textTransform: 'uppercase', color: '#808080' }}>
                Input Parameters
              </Text>
              <Tooltip title={copiedInput ? 'Copied!' : 'Copy'}>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(inputText, 'input');
                  }}
                  style={{ color: copiedInput ? '#629755' : '#808080' }}
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
                  background: '#313335',
                }}
              >
                <Text style={{ fontSize: 11, textTransform: 'uppercase', color: '#808080' }}>
                  Execution Result
                </Text>
                <Tooltip title={copiedOutput ? 'Copied!' : 'Copy'}>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(toolCall.output || '', 'output');
                    }}
                    style={{ color: copiedOutput ? '#629755' : '#808080' }}
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

