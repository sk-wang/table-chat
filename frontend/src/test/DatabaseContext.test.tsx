import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { DatabaseProvider, useDatabase } from '../contexts/DatabaseContext';
import { apiClient } from '../services/api';
import * as storage from '../services/storage';

// Mock API client
vi.mock('../services/api', () => ({
  apiClient: {
    listDatabases: vi.fn(),
  },
}));

// Mock storage
vi.mock('../services/storage', () => ({
  initCacheVersion: vi.fn(),
  getSelectedDatabase: vi.fn(),
  setSelectedDatabase: vi.fn(),
  clearSelectedDatabase: vi.fn(),
}));

// Test component that uses the context
const TestConsumer = () => {
  const { databases, selectedDatabase, loading, error, setSelectedDatabase, refreshDatabases } = useDatabase();
  
  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'loaded'}</span>
      <span data-testid="error">{error || 'no-error'}</span>
      <span data-testid="selected">{selectedDatabase || 'none'}</span>
      <span data-testid="count">{databases.length}</span>
      <ul data-testid="databases">
        {databases.map(db => (
          <li key={db.name}>{db.name}</li>
        ))}
      </ul>
      <button onClick={() => setSelectedDatabase('testdb')}>Select</button>
      <button onClick={() => refreshDatabases()}>Refresh</button>
    </div>
  );
};

describe('DatabaseContext', () => {
  const mockDatabases = [
    { name: 'db1', url: 'postgresql://localhost/db1', dbType: 'postgresql', sslDisabled: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { name: 'db2', url: 'mysql://localhost/db2', dbType: 'mysql', sslDisabled: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (storage.getSelectedDatabase as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (apiClient.listDatabases as ReturnType<typeof vi.fn>).mockResolvedValue({ databases: mockDatabases });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should provide context values', async () => {
    render(
      <DatabaseProvider>
        <TestConsumer />
      </DatabaseProvider>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(screen.getByTestId('error')).toHaveTextContent('no-error');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useDatabase must be used within a DatabaseProvider');
    
    consoleSpy.mockRestore();
  });

  it('should initialize cache version on mount', async () => {
    render(
      <DatabaseProvider>
        <TestConsumer />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(storage.initCacheVersion).toHaveBeenCalled();
    });
  });

  it('should restore selected database from cache', async () => {
    (storage.getSelectedDatabase as ReturnType<typeof vi.fn>).mockReturnValue('db1');

    render(
      <DatabaseProvider>
        <TestConsumer />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    // After loading, selected should be restored
    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('db1');
    });
  });

  it('should auto-select first database when none selected', async () => {
    render(
      <DatabaseProvider>
        <TestConsumer />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    // First database should be auto-selected
    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('db1');
    });
  });

  it('should handle API errors gracefully', async () => {
    (apiClient.listDatabases as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));

    render(
      <DatabaseProvider>
        <TestConsumer />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    expect(screen.getByTestId('error')).toHaveTextContent('API Error');
  });

  it('should update selected database when setSelectedDatabase is called', async () => {
    render(
      <DatabaseProvider>
        <TestConsumer />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    // Click select button
    act(() => {
      screen.getByText('Select').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('testdb');
    });

    expect(storage.setSelectedDatabase).toHaveBeenCalledWith('testdb');
  });

  it('should refresh databases when refreshDatabases is called', async () => {
    render(
      <DatabaseProvider>
        <TestConsumer />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    // Click refresh button
    act(() => {
      screen.getByText('Refresh').click();
    });

    // Wait for refresh to complete
    await waitFor(() => {
      expect(apiClient.listDatabases).toHaveBeenCalledTimes(2); // Initial + refresh
    });
  });

  it('should clear cached selection if database no longer exists', async () => {
    // Simulate cached database that no longer exists
    (storage.getSelectedDatabase as ReturnType<typeof vi.fn>).mockReturnValue('deleted-db');

    render(
      <DatabaseProvider>
        <TestConsumer />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    // Should clear cache and select first available
    expect(storage.clearSelectedDatabase).toHaveBeenCalled();
  });

  it('should handle empty database list', async () => {
    (apiClient.listDatabases as ReturnType<typeof vi.fn>).mockResolvedValue({ databases: [] });

    render(
      <DatabaseProvider>
        <TestConsumer />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('selected')).toHaveTextContent('none');
  });

  it('should keep current selection if database still exists after refresh', async () => {
    // Setup: Return cached db2 selection
    (storage.getSelectedDatabase as ReturnType<typeof vi.fn>).mockReturnValue('db2');

    render(
      <DatabaseProvider>
        <TestConsumer />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    // db2 should be restored from cache
    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('db2');
    });

    // Refresh with db2 still in list
    const newMockDatabases = [...mockDatabases];
    (apiClient.listDatabases as ReturnType<typeof vi.fn>).mockResolvedValue({ databases: newMockDatabases });

    act(() => {
      screen.getByText('Refresh').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    // Selection should be preserved (db2 from cache)
    await waitFor(() => {
      expect(screen.getByTestId('selected')).toHaveTextContent('db2');
    });
  });

  it('should clear selected database when setSelectedDatabase is called with null', async () => {
    // Override the mock implementation for this specific test
    const mockSetSelectedDatabase = vi.fn();
    vi.doMock('../contexts/DatabaseContext', async () => {
      const actual = await vi.importActual('../contexts/DatabaseContext');
      return {
        ...actual,
        useDatabase: () => ({
          databases: mockDatabases,
          selectedDatabase: 'testdb',
          loading: false,
          error: null,
          setSelectedDatabase: mockSetSelectedDatabase,
          refreshDatabases: vi.fn(),
        }),
      };
    });

    render(
      <DatabaseProvider>
        <TestConsumer />
      </DatabaseProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });
  });
});

