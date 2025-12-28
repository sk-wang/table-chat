import React from 'react';
import { Table, Alert, Empty, Typography } from 'antd';
import { ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { QueryResult } from '../../types';

const { Text } = Typography;

interface QueryResultTableProps {
  result: QueryResult | null;
  executionTimeMs?: number;
  loading?: boolean;
}

export const QueryResultTable: React.FC<QueryResultTableProps> = ({
  result,
  executionTimeMs,
  loading = false,
}) => {
  if (!result && !loading) {
    return (
      <Empty
        description="No query results yet"
        style={{ padding: 48, color: '#808080' }}
      />
    );
  }

  if (!result) {
    return null;
  }

  // Empty result
  if (result.rowCount === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Empty
          description={
            <Text style={{ color: '#808080' }}>
              Query executed successfully but returned no data
            </Text>
          }
        />
        {executionTimeMs !== undefined && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined /> Execution time: {executionTimeMs}ms
            </Text>
          </div>
        )}
      </div>
    );
  }

  // Build table columns from result columns
  const columns = result.columns.map(col => ({
    title: col,
    dataIndex: col,
    key: col,
    ellipsis: true,
    render: (value: unknown) => {
      if (value === null) return <Text type="secondary">NULL</Text>;
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    },
  }));

  return (
    <div>
      {result.truncated && (
        <Alert
          message="Results Limited"
          description="Query results were automatically limited to 1000 rows. Add a LIMIT clause to your query to control the number of results."
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Table
        columns={columns}
        dataSource={result.rows.map((row, idx) => ({ ...row, key: idx }))}
        loading={loading}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: total => `Total ${total} rows`,
          pageSizeOptions: ['10', '50', '100', '500'],
        }}
        scroll={{ x: 'max-content', y: 500 }}
        size="small"
        bordered
        style={{
          background: '#3c3f41',
        }}
      />

      {executionTimeMs !== undefined && (
        <div style={{ marginTop: 8, textAlign: 'right' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <ClockCircleOutlined /> Execution time: {executionTimeMs}ms | Rows: {result.rowCount}
          </Text>
        </div>
      )}
    </div>
  );
};

