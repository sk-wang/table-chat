import { describe, it, expect } from 'vitest';
import type { QueryResult, DatabaseResponse, ColumnInfo, TableMetadata } from '../types';

describe('Type Definitions', () => {
  describe('QueryResult', () => {
    it('should match expected structure', () => {
      const queryResult: QueryResult = {
        columns: ['id', 'name'],
        rows: [{ id: 1, name: 'Test' }],
        rowCount: 1,
        truncated: false,
      };

      expect(queryResult.columns).toHaveLength(2);
      expect(queryResult.rows).toHaveLength(1);
      expect(queryResult.rowCount).toBe(1);
      expect(queryResult.truncated).toBe(false);
    });
  });

  describe('DatabaseResponse', () => {
    it('should match expected structure', () => {
      const database: DatabaseResponse = {
        name: 'testdb',
        url: 'postgresql://localhost/testdb',
        dbType: 'postgresql',
        createdAt: '2024-01-01T00:00:00',
        updatedAt: '2024-01-01T00:00:00',
      };

      expect(database.name).toBe('testdb');
      expect(database.url).toContain('postgresql://');
      expect(database.dbType).toBe('postgresql');
    });

    it('should support mysql database type', () => {
      const database: DatabaseResponse = {
        name: 'mysqldb',
        url: 'mysql://localhost/testdb',
        dbType: 'mysql',
        createdAt: '2024-01-01T00:00:00',
        updatedAt: '2024-01-01T00:00:00',
      };

      expect(database.dbType).toBe('mysql');
    });
  });

  describe('Metadata Types', () => {
    it('ColumnInfo should have correct properties', () => {
      const column: ColumnInfo = {
        name: 'id',
        dataType: 'integer',
        isNullable: false,
        isPrimaryKey: true,
      };

      expect(column.name).toBe('id');
      expect(column.isPrimaryKey).toBe(true);
      expect(column.isNullable).toBe(false);
    });

    it('TableMetadata should have correct structure', () => {
      const table: TableMetadata = {
        schemaName: 'public',
        tableName: 'users',
        tableType: 'table',
        columns: [
          {
            name: 'id',
            dataType: 'integer',
            isNullable: false,
            isPrimaryKey: true,
          },
        ],
      };

      expect(table.schemaName).toBe('public');
      expect(table.tableName).toBe('users');
      expect(table.tableType).toBe('table');
      expect(table.columns).toHaveLength(1);
    });
  });
});
