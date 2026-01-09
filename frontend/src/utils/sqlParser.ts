/**
 * SQL Statement Parser for Single SQL Statement Execution
 *
 * This parser uses a tokenizer approach to detect SQL statement boundaries
 * while respecting string literals, comments, and SQL syntax rules.
 *
 * Performance target: < 50ms for 10,000 lines
 * Accuracy target: 99% for common SQL scenarios
 *
 * @feature 021-single-sql-execution
 * @date 2026-01-09
 */

import type {
  EditorPosition,
  SqlStatement,
  ParseResult,
  ParseOptions,
} from '../types/sql-execution';

/**
 * Token types for SQL parsing
 */
const TokenType = {
  TEXT: 'TEXT',
  SEMICOLON: 'SEMICOLON',
  SINGLE_QUOTE: 'SINGLE_QUOTE',
  DOUBLE_QUOTE: 'DOUBLE_QUOTE',
  BLOCK_COMMENT_START: 'BLOCK_COMMENT_START',
  BLOCK_COMMENT_END: 'BLOCK_COMMENT_END',
  LINE_COMMENT: 'LINE_COMMENT',
  NEWLINE: 'NEWLINE',
} as const;

type TokenType = (typeof TokenType)[keyof typeof TokenType];

/**
 * Parse SQL content into individual statements
 *
 * @param sql - The SQL content to parse
 * @param options - Parsing options (dialect, preserveComments)
 * @returns ParseResult containing statements and any errors
 */
export function parseStatements(
  sql: string,
  _options: ParseOptions = {}
): ParseResult {
  const statements: SqlStatement[] = [];
  const errors: string[] = [];

  if (!sql || !sql.trim()) {
    return { statements, errors };
  }

  try {
    const tokens = tokenize(sql);
    const statementTexts = splitIntoStatements(tokens, sql);

    let currentLine = 1;
    let currentColumn = 1;

    statementTexts.forEach((statementText, index) => {
      const trimmedStatement = statementText.text.trim();

      if (trimmedStatement.length === 0) {
        return; // Skip empty statements
      }

      // Calculate end position
      const lines = statementText.text.split('\n');
      const endLine = currentLine + lines.length - 1;
      const endColumn =
        lines.length === 1
          ? currentColumn + statementText.text.length
          : lines[lines.length - 1].length + 1;

      statements.push({
        text: trimmedStatement,
        startPosition: { line: currentLine, column: currentColumn },
        endPosition: { line: endLine, column: endColumn },
        index,
        type: 'SELECT',
      });

      // Update position for next statement
      currentLine = endLine;
      currentColumn = endColumn;

      // Account for semicolon and whitespace after statement
      const afterStatement = sql.substring(
        statementText.startIndex + statementText.text.length
      );
      const nextNonWhitespace = afterStatement.search(/\S/);
      if (nextNonWhitespace > 0) {
        const whitespace = afterStatement.substring(0, nextNonWhitespace);
        const newlines = whitespace.split('\n').length - 1;
        if (newlines > 0) {
          currentLine += newlines;
          currentColumn = whitespace.substring(whitespace.lastIndexOf('\n') + 1).length + 1;
        } else {
          currentColumn += whitespace.length;
        }
      }
    });
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : 'Unknown parsing error'
    );
  }

  return { statements, errors };
}

/**
 * Find the statement containing the given position
 *
 * @param statements - Array of parsed statements
 * @param position - Editor cursor position
 * @returns The statement at the position, or null if none found
 */
export function findStatementAtPosition(
  statements: SqlStatement[],
  position: EditorPosition
): SqlStatement | null {
  for (const statement of statements) {
    if (isPositionInRange(position, statement)) {
      return statement;
    }
  }
  return null;
}

/**
 * Check if a position is within a statement's range
 */
function isPositionInRange(
  position: EditorPosition,
  statement: SqlStatement
): boolean {
  const { line, column } = position;
  const { startPosition, endPosition } = statement;

  // Check if line is within range
  if (line < startPosition.line || line > endPosition.line) {
    return false;
  }

  // If on start line, check column is after start
  if (line === startPosition.line && column < startPosition.column) {
    return false;
  }

  // If on end line, check column is before end
  if (line === endPosition.line && column > endPosition.column) {
    return false;
  }

  return true;
}

/**
 * Tokenize SQL content
 *
 * This creates a sequence of tokens representing the SQL structure,
 * identifying semicolons, quotes, comments, etc.
 */
function tokenize(sql: string): Array<{ type: TokenType; index: number }> {
  const tokens: Array<{ type: TokenType; index: number }> = [];
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    // Block comment start: /*
    if (char === '/' && nextChar === '*') {
      tokens.push({ type: TokenType.BLOCK_COMMENT_START, index: i });
      i += 2;
      continue;
    }

    // Block comment end: */
    if (char === '*' && nextChar === '/') {
      tokens.push({ type: TokenType.BLOCK_COMMENT_END, index: i });
      i += 2;
      continue;
    }

    // Line comment: -- or #
    if (
      (char === '-' && nextChar === '-') ||
      char === '#'
    ) {
      tokens.push({ type: TokenType.LINE_COMMENT, index: i });
      // Skip to end of line
      while (i < sql.length && sql[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Single quote
    if (char === "'") {
      tokens.push({ type: TokenType.SINGLE_QUOTE, index: i });
      i++;
      continue;
    }

    // Double quote
    if (char === '"') {
      tokens.push({ type: TokenType.DOUBLE_QUOTE, index: i });
      i++;
      continue;
    }

    // Semicolon
    if (char === ';') {
      tokens.push({ type: TokenType.SEMICOLON, index: i });
      i++;
      continue;
    }

    // Newline
    if (char === '\n') {
      tokens.push({ type: TokenType.NEWLINE, index: i });
      i++;
      continue;
    }

    // Regular text
    i++;
  }

  return tokens;
}

/**
 * Split tokens into statements based on semicolons
 *
 * Respects string literals and comments - semicolons inside these
 * are not treated as statement boundaries.
 */
function splitIntoStatements(
  tokens: Array<{ type: TokenType; index: number }>,
  sql: string
): Array<{ text: string; startIndex: number }> {
  const statements: Array<{ text: string; startIndex: number }> = [];
  let statementStart = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBlockComment = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Track string literal state
    if (token.type === TokenType.SINGLE_QUOTE && !inDoubleQuote && !inBlockComment) {
      // Check for escaped quote ('' or \')
      const prevChar = token.index > 0 ? sql[token.index - 1] : '';
      const nextChar = token.index < sql.length - 1 ? sql[token.index + 1] : '';

      if (inSingleQuote && nextChar === "'") {
        // Escaped quote '', skip next token
        i++;
        continue;
      }
      if (prevChar === '\\') {
        // Escaped quote \', continue
        continue;
      }

      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (token.type === TokenType.DOUBLE_QUOTE && !inSingleQuote && !inBlockComment) {
      // Check for escaped quote ("" or \")
      const prevChar = token.index > 0 ? sql[token.index - 1] : '';
      const nextChar = token.index < sql.length - 1 ? sql[token.index + 1] : '';

      if (inDoubleQuote && nextChar === '"') {
        // Escaped quote "", skip next token
        i++;
        continue;
      }
      if (prevChar === '\\') {
        // Escaped quote \", continue
        continue;
      }

      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    // Track block comment state
    if (token.type === TokenType.BLOCK_COMMENT_START && !inSingleQuote && !inDoubleQuote) {
      inBlockComment = true;
      continue;
    }

    if (token.type === TokenType.BLOCK_COMMENT_END && inBlockComment) {
      inBlockComment = false;
      continue;
    }

    // Semicolon as statement boundary (only if not in string or comment)
    if (
      token.type === TokenType.SEMICOLON &&
      !inSingleQuote &&
      !inDoubleQuote &&
      !inBlockComment
    ) {
      const statementText = sql.substring(statementStart, token.index + 1);
      if (statementText.trim()) {
        statements.push({
          text: statementText,
          startIndex: statementStart,
        });
      }
      statementStart = token.index + 1;
    }
  }

  // Add final statement if no trailing semicolon
  if (statementStart < sql.length) {
    const finalText = sql.substring(statementStart);
    if (finalText.trim()) {
      statements.push({
        text: finalText,
        startIndex: statementStart,
      });
    }
  }

  return statements;
}

/**
 * Check if SQL content is empty or whitespace-only
 *
 * @param sql - SQL content to check
 * @returns true if empty or only whitespace
 */
export function isEmptyOrWhitespace(sql: string): boolean {
  return !sql || !sql.trim();
}

/**
 * Get statement text without comments (for execution)
 *
 * @param statement - SQL statement
 * @returns Statement text with comments removed
 */
export function stripComments(statement: string): string {
  let result = statement;

  // Remove block comments: /* ... */
  result = result.replace(/\/\*[\s\S]*?\*\//g, ' ');

  // Remove line comments: -- ... and # ...
  result = result.replace(/--[^\n]*/g, ' ');
  result = result.replace(/#[^\n]*/g, ' ');

  return result.trim();
}
