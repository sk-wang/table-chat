import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';

// Mock axios module
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

// Import after mocking
import { apiClient } from '../services/api';

describe('ApiClient', () => {
  let mockClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mocked axios instance
    mockClient = (axios.create as ReturnType<typeof vi.fn>)() as typeof mockClient;
  });

  describe('Database Operations', () => {
    describe('listDatabases', () => {
      it('should return list of databases', async () => {
        const mockResponse: AxiosResponse = {
        data: {
          databases: [
              { name: 'db1', url: 'postgresql://localhost/db1', dbType: 'postgresql', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
              { name: 'db2', url: 'mysql://localhost/db2', dbType: 'mysql', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
            ],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        };

        mockClient.get.mockResolvedValue(mockResponse);

        const result = await apiClient.listDatabases();

        expect(mockClient.get).toHaveBeenCalledWith('/dbs');
        expect(result.databases).toHaveLength(2);
        expect(result.databases[0].name).toBe('db1');
        expect(result.databases[1].dbType).toBe('mysql');
      });

      it('should throw error on failure', async () => {
        const mockError = {
          response: {
            data: { error: 'Server Error', detail: 'Internal server error' },
          },
          message: 'Request failed',
        };

        mockClient.get.mockRejectedValue(mockError);

        await expect(apiClient.listDatabases()).rejects.toThrow();
      });
    });

    describe('getDatabase', () => {
      it('should return database details', async () => {
        const mockResponse: AxiosResponse = {
          data: {
            name: 'testdb',
            url: 'postgresql://user:****@localhost/testdb',
            dbType: 'postgresql',
            createdAt: '2024-01-01T00:00:00',
            updatedAt: '2024-01-01T00:00:00',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        };

        mockClient.get.mockResolvedValue(mockResponse);

        const result = await apiClient.getDatabase('testdb');

        expect(mockClient.get).toHaveBeenCalledWith('/dbs/testdb');
        expect(result.name).toBe('testdb');
        expect(result.dbType).toBe('postgresql');
      });

      it('should throw error when database not found', async () => {
        const mockError = {
          response: {
            data: { error: 'Not Found', detail: 'Database not found' },
          },
          message: 'Request failed with status code 404',
        };

        mockClient.get.mockRejectedValue(mockError);

        await expect(apiClient.getDatabase('nonexistent')).rejects.toThrow();
      });
    });

    describe('createOrUpdateDatabase', () => {
      it('should create a new database connection', async () => {
        const mockResponse: AxiosResponse = {
          data: {
            name: 'newdb',
            url: 'postgresql://user:****@localhost/newdb',
            dbType: 'postgresql',
            createdAt: '2024-01-01T00:00:00',
            updatedAt: '2024-01-01T00:00:00',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        };

        mockClient.put.mockResolvedValue(mockResponse);

        const result = await apiClient.createOrUpdateDatabase('newdb', {
          url: 'postgresql://user:pass@localhost/newdb',
        });

        expect(mockClient.put).toHaveBeenCalledWith('/dbs/newdb', {
          url: 'postgresql://user:pass@localhost/newdb',
        });
        expect(result.name).toBe('newdb');
      });

      it('should throw error on connection failure', async () => {
        const mockError = {
          response: {
            data: { error: 'Connection Failed', detail: 'Could not connect to database' },
          },
          message: 'Request failed with status code 503',
        };

        mockClient.put.mockRejectedValue(mockError);

        await expect(
          apiClient.createOrUpdateDatabase('baddb', { url: 'postgresql://invalid' })
        ).rejects.toThrow();
      });
    });

    describe('deleteDatabase', () => {
      it('should delete a database connection', async () => {
        const mockResponse: AxiosResponse = {
          data: null,
          status: 204,
          statusText: 'No Content',
          headers: {},
          config: {} as never,
        };

        mockClient.delete.mockResolvedValue(mockResponse);

        await apiClient.deleteDatabase('testdb');

        expect(mockClient.delete).toHaveBeenCalledWith('/dbs/testdb');
      });

      it('should throw error when database not found', async () => {
        const mockError = {
          response: {
            data: { error: 'Not Found', detail: 'Database not found' },
          },
          message: 'Request failed with status code 404',
        };

        mockClient.delete.mockRejectedValue(mockError);

        await expect(apiClient.deleteDatabase('nonexistent')).rejects.toThrow();
      });
    });
  });

  describe('Query Operations', () => {
    describe('executeQuery', () => {
      it('should execute SQL query and return results', async () => {
        const mockResponse: AxiosResponse = {
          data: {
            sql: 'SELECT * FROM users LIMIT 1000',
            result: {
              columns: ['id', 'name', 'email'],
              rows: [
                { id: 1, name: 'Alice', email: 'alice@example.com' },
                { id: 2, name: 'Bob', email: 'bob@example.com' },
              ],
              rowCount: 2,
              truncated: true,
            },
            executionTimeMs: 42,
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        };

        mockClient.post.mockResolvedValue(mockResponse);

        const result = await apiClient.executeQuery('testdb', { sql: 'SELECT * FROM users' });

        expect(mockClient.post).toHaveBeenCalledWith('/dbs/testdb/query', {
          sql: 'SELECT * FROM users',
        });
        expect(result.result.columns).toEqual(['id', 'name', 'email']);
        expect(result.result.rowCount).toBe(2);
        expect(result.result.truncated).toBe(true);
        expect(result.executionTimeMs).toBe(42);
      });

      it('should throw error for invalid SQL', async () => {
        const mockError = {
          response: {
            data: { error: 'SQL Error', detail: 'SQL syntax error near...' },
          },
          message: 'Request failed with status code 400',
        };

        mockClient.post.mockRejectedValue(mockError);

        await expect(
          apiClient.executeQuery('testdb', { sql: 'INVALID SQL' })
        ).rejects.toThrow();
      });

      it('should throw error for non-SELECT statements', async () => {
        const mockError = {
          response: {
            data: { error: 'Validation Error', detail: 'Only SELECT queries are allowed' },
          },
          message: 'Request failed with status code 400',
        };

        mockClient.post.mockRejectedValue(mockError);

        await expect(
          apiClient.executeQuery('testdb', { sql: 'DELETE FROM users' })
        ).rejects.toThrow();
      });
    });

    describe('naturalLanguageQuery', () => {
      it('should generate SQL from natural language', async () => {
        const mockResponse: AxiosResponse = {
          data: {
            generatedSql: 'SELECT * FROM users WHERE age > 18',
            explanation: '查询所有年龄大于18岁的用户',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        };

        mockClient.post.mockResolvedValue(mockResponse);

        const result = await apiClient.naturalLanguageQuery('testdb', {
          prompt: '查询成年用户',
        });

        expect(mockClient.post).toHaveBeenCalledWith('/dbs/testdb/query/natural', {
          prompt: '查询成年用户',
        });
        expect(result.generatedSql).toBe('SELECT * FROM users WHERE age > 18');
        expect(result.explanation).toBe('查询所有年龄大于18岁的用户');
      });

      it('should throw error when LLM is unavailable', async () => {
        const mockError = {
          response: {
            data: { error: 'Service Unavailable', detail: 'LLM service is not configured' },
          },
          message: 'Request failed with status code 503',
        };

        mockClient.post.mockRejectedValue(mockError);

        await expect(
          apiClient.naturalLanguageQuery('testdb', { prompt: 'show users' })
        ).rejects.toThrow();
      });
    });
  });

  describe('Metadata Operations', () => {
    describe('getDatabaseMetadata', () => {
      it('should return database metadata', async () => {
        const mockResponse: AxiosResponse = {
          data: {
            name: 'testdb',
            schemas: ['public', 'analytics'],
            tables: [
              {
                schemaName: 'public',
                tableName: 'users',
                tableType: 'table',
                columns: [
                  { name: 'id', dataType: 'integer', isNullable: false, isPrimaryKey: true },
                  { name: 'name', dataType: 'varchar', isNullable: true, isPrimaryKey: false },
                ],
                comment: 'User accounts',
              },
            ],
            lastRefreshed: '2024-01-01T00:00:00',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        };

        mockClient.get.mockResolvedValue(mockResponse);

        const result = await apiClient.getDatabaseMetadata('testdb');

        expect(mockClient.get).toHaveBeenCalledWith('/dbs/testdb/metadata', { params: { refresh: false } });
        expect(result.schemas).toContain('public');
        expect(result.tables).toHaveLength(1);
        expect(result.tables[0].tableName).toBe('users');
        expect(result.tables[0].columns).toHaveLength(2);
      });

      it('should force refresh when requested', async () => {
        const mockResponse: AxiosResponse = {
          data: {
            name: 'testdb',
            schemas: ['public'],
            tables: [],
            lastRefreshed: '2024-01-01T12:00:00',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        };

      mockClient.get.mockResolvedValue(mockResponse);

        await apiClient.getDatabaseMetadata('testdb', true);

        expect(mockClient.get).toHaveBeenCalledWith('/dbs/testdb/metadata', { params: { refresh: true } });
      });
    });

    describe('refreshDatabaseMetadata', () => {
      it('should refresh and return metadata', async () => {
        const mockResponse: AxiosResponse = {
          data: {
            name: 'testdb',
            schemas: ['public'],
            tables: [
              {
                schemaName: 'public',
                tableName: 'new_table',
                tableType: 'table',
                columns: [],
              },
            ],
            lastRefreshed: '2024-01-01T12:00:00',
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {} as never,
        };

        mockClient.post.mockResolvedValue(mockResponse);

        const result = await apiClient.refreshDatabaseMetadata('testdb');

        expect(mockClient.post).toHaveBeenCalledWith('/dbs/testdb/metadata/refresh');
        expect(result.tables[0].tableName).toBe('new_table');
      });

      it('should throw error on refresh failure', async () => {
        const mockError = {
          response: {
            data: { error: 'Service Unavailable', detail: 'Failed to connect to database' },
          },
          message: 'Request failed with status code 503',
        };

        mockClient.post.mockRejectedValue(mockError);

        await expect(apiClient.refreshDatabaseMetadata('testdb')).rejects.toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    it('should extract error message from response', async () => {
      const mockError = {
        response: {
          data: { error: 'Validation Error', detail: 'Invalid input data' },
        },
        message: 'Request failed',
      };

      mockClient.get.mockRejectedValue(mockError);

      try {
        await apiClient.listDatabases();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('Invalid input data');
      }
    });

    it('should handle network errors', async () => {
      const mockError = {
        message: 'Network Error',
      };

      mockClient.get.mockRejectedValue(mockError);

      try {
        await apiClient.listDatabases();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toContain('Network Error');
      }
    });

    it('should handle errors without response data', async () => {
      const mockError = {
        response: {
          data: {},
        },
        message: 'Unknown error occurred',
      };

      mockClient.get.mockRejectedValue(mockError);

      try {
        await apiClient.listDatabases();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
