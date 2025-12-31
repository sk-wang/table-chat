import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal, Form, Input, Radio, Space, Typography, Checkbox, App, Switch, Button, Divider } from 'antd';
import { FolderOpenOutlined } from '@ant-design/icons';
import type { DatabaseResponse, SSHConfig } from '../../types';
import { apiClient } from '../../services/api';
import { readFileAsText } from '../../utils/fileReader';

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
  // Ant Design App context for message API
  const { message } = App.useApp();
  
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dbType, setDbType] = useState<DbType>('postgresql');
  const [sshEnabled, setSshEnabled] = useState(false);
  const [sshAuthType, setSshAuthType] = useState<'password' | 'key'>('password');
  
  // File input ref for private key file picker
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle private key file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const result = await readFileAsText(file);
    
    if (result.success) {
      form.setFieldValue('sshPrivateKey', result.content);
      message.success(`已加载: ${file.name}`);
    } else {
      message.error(result.error.message);
    }
    
    // Reset input to allow re-selecting the same file
    event.target.value = '';
  };

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

        {/* SSH Configuration - JetBrains IDE Style (Theme-aware) */}
        {sshEnabled && (
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.04)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: 6, 
            padding: '12px 16px',
            marginBottom: 16 
          }}>
            <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
              SSH Configuration
            </Text>
            
            {/* Hidden file input for private key selection - no accept filter to allow extensionless keys like id_rsa */}
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />

            {/* SSH Host & Port - Compact Row */}
            <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
              <Form.Item
                name="sshHost"
                rules={[{ required: sshEnabled, message: 'Host required' }]}
                style={{ marginBottom: 0, flex: 1 }}
              >
                <Input 
                  placeholder="SSH Host (e.g., bastion.example.com)" 
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                />
              </Form.Item>
              <Form.Item
                name="sshPort"
                initialValue={22}
                rules={[{ required: sshEnabled, message: 'Port' }]}
                style={{ marginBottom: 0, width: 80 }}
              >
                <Input 
                  type="number" 
                  placeholder="22" 
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                />
              </Form.Item>
            </Space.Compact>

            {/* SSH Username */}
            <Form.Item
              name="sshUsername"
              rules={[{ required: sshEnabled, message: 'Username required' }]}
              style={{ marginBottom: 8 }}
            >
              <Input 
                placeholder="Username (e.g., root)" 
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
              />
            </Form.Item>

            <Divider style={{ margin: '12px 0' }} />

            {/* Authentication Type - Compact Radio */}
            <Form.Item
              name="sshAuthType"
              initialValue="password"
              style={{ marginBottom: 8 }}
            >
              <Radio.Group
                value={sshAuthType}
                onChange={(e) => {
                  setSshAuthType(e.target.value);
                  if (e.target.value === 'password') {
                    form.setFieldsValue({ sshPrivateKey: undefined, sshKeyPassphrase: undefined });
                  } else {
                    form.setFieldsValue({ sshPassword: undefined });
                  }
                }}
                size="small"
              >
                <Radio value="password">Password</Radio>
                <Radio value="key">Key pair (OpenSSH or PuTTY)</Radio>
              </Radio.Group>
            </Form.Item>

            {/* Password Authentication */}
            {sshAuthType === 'password' && (
              <Form.Item
                name="sshPassword"
                rules={[
                  { required: sshEnabled && sshAuthType === 'password', message: 'Password required' },
                ]}
                style={{ marginBottom: 0 }}
              >
                <Input.Password 
                  placeholder="SSH Password" 
                  style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                />
              </Form.Item>
            )}

            {/* Private Key Authentication - JetBrains Style */}
            {sshAuthType === 'key' && (
              <>
                {/* Private Key Path/Content with Browse Button */}
                <Form.Item
                  name="sshPrivateKey"
                  rules={[
                    { required: sshEnabled && sshAuthType === 'key', message: 'Private key required' },
                  ]}
                  style={{ marginBottom: 8 }}
                >
                  <Input.TextArea
                    rows={5}
                    placeholder="Paste private key content or click Browse to select file...&#10;-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                    style={{ 
                      fontFamily: 'JetBrains Mono, Consolas, monospace', 
                      fontSize: 11,
                      resize: 'vertical'
                    }}
                  />
                </Form.Item>
                
                {/* Browse Button - JetBrains Style */}
                <div style={{ marginBottom: 12 }}>
                  <Button
                    icon={<FolderOpenOutlined />}
                    onClick={() => fileInputRef.current?.click()}
                    size="small"
                    style={{ fontSize: 12 }}
                  >
                    Browse...
                  </Button>
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                    Select private key file (.pem, id_rsa, id_ed25519)
                  </Text>
                </div>

                {/* Key Passphrase */}
                <Form.Item
                  name="sshKeyPassphrase"
                  style={{ marginBottom: 0 }}
                >
                  <Input.Password 
                    placeholder="Passphrase (leave empty if none)" 
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                  />
                </Form.Item>
                
                {editingDatabase && (
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                    Leave empty to keep existing key
                  </Text>
                )}
              </>
            )}
          </div>
        )}
      </Form>
    </Modal>
  );
};

