/**
 * Custom hook for Monaco Editor statement highlighting using Decorations API
 *
 * This hook manages visual highlighting of SQL statements in the Monaco editor.
 * It uses deltaDecorations API for optimal performance and supports real-time updates.
 *
 * Performance target: < 16ms update time (60fps)
 *
 * @feature 021-single-sql-execution
 * @date 2026-01-09
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { editor } from 'monaco-editor';
import type {
  SqlStatement,
  StatementHighlight,
  UseEditorHighlightResult,
} from '../../types/sql-execution';
import { HIGHLIGHT_CLASSES } from '../../types/sql-execution';

/**
 * Hook for managing SQL statement highlighting in Monaco Editor
 *
 * Uses Monaco's deltaDecorations API for efficient highlighting updates.
 * Automatically cleans up decorations on unmount.
 *
 * @param editorInstance - Monaco editor instance
 * @returns Highlight management interface
 *
 * @example
 * const { updateHighlight, clearHighlight } = useEditorHighlight(editor);
 *
 * // Highlight statement at cursor
 * useEffect(() => {
 *   updateHighlight(currentStatement);
 * }, [currentStatement]);
 */
export function useEditorHighlight(
  editorInstance: editor.IStandaloneCodeEditor | null
): UseEditorHighlightResult {
  // Track current decoration IDs for cleanup
  const decorationIdsRef = useRef<string[]>([]);

  // Track current highlight configuration
  const [currentHighlight, setCurrentHighlight] = useState<StatementHighlight | null>(null);

  // Use ref to store latest editor instance for cleanup
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(editorInstance);

  useEffect(() => {
    editorRef.current = editorInstance;
  }, [editorInstance]);

  /**
   * Update highlight for a SQL statement
   *
   * Uses requestAnimationFrame for smooth 60fps updates
   */
  const updateHighlight = useCallback(
    (statement: SqlStatement | null) => {
      if (!editorRef.current || !statement) {
        clearHighlight();
        return;
      }

      // Use requestAnimationFrame for smooth rendering (research.md Decision 7)
      requestAnimationFrame(() => {
        if (!editorRef.current) return;

        try {
          // Create decoration range
          const range = new (window as any).monaco.Range(
            statement.startPosition.line,
            statement.startPosition.column,
            statement.endPosition.line,
            statement.endPosition.column
          );

          // Create decoration configuration
          const decoration: editor.IModelDeltaDecoration = {
            range,
            options: {
              className: HIGHLIGHT_CLASSES.ACTIVE_STATEMENT,
              // Use inline styles for better cross-theme compatibility
              inlineClassName: 'active-sql-statement-inline',
            },
          };

          // Apply decoration using deltaDecorations (replaces old decorations)
          const newDecorationIds = editorRef.current.deltaDecorations(
            decorationIdsRef.current,
            [decoration]
          );

          decorationIdsRef.current = newDecorationIds;

          // Update current highlight state
          setCurrentHighlight({
            range: {
              startLineNumber: statement.startPosition.line,
              startColumn: statement.startPosition.column,
              endLineNumber: statement.endPosition.line,
              endColumn: statement.endPosition.column,
            },
            className: HIGHLIGHT_CLASSES.ACTIVE_STATEMENT,
            hoverMessage: 'Press F8 or Cmd/Ctrl+Enter to execute this statement',
          });
        } catch (error) {
          console.error('Failed to update highlight:', error);
        }
      });
    },
    [] // No dependencies - use refs for stable callback
  );

  /**
   * Clear all highlights
   */
  const clearHighlight = useCallback(() => {
    if (!editorRef.current) return;

    try {
      // Remove all decorations
      editorRef.current.deltaDecorations(decorationIdsRef.current, []);
      decorationIdsRef.current = [];
      setCurrentHighlight(null);
    } catch (error) {
      console.error('Failed to clear highlight:', error);
    }
  }, []); // No dependencies - use refs for stable callback

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current && decorationIdsRef.current.length > 0) {
        try {
          editorRef.current.deltaDecorations(decorationIdsRef.current, []);
        } catch (error) {
          // Editor might be disposed, ignore error
          console.warn('Could not clean up decorations on unmount:', error);
        }
      }
    };
  }, []); // Only run on unmount

  return {
    highlight: currentHighlight,
    updateHighlight,
    clearHighlight,
  };
}

/**
 * Hook for highlighting errors in SQL statements
 *
 * Similar to useEditorHighlight but uses error styling
 *
 * @param editorInstance - Monaco editor instance
 * @returns Error highlight management interface
 */
export function useEditorErrorHighlight(
  editorInstance: editor.IStandaloneCodeEditor | null
) {
  const decorationIdsRef = useRef<string[]>([]);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(editorInstance);

  useEffect(() => {
    editorRef.current = editorInstance;
  }, [editorInstance]);

  const highlightError = useCallback(
    (statement: SqlStatement, errorMessage: string) => {
      if (!editorRef.current || !statement) {
        return;
      }

      try {
        const range = new (window as any).monaco.Range(
          statement.startPosition.line,
          statement.startPosition.column,
          statement.endPosition.line,
          statement.endPosition.column
        );

        const decoration: editor.IModelDeltaDecoration = {
          range,
          options: {
            className: HIGHLIGHT_CLASSES.ERROR_STATEMENT,
            hoverMessage: { value: `Error: ${errorMessage}` },
            inlineClassName: 'error-sql-statement-inline',
          },
        };

        const newDecorationIds = editorRef.current.deltaDecorations(
          decorationIdsRef.current,
          [decoration]
        );

        decorationIdsRef.current = newDecorationIds;
      } catch (error) {
        console.error('Failed to highlight error:', error);
      }
    },
    [] // No dependencies - use refs for stable callback
  );

  const clearErrorHighlight = useCallback(() => {
    if (!editorRef.current) return;

    try {
      editorRef.current.deltaDecorations(decorationIdsRef.current, []);
      decorationIdsRef.current = [];
    } catch (error) {
      console.error('Failed to clear error highlight:', error);
    }
  }, []); // No dependencies - use refs for stable callback

  useEffect(() => {
    return () => {
      if (editorRef.current && decorationIdsRef.current.length > 0) {
        try {
          editorRef.current.deltaDecorations(decorationIdsRef.current, []);
        } catch (error) {
          console.warn('Could not clean up error decorations on unmount:', error);
        }
      }
    };
  }, []); // Only run on unmount

  return {
    highlightError,
    clearErrorHighlight,
  };
}
