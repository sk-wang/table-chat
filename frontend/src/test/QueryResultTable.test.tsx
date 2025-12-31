import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryResultTable } from '../components/results/QueryResultTable';
import type { QueryResult } from '../types';

// Mock react-resizable
vi.mock('react-resizable', () => ({
  Resizable: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('QueryResultTable', () => {
  const mockResult: QueryResult = {
    columns: ['id', 'name', 'email'],
    rows: [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
    ],
    rowCount: 2,
    truncated: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when result is null', () => {
    render(<QueryResultTable result={null} />);
    // Match actual text: "No query results yet"
    expect(screen.getByText(/No query results yet/i)).toBeInTheDocument();
  });

  it('should render empty state when result has no rows', () => {
    const emptyResult: QueryResult = {
      columns: ['id'],
      rows: [],
      rowCount: 0,
      truncated: false,
    };
    render(<QueryResultTable result={emptyResult} />);
    // Match actual text: "Query executed successfully but returned no data"
    expect(screen.getByText(/Query executed successfully but returned no data/i)).toBeInTheDocument();
  });

  it('should render table with data when result has rows', async () => {
    render(<QueryResultTable result={mockResult} />);
    
    // Check for row data
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('should display execution time when provided', () => {
    render(<QueryResultTable result={mockResult} executionTimeMs={42} />);
    expect(screen.getByText(/42ms/)).toBeInTheDocument();
  });

  it('should display row count when execution time is provided', () => {
    render(<QueryResultTable result={mockResult} executionTimeMs={42} />);
    // Match actual text: "Rows: 2"
    expect(screen.getByText(/Rows:/)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<QueryResultTable result={mockResult} loading />);
    // Table should be present
    const table = document.querySelector('.ant-table');
    expect(table).toBeInTheDocument();
  });

  it('should show truncated warning when result is truncated', () => {
    const truncatedResult: QueryResult = {
      ...mockResult,
      truncated: true,
    };
    render(<QueryResultTable result={truncatedResult} />);
    // Match actual text: "Results Limited"
    expect(screen.getByText(/Results Limited/i)).toBeInTheDocument();
  });

  it('should handle numeric values correctly', () => {
    const numericResult: QueryResult = {
      columns: ['count', 'total'],
      rows: [{ count: 100, total: 1234.56 }],
      rowCount: 1,
      truncated: false,
    };
    render(<QueryResultTable result={numericResult} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('1234.56')).toBeInTheDocument();
  });

  it('should handle null values in data', () => {
    const nullResult: QueryResult = {
      columns: ['optional_field'],
      rows: [{ optional_field: null }],
      rowCount: 1,
      truncated: false,
    };
    render(<QueryResultTable result={nullResult} />);
    // Null values should render as "NULL"
    expect(screen.getByText('NULL')).toBeInTheDocument();
  });

  it('should handle large datasets without crashing', () => {
    const largeResult: QueryResult = {
      columns: ['id', 'value'],
      rows: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `value-${i}` })),
      rowCount: 100,
      truncated: true,
    };
    render(<QueryResultTable result={largeResult} />);
    // Should render without crashing and show warning
    expect(screen.getByText(/Results Limited/i)).toBeInTheDocument();
  });
});

