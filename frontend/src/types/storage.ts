/**
 * Cache data types for browser localStorage
 */

// Cache version - increment when cache structure changes
export const CACHE_VERSION = '1';

/** Key prefixes for different cache types */
export const CACHE_KEYS = {
  VERSION: 'tablechat_cache_version',
  SELECTED_DATABASE: 'tablechat_selected_database',
  TABLE_LIST: 'tablechat_table_list',
  TABLE_DETAILS: 'tablechat_table_details',
} as const;

/** Cache data structure */
export interface CacheData<T> {
  data: T;
  timestamp: number;
  version: string;
}

/** Selected database cache */
export interface SelectedDatabaseCache {
  databaseName: string;
}

/** Table list cache - stores tables for a specific database */
export interface TableListCache {
  databaseName: string;
  tables: Array<{
    schemaName: string;
    tableName: string;
    tableType: 'table' | 'view';
    comment?: string;
  }>;
}

/** Table details cache - stores column info for a specific table */
export interface TableDetailsCache {
  databaseName: string;
  tableName: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    comment?: string;
    isPrimaryKey: boolean;
  }>;
}

/** All cache types union for type-safe access */
export type CacheType =
  | SelectedDatabaseCache
  | TableListCache
  | TableDetailsCache;
