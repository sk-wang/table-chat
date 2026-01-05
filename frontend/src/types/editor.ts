/**
 * Editor-related type definitions for SQL autocomplete and statement parsing.
 */

import type { ColumnInfo, TableSummary, TableMetadata, DatabaseMetadata } from './metadata';

// Re-export metadata types from metadata.ts to avoid duplication
export type { ColumnInfo, TableSummary, TableMetadata, DatabaseMetadata };

/**
 * SQL context type for autocomplete suggestions.
 */
export const SqlContext = {
  /** Suggest SQL keywords */
  KEYWORD: "KEYWORD",
  /** Suggest table names */
  TABLE_NAME: "TABLE_NAME",
  /** Suggest column names */
  COLUMN_NAME: "COLUMN_NAME",
  /** Suggest columns for aliased table (alias.column) */
  ALIAS_COLUMN: "ALIAS_COLUMN",
} as const;

export type SqlContext = (typeof SqlContext)[keyof typeof SqlContext];

/**
 * Represents a single SQL statement in the editor.
 */
export interface SqlStatement {
  /** The SQL statement text */
  text: string;
  /** Starting line number (1-based) */
  startLine: number;
  /** Starting column number (1-based) */
  startColumn: number;
  /** Ending line number (1-based) */
  endLine: number;
  /** Ending column number (1-based) */
  endColumn: number;
  /** Statement index (0-based) */
  index: number;
}

/**
 * Represents a table reference in a SQL query.
 */
export interface TableReference {
  /** Schema name (optional) */
  schemaName: string | null;
  /** Table name */
  tableName: string;
  /** Table alias (optional) */
  alias: string | null;
}

/**
 * Autocomplete request context information.
 */
export interface CompletionContext {
  /** The type of SQL context */
  contextType: SqlContext;
  /** Current input prefix for filtering */
  prefix: string;
  /** Tables referenced in the current query */
  tableRefs: TableReference[];
  /** Current alias if applicable */
  currentAlias: string | null;
}

/**
 * Frontend schema cache structure.
 */
export interface SchemaCache {
  /** Database connection name */
  databaseName: string | null;
  /** Table summary list */
  tables: TableSummary[];
  /** Map of table name -> column list (lazy loaded) */
  tableColumns: Map<string, ColumnInfo[]>;
  /** Last refresh timestamp */
  lastRefreshed: string | null;
}

/**
 * Monaco completion item kind mapping.
 */
export const CompletionItemKind = {
  Method: 0,
  Function: 1,
  Constructor: 2,
  Field: 3,
  Variable: 4,
  Class: 5,
  Struct: 6,
  Interface: 7,
  Module: 8,
  Property: 9,
  Event: 10,
  Operator: 11,
  Unit: 12,
  Value: 13,
  Constant: 14,
  Enum: 15,
  EnumMember: 16,
  Keyword: 17,
  Text: 18,
  Color: 19,
  File: 20,
  Reference: 21,
  Folder: 22,
  EnumCreator: 23,
  Issue: 24,
  Snippet: 25,
} as const;
