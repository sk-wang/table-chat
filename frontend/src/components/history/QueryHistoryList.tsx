import { Table, Typography, Empty, Tooltip, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircleOutlined, MessageOutlined, CopyOutlined } from '@ant-design/icons';
import type { QueryHistoryItem } from '../../types/history';
import { formatRelativeTime, truncateText } from './utils';

const { Text } = Typography;

interface QueryHistoryListProps {
  items: QueryHistoryItem[];
  loading: boolean;
  onSelectHistory: (item: QueryHistoryItem) => void;
  emptyText?: string;
  totalCount?: number;
}

export function QueryHistoryList({
  items,
  loading,
  onSelectHistory,
  emptyText = '暂无执行历史',
  totalCount,
}: QueryHistoryListProps) {
  // If we are loading and have no items, show a skeleton or at least no empty state
  const showEmpty = !loading && items.length === 0;

  // Handle double-click to copy SQL
  const handleCopySQL = async (sql: string) => {
    try {
      await navigator.clipboard.writeText(sql);
      message.success('SQL已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
  };

  // Define table columns
  const columns: ColumnsType<QueryHistoryItem> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_, __, index) => (
        <Text type="secondary">{index + 1}</Text>
      ),
    },
    {
      title: '执行时间',
      dataIndex: 'executedAt',
      key: 'executedAt',
      width: 120,
      render: (executedAt: string) => (
        <Tooltip title={new Date(executedAt).toLocaleString('zh-CN')}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {formatRelativeTime(executedAt)}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '数据库',
      dataIndex: 'dbName',
      key: 'dbName',
      width: 100,
      ellipsis: true,
      render: (dbName: string) => (
        <Tooltip title={dbName}>
          <Text style={{ fontSize: '12px' }}>{dbName}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'SQL',
      dataIndex: 'sqlContent',
      key: 'sqlContent',
      ellipsis: true,
      render: (sqlContent: string) => (
        <Tooltip 
          title={
            <div style={{ maxWidth: '400px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
              {sqlContent}
              <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '8px' }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>
                  <CopyOutlined style={{ marginRight: 4 }} />双击复制SQL
                </Text>
              </div>
            </div>
          }
          placement="topLeft"
          overlayStyle={{ maxWidth: '450px' }}
        >
          <Text 
            code 
            style={{ 
              fontSize: '12px', 
              cursor: 'pointer',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {truncateText(sqlContent, 80)}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 70,
      align: 'center',
      render: () => (
        <Tag 
          icon={<CheckCircleOutlined />} 
          color="success"
          style={{ margin: 0 }}
        >
          成功
        </Tag>
      ),
    },
    {
      title: '行数',
      dataIndex: 'rowCount',
      key: 'rowCount',
      width: 70,
      align: 'right',
      render: (rowCount: number) => (
        <Text style={{ fontSize: '12px' }}>{rowCount.toLocaleString()}</Text>
      ),
    },
    {
      title: '耗时',
      dataIndex: 'executionTimeMs',
      key: 'executionTimeMs',
      width: 80,
      align: 'right',
      render: (executionTimeMs: number) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {executionTimeMs} ms
        </Text>
      ),
    },
    {
      title: '备注',
      dataIndex: 'naturalQuery',
      key: 'naturalQuery',
      width: 250, // 增加宽度以容纳更多文字
      render: (naturalQuery: string | null) => {
        if (!naturalQuery) {
          return <Text type="secondary" style={{ fontSize: '12px' }}>-</Text>;
        }
        return (
          <Tag 
            icon={<MessageOutlined />} 
            color="blue"
            style={{ 
              margin: 0, 
              whiteSpace: 'normal', // 允许换行
              height: 'auto',       // 高度随内容自适应
              padding: '2px 8px',
              display: 'inline-flex',
              alignItems: 'center',
              lineHeight: '1.5',
            }}
          >
            {naturalQuery}
          </Tag>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={items}
      rowKey="id"
      loading={{
        spinning: loading,
        delay: 200, // Delay showing spinner to avoid flicker on fast loads
      }}
      size="small"
      pagination={false}
      locale={{
        emptyText: showEmpty ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary">{emptyText}</Text>
            }
            style={{ padding: '40px 0' }}
          />
        ) : null,
      }}
      onRow={(record) => ({
        onClick: () => onSelectHistory(record),
        onDoubleClick: () => handleCopySQL(record.sqlContent),
        style: { cursor: 'pointer' },
      })}
      footer={() => (
        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            当前显示 {items.length} 条
            {totalCount !== undefined && totalCount > items.length && ` / 共 ${totalCount} 条`}
          </Text>
        </div>
      )}
    />
  );
}
