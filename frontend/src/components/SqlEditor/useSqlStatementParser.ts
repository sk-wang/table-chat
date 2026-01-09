/**
 * Custom hook for SQL statement parsing with memoization
 *
 * This hook provides memoized SQL parsing and statement detection
 * based on cursor position. It updates when SQL content changes.
 *
 * @feature 021-single-sql-execution
 * @date 2026-01-09
 */

import { useMemo } from 'react';
import {
  parseStatements,
  findStatementAtPosition,
} from '../../utils/sqlParser';
import type {
  EditorPosition,
  UseSqlStatementParserResult,
  ParseOptions,
} from '../../types/sql-execution';

/**
 * Hook for parsing SQL statements and finding statement at cursor position
 *
 * @param sqlContent - The SQL content to parse
 * @param cursorPosition - Current cursor position in editor
 * @param options - Parsing options (dialect, etc.)
 * @returns Parser result with statements, current statement, and utility functions
 *
 * @example
 * const { statements, currentStatement, errors } = useSqlStatementParser(
 *   sql,
 *   cursorPosition,
 *   { dialect: 'postgres' }
 * );
 */
export function useSqlStatementParser(
  sqlContent: string,
  cursorPosition: EditorPosition | null,
  options?: ParseOptions
): UseSqlStatementParserResult {
  // Memoize parsing - only re-parse when content changes
  const { statements, errors } = useMemo(() => {
    return parseStatements(sqlContent, options);
  }, [sqlContent, options]);

  // Memoize current statement detection - updates when statements or cursor changes
  const currentStatement = useMemo(() => {
    if (!cursorPosition || statements.length === 0) {
      return null;
    }
    return findStatementAtPosition(statements, cursorPosition);
  }, [statements, cursorPosition]);

  // Parse function for manual re-parsing (rarely needed due to memoization)
  const parse = useMemo(() => {
    return (content: string) => parseStatements(content, options);
  }, [options]);

  // Find statement at position function (uses current statements)
  const findAtPosition = useMemo(() => {
    return (position: EditorPosition) => findStatementAtPosition(statements, position);
  }, [statements]);

  return {
    statements,
    currentStatement,
    parse,
    findStatementAtPosition: findAtPosition,
    errors,
  };
}
