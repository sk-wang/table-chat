import React, { useState, useEffect } from 'react';
import { Typography, Alert, Tabs, message, Layout } from 'antd';
import { CodeOutlined, RobotOutlined } from '@ant-design/icons';
import { SqlEditor } from '../../components/editor/SqlEditor';
import { QueryToolbar } from '../../components/editor/QueryToolbar';
import { QueryResultTable } from '../../components/results/QueryResultTable';
import { NaturalLanguageInput } from '../../components/editor/NaturalLanguageInput';
import { DatabaseSidebar } from '../../components/sidebar/DatabaseSidebar';
import { useDatabase } from '../../contexts/DatabaseContext';
import { apiClient } from '../../services/api';
import type { QueryResult } from '../../types';
import type { TableMetadata } from '../../types/metadata';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

type QueryMode = 'sql' | 'natural';

export const QueryPage: React.FC = () => {
  // Use global database context
  const { databases, selectedDatabase, loading: loadingDatabases } = useDatabase();
  
  // Metadata state
  const [metadata, setMetadata] = useState<TableMetadata[] | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  
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

  // Load metadata when database changes
  useEffect(() => {
    if (!selectedDatabase) {
      setMetadata(null);
      return;
    }

    const loadMetadata = async () => {
      try {
        setMetadataLoading(true);
        const response = await apiClient.getDatabaseMetadata(selectedDatabase);
        setMetadata(response.tables || []);
      } catch (err) {
        console.error('Failed to load metadata:', err);
        setMetadata([]);
      } finally {
        setMetadataLoading(false);
      }
    };

    loadMetadata();
  }, [selectedDatabase]);

  const handleRefreshMetadata = async () => {
    if (!selectedDatabase) return;
    
    try {
      setMetadataLoading(true);
      const response = await apiClient.refreshDatabaseMetadata(selectedDatabase);
      setMetadata(response.tables || []);
      message.success('Schema refreshed');
    } catch (err) {
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

      const response = await apiClient.executeQuery(selectedDatabase, { sql: sqlQuery });

      setResult(response.result);
      setExecutionTimeMs(response.executionTimeMs);
      // Update SQL in editor to show the actually executed SQL (with LIMIT if added)
      if (response.sql !== sqlQuery) {
        setSqlQuery(response.sql);
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
      
      // Store explanation
      if (response.explanation) {
        setGeneratedExplanation(response.explanation);
      }

      // Switch to SQL tab to show the generated query
      setQueryMode('sql');
      
      message.success('SQL 生成成功！您可以检查并执行生成的查询。');

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

        {/* Results */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <QueryResultTable
            result={result}
            executionTimeMs={executionTimeMs}
            loading={executing}
            metadata={metadata}
          />
        </div>
      </Content>
    </Layout>
  );
};
