import { describe, it, expect } from 'vitest';
import { exportToCSV, exportToJSON, generateFilename } from '../components/export/exportUtils';

describe('exportToCSV', () => {
  it('should export basic data correctly', () => {
    const columns = ['name', 'age'];
    const rows = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ];

    const result = exportToCSV(columns, rows);

    // Should have BOM
    expect(result.startsWith('\uFEFF')).toBe(true);

    // Should have correct content
    expect(result).toContain('name,age');
    expect(result).toContain('Alice,30');
    expect(result).toContain('Bob,25');
  });

  it('should handle NULL and undefined values', () => {
    const columns = ['name', 'value'];
    const rows = [
      { name: 'Test', value: null },
      { name: 'Test2', value: undefined },
    ];

    const result = exportToCSV(columns, rows);

    // NULL and undefined should be empty strings
    expect(result).toContain('Test,');
    expect(result).toContain('Test2,');
  });

  it('should escape commas in values', () => {
    const columns = ['name', 'description'];
    const rows = [{ name: 'Test', description: 'Has, comma' }];

    const result = exportToCSV(columns, rows);

    // Values with commas should be quoted
    expect(result).toContain('"Has, comma"');
  });

  it('should escape double quotes in values', () => {
    const columns = ['name', 'quote'];
    const rows = [{ name: 'Test', quote: 'Said "hello"' }];

    const result = exportToCSV(columns, rows);

    // Double quotes should be escaped as two double quotes
    expect(result).toContain('"Said ""hello"""');
  });

  it('should escape newlines in values', () => {
    const columns = ['name', 'text'];
    const rows = [{ name: 'Test', text: 'Line1\nLine2' }];

    const result = exportToCSV(columns, rows);

    // Values with newlines should be quoted
    expect(result).toContain('"Line1\nLine2"');
  });

  it('should handle empty data', () => {
    const columns = ['name', 'value'];
    const rows: Record<string, unknown>[] = [];

    const result = exportToCSV(columns, rows);

    // Should only have header
    expect(result).toBe('\uFEFFname,value');
  });
});

describe('exportToJSON', () => {
  it('should export basic data correctly', () => {
    const columns = ['name', 'age'];
    const rows = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ];

    const result = exportToJSON(columns, rows);
    const parsed = JSON.parse(result);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ name: 'Alice', age: 30 });
    expect(parsed[1]).toEqual({ name: 'Bob', age: 25 });
  });

  it('should handle NULL values as null', () => {
    const columns = ['name', 'value'];
    const rows = [{ name: 'Test', value: null }];

    const result = exportToJSON(columns, rows);
    const parsed = JSON.parse(result);

    expect(parsed[0].value).toBeNull();
  });

  it('should handle undefined values as null', () => {
    const columns = ['name', 'value'];
    const rows = [{ name: 'Test', value: undefined }];

    const result = exportToJSON(columns, rows);
    const parsed = JSON.parse(result);

    expect(parsed[0].value).toBeNull();
  });

  it('should use 2-space indentation', () => {
    const columns = ['name'];
    const rows = [{ name: 'Test' }];

    const result = exportToJSON(columns, rows);

    // Check for proper 2-space indentation structure
    expect(result).toContain('  {');  // Object opening with 2 spaces
    expect(result).not.toContain('        "name"'); // Not 8-space indentation
  });

  it('should handle empty data', () => {
    const columns = ['name', 'value'];
    const rows: Record<string, unknown>[] = [];

    const result = exportToJSON(columns, rows);
    const parsed = JSON.parse(result);

    expect(parsed).toEqual([]);
  });

  it('should handle nested objects', () => {
    const columns = ['name', 'data'];
    const rows = [{ name: 'Test', data: { nested: true } }];

    const result = exportToJSON(columns, rows);
    const parsed = JSON.parse(result);

    expect(parsed[0].data).toEqual({ nested: true });
  });

  it('should only include specified columns', () => {
    const columns = ['name'];
    const rows = [{ name: 'Test', extra: 'ignored' }];

    const result = exportToJSON(columns, rows);
    const parsed = JSON.parse(result);

    expect(parsed[0]).toEqual({ name: 'Test' });
    expect(parsed[0].extra).toBeUndefined();
  });
});

describe('generateFilename', () => {
  it('should generate correct filename format', () => {
    const filename = generateFilename('mydb', 'csv');

    // Should match pattern: mydb_YYYYMMDD_HHMMSS.csv
    expect(filename).toMatch(/^mydb_\d{8}_\d{6}\.csv$/);
  });

  it('should handle different formats', () => {
    const csvFile = generateFilename('db', 'csv');
    const jsonFile = generateFilename('db', 'json');
    const xlsxFile = generateFilename('db', 'xlsx');

    expect(csvFile.endsWith('.csv')).toBe(true);
    expect(jsonFile.endsWith('.json')).toBe(true);
    expect(xlsxFile.endsWith('.xlsx')).toBe(true);
  });

  it('should sanitize special characters in database name', () => {
    const filename = generateFilename('my/db:test', 'csv');

    // Should replace special characters with underscore
    expect(filename).toMatch(/^my_db_test_\d{8}_\d{6}\.csv$/);
    expect(filename).not.toContain('/');
    expect(filename).not.toContain(':');
  });

  it('should sanitize spaces in database name', () => {
    const filename = generateFilename('my database', 'csv');

    // Spaces should be replaced with underscore
    expect(filename).toMatch(/^my_database_\d{8}_\d{6}\.csv$/);
    expect(filename).not.toContain(' ');
  });

  it('should handle empty database name', () => {
    const filename = generateFilename('', 'csv');

    // Should still generate valid filename
    expect(filename).toMatch(/^_\d{8}_\d{6}\.csv$/);
  });

  it('should handle all special characters', () => {
    const specialChars = 'a\\b/c:d*e?f"g<h>i|j';
    const filename = generateFilename(specialChars, 'json');

    // All special characters should be sanitized
    expect(filename).not.toMatch(/[\\/:*?"<>|]/);
  });
});

