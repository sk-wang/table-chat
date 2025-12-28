import React, { useState } from 'react';
import { Button, Space, Typography, Spin, Alert } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { DatabaseList } from '../../components/database/DatabaseList';
import { AddDatabaseModal } from '../../components/database/AddDatabaseModal';
import { useDatabase } from '../../contexts/DatabaseContext';
import { apiClient } from '../../services/api';
import type { DatabaseResponse } from '../../types';

const { Title } = Typography;

export const DatabasesListPage: React.FC = () => {
  // Use global database context
  const { databases, loading, error: contextError, refreshDatabases, setSelectedDatabase } = useDatabase();
  const navigate = useNavigate();
  
  const [localError, setLocalError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDatabase, setEditingDatabase] = useState<DatabaseResponse | null>(null);

  const error = localError || contextError;

  const handleDelete = async (name: string) => {
    try {
      await apiClient.deleteDatabase(name);
      await refreshDatabases(); // Refresh global state
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to delete database');
    }
  };

  const handleEdit = (database: DatabaseResponse) => {
    setEditingDatabase(database);
    setModalOpen(true);
  };

  const handleSelect = (database: DatabaseResponse) => {
    // Select database and navigate to query page
    setSelectedDatabase(database.name);
    navigate('/query');
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingDatabase(null);
  };

  const handleModalSuccess = () => {
    refreshDatabases(); // Refresh global state
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
              onClick={() => refreshDatabases()}
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
            onClose={() => setLocalError(null)}
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

