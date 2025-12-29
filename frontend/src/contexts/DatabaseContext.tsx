import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';
import { initCacheVersion, getSelectedDatabase, setSelectedDatabase as setSelectedDatabaseCache, clearSelectedDatabase } from '../services/storage';
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
  const [selectedDatabase, setSelectedDatabaseState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Custom setter that saves to both state and cache
  const handleSetSelectedDatabase = useCallback((name: string | null) => {
    setSelectedDatabaseState(name);
    saveSelectedDatabaseToCache(name);
  }, []);

  // Initialize cache version and restore selected database from cache
  useEffect(() => {
    initCacheVersion();

    // Restore selected database from cache
    const cached = getSelectedDatabase();
    if (cached) {
      setSelectedDatabaseState(cached);
    }
  }, []);

  const refreshDatabases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.listDatabases();
      setDatabases(response.databases);

      // Auto-select first database if none selected AND no cached selection
      setSelectedDatabaseState(prev => {
        // If user has a cached selection, check if it still exists
        const cached = getSelectedDatabase();
        if (cached) {
          const cachedExists = response.databases.find(db => db.name === cached);
          if (cachedExists) {
            return cached; // Restore cached selection
          } else {
            // Cached database no longer exists, clear cache
            clearSelectedDatabaseFromCache();
          }
        }

        // Fall back to auto-select first database
        if (response.databases.length > 0 && !prev) {
          return response.databases[0].name;
        }
        // Clear selection if selected database no longer exists
        if (prev && !response.databases.find(db => db.name === prev)) {
          return response.databases.length > 0 ? response.databases[0].name : null;
        }
        return prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load databases');
    } finally {
      setLoading(false);
    }
  }, []);

  // Wrapper function for cache operations
  const saveSelectedDatabaseToCache = (name: string | null) => {
    if (name === null) {
      clearSelectedDatabase();
    } else {
      setSelectedDatabaseCache(name);
    }
  };

  // Wrapper function to clear cache
  const clearSelectedDatabaseFromCache = () => {
    clearSelectedDatabase();
  }; // No dependencies needed - uses setters and state updater functions

  useEffect(() => {
    refreshDatabases();
  }, [refreshDatabases]); // Include refreshDatabases in dependencies

  const value: DatabaseContextValue = {
    databases,
    selectedDatabase,
    loading,
    error,
    setSelectedDatabase: handleSetSelectedDatabase,
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

