// Database Metadata Types

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  comment?: string;
  extra?: string;
}

export interface TableSummary {
  schemaName: string;
  tableName: string;
  tableType: 'table' | 'view';
  comment?: string;
}

export interface TableMetadata {
  schemaName: string;
  tableName: string;
  tableType: 'table' | 'view';
  columns: ColumnInfo[];
  rowCount?: number;
  comment?: string;
}

export interface DatabaseMetadata {
  name: string;
  schemas: string[];
  tables: TableMetadata[];
  lastRefreshed?: string;
}

export interface TableListResponse {
  name: string;
  schemas: string[];
  tables: TableSummary[];
  lastRefreshed?: string;
}

// Table search state types
export interface TableSearchState {
  query: string;
  isActive: boolean;
  filteredCount: number;
}

export interface TableSearchResult {
  filteredTables: TableMetadata[];
  totalCount: number;
  resultCount: number;
}

