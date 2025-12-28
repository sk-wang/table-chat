import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryToolbar } from '../components/editor/QueryToolbar';

describe('QueryToolbar', () => {
  const mockDatabases = [
    { name: 'db1', url: 'postgresql://localhost/db1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { name: 'db2', url: 'postgresql://localhost/db2', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  ];

  const defaultProps = {
    databases: mockDatabases,
    selectedDatabase: 'db1',
    onExecute: vi.fn(),
    onClear: vi.fn(),
    executing: false,
    disabled: false,
    showDatabaseSelector: false,
  };

  it('should render execute and clear buttons', () => {
    render(<QueryToolbar {...defaultProps} />);

    expect(screen.getByText(/Execute/i)).toBeInTheDocument();
    expect(screen.getByText(/Clear/i)).toBeInTheDocument();
  });

  it('should call onExecute when execute button is clicked', () => {
    render(<QueryToolbar {...defaultProps} />);

    const executeButton = screen.getByText(/Execute/i);
    fireEvent.click(executeButton);

    expect(defaultProps.onExecute).toHaveBeenCalledTimes(1);
  });

  it('should call onClear when clear button is clicked', () => {
    render(<QueryToolbar {...defaultProps} />);

    const clearButton = screen.getByText(/Clear/i);
    fireEvent.click(clearButton);

    expect(defaultProps.onClear).toHaveBeenCalledTimes(1);
  });

  it('should disable execute button when no database is selected', () => {
    const props = { ...defaultProps, selectedDatabase: null };
    render(<QueryToolbar {...props} />);

    const executeButton = screen.getByText(/Execute/i).closest('button');
    expect(executeButton).toBeDisabled();
  });

  it('should disable execute button when disabled prop is true', () => {
    const props = { ...defaultProps, disabled: true };
    render(<QueryToolbar {...props} />);

    const executeButton = screen.getByText(/Execute/i).closest('button');
    expect(executeButton).toBeDisabled();
  });

  it('should show loading state when executing', () => {
    const props = { ...defaultProps, executing: true };
    render(<QueryToolbar {...props} />);

    // Button should be in loading state (Ant Design shows loading spinner)
    const executeButton = screen.getByText(/Execute/i).closest('button');
    expect(executeButton).toHaveClass('ant-btn-loading');
  });

  it('should display selected database name when showDatabaseSelector is false', () => {
    render(<QueryToolbar {...defaultProps} />);

    expect(screen.getByText('db1')).toBeInTheDocument();
  });

  it('should show database selector when showDatabaseSelector is true', () => {
    const props = { ...defaultProps, showDatabaseSelector: true, onDatabaseChange: vi.fn() };
    render(<QueryToolbar {...props} />);

    expect(screen.getByText(/Database:/i)).toBeInTheDocument();
  });
});
