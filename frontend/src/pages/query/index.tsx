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

  // Debug: Log selectedDatabase changes
  useEffect(() => {
    console.log('[QueryPage] selectedDatabase changed:', selectedDatabase);
    console.log('[QueryPage] databases:', databases);
  }, [selectedDatabase, databases]);

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
  const [formatting, setFormatting] = useState(false);
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

  const handleExecute = async (sqlToExecute?: string) => {
    console.log('[QueryPage] handleExecute called with:', sqlToExecute);

    const actualSql = sqlToExecute || sqlQuery;
    console.log('[QueryPage] Actual SQL to execute:', actualSql);

    if (!selectedDatabase) {
      console.warn('[QueryPage] Cannot execute: no database selected');
      message.warning('请先选择一个数据库！');
      return;
    }

    if (!actualSql.trim()) {
      console.warn('[QueryPage] Cannot execute: empty SQL');
      message.warning('请输入SQL语句！');
      return;
    }

    try {
      setExecuting(true);
      setError(null);
      setResult(null);
      setGeneratedExplanation(null);

      console.log('[QueryPage] Executing query on database:', selectedDatabase);

      // Load metadata for tables in the query (for column comments)
      const tables = extractTablesFromSQL(actualSql);
      await Promise.all(
        tables.map(t => loadTableDetails(t.schema, t.table))
      );

      // Pass natural query if this SQL was generated from NL
      const response = await apiClient.executeQuery(selectedDatabase, {
        sql: actualSql,
        naturalQuery: lastNaturalQuery ?? undefined,
      });

      console.log('[QueryPage] Query executed successfully:', response);

      setResult(response.result);
      setExecutionTimeMs(response.executionTimeMs);
      // Update SQL in editor to show the actually executed SQL (with LIMIT if added)
      // Only update if we executed the full sqlQuery, not a single statement
      if (!sqlToExecute && response.sql !== actualSql) {
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
          message.success(`Auto-exported as ${pendingExport.toUpperCase()}`);
        } catch (exportError) {
          message.error(`Auto-export failed: ${exportError instanceof Error ? exportError.message : 'Unknown error'}`);
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

  const handleFormat = async () => {
    if (!sqlQuery.trim()) {
      return;
    }

    try {
      setFormatting(true);
      const currentDb = databases.find(db => db.name === selectedDatabase);
      const dialect = currentDb?.dbType === 'mysql' ? 'mysql' : 'postgres';
      const formatted = await apiClient.formatSql(sqlQuery, dialect);
      setSqlQuery(formatted);
      message.success('SQL formatted successfully');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to format SQL');
    } finally {
      setFormatting(false);
    }
  };

  const handleGenerateSQL = async (prompt: string) => {
    if (!selectedDatabase) {
      message.error('Please select a database first');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setGeneratedExplanation(null);

      const response = await apiClient.naturalLanguageQuery(selectedDatabase, { prompt });

      // Add the generated SQL at the beginning, don't overwrite existing SQL
      const newSql = sqlQuery.trim()
        ? `${response.generatedSql}\n\n${sqlQuery}`
        : response.generatedSql;
      setSqlQuery(newSql);
      
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
        message.success(`SQL generated successfully! Export intent detected, will auto-export as ${response.exportFormat.toUpperCase()}`);
        
        // Store export format for auto-export after execution
        // We'll use a ref or state to track this
        sessionStorage.setItem('pendingExportFormat', response.exportFormat);
      } else {
      message.success('SQL generated successfully! You can review and execute the generated query.');
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
    message.info('SQL copied to editor');
  };

  // Handle SQL generated from Agent sidebar
  const handleAgentSQLGenerated = useCallback((sql: string) => {
    setSqlQuery(sql);
    setQueryMode('sql');
    message.success('SQL copied to editor');
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
          <CodeOutlined /> SQL Editor
        </span>
      ),
      children: (
        <div style={{ marginBottom: 16 }}>
          <SqlEditor
            value={sqlQuery}
            onChange={setSqlQuery}
            onExecuteStatement={handleExecute}
            onFormat={handleFormat}
          />
        </div>
      ),
    },
    {
      key: 'natural',
      label: (
        <span>
          <RobotOutlined /> Natural Language
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
          <TableOutlined /> Query Results
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
          <HistoryOutlined /> Execution History
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
          onFormat={handleFormat}
          sql={sqlQuery}
          executing={executing}
          formatting={formatting}
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
                    message="AI Generated SQL"
                    description={
                      <div>
                        <Text style={{ color: '#a9b7c6' }}>{generatedExplanation}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Please review the generated query and click "Execute" when ready
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
