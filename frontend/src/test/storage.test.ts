import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCacheVersion,
  setCacheVersion,
  checkCacheVersion,
  clearIncompatibleCache,
  initCacheVersion,
  getSelectedDatabase,
  setSelectedDatabase,
  clearSelectedDatabase,
  getTableListCache,
  setTableListCache,
  clearTableListCache,
  getTableDetailsCache,
  setTableDetailsCache,
  clearTableDetailsCache,
  getQueryPanelRatio,
  setQueryPanelRatio,
  clearQueryPanelRatio,
  clearAllCache,
  clearDatabaseCache,
  isStorageAvailable,
  getCacheStats,
} from '../services/storage';
import { CACHE_VERSION, CACHE_KEYS } from '../types/storage';

describe('Storage Service', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Version Management', () => {
    it('should return null when no version is stored', () => {
      expect(getCacheVersion()).toBeNull();
    });

    it('should store and retrieve cache version', () => {
      setCacheVersion();
      expect(getCacheVersion()).toBe(CACHE_VERSION);
    });

    it('should check cache version compatibility', () => {
      expect(checkCacheVersion()).toBe(false);
      setCacheVersion();
      expect(checkCacheVersion()).toBe(true);
    });

    it('should clear cache when version is incompatible', () => {
      localStorage.setItem(CACHE_KEYS.SELECTED_DATABASE, 'some_value');
      localStorage.setItem(CACHE_KEYS.VERSION, JSON.stringify('old_version'));
      
      clearIncompatibleCache();
      
      expect(getCacheVersion()).toBe(CACHE_VERSION);
    });

    it('should initialize cache version on first run', () => {
      initCacheVersion();
      expect(getCacheVersion()).toBe(CACHE_VERSION);
    });

    it('should clear incompatible cache on init', () => {
      localStorage.setItem(CACHE_KEYS.VERSION, JSON.stringify('0'));
      initCacheVersion();
      expect(getCacheVersion()).toBe(CACHE_VERSION);
    });
  });

  describe('Selected Database Cache', () => {
    it('should return null when no database is selected', () => {
      expect(getSelectedDatabase()).toBeNull();
    });

    it('should store and retrieve selected database', () => {
      setSelectedDatabase('testdb');
      expect(getSelectedDatabase()).toBe('testdb');
    });

    it('should clear selected database when set to null', () => {
      setSelectedDatabase('testdb');
      setSelectedDatabase(null);
      expect(getSelectedDatabase()).toBeNull();
    });

    it('should clear selected database using clearSelectedDatabase', () => {
      setSelectedDatabase('testdb');
      clearSelectedDatabase();
      expect(getSelectedDatabase()).toBeNull();
    });
  });

  describe('Table List Cache', () => {
    const testTables = [
      { schemaName: 'public', tableName: 'users', tableType: 'table' as const, comment: 'User table' },
      { schemaName: 'public', tableName: 'orders', tableType: 'table' as const },
    ];

    it('should return null when no table list is cached', () => {
      expect(getTableListCache('testdb')).toBeNull();
    });

    it('should store and retrieve table list', () => {
      setTableListCache('testdb', testTables);
      const cache = getTableListCache('testdb');
      
      expect(cache).not.toBeNull();
      expect(cache?.databaseName).toBe('testdb');
      expect(cache?.tables).toHaveLength(2);
      expect(cache?.tables[0].tableName).toBe('users');
    });

    it('should return null for different database name', () => {
      setTableListCache('testdb', testTables);
      expect(getTableListCache('otherdb')).toBeNull();
    });

    it('should clear specific database table list', () => {
      setTableListCache('testdb1', testTables);
      setTableListCache('testdb2', testTables);
      
      clearTableListCache('testdb1');
      
      expect(getTableListCache('testdb1')).toBeNull();
      expect(getTableListCache('testdb2')).not.toBeNull();
    });

    it('should clear all table lists when no database specified', () => {
      setTableListCache('testdb1', testTables);
      setTableListCache('testdb2', testTables);
      
      clearTableListCache();
      
      expect(getTableListCache('testdb1')).toBeNull();
      expect(getTableListCache('testdb2')).toBeNull();
    });
  });

  describe('Table Details Cache', () => {
    const testColumns = [
      { name: 'id', type: 'integer', nullable: false, isPrimaryKey: true },
      { name: 'name', type: 'varchar', nullable: true, comment: 'User name', isPrimaryKey: false },
    ];

    it('should return null when no table details are cached', () => {
      expect(getTableDetailsCache('testdb', 'users')).toBeNull();
    });

    it('should store and retrieve table details', () => {
      setTableDetailsCache('testdb', 'users', testColumns);
      const cache = getTableDetailsCache('testdb', 'users');
      
      expect(cache).not.toBeNull();
      expect(cache?.databaseName).toBe('testdb');
      expect(cache?.tableName).toBe('users');
      expect(cache?.columns).toHaveLength(2);
      expect(cache?.columns[0].name).toBe('id');
    });

    it('should return null for different table', () => {
      setTableDetailsCache('testdb', 'users', testColumns);
      expect(getTableDetailsCache('testdb', 'orders')).toBeNull();
    });

    it('should clear specific table details', () => {
      setTableDetailsCache('testdb', 'users', testColumns);
      setTableDetailsCache('testdb', 'orders', testColumns);
      
      clearTableDetailsCache('testdb', 'users');
      
      expect(getTableDetailsCache('testdb', 'users')).toBeNull();
      expect(getTableDetailsCache('testdb', 'orders')).not.toBeNull();
    });

    it('should clear all table details for a database', () => {
      setTableDetailsCache('testdb', 'users', testColumns);
      setTableDetailsCache('testdb', 'orders', testColumns);
      
      clearTableDetailsCache('testdb');
      
      expect(getTableDetailsCache('testdb', 'users')).toBeNull();
      expect(getTableDetailsCache('testdb', 'orders')).toBeNull();
    });

    it('should clear all table details when no params', () => {
      setTableDetailsCache('db1', 'users', testColumns);
      setTableDetailsCache('db2', 'orders', testColumns);
      
      clearTableDetailsCache();
      
      expect(getTableDetailsCache('db1', 'users')).toBeNull();
      expect(getTableDetailsCache('db2', 'orders')).toBeNull();
    });
  });

  describe('Query Panel Ratio Cache', () => {
    it('should return null when no ratio is cached', () => {
      expect(getQueryPanelRatio()).toBeNull();
    });

    it('should store and retrieve panel ratio', () => {
      setQueryPanelRatio(0.6);
      expect(getQueryPanelRatio()).toBe(0.6);
    });

    it('should reject invalid ratio values (too low)', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setQueryPanelRatio(0.05);
      expect(getQueryPanelRatio()).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should reject invalid ratio values (too high)', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setQueryPanelRatio(0.95);
      expect(getQueryPanelRatio()).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should accept boundary values', () => {
      setQueryPanelRatio(0.1);
      expect(getQueryPanelRatio()).toBe(0.1);
      
      setQueryPanelRatio(0.9);
      expect(getQueryPanelRatio()).toBe(0.9);
    });

    it('should clear panel ratio', () => {
      setQueryPanelRatio(0.5);
      clearQueryPanelRatio();
      expect(getQueryPanelRatio()).toBeNull();
    });
  });

  describe('Utility Methods', () => {
    it('should clear all cache', () => {
      setSelectedDatabase('testdb');
      setTableListCache('testdb', []);
      setQueryPanelRatio(0.5);
      
      clearAllCache();
      
      expect(getSelectedDatabase()).toBeNull();
      expect(getTableListCache('testdb')).toBeNull();
      expect(getQueryPanelRatio()).toBeNull();
    });

    it('should clear database-specific cache', () => {
      setTableListCache('testdb', []);
      setTableDetailsCache('testdb', 'users', []);
      setSelectedDatabase('testdb'); // Should not be cleared
      
      clearDatabaseCache('testdb');
      
      expect(getTableListCache('testdb')).toBeNull();
      expect(getTableDetailsCache('testdb', 'users')).toBeNull();
      // Selected database is managed separately
    });

    it('should check storage availability', () => {
      expect(isStorageAvailable()).toBe(true);
    });

    it('should return cache statistics', () => {
      setSelectedDatabase('testdb');
      setTableListCache('db1', []);
      setTableListCache('db2', []);
      setTableDetailsCache('db1', 'users', []);
      
      const stats = getCacheStats();
      
      expect(stats.totalKeys).toBe(4);
      expect(stats.selectedDatabase).toBe(1);
      expect(stats.tableList).toBe(2);
      expect(stats.tableDetails).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage getItem errors gracefully', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(getSelectedDatabase()).toBeNull();
      
      getItemSpy.mockRestore();
    });

    it('should handle localStorage setItem errors gracefully', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      // Should not throw
      expect(() => setSelectedDatabase('testdb')).not.toThrow();
      
      setItemSpy.mockRestore();
    });

    it('should handle malformed JSON in localStorage', () => {
      localStorage.setItem(CACHE_KEYS.SELECTED_DATABASE, 'not valid json');
      expect(getSelectedDatabase()).toBeNull();
    });
  });
});

