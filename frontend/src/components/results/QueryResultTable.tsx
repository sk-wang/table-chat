import React, { useState, useCallback } from 'react';
import { Table, Alert, Empty, Typography, Tooltip } from 'antd';
import { ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { Resizable, ResizeCallbackData } from 'react-resizable';
import type { QueryResult } from '../../types';
import type { TableMetadata, ColumnInfo } from '../../types/metadata';
import 'react-resizable/css/styles.css';

const { Text } = Typography;

interface QueryResultTableProps {
  result: QueryResult | null;
  executionTimeMs?: number;
  loading?: boolean;
  metadata?: TableMetadata[] | null;
}

// Resizable header cell component
const ResizableTitle = (
  props: React.HTMLAttributes<HTMLTableCellElement> & {
    onResize: (e: React.SyntheticEvent, data: ResizeCallbackData) => void;
    width: number;
  }
) => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            right: -5,
            bottom: 0,
            top: 0,
            width: 10,
            cursor: 'col-resize',
            zIndex: 1,
          }}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

// Helper to find column comment from metadata
const findColumnComment = (
  columnName: string,
  metadata: TableMetadata[] | null | undefined
): string | undefined => {
  if (!metadata) return undefined;
  
  for (const table of metadata) {
    const column = table.columns?.find(
      (col: ColumnInfo) => col.name.toLowerCase() === columnName.toLowerCase()
    );
    if (column?.comment) {
      return column.comment;
    }
  }
  return undefined;
};

export const QueryResultTable: React.FC<QueryResultTableProps> = ({
  result,
  executionTimeMs,
  loading = false,
  metadata,
}) => {
  // State for column widths
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  // Handle column resize
  const handleResize = useCallback(
    (columnKey: string) =>
      (_: React.SyntheticEvent, { size }: ResizeCallbackData) => {
        setColumnWidths((prev) => ({
          ...prev,
          [columnKey]: Math.max(size.width, 50), // Minimum width 50px
        }));
      },
    []
  );

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

  // Build table columns from result columns with comments and resize
  const columns = result.columns.map((col) => {
    const comment = findColumnComment(col, metadata);
    const width = columnWidths[col] || 150; // Default width 150px

    return {
      title: (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>{col}</span>
          {comment && (
            <Tooltip title={comment.length > 30 ? comment : undefined}>
              <span
                style={{
                  fontSize: 10,
                  color: '#808080',
                  fontWeight: 'normal',
                  fontStyle: 'italic',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: width - 20,
                }}
              >
                {comment.length > 30 ? comment.slice(0, 30) + '...' : comment}
              </span>
            </Tooltip>
          )}
        </div>
      ),
      dataIndex: col,
      key: col,
      width,
      ellipsis: true,
      onHeaderCell: () => ({
        width,
        onResize: handleResize(col),
      }),
      render: (value: unknown) => {
        if (value === null) return <Text type="secondary">NULL</Text>;
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      },
    };
  });

  // Table components with resizable header
  const components = {
    header: {
      cell: ResizableTitle,
    },
  };

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
        components={components}
        columns={columns}
        dataSource={result.rows.map((row, idx) => ({ ...row, key: idx }))}
        loading={loading}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} rows`,
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
            <ClockCircleOutlined /> Execution time: {executionTimeMs}ms | Rows:{' '}
            {result.rowCount}
          </Text>
        </div>
      )}
    </div>
  );
};
