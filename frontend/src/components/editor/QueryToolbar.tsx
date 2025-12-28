import React from 'react';
import { Button, Space, Select, Typography } from 'antd';
import { PlayCircleOutlined, ClearOutlined } from '@ant-design/icons';
import type { DatabaseResponse } from '../../types';

const { Text } = Typography;

interface QueryToolbarProps {
  databases: DatabaseResponse[];
  selectedDatabase: string | null;
  onDatabaseChange?: (dbName: string) => void;
  onExecute: () => void;
  onClear: () => void;
  executing?: boolean;
  disabled?: boolean;
  showDatabaseSelector?: boolean;
}

export const QueryToolbar: React.FC<QueryToolbarProps> = ({
  databases,
  selectedDatabase,
  onDatabaseChange,
  onExecute,
  onClear,
  executing = false,
  disabled = false,
  showDatabaseSelector = true,
}) => {
  return (
    <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
      <Space>
        {showDatabaseSelector && onDatabaseChange && (
          <>
            <Text style={{ color: '#a9b7c6' }}>Database:</Text>
            <Select
              value={selectedDatabase}
              onChange={onDatabaseChange}
              style={{ width: 200 }}
              placeholder="Select database"
              disabled={disabled || databases.length === 0}
              options={databases.map(db => ({
                label: db.name,
                value: db.name,
              }))}
            />
          </>
        )}
        {!showDatabaseSelector && selectedDatabase && (
          <Text style={{ color: '#589df6', fontWeight: 500 }}>
            {selectedDatabase}
          </Text>
        )}
      </Space>

      <Space>
        <Button
          icon={<ClearOutlined />}
          onClick={onClear}
          disabled={disabled}
          style={{ background: '#3c3f41', borderColor: '#323232', color: '#a9b7c6' }}
        >
          Clear
        </Button>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={onExecute}
          loading={executing}
          disabled={disabled || !selectedDatabase}
          style={{ background: '#589df6', borderColor: '#589df6' }}
        >
          Execute (Ctrl+Enter)
        </Button>
      </Space>
    </Space>
  );
};
