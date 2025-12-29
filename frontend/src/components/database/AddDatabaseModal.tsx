import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Input, message, Radio, Space, Typography } from 'antd';
import type { DatabaseResponse } from '../../types';
import { apiClient } from '../../services/api';

const { Text } = Typography;

interface AddDatabaseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingDatabase?: DatabaseResponse | null;
}

// Database type configuration
const DB_TYPES = {
  postgresql: {
    label: 'PostgreSQL',
    color: '#336791',
    placeholder: 'postgresql://user:password@localhost:5432/mydb',
    pattern: /^(postgresql|postgres):\/\/.+/,
    errorMessage: 'Must be a valid PostgreSQL connection URL (postgresql:// or postgres://)',
    helpText: 'Format: postgresql://user:password@host:port/database',
  },
  mysql: {
    label: 'MySQL',
    color: '#4479A1',
    placeholder: 'mysql://user:password@localhost:3306/mydb',
    pattern: /^mysql:\/\/.+/,
    errorMessage: 'Must be a valid MySQL connection URL (mysql://)',
    helpText: 'Format: mysql://user:password@host:port/database',
  },
} as const;

type DbType = keyof typeof DB_TYPES;

export const AddDatabaseModal: React.FC<AddDatabaseModalProps> = ({
  open,
  onClose,
  onSuccess,
  editingDatabase,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dbType, setDbType] = useState<DbType>('postgresql');

  // Get current database type config
  const dbConfig = useMemo(() => DB_TYPES[dbType], [dbType]);

  useEffect(() => {
    if (open && editingDatabase) {
      form.setFieldsValue({
        name: editingDatabase.name,
        url: '', // Don't populate URL for security
      });
      // Set dbType based on existing database
      setDbType(editingDatabase.dbType as DbType || 'postgresql');
    } else if (open) {
      form.resetFields();
      setDbType('postgresql');
    }
  }, [open, editingDatabase, form]);

  // Re-validate URL when database type changes
  const handleDbTypeChange = (type: DbType) => {
    setDbType(type);
    // Clear URL validation errors when type changes
    const url = form.getFieldValue('url');
    if (url) {
      form.validateFields(['url']);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      await apiClient.createOrUpdateDatabase(values.name, { url: values.url });

      message.success(
        editingDatabase
          ? `Database "${values.name}" updated successfully`
          : `Database "${values.name}" added successfully`
      );

      form.resetFields();
      onSuccess();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error('Failed to save database connection');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={editingDatabase ? 'Edit Database Connection' : 'Add Database Connection'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      okText={editingDatabase ? 'Update' : 'Add'}
      cancelText="Cancel"
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
      >
        {/* Database Type Selector */}
        <Form.Item label="Database Type">
          <Radio.Group
            value={dbType}
            onChange={(e) => handleDbTypeChange(e.target.value)}
            disabled={editingDatabase !== null && editingDatabase !== undefined}
          >
            <Space>
              {(Object.keys(DB_TYPES) as DbType[]).map((type) => (
                <Radio.Button
                  key={type}
                  value={type}
                  style={{
                    borderColor: dbType === type ? DB_TYPES[type].color : undefined,
                    color: dbType === type ? DB_TYPES[type].color : undefined,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: DB_TYPES[type].color,
                      marginRight: 6,
                    }}
                  />
                  {DB_TYPES[type].label}
                </Radio.Button>
              ))}
            </Space>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="name"
          label="Database Name"
          rules={[
            { required: true, message: 'Please enter a database name' },
            {
              pattern: /^[a-zA-Z0-9_-]+$/,
              message: 'Only letters, numbers, underscores, and hyphens allowed',
            },
          ]}
        >
          <Input
            placeholder={`my-${dbType}-db`}
            disabled={editingDatabase !== null && editingDatabase !== undefined}
          />
        </Form.Item>

        <Form.Item
          name="url"
          label="Connection URL"
          rules={[
            { required: true, message: 'Please enter a connection URL' },
            {
              pattern: dbConfig.pattern,
              message: dbConfig.errorMessage,
            },
          ]}
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dbConfig.helpText}
            </Text>
          }
        >
          <Input.Password 
            placeholder={dbConfig.placeholder}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

