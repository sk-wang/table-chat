/**
 * SQL Statement Parser for single statement execution.
 * Parses multiple SQL statements and tracks their positions in the editor.
 */

import type { SqlStatement } from "../../types/editor";

// Re-export SqlStatement for use in other modules
export type { SqlStatement } from "../../types/editor";

/**
 * Parse result containing all statements and metadata.
 */
export interface ParseResult {
  statements: SqlStatement[];
  statementCount: number;
}

/**
 * Parses SQL text into individual statements.
 * Handles semicolons, string literals, and comments correctly.
 *
 * @param sql - The SQL text to parse
 * @returns Parse result with statement positions
 */
export function parseStatements(sql: string): ParseResult {
  const statements: SqlStatement[] = [];

  // Track state while parsing
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;
  let parenthesisLevel = 0;

  let currentStatementStart = 0;
  let currentStatementStartLine = 1;
  let currentStatementStartColumn = 1;
  let currentLine = 1;
  let currentColumn = 1;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || "";

    // Track position
    if (char === "\n") {
      currentLine++;
      currentColumn = 1;
      inLineComment = false;
    } else {
      currentColumn++;
    }

    // Handle block comments
    if (!inSingleQuote && !inDoubleQuote && !inLineComment) {
      if (char === "/" && nextChar === "*" && !inBlockComment) {
        inBlockComment = true;
        i++; // Skip next char
        continue;
      }
      if (char === "*" && nextChar === "/" && inBlockComment) {
        inBlockComment = false;
        i++; // Skip next char
        continue;
      }
    }

    // Handle line comments
    if (!inSingleQuote && !inDoubleQuote && !inBlockComment) {
      if (char === "-" && nextChar === "-") {
        inLineComment = true;
        i++; // Skip next char
        continue;
      }
    }

    // Skip if inside comments
    if (inLineComment || inBlockComment) {
      continue;
    }

    // Handle string literals
    if (char === "'" && !inDoubleQuote) {
      if (inSingleQuote && sql[i - 1] !== "\\") {
        inSingleQuote = false;
      } else if (!inSingleQuote) {
        inSingleQuote = true;
      }
    }
    if (char === '"' && !inSingleQuote) {
      if (inDoubleQuote && sql[i - 1] !== "\\") {
        inDoubleQuote = false;
      } else if (!inDoubleQuote) {
        inDoubleQuote = true;
      }
    }

    // Track parenthesis for functions/subqueries
    if (!inSingleQuote && !inDoubleQuote) {
      if (char === "(") {
        parenthesisLevel++;
      } else if (char === ")") {
        parenthesisLevel--;
      }
    }

    // Check for semicolon (statement separator)
    if (
      char === ";" &&
      !inSingleQuote &&
      !inDoubleQuote &&
      parenthesisLevel === 0
    ) {
      const statementText = sql.slice(currentStatementStart, i).trim();

      // Only add non-empty statements
      if (statementText.length > 0) {
        statements.push({
          text: statementText,
          startLine: currentStatementStartLine,
          startColumn: currentStatementStartColumn,
          endLine: currentLine,
          endColumn: currentColumn,
          index: statements.length,
        });
      }

      // Reset for next statement
      currentStatementStart = i + 1;
      currentStatementStartLine = currentLine;
      currentStatementStartColumn = currentColumn + 1;
    }
  }

  // Add the last statement if exists
  const lastStatementText = sql.slice(currentStatementStart).trim();
  if (lastStatementText.length > 0) {
    statements.push({
      text: lastStatementText,
      startLine: currentStatementStartLine,
      startColumn: currentStatementStartColumn,
      endLine: currentLine,
      endColumn: currentColumn,
      index: statements.length,
    });
  }

  return {
    statements,
    statementCount: statements.length,
  };
}

/**
 * Finds the statement at the given cursor position.
 *
 * @param sql - The full SQL text
 * @param lineNumber - 1-based line number
 * @param column - 1-based column number
 * @returns The statement at the position, or null if none found
 */
export function getStatementAtPosition(
  sql: string,
  lineNumber: number,
  column: number
): SqlStatement | null {
  const result = parseStatements(sql);

  // Convert line/column to character offset
  let currentLine = 1;
  let currentColumn = 1;
  let offset = 0;

  for (; offset < sql.length; offset++) {
    if (currentLine === lineNumber && currentColumn === column) {
      break;
    }

    if (sql[offset] === "\n") {
      currentLine++;
      currentColumn = 1;
    } else {
      currentColumn++;
    }
  }

  // Find statement containing this offset
  for (const statement of result.statements) {
    const statementStartOffset = getOffset(sql, statement.startLine, statement.startColumn);
    const statementEndOffset = getOffset(sql, statement.endLine, statement.endColumn);

    if (offset >= statementStartOffset && offset <= statementEndOffset) {
      return statement;
    }
  }

  // If no exact match, find the nearest statement
  let nearestStatement: SqlStatement | null = null;
  let minDistance = Infinity;

  for (const statement of result.statements) {
    const statementStartOffset = getOffset(sql, statement.startLine, statement.startColumn);
    const distance = Math.abs(offset - statementStartOffset);

    if (distance < minDistance) {
      minDistance = distance;
      nearestStatement = statement;
    }
  }

  return nearestStatement;
}

/**
 * Converts line/column to character offset.
 */
function getOffset(sql: string, line: number, column: number): number {
  let currentLine = 1;
  let currentColumn = 1;

  for (let i = 0; i < sql.length; i++) {
    if (currentLine === line && currentColumn === column) {
      return i;
    }

    if (sql[i] === "\n") {
      currentLine++;
      currentColumn = 1;
    } else {
      currentColumn++;
    }
  }

  return sql.length;
}
