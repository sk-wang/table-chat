/**
 * Type definitions for SQL query history feature.
 */

/**
 * A single query history record.
 */
export interface QueryHistoryItem {
  /** Record ID */
  id: number;
  /** Database connection name */
  dbName: string;
  /** Full SQL statement */
  sqlContent: string;
  /** Natural language description (if generated from NL) */
  naturalQuery: string | null;
  /** Number of rows returned */
  rowCount: number;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Execution timestamp (ISO8601) */
  executedAt: string;
}

/**
 * Response for listing query history.
 */
export interface QueryHistoryListResponse {
  /** List of history records */
  items: QueryHistoryItem[];
  /** Total count of records */
  total: number;
  /** Whether there are more records */
  hasMore: boolean;
  /** Cursor for next page */
  nextCursor: string | null;
}

/**
 * Parameters for searching query history.
 */
export interface QueryHistorySearchParams {
  /** Search keyword */
  query: string;
  /** Maximum results to return */
  limit?: number;
}

/**
 * Response for searching query history.
 */
export interface QueryHistorySearchResponse {
  /** Matching history records */
  items: QueryHistoryItem[];
  /** Total count of matches */
  total: number;
}

