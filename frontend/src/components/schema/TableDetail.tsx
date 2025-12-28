import React from 'react';
import { Table, Tag, Typography, Empty } from 'antd';
import { KeyOutlined } from '@ant-design/icons';
import type { ColumnInfo } from '../../types/metadata';

const { Text } = Typography;

interface TableDetailProps {
  schemaName: string | null;
  tableName: string | null;
  columns: ColumnInfo[];
}

export const TableDetail: React.FC<TableDetailProps> = ({
  schemaName,
  tableName,
  columns,
}) => {
  if (!tableName) {
    return (
      <Empty
        description="Select a table to view details"
        style={{ padding: 24 }}
      />
    );
  }

  const tableColumns = [
    {
      title: 'Column',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ColumnInfo) => (
        <span>
          {record.isPrimaryKey && (
            <KeyOutlined style={{ color: '#faad14', marginRight: 4 }} />
          )}
          <Text strong style={{ color: '#a9b7c6' }}>{name}</Text>
        </span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'dataType',
      key: 'dataType',
      render: (type: string) => (
        <Tag color="blue">{type}</Tag>
      ),
    },
    {
      title: 'Nullable',
      dataIndex: 'isNullable',
      key: 'isNullable',
      render: (nullable: boolean) => (
        nullable ? (
          <Tag color="default">NULL</Tag>
        ) : (
          <Tag color="orange">NOT NULL</Tag>
        )
      ),
    },
    {
      title: 'Default',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
      render: (value: string | null) => (
        value ? (
          <Text code style={{ fontSize: 11 }}>{value}</Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 16, color: '#a9b7c6' }}>
          {schemaName}.{tableName}
        </Text>
        <Text type="secondary" style={{ marginLeft: 8 }}>
          ({columns.length} columns)
        </Text>
      </div>

      <Table
        columns={tableColumns}
        dataSource={columns.map((col, idx) => ({ ...col, key: idx }))}
        pagination={false}
        size="small"
        bordered
        style={{ background: '#3c3f41' }}
      />
    </div>
  );
};

