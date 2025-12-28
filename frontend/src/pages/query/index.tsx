import React, { useState, useEffect } from 'react';
import { Typography, Alert, Spin, Tabs, message } from 'antd';
import { CodeOutlined, RobotOutlined } from '@ant-design/icons';
import { SqlEditor } from '../../components/editor/SqlEditor';
import { QueryToolbar } from '../../components/editor/QueryToolbar';
import { QueryResultTable } from '../../components/results/QueryResultTable';
import { NaturalLanguageInput } from '../../components/editor/NaturalLanguageInput';
import { apiClient } from '../../services/api';
import type { DatabaseResponse, QueryResult } from '../../types';

const { Title, Text } = Typography;

type QueryMode = 'sql' | 'natural';

export const QueryPage: React.FC = () => {
  const [databases, setDatabases] = useState<DatabaseResponse[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM ');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | undefined>();
  const [executing, setExecuting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDatabases, setLoadingDatabases] = useState(true);
  const [queryMode, setQueryMode] = useState<QueryMode>('sql');
  const [llmUnavailable, setLlmUnavailable] = useState(false);
  const [generatedExplanation, setGeneratedExplanation] = useState<string | null>(null);

  // Load databases on mount
  useEffect(() => {
    const loadDatabases = async () => {
      try {
        const response = await apiClient.listDatabases();
        setDatabases(response.databases);
        
        // Auto-select first database if available
        if (response.databases.length > 0 && !selectedDatabase) {
          setSelectedDatabase(response.databases[0].name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load databases');
      } finally {
        setLoadingDatabases(false);
      }
    };

    loadDatabases();
  }, [selectedDatabase]);

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

  if (loadingDatabases) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (databases.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          message="No Databases Configured"
          description="Please add a database connection in the Databases page before running queries."
          type="info"
          showIcon
        />
      </div>
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
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Title level={2} style={{ margin: 0, marginBottom: 24, color: '#a9b7c6' }}>
        SQL Query
      </Title>

      <QueryToolbar
        databases={databases}
        selectedDatabase={selectedDatabase}
        onDatabaseChange={setSelectedDatabase}
        onExecute={handleExecute}
        onClear={handleClear}
        executing={executing}
      />

      <Tabs
        activeKey={queryMode}
        onChange={(key) => setQueryMode(key as QueryMode)}
        items={tabItems}
        style={{ marginBottom: 16 }}
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
          style={{ marginBottom: 16, background: '#2d3436', borderColor: '#80CBC4' }}
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
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        <QueryResultTable
          result={result}
          executionTimeMs={executionTimeMs}
          loading={executing}
        />
      </div>
    </div>
  );
};
