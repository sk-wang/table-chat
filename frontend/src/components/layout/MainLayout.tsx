import React from 'react';
import { Layout, Typography } from 'antd';
import { Outlet } from 'react-router-dom';

const { Header, Content } = Layout;
const { Title } = Typography;

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh', background: '#2b2b2b' }}>
      {/* Header - JetBrains style, minimal */}
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          background: '#3c3f41',
          borderBottom: '1px solid #323232',
          height: 40,
          lineHeight: '40px',
        }}
      >
        <Title
          level={5}
          style={{
            margin: 0,
            color: '#a9b7c6',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
          }}
        >
          TableChat
        </Title>
      </Header>

      {/* Main Content - Full width, pages handle their own layout */}
      <Content
        style={{
          background: '#2b2b2b',
          height: 'calc(100vh - 40px)',
          overflow: 'hidden',
        }}
      >
        {children || <Outlet />}
      </Content>
    </Layout>
  );
};

export default MainLayout;
