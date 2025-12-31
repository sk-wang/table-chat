// === Request Types ===

export interface SSHConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  password?: string;
  privateKey?: string;
  keyPassphrase?: string;
}

export interface DatabaseCreateRequest {
  url: string;
  sslDisabled?: boolean;
  sshConfig?: SSHConfig;
}

export interface QueryRequest {
  sql: string;
  naturalQuery?: string;
}

export interface NaturalQueryRequest {
  prompt: string;
}

// === Response Types ===

// Re-export metadata types from metadata.ts to avoid duplication
export type { ColumnInfo, TableSummary, TableMetadata, DatabaseMetadata, TableListResponse } from './metadata';

export interface SSHConfigResponse {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  // Note: password, privateKey, and keyPassphrase are not included in response
}

export interface DatabaseResponse {
  name: string;
  url: string;
  dbType: 'postgresql' | 'mysql';
  sslDisabled: boolean;
  sshConfig: SSHConfigResponse | null;
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
  /** 导出格式，当识别到导出意图时返回 */
  exportFormat?: 'csv' | 'json' | 'xlsx' | null;
}

export interface ErrorResponse {
  error: string;
  detail?: string;
}

export interface SQLErrorResponse extends ErrorResponse {
  line?: number;
  column?: number;
}

