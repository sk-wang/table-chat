/**
 * Schema Cache Context for managing database schema metadata state.
 * Provides in-memory caching of table and column information for autocomplete.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { SchemaCache, TableSummary, ColumnInfo } from "../types/editor";

interface SchemaContextValue {
  cache: SchemaCache;
  setDatabaseName: (dbName: string | null) => void;
  setTables: (tables: TableSummary[]) => void;
  setTableColumns: (tableName: string, columns: ColumnInfo[]) => void;
  getTableColumns: (tableName: string) => ColumnInfo[] | undefined;
  clearCache: () => void;
}

const SchemaContext = createContext<SchemaContextValue | undefined>(undefined);

interface SchemaProviderProps {
  children: ReactNode;
}

/**
 * Provider component for schema cache state management.
 */
export function SchemaProvider({ children }: SchemaProviderProps) {
  const [cache, setCacheState] = useState<SchemaCache>({
    databaseName: null,
    tables: [],
    tableColumns: new Map(),
    lastRefreshed: null,
  });

  const setDatabaseName = useCallback((dbName: string | null) => {
    setCacheState((prev) => ({
      ...prev,
      databaseName: dbName,
      // Clear cache when switching databases
      tables: dbName ? prev.tables : [],
      tableColumns: new Map(),
      lastRefreshed: dbName ? prev.lastRefreshed : null,
    }));
  }, []);

  const setTables = useCallback((tables: TableSummary[]) => {
    setCacheState((prev) => ({
      ...prev,
      tables,
      lastRefreshed: new Date().toISOString(),
    }));
  }, []);

  const setTableColumns = useCallback((tableName: string, columns: ColumnInfo[]) => {
    setCacheState((prev) => {
      const newMap = new Map(prev.tableColumns);
      newMap.set(tableName, columns);
      return {
        ...prev,
        tableColumns: newMap,
        lastRefreshed: new Date().toISOString(),
      };
    });
  }, []);

  const getTableColumns = useCallback((tableName: string): ColumnInfo[] | undefined => {
    return cache.tableColumns.get(tableName);
  }, [cache.tableColumns]);

  const clearCache = useCallback(() => {
    setCacheState({
      databaseName: null,
      tables: [],
      tableColumns: new Map(),
      lastRefreshed: null,
    });
  }, []);

  const value: SchemaContextValue = {
    cache,
    setDatabaseName,
    setTables,
    setTableColumns,
    getTableColumns,
    clearCache,
  };

  return <SchemaContext.Provider value={value}>{children}</SchemaContext.Provider>;
}

/**
 * Hook to access schema cache context.
 * Throws error if used outside SchemaProvider.
 */
export function useSchemaContext(): SchemaContextValue {
  const context = useContext(SchemaContext);
  if (!context) {
    throw new Error("useSchemaContext must be used within SchemaProvider");
  }
  return context;
}
