import { Refine } from '@refinedev/core';
import { useNotificationProvider } from '@refinedev/antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, theme } from 'antd';

import { dataProvider } from './providers/data-provider';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { MainLayout } from './components/layout/MainLayout';
import { DatabasesListPage } from './pages/databases/list';
import { QueryPage } from './pages/query';

import '@refinedev/antd/dist/reset.css';
import './index.css';

function App() {
  // JetBrains Darcula theme configuration for Ant Design
  const jetbrainsTheme = {
    algorithm: theme.darkAlgorithm,
    token: {
      colorPrimary: '#589df6',
      colorBgBase: '#2b2b2b',
      colorBgContainer: '#3c3f41',
      colorBgElevated: '#313335',
      colorBorder: '#323232',
      colorText: '#a9b7c6',
      colorTextSecondary: '#808080',
      colorSuccess: '#6a8759',
      colorWarning: '#bbb529',
      colorError: '#ff6b68',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      fontFamilyCode: "'JetBrains Mono', 'Fira Code', monospace",
      borderRadius: 4,
    },
  };

  return (
    <BrowserRouter>
      <ConfigProvider theme={jetbrainsTheme}>
        <AntdApp>
          <DatabaseProvider>
            <Refine
            dataProvider={dataProvider}
            notificationProvider={useNotificationProvider}
            resources={[
              {
                name: 'databases',
                list: '/databases',
                create: '/databases/create',
                edit: '/databases/edit/:id',
                show: '/databases/show/:id',
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
            }}
          >
            <Routes>
              <Route element={<MainLayout />}>
                <Route index element={<Navigate to="/databases" replace />} />
                <Route path="/databases" element={<DatabasesListPage />} />
                <Route path="/query" element={<QueryPage />} />
              </Route>
            </Routes>
            </Refine>
          </DatabaseProvider>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;
