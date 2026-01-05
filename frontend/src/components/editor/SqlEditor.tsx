import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState, Component } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { getSqlCompletionProvider, type SchemaDataProvider } from './SqlCompletionProvider';
import { getStatementAtPosition, type SqlStatement } from './SqlStatementParser';
import type { TableSummary, ColumnInfo } from '../../types/editor';
import { Alert } from 'antd';

// Re-export SqlStatement from SqlStatementParser for external use
export type { SqlStatement } from './SqlStatementParser';

// Infer editor type from OnMount callback parameters
type EditorInstance = Parameters<OnMount>[0];
type MonacoInstance = Parameters<OnMount>[1];

export interface SqlEditorRef {
  /**
   * Get the SQL statement at the current cursor position.
   */
  getCurrentStatement: () => SqlStatement | null;
  /**
   * Highlight a specific statement temporarily.
   */
  highlightStatement: (statement: SqlStatement) => void;
  /**
   * Clear any statement highlights.
   */
  clearHighlight: () => void;
  /**
   * Get the editor instance.
   */
  getEditor: () => EditorInstance | null;
  /**
   * Manually trigger autocomplete suggestions.
   */
  triggerSuggest: () => void;
}

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  onExecuteCurrent?: () => void;
  onFormat?: () => void;
  readOnly?: boolean;
  // Schema data for autocomplete
  schemaData?: {
    tables: TableSummary[];
    getTableColumns: (tableName: string) => ColumnInfo[] | undefined;
  };
}

export const SqlEditor = forwardRef<SqlEditorRef, SqlEditorProps>(({
  value,
  onChange,
  onExecute,
  onExecuteCurrent,
  onFormat,
  readOnly = false,
  schemaData,
}, ref) => {
  const editorRef = useRef<EditorInstance | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);
  const providerRef = useRef<ReturnType<typeof getSqlCompletionProvider> | null>(null);
  const decorationRef = useRef<ReturnType<EditorInstance['createDecorationsCollection']> | null>(null);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getCurrentStatement: () => {
      const editor = editorRef.current;
      if (!editor) return null;

      const position = editor.getPosition();
      if (!position) return null;

      return getStatementAtPosition(value, position.lineNumber, position.column);
    },

    highlightStatement: (statement: SqlStatement) => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;

      // Create decorations for the statement
      const decorations = editor.createDecorationsCollection([
        {
          range: new monaco.Range(
            statement.startLine,
            statement.startColumn,
            statement.endLine,
            statement.endColumn
          ),
          options: {
            className: 'executing-statement-highlight',
            isWholeLine: false,
          },
        },
      ]);

      decorationRef.current = decorations;

      // Clear highlight after a short delay
      setTimeout(() => {
        decorations.clear();
      }, 1000);
    },

    clearHighlight: () => {
      if (decorationRef.current) {
        decorationRef.current.clear();
      }
    },

    getEditor: () => editorRef.current,

    triggerSuggest: () => {
      const editor = editorRef.current;
      console.log('[SqlEditor] triggerSuggest called, editor exists:', editor !== null);
      if (!editor) return;

      // Manually trigger autocomplete
      console.log('[SqlEditor] Triggering editor.action.triggerSuggest');
      editor.trigger('api', 'editor.action.triggerSuggest', {});
    },
  }));

  const handleEditorDidMount: OnMount = (editorInstance, monacoInstance) => {
    editorRef.current = editorInstance;
    monacoRef.current = monacoInstance;

    // Register SQL completion provider
    const provider = getSqlCompletionProvider();
    providerRef.current = provider;

    // Register with Monaco
    monacoInstance.languages.registerCompletionItemProvider('sql', provider);

    // Add Ctrl+Enter / Cmd+Enter keyboard shortcut for execution
    if (onExecute) {
      editorInstance.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
        () => {
          onExecute();
        }
      );
    }

    // Add Ctrl+Shift+Enter for single statement execution
    const handleSingleStatementExecution = () => {
      const position = editorInstance.getPosition();
      if (!position) return;

      const statement = getStatementAtPosition(value, position.lineNumber, position.column);
      if (!statement) return;

      // Highlight the statement
      const decorations = editorInstance.createDecorationsCollection([
        {
          range: new monacoInstance.Range(
            statement.startLine,
            statement.startColumn,
            statement.endLine,
            statement.endColumn
          ),
          options: {
            className: 'executing-statement-highlight',
            isWholeLine: false,
          },
        },
      ]);

      // Clear highlight after execution
      setTimeout(() => {
        decorations.clear();
      }, 500);

      // Trigger the callback with the statement text
      if (onExecuteCurrent) {
        onExecuteCurrent();
      }
    };

    editorInstance.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.Enter,
      handleSingleStatementExecution
    );

    // Add Shift+Alt+F keyboard shortcut for formatting
    if (onFormat) {
      editorInstance.addCommand(
        monacoInstance.KeyMod.Shift | monacoInstance.KeyMod.Alt | monacoInstance.KeyCode.KeyF,
        () => {
          onFormat();
        }
      );
    }

    // Add Ctrl+Space for manual autocomplete trigger
    editorInstance.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Space,
      () => {
        editorInstance.trigger('manual', 'editor.action.triggerSuggest', {});
      }
    );

    // Focus editor
    editorInstance.focus();
  };

  // Update schema data provider when schemaData changes
  useEffect(() => {
    const provider = providerRef.current;
    if (!provider) return;

    if (schemaData) {
      const dataProvider: SchemaDataProvider = {
        getTables: () => schemaData.tables,
        getTableColumns: (tableName: string) => schemaData.getTableColumns(tableName),
        hasSchemaData: () => schemaData.tables.length > 0,
      };
      provider.setSchemaDataProvider(dataProvider);
    } else {
      provider.setSchemaDataProvider(null);
    }
  }, [schemaData]);

  // Register SQL keyword suggestions
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    // Register SQL language for better syntax highlighting
    monaco.languages.register({ id: 'sql' });

    // Define SQL language configuration
    monaco.languages.setLanguageConfiguration('sql', {
      comments: {
        lineComment: '--',
        blockComment: ['/*', '*/'],
      },
      brackets: [
        ['(', ')'],
        ['[', ']'],
      ],
      autoClosingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: "'", close: "'" },
        { open: '"', close: '"' },
      ],
      surroundingPairs: [
        { open: '(', close: ')' },
        { open: '[', close: ']' },
        { open: "'", close: "'" },
        { open: '"', close: '"' },
      ],
    });
  }, []);

  return (
    <div className="monaco-editor-container" style={{ height: '300px' }}>
      <style>
        {`
          .executing-statement-highlight {
            background-color: rgba(255, 200, 0, 0.15);
            border-left: 3px solid #ffc800;
          }
        `}
      </style>
      <Editor
        height="100%"
        defaultLanguage="sql"
        value={value}
        onChange={val => onChange(val || '')}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          readOnly,
          wordWrap: 'on',
          suggest: {
            showKeywords: true,
            showSnippets: false,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
        }}
      />
    </div>
  );
});

SqlEditor.displayName = 'SqlEditor';

/**
 * Error boundary for catching and gracefully handling editor errors.
 * Prevents the entire app from crashing if autocomplete fails.
 */
interface SqlEditorErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface SqlEditorErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

class SqlEditorErrorBoundary extends Component<
  SqlEditorErrorBoundaryProps,
  SqlEditorErrorBoundaryState
> {
  constructor(props: SqlEditorErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SqlEditorErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SqlEditor ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div style={{ padding: '16px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '4px' }}>
            <Alert
              message="Editor Error"
              description="The SQL editor encountered an error. Please refresh the page."
              type="error"
              showIcon
            />
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component that includes error boundary and degradation UI.
 */
interface SqlEditorWrapperProps extends SqlEditorProps {
  showSchemaWarning?: boolean;
}

export const SqlEditorWrapper = forwardRef<SqlEditorRef, SqlEditorWrapperProps>(
  ({ showSchemaWarning, ...props }, ref) => {
    const [hasError, setHasError] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const handleResetError = () => {
      setHasError(false);
      setError(null);
    };

    // If there was an error, show fallback
    if (hasError) {
      return (
        <div style={{ padding: '16px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '4px' }}>
          <Alert
            message="Editor Error"
            description={error?.message || 'The SQL editor encountered an error.'}
            type="error"
            showIcon
            action={
              <button
                onClick={handleResetError}
                style={{
                  background: 'white',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  padding: '4px 12px',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            }
          />
        </div>
      );
    }

    return (
      <SqlEditorErrorBoundary
        fallback={
          <div style={{ padding: '16px' }}>
            <Alert
              message="Editor Error"
              description="The SQL editor encountered an error. Please refresh the page."
              type="error"
              showIcon
            />
          </div>
        }
      >
        {showSchemaWarning && (
          <Alert
            message="Limited Autocomplete"
            description="Database schema is not available. Only SQL keywords will be suggested. Connect to a database for full autocomplete."
            type="warning"
            showIcon
            closable
            style={{ marginBottom: '8px' }}
          />
        )}
        <SqlEditor ref={ref} {...props} />
      </SqlEditorErrorBoundary>
    );
  }
);

SqlEditorWrapper.displayName = 'SqlEditorWrapper';
