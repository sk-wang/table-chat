import React from 'react';
import { Typography } from 'antd';
import { UserOutlined, RobotOutlined, ToolOutlined } from '@ant-design/icons';
import { ToolCallBlock } from './ToolCallBlock';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { AgentMessage as AgentMessageType } from '../../types/agent';

const { Text, Paragraph } = Typography;

interface AgentMessageProps {
  message: AgentMessageType;
}

export const AgentMessage: React.FC<AgentMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isTool = message.role === 'tool';

  // JetBrains Darcula color scheme
  const getIcon = () => {
    switch (message.role) {
      case 'user':
        return <UserOutlined style={{ color: '#6897bb' }} />; // Blue
      case 'assistant':
        return <RobotOutlined style={{ color: '#ffc66d' }} />; // Yellow
      case 'tool':
        return <ToolOutlined style={{ color: '#9876aa' }} />; // Purple
    }
  };

  const getBackground = () => {
    switch (message.role) {
      case 'user':
        return '#313335'; // JetBrains dark gray
      case 'assistant':
        return '#2b2b2b'; // JetBrains editor background
      case 'tool':
        return '#3c3f41'; // JetBrains tool panel
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          maxWidth: '85%',
          flexDirection: isUser ? 'row-reverse' : 'row',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#3c3f41',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {getIcon()}
        </div>
        
        <div
          style={{
            background: getBackground(),
            padding: '10px 14px',
            borderRadius: 12,
            borderTopLeftRadius: isUser ? 12 : 4,
            borderTopRightRadius: isUser ? 4 : 12,
          }}
        >
          {!isTool && message.content && (
            isUser ? (
              // User messages: plain text
              <Paragraph
                style={{
                  margin: 0,
                  color: '#e0e0e0',
                  fontSize: 14,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {message.content}
              </Paragraph>
            ) : (
              // Assistant messages: Markdown rendered
              <MarkdownRenderer content={message.content} />
            )
          )}
          
          {message.toolCall && (
            <ToolCallBlock toolCall={message.toolCall} />
          )}
        </div>
      </div>
      
      <Text
        type="secondary"
        style={{
          fontSize: 11,
          marginTop: 4,
          marginLeft: isUser ? 0 : 40,
          marginRight: isUser ? 40 : 0,
        }}
      >
        {new Date(message.timestamp).toLocaleTimeString()}
      </Text>
    </div>
  );
};

