import React, { useState } from 'react';
import { 
  Typography, 
  Button, 
  Popconfirm, 
  message, 
  Spin,
  Tooltip,
  Tree,
  Collapse,
} from 'antd';
import { 
  DatabaseOutlined, 
  PlusOutlined, 
  DeleteOutlined,
  ReloadOutlined,
  TableOutlined,
  EyeOutlined,
  DownOutlined,
  RightOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { useDatabase } from '../../contexts/DatabaseContext';
import { AddDatabaseModal } from '../database/AddDatabaseModal';
import { apiClient } from '../../services/api';
import type { TableMetadata } from '../../types/metadata';

interface DatabaseSidebarProps {
  metadata: TableMetadata[] | null;
  metadataLoading: boolean;
  onTableSelect?: (schemaName: string, tableName: string) => void;
  onRefreshMetadata?: () => void;
}

const { Text } = Typography;

// Helper function to truncate text and return if truncated
const truncateText = (text: string | undefined | null, maxLength: number): { text: string; isTruncated: boolean } => {
  if (!text) return { text: '', isTruncated: false };
  if (text.length <= maxLength) return { text, isTruncated: false };
  return { text: text.slice(0, maxLength) + '...', isTruncated: true };
};

// Comment display component with optional tooltip for long text
const CommentText: React.FC<{ comment: string | undefined | null; maxLength: number }> = ({ comment, maxLength }) => {
  if (!comment) return null;
  const { text, isTruncated } = truncateText(comment, maxLength);
  
  const content = (
    <span style={{ color: '#808080', marginLeft: 6, fontSize: 10, fontStyle: 'italic' }}>
      {text}
    </span>
  );
  
  if (isTruncated) {
    return (
      <Tooltip title={comment} placement="right">
        {content}
      </Tooltip>
    );
  }
  
  return content;
};

export const DatabaseSidebar: React.FC<DatabaseSidebarProps> = ({
  metadata,
  metadataLoading,
  onTableSelect,
  onRefreshMetadata,
}) => {
  const { 
    databases, 
    selectedDatabase, 
    setSelectedDatabase, 
    loading, 
    refreshDatabases 
  } = useDatabase();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeKeys, setActiveKeys] = useState<string[]>(['databases', 'schema']);

  const handleDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDeleting(name);
      await apiClient.deleteDatabase(name);
      message.success(`Database "${name}" deleted`);
      await refreshDatabases();
    } catch (error) {
      message.error(`Failed to delete: ${error}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleAddSuccess = () => {
    refreshDatabases();
  };

  // Build tree data for metadata with columns
  const buildMetadataTree = (): DataNode[] => {
    if (!metadata || metadata.length === 0) return [];

    // Group by schema
    const schemaMap = new Map<string, TableMetadata[]>();
    metadata.forEach(table => {
      const schema = table.schemaName || 'public';
      if (!schemaMap.has(schema)) {
        schemaMap.set(schema, []);
      }
      schemaMap.get(schema)!.push(table);
    });

    return Array.from(schemaMap.entries()).map(([schema, tables]) => ({
      key: `schema-${schema}`,
      title: (
        <Text style={{ color: '#a9b7c6', fontSize: 12 }}>
          {schema} ({tables.length})
        </Text>
      ),
      icon: <DatabaseOutlined style={{ color: '#6897bb' }} />,
      children: tables.map(table => ({
        key: `table-${schema}-${table.tableName}`,
        title: (
          <span style={{ color: '#a9b7c6', fontSize: 12 }}>
            {table.tableName}
            <span style={{ color: '#666', marginLeft: 4, fontSize: 10 }}>
              ({table.columns?.length || 0} cols)
            </span>
            <CommentText comment={table.comment} maxLength={50} />
          </span>
        ),
        icon: table.tableType === 'view' 
          ? <EyeOutlined style={{ color: '#cc7832' }} />
          : <TableOutlined style={{ color: '#6a8759' }} />,
        // Add columns as children
        children: (table.columns || []).map(column => ({
          key: `column-${schema}-${table.tableName}-${column.name}`,
          title: (
            <span style={{ fontSize: 11, color: '#a9b7c6' }}>
              {column.isPrimaryKey && (
                <KeyOutlined style={{ color: '#faad14', marginRight: 4, fontSize: 10 }} />
              )}
              <span style={{ color: column.isPrimaryKey ? '#faad14' : '#a9b7c6' }}>
                {column.name}
              </span>
              <span style={{ color: '#666', marginLeft: 6 }}>
                {column.dataType}
                {!column.isNullable && <span style={{ color: '#cc7832' }}> NOT NULL</span>}
              </span>
              <CommentText comment={column.comment} maxLength={30} />
            </span>
          ),
          isLeaf: true,
        })),
      })),
    }));
  };

  const handleTreeSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length === 0) return;
    const key = selectedKeys[0] as string;
    // Only trigger on table selection, not columns
    if (key.startsWith('table-') && !key.startsWith('column-')) {
      const parts = key.replace('table-', '').split('-');
      const schema = parts[0];
      const table = parts.slice(1).join('-');
      onTableSelect?.(schema, table);
    }
  };

  // Custom panel header for Databases
  const databasesHeader = (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      width: '100%',
    }}>
      <Text strong style={{ color: '#a9b7c6', fontSize: 11, textTransform: 'uppercase' }}>
        Databases ({databases.length})
      </Text>
      <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
        <Tooltip title="Refresh">
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined spin={loading} />}
            onClick={(e) => { e.stopPropagation(); refreshDatabases(); }}
            style={{ color: '#808080', padding: '2px 4px', height: 20 }}
          />
        </Tooltip>
        <Tooltip title="Add Database">
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={(e) => { e.stopPropagation(); setModalOpen(true); }}
            style={{ color: '#6a8759', padding: '2px 4px', height: 20 }}
          />
        </Tooltip>
      </div>
    </div>
  );

  // Custom panel header for Schema
  const schemaHeader = (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      width: '100%',
    }}>
      <Text strong style={{ color: '#a9b7c6', fontSize: 11, textTransform: 'uppercase' }}>
        Schema {metadata ? `(${metadata.length} tables)` : ''}
      </Text>
      {onRefreshMetadata && (
        <div onClick={e => e.stopPropagation()}>
          <Tooltip title="Refresh Schema">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined spin={metadataLoading} />}
              onClick={(e) => { e.stopPropagation(); onRefreshMetadata(); }}
              style={{ color: '#808080', padding: '2px 4px', height: 20 }}
            />
          </Tooltip>
        </div>
      )}
    </div>
  );

  const collapseItems = [
    {
      key: 'databases',
      label: databasesHeader,
      children: (
        <div style={{ 
          maxHeight: 200, 
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <Spin size="small" />
            </div>
          ) : databases.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                No databases
              </Text>
              <br />
              <Button 
                type="link" 
                size="small" 
                onClick={() => setModalOpen(true)}
                style={{ fontSize: 12, padding: 0 }}
              >
                Add one
              </Button>
            </div>
          ) : (
            databases.map(db => (
              <div
                key={db.name}
                onClick={() => setSelectedDatabase(db.name)}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  background: selectedDatabase === db.name ? '#4e5254' : 'transparent',
                  borderLeft: selectedDatabase === db.name ? '2px solid #589df6' : '2px solid transparent',
                }}
                onMouseEnter={e => {
                  if (selectedDatabase !== db.name) {
                    e.currentTarget.style.background = '#45494a';
                  }
                }}
                onMouseLeave={e => {
                  if (selectedDatabase !== db.name) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6, 
                  overflow: 'hidden', 
                  flex: 1,
                  minWidth: 0,
                }}>
                  <DatabaseOutlined style={{ 
                    color: selectedDatabase === db.name ? '#589df6' : '#6897bb',
                    flexShrink: 0,
                    fontSize: 12,
                  }} />
                  <Text 
                    ellipsis={{ tooltip: db.name }}
                    style={{ 
                      color: selectedDatabase === db.name ? '#fff' : '#a9b7c6',
                      fontSize: 12,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {db.name}
                  </Text>
                </div>
                <Popconfirm
                  title="Delete connection?"
                  description={`Remove "${db.name}"?`}
                  onConfirm={(e) => handleDelete(db.name, e as unknown as React.MouseEvent)}
                  onCancel={(e) => e?.stopPropagation()}
                  okText="Yes"
                  cancelText="No"
                  placement="right"
                >
                  <Button
                    type="text"
                    size="small"
                    loading={deleting === db.name}
                    icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                      color: '#808080', 
                      padding: '2px 4px',
                      opacity: 0.5,
                      height: 20,
                      minWidth: 20,
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                  />
                </Popconfirm>
              </div>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'schema',
      label: schemaHeader,
      children: (
        <div style={{ 
          overflowY: 'auto', 
          overflowX: 'hidden',
          maxHeight: 'calc(100vh - 300px)',
        }}>
          {!selectedDatabase ? (
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Select a database first
              </Text>
            </div>
          ) : metadataLoading ? (
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <Spin size="small" />
              <br />
              <Text type="secondary" style={{ fontSize: 11, marginTop: 8 }}>
                Loading...
              </Text>
            </div>
          ) : metadata && metadata.length > 0 ? (
            <Tree
              showIcon
              defaultExpandAll
              treeData={buildMetadataTree()}
              onSelect={handleTreeSelect}
              style={{ 
                background: 'transparent',
                fontSize: 12,
                padding: '4px 0',
              }}
            />
          ) : (
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                No tables found
              </Text>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#3c3f41',
      overflow: 'hidden',
      width: '100%',
      minWidth: 0,
    }}>
      <Collapse
        activeKey={activeKeys}
        onChange={(keys) => setActiveKeys(keys as string[])}
        bordered={false}
        expandIcon={({ isActive }) => 
          isActive ? <DownOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />
        }
        style={{ 
          background: 'transparent',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        items={collapseItems}
      />

      {/* Fixed hint at bottom */}
      {selectedDatabase && metadata && metadata.length > 0 && (
        <div style={{ 
          padding: '8px 12px',
          borderTop: '1px solid #323232',
          background: '#313335',
          flexShrink: 0,
        }}>
          <Text type="secondary" style={{ fontSize: 10 }}>
            💡 Click table to generate SELECT
          </Text>
        </div>
      )}

      {/* Add Database Modal */}
      <AddDatabaseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
};
