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

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  comment?: string;
}

export interface TableMetadata {
  schemaName: string;
  tableName: string;
  tableType: 'table' | 'view';
  columns: ColumnInfo[];
}

export interface DatabaseResponse {
  name: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  tables?: TableMetadata[];
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

