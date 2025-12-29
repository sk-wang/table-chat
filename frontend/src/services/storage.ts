/**
 * localStorage cache service for browser-side caching
 *
 * Provides safe localStorage operations with version management
 * and graceful degradation when localStorage is unavailable.
 */

import {
  CACHE_VERSION,
  CACHE_KEYS,
} from '../types/storage';
import type {
  CacheData,
  SelectedDatabaseCache,
  TableListCache,
  TableDetailsCache,
} from '../types/storage';

// Development mode logging (T020)
const DEBUG = import.meta.env?.DEV ?? import.meta.env?.MODE === 'development';

const logCacheHit = (type: string, key: string) => {
  if (DEBUG) {
    console.log(`[Cache] HIT: ${type} for ${key}`);
  }
};

const logCacheMiss = (type: string, key: string) => {
  if (DEBUG) {
    console.log(`[Cache] MISS: ${type} for ${key}`);
  }
};

const logCacheClear = (type: string) => {
  if (DEBUG) {
    console.log(`[Cache] CLEAR: ${type}`);
  }
};

/** Flag to track localStorage availability */
let localStorageAvailable: boolean | null = null;

/**
 * Check if localStorage is available
 * Caches the result to avoid repeated checks
 */
const isLocalStorageAvailable = (): boolean => {
  if (localStorageAvailable !== null) {
    return localStorageAvailable;
  }

  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    localStorageAvailable = true;
    return true;
  } catch {
    localStorageAvailable = false;
    return false;
  }
};

/**
 * Safe get item from localStorage
 * Returns null if localStorage is unavailable or error occurs
 */
const safeGetItem = <T>(key: string): T | null => {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item) as T;
  } catch {
    return null;
  }
};

/**
 * Safe set item to localStorage
 * Returns true if successful, false otherwise
 */
const safeSetItem = <T>(key: string, value: T): boolean => {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

/**
 * Safe remove item from localStorage
 * Returns true if successful, false otherwise
 */
const safeRemoveItem = (key: string): boolean => {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

/**
 * Create a cache wrapper with metadata
 */
const wrapCache = <T>(data: T): CacheData<T> => ({
  data,
  timestamp: Date.now(),
  version: CACHE_VERSION,
});

/**
 * Unwrap cache data and validate version
 */
const unwrapCache = <T>(wrapped: CacheData<T> | null, expectedVersion: string = CACHE_VERSION): T | null => {
  if (!wrapped) return null;

  // Check version compatibility
  if (wrapped.version !== expectedVersion) {
    return null;
  }

  return wrapped.data;
};

// ============================================
// Version Management (T004, T005)
// ============================================

/**
 * Get the stored cache version
 */
export const getCacheVersion = (): string | null => {
  return safeGetItem<string>(CACHE_KEYS.VERSION);
};

/**
 * Set the current cache version
 */
export const setCacheVersion = (): void => {
  safeSetItem(CACHE_KEYS.VERSION, CACHE_VERSION);
};

/**
 * Check if cache version matches current version
 * Returns true if compatible, false if version mismatch
 */
export const checkCacheVersion = (): boolean => {
  const storedVersion = getCacheVersion();
  return storedVersion === CACHE_VERSION;
};

/**
 * Clear all cache when version is incompatible
 */
export const clearIncompatibleCache = (): void => {
  if (!checkCacheVersion()) {
    clearAllCache();
    setCacheVersion();
  }
};

/**
 * Initialize cache version on app start
 */
export const initCacheVersion = (): void => {
  if (!getCacheVersion()) {
    setCacheVersion();
  } else {
    clearIncompatibleCache();
  }
};

// ============================================
// Selected Database Cache (US1 - T006)
// ============================================

/**
 * Get the cached selected database name
 */
export const getSelectedDatabase = (): string | null => {
  const wrapped = safeGetItem<CacheData<SelectedDatabaseCache>>(CACHE_KEYS.SELECTED_DATABASE);
  const cache = unwrapCache(wrapped);
  return cache?.databaseName ?? null;
};

/**
 * Set the selected database name
 */
export const setSelectedDatabase = (databaseName: string | null): void => {
  if (databaseName === null) {
    safeRemoveItem(CACHE_KEYS.SELECTED_DATABASE);
    return;
  }

  safeSetItem(CACHE_KEYS.SELECTED_DATABASE, wrapCache({ databaseName }));
};

/**
 * Clear the selected database cache
 */
export const clearSelectedDatabase = (): void => {
  safeRemoveItem(CACHE_KEYS.SELECTED_DATABASE);
};

// ============================================
// Table List Cache (US2 - T010)
// ============================================

/**
 * Get cached table list for a specific database
 */
export const getTableListCache = (databaseName: string): TableListCache | null => {
  const wrapped = safeGetItem<CacheData<TableListCache>>(`${CACHE_KEYS.TABLE_LIST}_${databaseName}`);
  const cache = unwrapCache(wrapped);

  // Double-check database name matches
  if (cache && cache.databaseName !== databaseName) {
    logCacheMiss('TableList', databaseName);
    return null;
  }

  if (cache) {
    logCacheHit('TableList', databaseName);
  } else {
    logCacheMiss('TableList', databaseName);
  }

  return cache;
};

/**
 * Set cached table list for a specific database
 */
export const setTableListCache = (
  databaseName: string,
  tables: Array<{ schemaName: string; tableName: string; tableType: 'table' | 'view'; comment?: string }>
): void => {
  const cache: TableListCache = { databaseName, tables };
  safeSetItem(`${CACHE_KEYS.TABLE_LIST}_${databaseName}`, wrapCache(cache));
};

/**
 * Clear table list cache for a specific database
 */
export const clearTableListCache = (databaseName?: string): void => {
  if (databaseName) {
    safeRemoveItem(`${CACHE_KEYS.TABLE_LIST}_${databaseName}`);
    logCacheClear(`TableList:${databaseName}`);
  } else {
    // Clear all table list caches
    Object.keys(localStorage)
      .filter(key => key.startsWith(CACHE_KEYS.TABLE_LIST))
      .forEach(key => {
        safeRemoveItem(key);
        logCacheClear('TableList');
      });
  }
};

// ============================================
// Table Details Cache (US3 - T014)
// ============================================

/**
 * Get cached table details for a specific table
 */
export const getTableDetailsCache = (databaseName: string, tableName: string): TableDetailsCache | null => {
  const key = `${CACHE_KEYS.TABLE_DETAILS}_${databaseName}_${tableName}`;
  const wrapped = safeGetItem<CacheData<TableDetailsCache>>(key);
  const cache = unwrapCache(wrapped);

  // Double-check database and table names match
  if (cache && (cache.databaseName !== databaseName || cache.tableName !== tableName)) {
    logCacheMiss('TableDetails', key);
    return null;
  }

  if (cache) {
    logCacheHit('TableDetails', key);
  } else {
    logCacheMiss('TableDetails', key);
  }

  return cache;
};

/**
 * Set cached table details for a specific table
 */
export const setTableDetailsCache = (
  databaseName: string,
  tableName: string,
  columns: TableDetailsCache['columns']
): void => {
  const cache: TableDetailsCache = { databaseName, tableName, columns };
  const key = `${CACHE_KEYS.TABLE_DETAILS}_${databaseName}_${tableName}`;
  safeSetItem(key, wrapCache(cache));
};

/**
 * Clear table details cache
 */
export const clearTableDetailsCache = (databaseName?: string, tableName?: string): void => {
  const keys = Object.keys(localStorage);

  if (databaseName && tableName) {
    // Clear specific table details
    const key = `${CACHE_KEYS.TABLE_DETAILS}_${databaseName}_${tableName}`;
    safeRemoveItem(key);
    logCacheClear(`TableDetails:${databaseName}.${tableName}`);
  } else if (databaseName) {
    // Clear all table details for a database
    keys
      .filter(key => key.startsWith(`${CACHE_KEYS.TABLE_DETAILS}_${databaseName}_`))
      .forEach(key => {
        safeRemoveItem(key);
        logCacheClear(`TableDetails:${databaseName}`);
      });
  } else {
    // Clear all table details
    keys
      .filter(key => key.startsWith(CACHE_KEYS.TABLE_DETAILS))
      .forEach(key => {
        safeRemoveItem(key);
        logCacheClear('TableDetails');
      });
  }
};

// ============================================
// Utility Methods (Polish - T018, T019, T020)
// ============================================

/**
 * Clear all cache data
 */
export const clearAllCache = (): void => {
  if (!isLocalStorageAvailable()) return;

  Object.keys(localStorage)
    .filter(key => key.startsWith('tablechat_'))
    .forEach(key => {
      safeRemoveItem(key);
      logCacheClear('All');
    });
};

/**
 * Clear all cache for a specific database
 */
export const clearDatabaseCache = (databaseName: string): void => {
  clearTableListCache(databaseName);
  clearTableDetailsCache(databaseName);
  logCacheClear(`Database:${databaseName}`);
};

/**
 * Check if localStorage is available (for graceful degradation)
 */
export const isStorageAvailable = (): boolean => {
  return isLocalStorageAvailable();
};

/**
 * Get cache statistics for debugging
 */
export const getCacheStats = (): Record<string, number> => {
  const stats: Record<string, number> = {
    totalKeys: 0,
    selectedDatabase: 0,
    tableList: 0,
    tableDetails: 0,
  };

  if (!isLocalStorageAvailable()) return stats;

  Object.keys(localStorage)
    .filter(key => key.startsWith('tablechat_'))
    .forEach(key => {
      stats.totalKeys++;
      if (key.includes(CACHE_KEYS.SELECTED_DATABASE)) {
        stats.selectedDatabase++;
      } else if (key.includes(CACHE_KEYS.TABLE_LIST)) {
        stats.tableList++;
      } else if (key.includes(CACHE_KEYS.TABLE_DETAILS)) {
        stats.tableDetails++;
      }
    });

  return stats;
};
