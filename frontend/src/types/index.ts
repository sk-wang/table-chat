// === Request Types ===

export interface DatabaseCreateRequest {
  url: string;
}

export interface QueryRequest {
  sql: string;
}

export interface NaturalQueryRequest {
  prompt: string;
}

// === Response Types ===

// Re-export metadata types from metadata.ts to avoid duplication
export type { ColumnInfo, TableMetadata, DatabaseMetadata } from './metadata';

export interface DatabaseResponse {
  name: string;
  url: string;
  dbType: 'postgresql' | 'mysql';
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseListResponse {
  databases: DatabaseResponse[];
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

export interface QueryResponse {
  sql: string;
  result: QueryResult;
  executionTimeMs: number;
}

export interface NaturalQueryResponse {
  generatedSql: string;
  explanation?: string;
}

export interface ErrorResponse {
  error: string;
  detail?: string;
}

export interface SQLErrorResponse extends ErrorResponse {
  line?: number;
  column?: number;
}

