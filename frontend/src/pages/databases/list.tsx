import React, { useState, useEffect } from 'react';
import { Button, Space, Typography, Spin, Alert } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { DatabaseList } from '../../components/database/DatabaseList';
import { AddDatabaseModal } from '../../components/database/AddDatabaseModal';
import { apiClient } from '../../services/api';
import type { DatabaseResponse } from '../../types';

const { Title } = Typography;

export const DatabasesListPage: React.FC = () => {
  const [databases, setDatabases] = useState<DatabaseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDatabase, setEditingDatabase] = useState<DatabaseResponse | null>(null);

  const loadDatabases = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.listDatabases();
      setDatabases(response.databases);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load databases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabases();
  }, []);

  const handleDelete = async (name: string) => {
    await apiClient.deleteDatabase(name);
    await loadDatabases();
  };

  const handleEdit = (database: DatabaseResponse) => {
    setEditingDatabase(database);
    setModalOpen(true);
  };

  const handleSelect = (database: DatabaseResponse) => {
    // TODO: Navigate to query page with selected database
    console.log('Selected database:', database.name);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingDatabase(null);
  };

  const handleModalSuccess = () => {
    loadDatabases();
  };

  if (loading && databases.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Title level={2} style={{ margin: 0, color: '#a9b7c6' }}>
            Database Connections
          </Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadDatabases}
              loading={loading}
              style={{ background: '#3c3f41', borderColor: '#323232', color: '#a9b7c6' }}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
              style={{ background: '#589df6', borderColor: '#589df6' }}
            >
              Add Database
            </Button>
          </Space>
        </Space>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        <DatabaseList
          databases={databases}
          loading={loading}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onSelect={handleSelect}
        />
      </Space>

      <AddDatabaseModal
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingDatabase={editingDatabase}
      />
    </div>
  );
};

