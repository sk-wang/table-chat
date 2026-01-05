/**
 * Hook for accessing and managing database schema metadata.
 * Wraps SchemaContext with convenient methods for loading metadata.
 */

import { useCallback, useEffect, useState } from "react";
import { useSchemaContext } from "../contexts/SchemaContext";
import { metadataService } from "../services/metadataService";
import type { TableSummary, ColumnInfo } from "../types/editor";

interface UseSchemaMetadataOptions {
  /** Auto-load tables when database name changes */
  autoLoad?: boolean;
  /** Auto-refresh interval in milliseconds (0 to disable) */
  refreshInterval?: number;
}

interface UseSchemaMetadataResult {
  /** Current schema cache */
  cache: {
    databaseName: string | null;
    tables: TableSummary[];
    lastRefreshed: string | null;
  };
  /** Load table list for the given database */
  loadTables: (dbName: string, refresh?: boolean) => Promise<void>;
  /** Load columns for a specific table */
  loadTableColumns: (dbName: string, schemaName: string, tableName: string) => Promise<ColumnInfo[]>;
  /** Get cached columns for a table */
  getTableColumns: (tableName: string) => ColumnInfo[] | undefined;
  /** Clear the cache */
  clearCache: () => void;
  /** Set current database name */
  setDatabaseName: (dbName: string | null) => void;
  /** Loading state indicator */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Hook for managing schema metadata with automatic loading capabilities.
 */
export function useSchemaMetadata(
  options: UseSchemaMetadataOptions = {}
): UseSchemaMetadataResult {
  const { refreshInterval = 0 } = options;
  const {
    cache,
    setDatabaseName: contextSetDatabaseName,
    setTables,
    setTableColumns,
    getTableColumns: contextGetTableColumns,
    clearCache,
  } = useSchemaContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTables = useCallback(
    async (dbName: string, refresh: boolean = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await metadataService.getTableList(dbName, refresh);
        contextSetDatabaseName(dbName);
        setTables(result.tables);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load tables";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [contextSetDatabaseName, setTables]
  );

  const loadTableColumns = useCallback(
    async (dbName: string, schemaName: string, tableName: string): Promise<ColumnInfo[]> => {
      // Check cache first
      const cached = contextGetTableColumns(tableName);
      if (cached) {
        return cached;
      }

      setIsLoading(true);
      setError(null);
      try {
        const tableData = await metadataService.getTableColumns(dbName, schemaName, tableName);
        setTableColumns(tableName, tableData.columns);
        return tableData.columns;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load table columns";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [contextGetTableColumns, setTableColumns]
  );

  // Auto-refresh logic
  useEffect(() => {
    if (refreshInterval > 0 && cache.databaseName) {
      const interval = setInterval(() => {
        loadTables(cache.databaseName!, true);
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, cache.databaseName, loadTables]);

  return {
    cache: {
      databaseName: cache.databaseName,
      tables: cache.tables,
      lastRefreshed: cache.lastRefreshed,
    },
    loadTables,
    loadTableColumns,
    getTableColumns: contextGetTableColumns,
    clearCache,
    setDatabaseName: contextSetDatabaseName,
    isLoading,
    error,
  };
}
