import React, { useState, useEffect } from 'react';
import { Typography, Alert, Spin } from 'antd';
import { SqlEditor } from '../../components/editor/SqlEditor';
import { QueryToolbar } from '../../components/editor/QueryToolbar';
import { QueryResultTable } from '../../components/results/QueryResultTable';
import { apiClient } from '../../services/api';
import type { DatabaseResponse, QueryResult } from '../../types';

const { Title } = Typography;

export const QueryPage: React.FC = () => {
  const [databases, setDatabases] = useState<DatabaseResponse[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM ');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number | undefined>();
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingDatabases, setLoadingDatabases] = useState(true);

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

      const response = await apiClient.executeQuery(selectedDatabase, { sql: sqlQuery });

      setResult(response.result);
      setExecutionTimeMs(response.executionTimeMs);
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

      <div style={{ marginBottom: 16 }}>
        <SqlEditor
          value={sqlQuery}
          onChange={setSqlQuery}
          onExecute={handleExecute}
        />
      </div>

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

