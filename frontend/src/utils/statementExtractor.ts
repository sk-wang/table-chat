/**
 * Statement extraction utility for single SQL execution
 *
 * Implements selection-first strategy: manual selection takes precedence
 * over automatic cursor-based detection.
 *
 * @feature 021-single-sql-execution
 * @date 2026-01-09
 */

import type { SqlStatement, EditorPosition } from '../types/sql-execution';

/**
 * Monaco Editor Range interface (subset)
 */
interface MonacoRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

/**
 * Monaco Editor Selection interface (subset)
 */
interface MonacoSelection extends MonacoRange {
  isEmpty(): boolean;
}

/**
 * Monaco Editor Model interface (subset)
 */
interface MonacoModel {
  getValue(): string;
  getValueInRange(range: MonacoRange): string;
}

/**
 * Get the SQL statement to execute based on selection or cursor position
 *
 * Strategy (per research.md Decision 6):
 * 1. If user has manually selected text → use selected text
 * 2. Otherwise → find statement at cursor position
 *
 * @param model - Monaco editor model
 * @param selection - Current selection
 * @param currentStatement - Statement at cursor position (from parser)
 * @returns SQL text to execute, or null if none found
 *
 * @example
 * const sql = getStatementToExecute(editor.getModel(), editor.getSelection(), currentStatement);
 * if (sql) {
 *   await executeQuery(sql);
 * }
 */
export function getStatementToExecute(
  model: MonacoModel | null,
  selection: MonacoSelection | null,
  currentStatement: SqlStatement | null
): string | null {
  console.log('[statementExtractor] getStatementToExecute called');
  console.log('[statementExtractor] model:', model);
  console.log('[statementExtractor] selection:', selection);
  console.log('[statementExtractor] currentStatement:', currentStatement);

  if (!model) {
    console.warn('[statementExtractor] Model is null');
    return null;
  }

  // Strategy 1: Check for manual text selection (highest priority)
  if (selection && !selection.isEmpty()) {
    console.log('[statementExtractor] Using manual selection');
    const selectedText = model.getValueInRange(selection);
    const trimmed = selectedText.trim();
    console.log('[statementExtractor] Selected text:', trimmed);
    return trimmed.length > 0 ? trimmed : null;
  }

  // Strategy 2: Fall back to statement at cursor position
  if (currentStatement) {
    console.log('[statementExtractor] Using current statement at cursor');
    console.log('[statementExtractor] Statement text:', currentStatement.text);
    return currentStatement.text;
  }

  // No statement found
  console.warn('[statementExtractor] No statement found (no selection and no current statement)');
  return null;
}

/**
 * Check if given SQL content is empty or whitespace-only
 *
 * Used for validation before execution (per FR-010)
 *
 * @param sql - SQL content to check
 * @returns true if empty or only whitespace
 */
export function isEmptyOrWhitespace(sql: string | null): boolean {
  return !sql || sql.trim().length === 0;
}

/**
 * Get cursor position from Monaco editor
 *
 * @param editor - Monaco editor instance
 * @returns Editor position or null
 */
export function getCursorPosition(editor: any): EditorPosition | null {
  if (!editor) {
    return null;
  }

  const position = editor.getPosition();
  if (!position) {
    return null;
  }

  return {
    line: position.lineNumber,
    column: position.column,
  };
}

/**
 * Find nearest statement when cursor is between statements
 *
 * When cursor is on blank line or semicolon, find the closest statement:
 * - Look backward first (previous statement)
 * - If none, look forward (next statement)
 *
 * @param statements - All parsed statements
 * @param position - Current cursor position
 * @returns Nearest statement or null
 */
export function findNearestStatement(
  statements: SqlStatement[],
  position: EditorPosition
): SqlStatement | null {
  if (statements.length === 0) {
    return null;
  }

  // Find statements before and after cursor
  let previousStatement: SqlStatement | null = null;
  let nextStatement: SqlStatement | null = null;

  for (const statement of statements) {
    if (statement.endPosition.line < position.line ||
        (statement.endPosition.line === position.line &&
         statement.endPosition.column < position.column)) {
      // Statement ends before cursor
      previousStatement = statement;
    } else if (statement.startPosition.line > position.line ||
               (statement.startPosition.line === position.line &&
                statement.startPosition.column > position.column)) {
      // Statement starts after cursor
      if (!nextStatement) {
        nextStatement = statement;
      }
      break;
    }
  }

  // Prefer previous statement (backward search first)
  return previousStatement || nextStatement || statements[0];
}

/**
 * Validate SQL statement before execution
 *
 * @param sql - SQL statement to validate
 * @returns Error message if invalid, null if valid
 */
export function validateStatementForExecution(sql: string | null): string | null {
  if (!sql) {
    return 'No SQL statement to execute';
  }

  const trimmed = sql.trim();

  if (trimmed.length === 0) {
    return 'SQL statement is empty or contains only whitespace';
  }

  // Basic validation: must have at least one word
  if (!/\w+/.test(trimmed)) {
    return 'SQL statement does not contain any valid content';
  }

  return null; // Valid
}
