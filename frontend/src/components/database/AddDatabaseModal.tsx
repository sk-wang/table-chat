import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Input, Radio, Space, Typography, Checkbox, App, Collapse, Switch } from 'antd';
import type { DatabaseResponse, SSHConfig } from '../../types';
import { apiClient } from '../../services/api';

const { Text } = Typography;
const { Panel } = Collapse;

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
  // Ant Design App context for message API
  const { message } = App.useApp();
  
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dbType, setDbType] = useState<DbType>('postgresql');
  const [sshEnabled, setSshEnabled] = useState(false);
  const [sshAuthType, setSshAuthType] = useState<'password' | 'key'>('password');

  // Get current database type config
  const dbConfig = useMemo(() => DB_TYPES[dbType], [dbType]);

  useEffect(() => {
    if (open && editingDatabase) {
      form.setFieldsValue({
        name: editingDatabase.name,
        url: '', // Don't populate URL for security
        sslDisabled: editingDatabase.sslDisabled || false,
      });
      // Set dbType based on existing database
      setDbType(editingDatabase.dbType as DbType || 'postgresql');

      // Load SSH config if exists
      if (editingDatabase.sshConfig && editingDatabase.sshConfig.enabled) {
        setSshEnabled(true);
        setSshAuthType(editingDatabase.sshConfig.authType);
        form.setFieldsValue({
          sshHost: editingDatabase.sshConfig.host,
          sshPort: editingDatabase.sshConfig.port,
          sshUsername: editingDatabase.sshConfig.username,
          sshAuthType: editingDatabase.sshConfig.authType,
        });
      } else {
        setSshEnabled(false);
        setSshAuthType('password');
      }
    } else if (open) {
      form.resetFields();
      setDbType('postgresql');
      setSshEnabled(false);
      setSshAuthType('password');
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

      // Build SSH config if enabled
      let sshConfig: SSHConfig | undefined = undefined;
      if (sshEnabled) {
        sshConfig = {
          enabled: true,
          host: values.sshHost,
          port: values.sshPort || 22,
          username: values.sshUsername,
          authType: values.sshAuthType,
        };

        // Add authentication credentials
        if (values.sshAuthType === 'password') {
          sshConfig.password = values.sshPassword;
        } else {
          sshConfig.privateKey = values.sshPrivateKey;
          if (values.sshKeyPassphrase) {
            sshConfig.keyPassphrase = values.sshKeyPassphrase;
          }
        }
      }

      await apiClient.createOrUpdateDatabase(values.name, {
        url: values.url,
        sslDisabled: values.sslDisabled || false,
        sshConfig,
      });

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

        {/* SSL Disabled Option - Only for MySQL */}
        {dbType === 'mysql' && (
          <Form.Item
            name="sslDisabled"
            valuePropName="checked"
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                仅在遇到 SSL 协议兼容性问题时使用
              </Text>
            }
          >
            <Checkbox>禁用 SSL</Checkbox>
          </Form.Item>
        )}

        {/* SSH Tunnel Configuration */}
        <Form.Item label="SSH Tunnel" style={{ marginBottom: 8 }}>
          <Space align="center">
            <Switch
              checked={sshEnabled}
              onChange={(checked) => {
                setSshEnabled(checked);
                if (!checked) {
                  // Clear SSH fields when disabled
                  form.setFieldsValue({
                    sshHost: undefined,
                    sshPort: undefined,
                    sshUsername: undefined,
                    sshPassword: undefined,
                    sshPrivateKey: undefined,
                    sshKeyPassphrase: undefined,
                  });
                }
              }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {sshEnabled ? 'Enabled' : 'Disabled'}
            </Text>
          </Space>
        </Form.Item>

        {sshEnabled && (
          <Collapse
            defaultActiveKey={['ssh']}
            style={{ marginBottom: 16 }}
            bordered={false}
          >
            <Panel header="SSH Configuration" key="ssh">
              {/* SSH Host */}
              <Form.Item
                name="sshHost"
                label="SSH Host"
                rules={[
                  { required: sshEnabled, message: 'Please enter SSH host' },
                ]}
              >
                <Input placeholder="example.com or 192.168.1.1" />
              </Form.Item>

              {/* SSH Port */}
              <Form.Item
                name="sshPort"
                label="SSH Port"
                initialValue={22}
                rules={[
                  { required: sshEnabled, message: 'Please enter SSH port' },
                  {
                    type: 'number',
                    min: 1,
                    max: 65535,
                    message: 'Port must be between 1 and 65535',
                    transform: (value) => Number(value),
                  },
                ]}
              >
                <Input type="number" placeholder="22" />
              </Form.Item>

              {/* SSH Username */}
              <Form.Item
                name="sshUsername"
                label="SSH Username"
                rules={[
                  { required: sshEnabled, message: 'Please enter SSH username' },
                ]}
              >
                <Input placeholder="root or your-username" />
              </Form.Item>

              {/* Authentication Type Selector */}
              <Form.Item
                name="sshAuthType"
                label="Authentication Type"
                initialValue="password"
              >
                <Radio.Group
                  value={sshAuthType}
                  onChange={(e) => {
                    setSshAuthType(e.target.value);
                    // Clear opposite auth fields when switching
                    if (e.target.value === 'password') {
                      form.setFieldsValue({
                        sshPrivateKey: undefined,
                        sshKeyPassphrase: undefined,
                      });
                    } else {
                      form.setFieldsValue({
                        sshPassword: undefined,
                      });
                    }
                  }}
                >
                  <Radio.Button value="password">Password</Radio.Button>
                  <Radio.Button value="key">Private Key</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {/* Password Authentication */}
              {sshAuthType === 'password' && (
                <Form.Item
                  name="sshPassword"
                  label="SSH Password"
                  rules={[
                    {
                      required: sshEnabled && sshAuthType === 'password',
                      message: 'Please enter SSH password',
                    },
                  ]}
                  extra={
                    editingDatabase && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Leave empty to keep existing password
                      </Text>
                    )
                  }
                >
                  <Input.Password placeholder="Your SSH password" />
                </Form.Item>
              )}

              {/* Private Key Authentication */}
              {sshAuthType === 'key' && (
                <>
                  <Form.Item
                    name="sshPrivateKey"
                    label="Private Key"
                    rules={[
                      {
                        required: sshEnabled && sshAuthType === 'key',
                        message: 'Please enter private key',
                      },
                    ]}
                    extra={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Paste your private key content (OpenSSH or PEM format)
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Example: -----BEGIN RSA PRIVATE KEY----- ...
                        </Text>
                        {editingDatabase && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Leave empty to keep existing private key
                          </Text>
                        )}
                      </Space>
                    }
                  >
                    <Input.TextArea
                      rows={6}
                      placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                      style={{ fontFamily: 'monospace', fontSize: 12 }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="sshKeyPassphrase"
                    label="Key Passphrase (Optional)"
                    extra={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Only required if your private key is encrypted
                      </Text>
                    }
                  >
                    <Input.Password placeholder="Leave empty if key has no passphrase" />
                  </Form.Item>
                </>
              )}
            </Panel>
          </Collapse>
        )}
      </Form>
    </Modal>
  );
};

