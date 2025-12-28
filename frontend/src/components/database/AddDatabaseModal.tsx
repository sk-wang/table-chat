import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import type { DatabaseResponse } from '../../types';
import { apiClient } from '../../services/api';

interface AddDatabaseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingDatabase?: DatabaseResponse | null;
}

export const AddDatabaseModal: React.FC<AddDatabaseModalProps> = ({
  open,
  onClose,
  onSuccess,
  editingDatabase,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && editingDatabase) {
      form.setFieldsValue({
        name: editingDatabase.name,
        url: '', // Don't populate URL for security
      });
    } else if (open) {
      form.resetFields();
    }
  }, [open, editingDatabase, form]);

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
        disabled={editingDatabase !== null && editingDatabase !== undefined}
      >
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
            placeholder="my-postgres-db"
            disabled={editingDatabase !== null && editingDatabase !== undefined}
          />
        </Form.Item>

        <Form.Item
          name="url"
          label="Connection URL"
          rules={[
            { required: true, message: 'Please enter a connection URL' },
            {
              pattern: /^postgresql:\/\/.+/,
              message: 'Must be a valid PostgreSQL connection URL',
            },
          ]}
          extra="Format: postgresql://user:password@host:port/database"
        >
          <Input.Password placeholder="postgresql://user:password@localhost:5432/mydb" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

