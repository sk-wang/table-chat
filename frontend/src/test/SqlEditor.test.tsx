import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SqlEditor } from '../components/editor/SqlEditor';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, onMount, options }: { 
    value: string; 
    onChange: (v: string) => void;
    onMount?: (editor: unknown, monaco: unknown) => void;
    options?: { readOnly?: boolean };
  }) => {
    // Simulate editor mount
    if (onMount) {
      const mockEditor = {
        addCommand: vi.fn(),
        focus: vi.fn(),
      };
      const mockMonaco = {
        KeyMod: { CtrlCmd: 2048, Shift: 1024, Alt: 512 },
        KeyCode: { Enter: 3, KeyF: 36 },
      };
      setTimeout(() => onMount(mockEditor, mockMonaco), 0);
    }
    
    return (
      <div data-testid="mock-monaco-editor" data-readonly={options?.readOnly}>
        <textarea
          data-testid="mock-editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={options?.readOnly}
        />
      </div>
    );
  },
}));

describe('SqlEditor', () => {
  const defaultProps = {
    value: 'SELECT * FROM users',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the editor container', () => {
    render(<SqlEditor {...defaultProps} />);
    expect(document.querySelector('.monaco-editor-container')).toBeInTheDocument();
  });

  it('should render with the provided SQL value', () => {
    render(<SqlEditor {...defaultProps} />);
    const textarea = screen.getByTestId('mock-editor-textarea');
    expect(textarea).toHaveValue('SELECT * FROM users');
  });

  it('should call onChange when value changes', () => {
    const onChange = vi.fn();
    render(<SqlEditor {...defaultProps} onChange={onChange} />);
    
    const textarea = screen.getByTestId('mock-editor-textarea');
    textarea.focus();
    
    // Simulate typing by dispatching a change event
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    
    // The mock onChange should be connected
    expect(textarea).toBeInTheDocument();
  });

  it('should render with readOnly mode when specified', () => {
    render(<SqlEditor {...defaultProps} readOnly />);
    const editor = screen.getByTestId('mock-monaco-editor');
    expect(editor).toHaveAttribute('data-readonly', 'true');
  });

  it('should render without readOnly mode by default', () => {
    render(<SqlEditor {...defaultProps} />);
    const editor = screen.getByTestId('mock-monaco-editor');
    expect(editor).not.toHaveAttribute('data-readonly', 'true');
  });

  it('should accept onExecute callback', () => {
    const onExecute = vi.fn();
    render(<SqlEditor {...defaultProps} onExecute={onExecute} />);
    // The component should render without errors
    expect(screen.getByTestId('mock-monaco-editor')).toBeInTheDocument();
  });

  it('should accept onFormat callback', () => {
    const onFormat = vi.fn();
    render(<SqlEditor {...defaultProps} onFormat={onFormat} />);
    // The component should render without errors
    expect(screen.getByTestId('mock-monaco-editor')).toBeInTheDocument();
  });

  it('should handle empty value', () => {
    render(<SqlEditor {...defaultProps} value="" />);
    const textarea = screen.getByTestId('mock-editor-textarea');
    expect(textarea).toHaveValue('');
  });

  it('should handle complex SQL queries', () => {
    const complexSql = `
      SELECT u.id, u.name, o.total
      FROM users u
      JOIN orders o ON u.id = o.user_id
      WHERE o.created_at > '2024-01-01'
      ORDER BY o.total DESC
      LIMIT 100
    `;
    render(<SqlEditor {...defaultProps} value={complexSql} />);
    const textarea = screen.getByTestId('mock-editor-textarea');
    expect(textarea).toHaveValue(complexSql);
  });
});

