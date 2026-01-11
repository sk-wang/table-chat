import React, { useRef, useState, useEffect, useCallback } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useSqlStatementParser } from '../SqlEditor/useSqlStatementParser';
import { useEditorHighlight } from '../SqlEditor/useEditorHighlight';
import { getCursorPosition, getStatementToExecute } from '../../utils/statementExtractor';
import type { EditorPosition, SqlStatement } from '../../types/sql-execution';
import './SqlEditor.css'; // Import global CSS for Monaco decorations

// Infer editor type from OnMount callback parameters
type EditorInstance = Parameters<OnMount>[0];
type MonacoInstance = Parameters<OnMount>[1];

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  onExecuteStatement?: (sql: string) => void; // New prop for single statement execution
  onFormat?: () => void;
  readOnly?: boolean;
}

export const SqlEditor: React.FC<SqlEditorProps> = ({
  value,
  onChange,
  onExecute,
  onExecuteStatement,
  onFormat,
  readOnly = false,
}) => {
  const editorRef = useRef<EditorInstance | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);

  // State for cursor position tracking
  const [cursorPosition, setCursorPosition] = useState<EditorPosition | null>(null);

  // Parse SQL statements and find current statement at cursor
  const { currentStatement } = useSqlStatementParser(value, cursorPosition);

  // Use ref to store latest currentStatement for event handlers
  const currentStatementRef = useRef<SqlStatement | null>(currentStatement);
  useEffect(() => {
    currentStatementRef.current = currentStatement;
  }, [currentStatement]);

  // Handle single statement execution
  // Use useCallback with empty deps and read from refs
  const handleExecuteCurrentStatement = useCallback(() => {
    console.log('[SqlEditor] Execute triggered');

    if (!editorRef.current) {
      console.warn('[SqlEditor] Editor ref is null');
      return;
    }

    const editor = editorRef.current;
    const model = editor.getModel();
    const selection = editor.getSelection();

    console.log('[SqlEditor] Current statement from ref:', currentStatementRef.current);
    console.log('[SqlEditor] Selection:', selection);

    // Get statement to execute (selection-first strategy)
    // Read latest currentStatement from ref
    const statementToExecute = getStatementToExecute(
      model,
      selection,
      currentStatementRef.current
    );

    console.log('[SqlEditor] Statement to execute:', statementToExecute);

    if (statementToExecute && statementToExecute.trim()) {
      console.log('[SqlEditor] Calling execution callback with SQL:', statementToExecute);
      // Use new callback if provided, otherwise fall back to old one
      if (onExecuteStatement) {
        onExecuteStatement(statementToExecute);
      } else if (onExecute) {
        onExecute();
      }
    } else {
      console.warn('[SqlEditor] No statement to execute (empty or null)');
    }
  }, [onExecute, onExecuteStatement]);

  // Store handleExecuteCurrentStatement in a ref so keyboard shortcuts always call latest version
  const executeCallbackRef = useRef(handleExecuteCurrentStatement);
  useEffect(() => {
    executeCallbackRef.current = handleExecuteCurrentStatement;
  }, [handleExecuteCurrentStatement]);

  // Manage statement highlighting
  const { updateHighlight, clearHighlight } = useEditorHighlight(editorRef.current);

  // Update highlight when current statement changes (real-time highlighting)
  useEffect(() => {
    if (currentStatement) {
      updateHighlight(currentStatement);
    } else {
      clearHighlight();
    }
  }, [currentStatement, updateHighlight, clearHighlight]);

  const handleEditorDidMount: OnMount = (editorInstance, monacoInstance) => {
    editorRef.current = editorInstance;
    monacoRef.current = monacoInstance;

    // Enable line numbers gutter for execution button
    editorInstance.updateOptions({
      glyphMargin: true, // Enable glyph margin for execution icons
      lineNumbers: 'on',
    });

    // Add cursor position tracking with debounce (50ms)
    let cursorTimeout: NodeJS.Timeout;
    const cursorDisposable = editorInstance.onDidChangeCursorPosition(() => {
      clearTimeout(cursorTimeout);
      cursorTimeout = setTimeout(() => {
        const position = getCursorPosition(editorInstance);
        setCursorPosition(position);
      }, 50); // 50ms debounce for performance
    });

    // Set initial cursor position after a short delay to avoid flashing
    // Wait for editor to fully initialize
    setTimeout(() => {
      const initialPosition = getCursorPosition(editorInstance);
      setCursorPosition(initialPosition);
    }, 100);

    // Add F8 keyboard shortcut for single statement execution
    editorInstance.addCommand(monacoInstance.KeyCode.F8, () => {
      executeCallbackRef.current();
    });

    // Add Ctrl+Enter / Cmd+Enter keyboard shortcut for execution
    if (onExecute || onExecuteStatement) {
      editorInstance.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
        () => {
          executeCallbackRef.current();
        }
      );
    }

    // Add Shift+Alt+F keyboard shortcut for formatting
    if (onFormat) {
      editorInstance.addCommand(
        monacoInstance.KeyMod.Shift |
          monacoInstance.KeyMod.Alt |
          monacoInstance.KeyCode.KeyF,
        () => {
          onFormat();
        }
      );
    }

    // Add glyph margin click handler
    const glyphClickDisposable = editorInstance.onMouseDown((e) => {
      if (
        e.target.type === monacoInstance.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
      ) {
        executeCallbackRef.current();
      }
    });

    // Focus editor
    editorInstance.focus();

    // Store disposables for cleanup
    const disposables = [cursorDisposable, glyphClickDisposable];

    // Return cleanup function (will be called on unmount if stored)
    return () => {
      disposables.forEach((d) => d?.dispose?.());
      clearTimeout(cursorTimeout);
    };
  };

  // Add glyph margin decorations for current statement
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !currentStatement) {
      return;
    }

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    try {
      // Add execution icon at the start line of current statement
      const decorationIds = editor.deltaDecorations(
        [],
        [
          {
            range: new monaco.Range(
              currentStatement.startPosition.line,
              1,
              currentStatement.startPosition.line,
              1
            ),
            options: {
              glyphMarginClassName: 'sql-execution-glyph',
              glyphMarginHoverMessage: { value: 'Click to execute (F8)' },
            },
          },
        ]
      );

      // Cleanup function
      return () => {
        editor.deltaDecorations(decorationIds, []);
      };
    } catch (error) {
      console.error('Failed to add glyph margin decoration:', error);
    }
  }, [currentStatement]);

  return (
    <div className="monaco-editor-container" style={{ height: '300px' }}>
      <Editor
        height="100%"
        defaultLanguage="sql"
        value={value}
        onChange={(val) => onChange(val || '')}
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
          glyphMargin: true, // Enable glyph margin for ▶ button
        }}
      />
    </div>
  );
};
