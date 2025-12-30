import React from 'react';
import { Typography } from 'antd';
import { LoadingOutlined, SearchOutlined, CodeOutlined, BulbOutlined } from '@ant-design/icons';
import type { ThinkingEventData } from '../../types/agent';

const { Text } = Typography;

interface ThinkingIndicatorProps {
  data?: ThinkingEventData;
  message?: string;
}

const thinkingStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  borderRadius: 8,
  border: '1px solid #334155',
  marginBottom: 12,
};

const iconContainerStyles: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'rgba(128, 203, 196, 0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
};

const pulseKeyframes = `
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(0.95); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes dotPulse {
    0%, 80%, 100% { transform: scale(0); opacity: 0; }
    40% { transform: scale(1); opacity: 1; }
  }
`;

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ data, message }) => {
  const status = data?.status || 'analyzing';
  const displayMessage = message || data?.message || '思考中...';

  const getStatusIcon = () => {
    switch (status) {
      case 'analyzing':
        return <SearchOutlined style={{ color: '#80CBC4', fontSize: 18 }} />;
      case 'planning':
        return <BulbOutlined style={{ color: '#FFC66D', fontSize: 18 }} />;
      case 'generating':
        return <CodeOutlined style={{ color: '#9876AA', fontSize: 18 }} />;
      default:
        return <LoadingOutlined style={{ color: '#80CBC4', fontSize: 18 }} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'analyzing':
        return '#80CBC4';
      case 'planning':
        return '#FFC66D';
      case 'generating':
        return '#9876AA';
      default:
        return '#80CBC4';
    }
  };

  return (
    <>
      <style>{pulseKeyframes}</style>
      <div style={thinkingStyles}>
        <div
          style={{
            ...iconContainerStyles,
            animation: 'pulse 1.5s ease-in-out infinite',
            boxShadow: `0 0 20px ${getStatusColor()}33`,
          }}
        >
          {getStatusIcon()}
        </div>

        <div style={{ flex: 1 }}>
          <Text
            style={{
              color: getStatusColor(),
              fontSize: 14,
              fontWeight: 500,
              display: 'block',
            }}
          >
            {displayMessage}
          </Text>
          
          {/* Animated dots */}
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: getStatusColor(),
                  animation: `dotPulse 1.4s ease-in-out ${i * 0.16}s infinite`,
                }}
              />
            ))}
          </div>
        </div>

        <LoadingOutlined
          style={{
            color: '#64748b',
            fontSize: 16,
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    </>
  );
};

