import React, { useState, useCallback, useMemo } from 'react';
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
import { TableSearchInput } from './TableSearchInput';

// Database type configuration
const DB_TYPE_CONFIG = {
  postgresql: {
    icon: <DatabaseOutlined style={{ color: '#336791' }} />,
    label: 'PostgreSQL',
    bgColor: '#336791',
  },
  mysql: {
    icon: <DatabaseOutlined style={{ color: '#4479A1' }} />,
    label: 'MySQL',
    bgColor: '#4479A1',
  },
} as const;

// Helper to get database type info
const getDbTypeInfo = (dbType: string | undefined) => {
  return DB_TYPE_CONFIG[dbType as keyof typeof DB_TYPE_CONFIG] || DB_TYPE_CONFIG.postgresql;
};

interface DatabaseSidebarProps {
  metadata: TableMetadata[] | null;
  metadataLoading: boolean;
  onTableSelect?: (schemaName: string, tableName: string) => void;
  onRefreshMetadata?: () => void;
}

const { Text } = Typography;

// Comment display component - inline with word wrap when needed
const CommentText: React.FC<{ comment: string | undefined | null }> = ({ comment }) => {
  if (!comment) return null;
  
  return (
    <span style={{ 
      color: '#808080', 
      fontSize: 10, 
      fontStyle: 'italic',
      marginLeft: 6,
      whiteSpace: 'normal',
      wordBreak: 'break-word',
    }}>
      {comment}
    </span>
  );
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTables, setFilteredTables] = useState<TableMetadata[] | null>(null);

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

  // Handle search input
  const handleSearch = useCallback((query: string, results: TableMetadata[]) => {
    setSearchQuery(query);
    setFilteredTables(results);
  }, []);

  // Get tables to display (filtered or original)
  const displayTables = useMemo(() => {
    if (searchQuery && filteredTables) {
      return filteredTables;
    }
    return metadata;
  }, [searchQuery, filteredTables, metadata]);

  // Calculate table count for display
  const tableCount = useMemo(() => {
    if (!displayTables) return 0;
    return displayTables.length;
  }, [displayTables]);

  // Calculate original table count
  const originalTableCount = useMemo(() => {
    return metadata?.length || 0;
  }, [metadata]);

  // Build tree data for metadata with columns
  const buildMetadataTree = (): DataNode[] => {
    if (!displayTables || displayTables.length === 0) return [];

    // Group by schema
    const schemaMap = new Map<string, TableMetadata[]>();
    displayTables.forEach(table => {
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
          <div style={{ color: '#a9b7c6', fontSize: 12, whiteSpace: 'normal', wordBreak: 'break-word', padding: '2px 0' }}>
            {table.tableName}
            <span style={{ color: '#666', marginLeft: 4, fontSize: 10 }}>
              ({table.columns?.length || 0} cols)
            </span>
            <CommentText comment={table.comment} />
          </div>
        ),
        icon: table.tableType === 'view' 
          ? <EyeOutlined style={{ color: '#cc7832' }} />
          : <TableOutlined style={{ color: '#6a8759' }} />,
        // Add columns as children
        children: (table.columns || []).map(column => ({
          key: `column-${schema}-${table.tableName}-${column.name}`,
          title: (
            <div style={{ fontSize: 11, color: '#a9b7c6', whiteSpace: 'normal', wordBreak: 'break-word', padding: '1px 0' }}>
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
              <CommentText comment={column.comment} />
            </div>
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
        Schema {searchQuery
          ? `(${tableCount} of ${originalTableCount})`
          : metadata ? `(${metadata.length} tables)` : ''}
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
                  {/* Database type indicator with color */}
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: getDbTypeInfo(db.dbType).bgColor,
                      flexShrink: 0,
                    }}
                    title={getDbTypeInfo(db.dbType).label}
                  />
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
                  {/* Database type badge */}
                  <span
                    style={{
                      fontSize: 9,
                      color: getDbTypeInfo(db.dbType).bgColor,
                      background: 'rgba(255,255,255,0.1)',
                      padding: '1px 4px',
                      borderRadius: 3,
                      flexShrink: 0,
                    }}
                  >
                    {getDbTypeInfo(db.dbType).label.toUpperCase()}
                  </span>
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
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flex: 1,
        }}>
          {/* Search input */}
          {selectedDatabase && metadata && metadata.length > 0 && (
            <TableSearchInput
              tables={metadata}
              onSearch={handleSearch}
              placeholder="Search tables..."
            />
          )}

          {/* Table tree */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
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
            ) : searchQuery && tableCount === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  No tables found for "{searchQuery}"
                </Text>
              </div>
            ) : displayTables && tableCount > 0 ? (
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
      <style>{`
        .ant-collapse {
          display: flex !important;
          flex-direction: column !important;
          height: 100% !important;
          border-radius: 0 !important;
          background: transparent !important;
        }
        .ant-collapse-item {
          display: flex !important;
          flex-direction: column !important;
          border-bottom: 1px solid #323232 !important;
        }
        /* Schema panel (the second item) should fill space when active */
        .ant-collapse-item-active:last-child {
          flex: 1 !important;
          min-height: 0;
        }
        .ant-collapse-item:not(.ant-collapse-item-active) {
          flex: 0 0 auto !important;
        }
        .ant-collapse-header {
          flex-shrink: 0 !important;
          background: #3c3f41 !important;
          padding: 8px 12px !important;
          cursor: pointer !important;
        }
        .ant-tree-node-content-wrapper {
          white-space: normal !important;
          height: auto !important;
          min-height: 24px;
          display: flex !important;
          align-items: flex-start !important;
          padding-top: 2px !important;
          padding-bottom: 2px !important;
          cursor: pointer !important;
        }
        .ant-tree-title {
          width: 100%;
        }
        .ant-tree-indent-unit {
          width: 12px !important;
        }
        .ant-collapse-content {
          background: transparent !important;
          overflow: hidden !important;
        }
        .ant-collapse-item-active > .ant-collapse-content {
          flex: 1 !important;
          display: flex !important;
          flex-direction: column !important;
        }
        .ant-collapse-content-box {
          flex: 1 !important;
          display: flex !important;
          flex-direction: column !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
      `}</style>
      <Collapse
        activeKey={activeKeys}
        onChange={(keys) => setActiveKeys(keys as string[])}
        bordered={false}
        expandIcon={({ isActive }) => 
          isActive ? <DownOutlined style={{ fontSize: 10, color: '#909090' }} /> : <RightOutlined style={{ fontSize: 10, color: '#909090' }} />
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
      {selectedDatabase && displayTables && tableCount > 0 && (
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid #323232',
          background: '#313335',
          flexShrink: 0,
        }}>
          <Text type="secondary" style={{ fontSize: 10 }}>
            {searchQuery ? `Showing ${tableCount} of ${originalTableCount} tables` : '💡 Click table to generate SELECT'}
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
