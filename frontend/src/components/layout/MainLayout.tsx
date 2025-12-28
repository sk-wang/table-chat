import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { DatabaseOutlined, CodeOutlined } from '@ant-design/icons';
import { Link, Outlet, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const location = useLocation();

  const menuItems = [
    {
      key: '/databases',
      icon: <DatabaseOutlined />,
      label: <Link to="/databases">Databases</Link>,
    },
    {
      key: '/query',
      icon: <CodeOutlined />,
      label: <Link to="/query">Query</Link>,
    },
  ];

  // Determine selected key based on current path
  const selectedKey = location.pathname.startsWith('/query') ? '/query' : '/databases';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header - JetBrains style */}
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          background: '#3c3f41',
          borderBottom: '1px solid #323232',
        }}
      >
        <Title
          level={4}
          style={{
            margin: 0,
            color: '#a9b7c6',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          TableChat
        </Title>
      </Header>

      <Layout>
        {/* Sidebar - JetBrains style */}
        <Sider
          width={200}
          style={{
            background: '#3c3f41',
            borderRight: '1px solid #323232',
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            style={{
              height: '100%',
              background: '#3c3f41',
              borderRight: 0,
            }}
            items={menuItems}
            theme="dark"
          />
        </Sider>

        {/* Main Content */}
        <Content
          style={{
            padding: '16px',
            background: '#2b2b2b',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {children || <Outlet />}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
