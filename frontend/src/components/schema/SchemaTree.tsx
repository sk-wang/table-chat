import React, { useState, useEffect } from 'react';
import { Tree, Spin, Alert, Button, Tooltip, Empty } from 'antd';
import {
  TableOutlined,
  EyeOutlined,
  KeyOutlined,
  ReloadOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { apiClient } from '../../services/api';
import type { DatabaseMetadata, TableMetadata, ColumnInfo } from '../../types/metadata';

interface SchemaTreeProps {
  databaseName: string | null;
  onTableSelect?: (schemaName: string, tableName: string) => void;
  onGenerateSelect?: (sql: string) => void;
}

export const SchemaTree: React.FC<SchemaTreeProps> = ({
  databaseName,
  onTableSelect,
  onGenerateSelect,
}) => {
  const [metadata, setMetadata] = useState<DatabaseMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    if (databaseName) {
      loadMetadata();
    } else {
      setMetadata(null);
    }
  }, [databaseName]);

  const loadMetadata = async (forceRefresh = false) => {
    if (!databaseName) return;

    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await apiClient.getDatabaseMetadata(databaseName, forceRefresh);
      setMetadata(data);

      // Auto-expand first schema
      if (data.schemas.length > 0) {
        setExpandedKeys([`schema-${data.schemas[0]}`]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metadata');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadMetadata(true);
  };

  const handleTableClick = (table: TableMetadata) => {
    if (onTableSelect) {
      onTableSelect(table.schemaName, table.tableName);
    }
  };

  const handleGenerateSelectClick = (table: TableMetadata) => {
    const columns = table.columns.map(c => c.name).join(', ');
    const sql = `SELECT ${columns}\nFROM ${table.schemaName}.${table.tableName}\nLIMIT 100`;
    
    if (onGenerateSelect) {
      onGenerateSelect(sql);
    }
  };

  const getColumnIcon = (column: ColumnInfo) => {
    if (column.isPrimaryKey) {
      return <KeyOutlined style={{ color: '#faad14' }} />;
    }
    return null;
  };

  const buildTreeData = (): DataNode[] => {
    if (!metadata) return [];

    // Group tables by schema
    const tablesBySchema: Record<string, TableMetadata[]> = {};
    for (const table of metadata.tables) {
      if (!tablesBySchema[table.schemaName]) {
        tablesBySchema[table.schemaName] = [];
      }
      tablesBySchema[table.schemaName].push(table);
    }

    return metadata.schemas.map(schema => ({
      key: `schema-${schema}`,
      title: (
        <span style={{ fontWeight: 600 }}>
          <DatabaseOutlined style={{ marginRight: 4 }} />
          {schema}
        </span>
      ),
      children: (tablesBySchema[schema] || []).map(table => ({
        key: `table-${schema}.${table.tableName}`,
        title: (
          <Tooltip title={`Double-click to generate SELECT`}>
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => handleTableClick(table)}
              onDoubleClick={() => handleGenerateSelectClick(table)}
            >
              {table.tableType === 'view' ? (
                <EyeOutlined style={{ marginRight: 4, color: '#1890ff' }} />
              ) : (
                <TableOutlined style={{ marginRight: 4, color: '#52c41a' }} />
              )}
              {table.tableName}
              <span style={{ color: '#666', marginLeft: 4 }}>
                ({table.columns.length} cols)
              </span>
            </span>
          </Tooltip>
        ),
        children: table.columns.map(column => ({
          key: `column-${schema}.${table.tableName}.${column.name}`,
          title: (
            <span style={{ fontSize: 12 }}>
              {getColumnIcon(column)}
              <span style={{ marginLeft: column.isPrimaryKey ? 4 : 0 }}>
                {column.name}
              </span>
              <span style={{ color: '#888', marginLeft: 4 }}>
                {column.dataType}
                {!column.isNullable && ' NOT NULL'}
              </span>
            </span>
          ),
          isLeaf: true,
        })),
      })),
    }));
  };

  if (!databaseName) {
    return (
      <Empty
        description="Select a database to view schema"
        style={{ padding: 24, color: '#808080' }}
      />
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <Spin size="small" />
        <div style={{ marginTop: 8, color: '#808080' }}>Loading schema...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => loadMetadata()}>
            Retry
          </Button>
        }
        style={{ margin: 8 }}
      />
    );
  }

  const treeData = buildTreeData();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid #3c3f41',
        background: '#2b2b2b',
      }}>
        <span style={{ fontWeight: 600, color: '#a9b7c6' }}>Schema Browser</span>
        <Tooltip title="Refresh metadata">
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={handleRefresh}
            loading={refreshing}
            style={{ color: '#808080' }}
          />
        </Tooltip>
      </div>

      {treeData.length === 0 ? (
        <Empty
          description="No tables found"
          style={{ padding: 24, color: '#808080' }}
        />
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          <Tree
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys)}
            showLine={{ showLeafIcon: false }}
            style={{ background: 'transparent', color: '#a9b7c6' }}
          />
        </div>
      )}

      {metadata?.lastRefreshed && (
        <div style={{ 
          padding: '4px 12px', 
          fontSize: 11, 
          color: '#666',
          borderTop: '1px solid #3c3f41',
        }}>
          Last updated: {new Date(metadata.lastRefreshed).toLocaleString()}
        </div>
      )}
    </div>
  );
};

