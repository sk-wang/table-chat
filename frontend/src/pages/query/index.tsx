import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Alert, Tabs, Layout, App } from 'antd';
import { CodeOutlined, RobotOutlined, HistoryOutlined, TableOutlined } from '@ant-design/icons';
import { SqlEditor } from '../../components/editor/SqlEditor';
import { QueryToolbar } from '../../components/editor/QueryToolbar';
import { QueryResultTable } from '../../components/results/QueryResultTable';
import { NaturalLanguageInput } from '../../components/editor/NaturalLanguageInput';
import { AgentSidebar } from '../../components/agent';
import { DatabaseSidebar } from '../../components/sidebar/DatabaseSidebar';
import { ResizableSplitPane } from '../../components/layout/ResizableSplitPane';
import { QueryHistoryTab } from '../../components/history';
import { ExportButton } from '../../components/export';
import { useDatabase } from '../../contexts/DatabaseContext';
import { apiClient } from '../../services/api';
import {
  getTableListCache,
  setTableListCache,
  getTableDetailsCache,
  setTableDetailsCache,
  clearTableDetailsCache,
} from '../../services/storage';
import type { QueryResult } from '../../types';
import type { TableMetadata, TableSummary } from '../../types/metadata';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

type QueryMode = 'sql' | 'natural';

export const QueryPage: React.FC = () => {
  // Ant Design App context for message API
  const { message } = App.useApp();
  
  // Use global database context
  const { databases, selectedDatabase, loading: loadingDatabases } = useDatabase();
  
  // Metadata state - use table summaries initially, load details on demand
  const [tableSummaries, setTableSummaries] = useState<TableSummary[] | null>(null);
  const [tableDetails, setTableDetails] = useState<Map<string, TableMetadata>>(new Map());
  const [metadataLoading, setMetadataLoading] = useState(false);
  
  // Convert to TableMetadata[] for backward compatibility
  const metadata: TableMetadata[] | null = tableSummaries
    ? tableSummaries.map(summary => {
        const key = `${summary.schemaName}.${summary.tableName}`;
        const details = tableDetails.get(key);
        return details || {
          ...summary,
          columns: [],
        };
      })
    : null;
  
  // Query state
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM ');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | undefined>();
  const [executing, setExecuting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryMode, setQueryMode] = useState<QueryMode>('sql');
  const [llmUnavailable, setLlmUnavailable] = useState(false);
  const [generatedExplanation, setGeneratedExplanation] = useState<string | null>(null);
  
  // Bottom panel state
  const [bottomPanelTab, setBottomPanelTab] = useState<'results' | 'history'>('results');
  const [lastNaturalQuery, setLastNaturalQuery] = useState<string | null>(null);
  // Counter to trigger history refresh after query execution
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Load table list when database changes (without column details)
  //优先使用缓存，API 作为回退 (T011, T012)
  useEffect(() => {
    if (!selectedDatabase) {
      setTableSummaries(null);
      setTableDetails(new Map());
      return;
    }

    const loadTableList = async (forceRefresh: boolean = false) => {
      // Try cache first unless force refresh (T011)
      if (!forceRefresh) {
        const cached = getTableListCache(selectedDatabase);
        if (cached) {
          console.log('[Cache] Table list hit for', selectedDatabase);
          setTableSummaries(cached.tables);
          setMetadataLoading(false);
          return;
        }
        console.log('[Cache] Table list miss for', selectedDatabase);
      }

      try {
        setMetadataLoading(true);
        const response = await apiClient.getTableList(selectedDatabase, forceRefresh);
        const tables = response.tables || [];

        // Update cache after successful API call (T012)
        setTableListCache(selectedDatabase, tables);

        setTableSummaries(tables);
        setTableDetails(new Map()); // Clear previous details
      } catch (err) {
        console.error('Failed to load table list:', err);
        setTableSummaries([]);
      } finally {
        setMetadataLoading(false);
      }
    };

    loadTableList();
  }, [selectedDatabase]);

  // Load table details on demand - 优先使用缓存 (T015, T016)
  const loadTableDetails = useCallback(async (schemaName: string, tableName: string) => {
    if (!selectedDatabase) return;

    const key = `${schemaName}.${tableName}`;
    // Skip if already loaded in memory
    if (tableDetails.has(key)) return;

    // Try cache first (T015)
    const cached = getTableDetailsCache(selectedDatabase, key);
    if (cached) {
      console.log('[Cache] Table details hit for', key);
      const details: TableMetadata = {
        schemaName,
        tableName,
        tableType: 'table',
        columns: cached.columns.map(c => ({
          name: c.name,
          dataType: c.type,
          isNullable: c.nullable,
          isPrimaryKey: c.isPrimaryKey,
          comment: c.comment,
        })),
      };
      setTableDetails(prev => new Map(prev).set(key, details));
      return;
    }
    console.log('[Cache] Table details miss for', key);

    try {
      const details = await apiClient.getTableDetails(selectedDatabase, schemaName, tableName);

      // Update cache after successful API call (T016)
      setTableDetailsCache(selectedDatabase, key, details.columns.map(c => ({
        name: c.name,
        type: c.dataType,
        nullable: c.isNullable,
        isPrimaryKey: c.isPrimaryKey,
        comment: c.comment,
      })));

      setTableDetails(prev => new Map(prev).set(key, details));
    } catch (err) {
      console.error(`Failed to load table details for ${key}:`, err);
    }
  }, [selectedDatabase, tableDetails]);

  const handleRefreshMetadata = async () => {
    if (!selectedDatabase) return;

    try {
      setMetadataLoading(true);
      const response = await apiClient.getTableList(selectedDatabase, true);
      const tables = response.tables || [];

      // Update cache after force refresh (T013)
      setTableListCache(selectedDatabase, tables);

      // Clear table details cache on force refresh (T017)
      clearTableDetailsCache(selectedDatabase);

      setTableSummaries(tables);
      setTableDetails(new Map());
      message.success('Schema refreshed');
    } catch {
      message.error('Failed to refresh schema');
    } finally {
      setMetadataLoading(false);
    }
  };

  const handleTableSelect = (schemaName: string, tableName: string) => {
    const sql = `SELECT * FROM ${schemaName}.${tableName} LIMIT 100`;
    setSqlQuery(sql);
    setQueryMode('sql');
    message.info(`Generated SELECT for ${tableName}`);
    // Also load table details for column comments
    loadTableDetails(schemaName, tableName);
  };

  // Get default schema for current database
  // For PostgreSQL: 'public', for MySQL: the database name (first schema from tableSummaries)
  const getDefaultSchema = (): string => {
    // Get current database info
    const currentDb = databases.find(db => db.name === selectedDatabase);
    
    if (currentDb?.dbType === 'mysql') {
      // For MySQL, get schema from loaded table summaries
      if (tableSummaries && tableSummaries.length > 0) {
        return tableSummaries[0].schemaName;
      }
      // Fallback: if no tables loaded yet, return empty string (will try to match anyway)
      return '';
    }
    
    // Default for PostgreSQL
    return 'public';
  };

  // Extract table names from SQL for loading metadata
  const extractTablesFromSQL = (sql: string): Array<{schema: string, table: string}> => {
    const tables: Array<{schema: string, table: string}> = [];
    const defaultSchema = getDefaultSchema();
    
    // Match patterns like: FROM schema.table, JOIN schema.table, FROM table, JOIN table
    // Also handle MySQL backtick syntax: FROM `schema`.`table`, FROM `table`
    const patterns = [
      /\bFROM\s+[`"']?(\w+)[`"']?\.[`"']?(\w+)[`"']?/gi,
      /\bJOIN\s+[`"']?(\w+)[`"']?\.[`"']?(\w+)[`"']?/gi,
      /\bFROM\s+[`"']?(\w+)[`"']?(?:\s|$|,|\))/gi,
      /\bJOIN\s+[`"']?(\w+)[`"']?(?:\s|$|,|\))/gi,
    ];
    
    // Match schema.table patterns
    for (const pattern of patterns.slice(0, 2)) {
      let match;
      while ((match = pattern.exec(sql)) !== null) {
        tables.push({ schema: match[1], table: match[2] });
      }
    }
    
    // Match single table patterns (use detected default schema)
    for (const pattern of patterns.slice(2)) {
      let match;
      while ((match = pattern.exec(sql)) !== null) {
        // Skip SQL keywords
        const tableName = match[1].toLowerCase();
        if (!['select', 'where', 'order', 'group', 'having', 'limit', 'offset', 'union', 'inner', 'left', 'right', 'outer', 'cross', 'on', 'and', 'or'].includes(tableName)) {
          tables.push({ schema: defaultSchema, table: match[1] });
        }
      }
    }
    
    // Deduplicate
    const seen = new Set<string>();
    return tables.filter(t => {
      const key = `${t.schema}.${t.table}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const handleExecute = async () => {
    if (!selectedDatabase || !sqlQuery.trim()) {
      return;
    }

    try {
      setExecuting(true);
      setError(null);
      setResult(null);
      setGeneratedExplanation(null);

      // Load metadata for tables in the query (for column comments)
      const tables = extractTablesFromSQL(sqlQuery);
      await Promise.all(
        tables.map(t => loadTableDetails(t.schema, t.table))
      );

      // Pass natural query if this SQL was generated from NL
      const response = await apiClient.executeQuery(selectedDatabase, { 
        sql: sqlQuery,
        naturalQuery: lastNaturalQuery ?? undefined,
      });

      setResult(response.result);
      setExecutionTimeMs(response.executionTimeMs);
      // Update SQL in editor to show the actually executed SQL (with LIMIT if added)
      if (response.sql !== sqlQuery) {
        setSqlQuery(response.sql);
      }
      
      // Clear natural query after execution (only record once)
      setLastNaturalQuery(null);
      
      // Trigger history refresh
      setHistoryRefreshKey(prev => prev + 1);
      
      // Check if there's a pending export format
      const pendingExport = sessionStorage.getItem('pendingExportFormat');
      if (pendingExport && response.result.rows.length > 0) {
        // Clear the pending export
        sessionStorage.removeItem('pendingExportFormat');
        
        // Trigger export using the ExportButton functionality
        const { exportQueryResult } = await import('../../components/export');
        try {
          await exportQueryResult(
            selectedDatabase,
            pendingExport as 'csv' | 'json' | 'xlsx',
            response.result.columns,
            response.result.rows
          );
          message.success(`已自动导出为 ${pendingExport.toUpperCase()}`);
        } catch (exportError) {
          message.error(`自动导出失败: ${exportError instanceof Error ? exportError.message : '未知错误'}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query execution failed');
      setResult(null);
    } finally {
      setExecuting(false);
    }
  };

  const handleClear = () => {
    setSqlQuery('');
    setResult(null);
    setError(null);
    setExecutionTimeMs(undefined);
    setGeneratedExplanation(null);
  };

  const handleGenerateSQL = async (prompt: string) => {
    if (!selectedDatabase) {
      message.error('请先选择数据库');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setGeneratedExplanation(null);

      const response = await apiClient.naturalLanguageQuery(selectedDatabase, { prompt });

      // Set the generated SQL in the editor
      setSqlQuery(response.generatedSql);
      
      // Store the natural language prompt for history recording
      setLastNaturalQuery(prompt);
      
      // Store explanation
      if (response.explanation) {
        setGeneratedExplanation(response.explanation);
      }

      // Switch to SQL tab to show the generated query
      setQueryMode('sql');
      
      // Check if export format was detected
      if (response.exportFormat) {
        message.success(`SQL 生成成功！检测到导出意图，将在执行后自动导出为 ${response.exportFormat.toUpperCase()}`);
        
        // Store export format for auto-export after execution
        // We'll use a ref or state to track this
        sessionStorage.setItem('pendingExportFormat', response.exportFormat);
      } else {
      message.success('SQL 生成成功！您可以检查并执行生成的查询。');
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'SQL generation failed';
      
      // Check if LLM is unavailable
      if (errorMsg.includes('LLM') || errorMsg.includes('503') || errorMsg.includes('not configured')) {
        setLlmUnavailable(true);
      }
      
      setError(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  // Handle selecting a history item
  const handleSelectHistory = (sql: string, naturalQuery?: string | null) => {
    setSqlQuery(sql);
    setLastNaturalQuery(naturalQuery ?? null);
    setQueryMode('sql');
    // Switch to results tab to prepare for execution
    setBottomPanelTab('results');
    message.info('SQL 已复制到编辑器');
  };

  // Handle SQL generated from Agent sidebar
  const handleAgentSQLGenerated = useCallback((sql: string) => {
    setSqlQuery(sql);
    setQueryMode('sql');
    message.success('SQL 已复制到编辑器');
  }, [message]);

  // Show welcome message if no databases
  if (!loadingDatabases && databases.length === 0) {
    return (
      <Layout style={{ height: '100%', background: 'transparent' }}>
        <Sider
          width={280}
          style={{
            background: '#3c3f41',
            borderRight: '1px solid #323232',
            overflow: 'hidden',
          }}
        >
          <DatabaseSidebar
            metadata={null}
            metadataLoading={false}
          />
        </Sider>
        <Content style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#2b2b2b',
        }}>
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Title level={3} style={{ color: '#a9b7c6' }}>
              Welcome to TableChat
            </Title>
            <Text style={{ color: '#808080', fontSize: 14 }}>
              Add a database connection in the sidebar to get started.
            </Text>
          </div>
        </Content>
      </Layout>
    );
  }

  const tabItems = [
    {
      key: 'sql',
      label: (
        <span>
          <CodeOutlined /> SQL 编辑器
        </span>
      ),
      children: (
        <div style={{ marginBottom: 16 }}>
          <SqlEditor
            value={sqlQuery}
            onChange={setSqlQuery}
            onExecute={handleExecute}
          />
        </div>
      ),
    },
    {
      key: 'natural',
      label: (
        <span>
          <RobotOutlined /> 自然语言
        </span>
      ),
      children: (
        <NaturalLanguageInput
          onGenerate={handleGenerateSQL}
          loading={generating}
          disabled={!selectedDatabase}
          llmUnavailable={llmUnavailable}
        />
      ),
    },
  ];

  const bottomTabItems = [
    {
      key: 'results',
      label: (
        <span>
          <TableOutlined /> 查询结果
        </span>
      ),
      children: (
        <div style={{ flex: 1, height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* 导出按钮工具栏 */}
          {result && result.rows && result.rows.length > 0 && (
            <div style={{ padding: '8px 16px', borderBottom: '1px solid #323232', display: 'flex', justifyContent: 'flex-end' }}>
              <ExportButton
                result={result}
                dbName={selectedDatabase || 'unknown'}
                disabled={executing}
              />
            </div>
          )}
          {/* 查询结果表格 */}
          <div style={{ flex: 1, overflow: 'auto' }}>
          <QueryResultTable
            result={result}
            executionTimeMs={executionTimeMs}
            loading={executing}
            metadata={metadata}
          />
          </div>
        </div>
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined /> 执行历史
        </span>
      ),
      forceRender: true, // 关键：提前渲染并加载数据，避免首次切换闪烁
      children: (
        <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          {selectedDatabase && (
            <QueryHistoryTab
              dbName={selectedDatabase}
              onSelectHistory={handleSelectHistory}
              refreshTrigger={historyRefreshKey}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <Layout style={{ height: '100%', background: 'transparent' }}>
      {/* Database & Schema Sidebar */}
      <Sider
        width={280}
        style={{
          background: '#3c3f41',
          borderRight: '1px solid #323232',
          overflow: 'hidden',
        }}
      >
        <DatabaseSidebar
          metadata={metadata}
          metadataLoading={metadataLoading}
          onTableSelect={handleTableSelect}
          onRefreshMetadata={handleRefreshMetadata}
          onLoadTableDetails={loadTableDetails}
        />
      </Sider>

      {/* Main Query Area */}
      <Content style={{ 
        padding: 16, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        background: '#2b2b2b',
      }}>
        {/* Toolbar */}
        <QueryToolbar
          databases={databases}
          selectedDatabase={selectedDatabase}
          onExecute={handleExecute}
          onClear={handleClear}
          executing={executing}
          showDatabaseSelector={false}
        />

        {/* Resizable Split Pane - Editor on top, Results on bottom */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ResizableSplitPane
            topPanel={
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Editor Tabs */}
                <Tabs
                  activeKey={queryMode}
                  onChange={(key) => setQueryMode(key as QueryMode)}
                  items={tabItems}
                  style={{ marginBottom: 8 }}
                />

                {/* Show generated explanation if available */}
                {generatedExplanation && queryMode === 'sql' && (
                  <Alert
                    message="AI 生成的 SQL"
                    description={
                      <div>
                        <Text style={{ color: '#a9b7c6' }}>{generatedExplanation}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          请检查生成的查询，确认无误后点击"Execute"执行
                        </Text>
                      </div>
                    }
                    type="info"
                    showIcon
                    icon={<RobotOutlined />}
                    closable
                    onClose={() => setGeneratedExplanation(null)}
                    style={{ marginBottom: 12, background: '#2d3436', borderColor: '#80CBC4' }}
                  />
                )}

                {error && (
                  <Alert
                    message="Query Error"
                    description={error}
                    type="error"
                    showIcon
                    closable
                    onClose={() => setError(null)}
                    style={{ marginBottom: 12 }}
                  />
                )}
              </div>
            }
            bottomPanel={
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Tabs
                  activeKey={bottomPanelTab}
                  onChange={(key) => setBottomPanelTab(key as 'results' | 'history')}
                  size="small"
                  style={{ height: '100%' }}
                  tabBarStyle={{ marginBottom: 0 }}
                  items={bottomTabItems}
                />
              </div>
            }
            defaultRatio={0.4}
            minTopHeight={100}
            minBottomHeight={100}
            storageKey="tablechat_query_panel_ratio"
          />
        </div>
      </Content>

      {/* Agent Sidebar - Right side */}
      <AgentSidebar
        dbName={selectedDatabase || ''}
        disabled={!selectedDatabase}
        onSQLGenerated={handleAgentSQLGenerated}
      />
    </Layout>
  );
};
