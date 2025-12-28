import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';
import type { DatabaseResponse } from '../types';

interface DatabaseContextValue {
  databases: DatabaseResponse[];
  selectedDatabase: string | null;
  loading: boolean;
  error: string | null;
  setSelectedDatabase: (name: string | null) => void;
  refreshDatabases: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [databases, setDatabases] = useState<DatabaseResponse[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDatabases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.listDatabases();
      setDatabases(response.databases);

      // Auto-select first database if none selected
      if (response.databases.length > 0 && !selectedDatabase) {
        setSelectedDatabase(response.databases[0].name);
      }
      // Clear selection if selected database no longer exists
      if (selectedDatabase && !response.databases.find(db => db.name === selectedDatabase)) {
        setSelectedDatabase(response.databases.length > 0 ? response.databases[0].name : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load databases');
    } finally {
      setLoading(false);
    }
  }, [selectedDatabase]);

  useEffect(() => {
    refreshDatabases();
  }, []);

  const value: DatabaseContextValue = {
    databases,
    selectedDatabase,
    loading,
    error,
    setSelectedDatabase,
    refreshDatabases,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = (): DatabaseContextValue => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

