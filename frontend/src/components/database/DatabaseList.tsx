import React from 'react';
import { List, Card, Button, Space, Typography, Popconfirm, message } from 'antd';
import { DeleteOutlined, EditOutlined, DatabaseOutlined } from '@ant-design/icons';
import type { DatabaseResponse } from '../../types';

const { Text } = Typography;

interface DatabaseListProps {
  databases: DatabaseResponse[];
  loading?: boolean;
  onDelete: (name: string) => Promise<void>;
  onEdit: (database: DatabaseResponse) => void;
  onSelect: (database: DatabaseResponse) => void;
}

export const DatabaseList: React.FC<DatabaseListProps> = ({
  databases,
  loading = false,
  onDelete,
  onEdit,
  onSelect,
}) => {
  const handleDelete = async (name: string) => {
    try {
      await onDelete(name);
      message.success(`Database "${name}" deleted successfully`);
    } catch (error) {
      message.error(`Failed to delete database: ${error}`);
    }
  };

  return (
    <List
      loading={loading}
      dataSource={databases}
      locale={{ emptyText: 'No databases configured. Add one to get started.' }}
      renderItem={database => (
        <List.Item>
          <Card
            hoverable
            style={{
              width: '100%',
              background: '#3c3f41',
              borderColor: '#323232',
            }}
            onClick={() => onSelect(database)}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  <DatabaseOutlined style={{ fontSize: 20, color: '#589df6' }} />
                  <Text strong style={{ color: '#a9b7c6', fontSize: 16 }}>
                    {database.name}
                  </Text>
                </Space>
                <Space>
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={e => {
                      e.stopPropagation();
                      onEdit(database);
                    }}
                    style={{ color: '#a9b7c6' }}
                  />
                  <Popconfirm
                    title="Delete database connection"
                    description={`Are you sure you want to delete "${database.name}"?`}
                    onConfirm={e => {
                      e?.stopPropagation();
                      handleDelete(database.name);
                    }}
                    onCancel={e => e?.stopPropagation()}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={e => e.stopPropagation()}
                    />
                  </Popconfirm>
                </Space>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {database.url}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Created: {new Date(database.createdAt).toLocaleString()}
              </Text>
            </Space>
          </Card>
        </List.Item>
      )}
    />
  );
};

