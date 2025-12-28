// Database Metadata Types

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
  rowCount?: number;
  comment?: string;
}

export interface DatabaseMetadata {
  name: string;
  schemas: string[];
  tables: TableMetadata[];
  lastRefreshed?: string;
}

