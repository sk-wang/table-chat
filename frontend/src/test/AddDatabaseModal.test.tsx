import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { AddDatabaseModal } from '../components/database/AddDatabaseModal';

// Mock the API client
vi.mock('../services/api', () => ({
  apiClient: {
    createOrUpdateDatabase: vi.fn(),
  },
}));

// Mock the file reader utility
vi.mock('../utils/fileReader', () => ({
  readFileAsText: vi.fn(),
}));

// Wrapper to provide Ant Design App context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <App>{children}</App>
);

describe('AddDatabaseModal', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    editingDatabase: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render modal when open is true', () => {
    render(
      <TestWrapper>
        <AddDatabaseModal {...defaultProps} />
      </TestWrapper>
    );
    expect(screen.getByText(/Add Database Connection/i)).toBeInTheDocument();
  });

  it('should not render modal content when open is false', () => {
    render(
      <TestWrapper>
        <AddDatabaseModal {...defaultProps} open={false} />
      </TestWrapper>
    );
    expect(screen.queryByText(/Add Database Connection/i)).not.toBeInTheDocument();
  });

  it('should render database type selector with PostgreSQL and MySQL options', () => {
    render(
      <TestWrapper>
        <AddDatabaseModal {...defaultProps} />
      </TestWrapper>
    );
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument();
    expect(screen.getByText('MySQL')).toBeInTheDocument();
  });

  it('should render database name and URL input fields', () => {
    render(
      <TestWrapper>
        <AddDatabaseModal {...defaultProps} />
      </TestWrapper>
    );
    expect(screen.getByLabelText(/Database Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Connection URL/i)).toBeInTheDocument();
  });

  it('should render SSH Tunnel label', () => {
    render(
      <TestWrapper>
        <AddDatabaseModal {...defaultProps} />
      </TestWrapper>
    );
    expect(screen.getByText(/SSH Tunnel/i)).toBeInTheDocument();
  });

  it('should have SSH toggle switch', async () => {
    render(
      <TestWrapper>
        <AddDatabaseModal {...defaultProps} />
      </TestWrapper>
    );
    
    // Find the SSH toggle switch
    const sshToggle = screen.getByRole('switch');
    expect(sshToggle).toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <AddDatabaseModal {...defaultProps} onClose={onClose} />
      </TestWrapper>
    );
    
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should display edit title when editing an existing database', () => {
    const editingDatabase = {
      name: 'test-db',
      url: 'postgresql://localhost/test',
      dbType: 'postgresql' as const,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    
    render(
      <TestWrapper>
        <AddDatabaseModal {...defaultProps} editingDatabase={editingDatabase} />
      </TestWrapper>
    );
    
    expect(screen.getByText(/Edit Database Connection/i)).toBeInTheDocument();
  });

  it('should pre-fill form when editing an existing database', async () => {
    const editingDatabase = {
      name: 'test-db',
      url: 'postgresql://user:pass@localhost:5432/test',
      dbType: 'postgresql' as const,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };
    
    render(
      <TestWrapper>
        <AddDatabaseModal {...defaultProps} editingDatabase={editingDatabase} />
      </TestWrapper>
    );
    
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Database Name/i);
      expect(nameInput).toHaveValue('test-db');
    });
  });

  it('should have form elements', async () => {
    render(
      <TestWrapper>
        <AddDatabaseModal {...defaultProps} />
      </TestWrapper>
    );
    
    // Form should have the modal title
    expect(screen.getByText(/Add Database Connection/i)).toBeInTheDocument();
  });
});

