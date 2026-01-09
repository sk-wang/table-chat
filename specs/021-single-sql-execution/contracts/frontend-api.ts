/**
 * Frontend API Contracts for Single SQL Statement Execution
 *
 * This file defines TypeScript interfaces for all data structures used in the
 * Single SQL Statement Execution feature. These interfaces ensure type safety
 * across the frontend application.
 *
 * @feature 021-single-sql-execution
 * @date 2026-01-09
 */

// ============================================================================
// SQL Statement Parsing
// ============================================================================

/**
 * Represents a position in the Monaco Editor
 */
export interface EditorPosition {
  /** Line number (1-based) */
  line: number;
  /** Column number (1-based) */
  column: number;
}

/**
 * Represents a range/selection in the Monaco Editor
 */
export interface EditorRange {
  /** Starting line number (1-based) */
  startLineNumber: number;
  /** Starting column number (1-based) */
  startColumn: number;
  /** Ending line number (1-based) */
  endLineNumber: number;
  /** Ending column number (1-based) */
  endColumn: number;
}

/**
 * Represents a single parsed SQL statement with its position
 */
export interface SqlStatement {
  /** The SQL text content */
  text: string;
  /** Starting position in the editor */
  startPosition: EditorPosition;
  /** Ending position in the editor */
  endPosition: EditorPosition;
  /** Zero-based index in the statements array */
  index: number;
  /** Statement type (always 'SELECT' for this feature) */
  type: 'SELECT';
}

/**
 * Configuration for visual highlighting of a statement
 */
export interface StatementHighlight {
  /** The range to highlight */
  range: EditorRange;
  /** CSS class for styling */
  className: string;
  /** Optional hover message */
  hoverMessage?: string;
}

// ============================================================================
// Query Execution
// ============================================================================

/**
 * Query execution status
 */
export type ExecutionStatus = 'idle' | 'executing' | 'success' | 'error' | 'timeout';

/**
 * Error types returned by the backend
 */
export type ErrorType = 'sql_error' | 'connection_error' | 'timeout_error' | 'validation_error';

/**
 * Tracks the current state of query execution
 */
export interface ExecutionState {
  /** Current execution status */
  status: ExecutionStatus;
  /** SQL statement being executed */
  sql: string | null;
  /** Execution result (if success) */
  result: QueryResult | null;
  /** Error message (if error/timeout) */
  error: string | null;
  /** Error type (if error/timeout) */
  errorType: ErrorType | null;
  /** Execution start time (milliseconds since epoch) */
  startTime: number | null;
  /** Execution duration in milliseconds */
  duration: number | null;
}

// ============================================================================
// Backend API Request/Response Models (matches Pydantic models)
// ============================================================================

/**
 * Request payload for executing a SQL query
 * Maps to backend QueryRequest Pydantic model
 */
export interface QueryRequest {
  /** SQL SELECT statement to execute */
  sql: string;
  /** Natural language description (if SQL was AI-generated) */
  naturalQuery?: string | null;
  /** Query timeout in seconds (10-300, default: 30) */
  timeoutSeconds?: number;
}

/**
 * Query result data
 * Maps to backend QueryResult Pydantic model
 */
export interface QueryResult {
  /** Column names */
  columns: string[];
  /** Data rows (array of objects with column names as keys) */
  rows: Record<string, unknown>[];
  /** Number of rows returned */
  rowCount: number;
  /** True if LIMIT was auto-added */
  truncated: boolean;
}

/**
 * Response from executing a SQL query
 * Maps to backend QueryResponse Pydantic model
 */
export interface QueryResponse {
  /** Executed SQL (may include auto-added LIMIT) */
  sql: string;
  /** Query result data */
  result: QueryResult;
  /** Execution time in milliseconds */
  executionTimeMs: number;
}

/**
 * Error response from the backend
 * Maps to backend ErrorResponse Pydantic model
 */
export interface ErrorResponse {
  /** Error message */
  error: string;
  /** Error category */
  errorType: ErrorType;
  /** Additional error details */
  details?: Record<string, unknown> | null;
}

// ============================================================================
// Settings
// ============================================================================

/**
 * User preference for query execution timeout
 * Stored in localStorage
 */
export interface QueryTimeoutSettings {
  /** Timeout duration in seconds (10-300) */
  timeoutSeconds: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result of parsing SQL content into statements
 */
export interface ParseResult {
  /** Array of parsed statements */
  statements: SqlStatement[];
  /** Parse errors, if any */
  errors: string[];
}

/**
 * Options for the SQL statement parser
 */
export interface ParseOptions {
  /** SQL dialect (postgres or mysql) */
  dialect?: 'postgres' | 'mysql';
  /** Whether to preserve comments */
  preserveComments?: boolean;
}

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcut {
  /** Key code (e.g., 'F8', 'Enter') */
  key: string;
  /** Ctrl key required */
  ctrlKey?: boolean;
  /** Alt key required */
  altKey?: boolean;
  /** Shift key required */
  shiftKey?: boolean;
  /** Meta/Cmd key required (Mac) */
  metaKey?: boolean;
  /** Callback function */
  handler: () => void;
}

// ============================================================================
// Component Props
// ============================================================================

/**
 * Props for the SQL Editor component
 */
export interface SqlEditorProps {
  /** Initial SQL content */
  initialValue?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Callback when execute is triggered */
  onExecute?: (sql: string) => void;
  /** Callback when content changes */
  onChange?: (value: string) => void;
  /** Editor height in pixels */
  height?: number;
  /** SQL dialect for syntax highlighting */
  dialect?: 'postgres' | 'mysql';
}

/**
 * Props for the Execution Controls component
 */
export interface ExecutionControlsProps {
  /** Current execution state */
  executionState: ExecutionState;
  /** Callback when execute button is clicked */
  onExecute: () => void;
  /** Callback when retry button is clicked */
  onRetry: () => void;
  /** Whether execution is currently disabled */
  disabled?: boolean;
}

/**
 * Props for the Query Result component
 */
export interface QueryResultProps {
  /** Query result to display */
  result: QueryResult | null;
  /** Whether to show in loading state */
  loading: boolean;
  /** Error message to display */
  error: string | null;
  /** Error type */
  errorType: ErrorType | null;
}

// ============================================================================
// Custom Hooks Return Types
// ============================================================================

/**
 * Return type for useSqlStatementParser hook
 */
export interface UseSqlStatementParserResult {
  /** Parsed statements */
  statements: SqlStatement[];
  /** Currently selected/highlighted statement */
  currentStatement: SqlStatement | null;
  /** Parse the SQL content */
  parse: (content: string) => void;
  /** Find statement at given position */
  findStatementAtPosition: (position: EditorPosition) => SqlStatement | null;
  /** Parse errors */
  errors: string[];
}

/**
 * Return type for useEditorHighlight hook
 */
export interface UseEditorHighlightResult {
  /** Current highlight configuration */
  highlight: StatementHighlight | null;
  /** Update highlight for given statement */
  updateHighlight: (statement: SqlStatement | null) => void;
  /** Clear all highlights */
  clearHighlight: () => void;
}

/**
 * Return type for useKeyboardShortcut hook
 */
export interface UseKeyboardShortcutResult {
  /** Register a keyboard shortcut */
  register: (shortcut: KeyboardShortcut) => void;
  /** Unregister a keyboard shortcut */
  unregister: (key: string) => void;
  /** Clear all registered shortcuts */
  clearAll: () => void;
}

/**
 * Return type for useQueryExecution hook
 */
export interface UseQueryExecutionResult {
  /** Current execution state */
  executionState: ExecutionState;
  /** Execute a SQL query */
  executeQuery: (sql: string, options?: { timeoutSeconds?: number }) => Promise<void>;
  /** Retry last failed query */
  retryQuery: () => Promise<void>;
  /** Cancel ongoing execution */
  cancelQuery: () => void;
  /** Reset execution state */
  reset: () => void;
}

// ============================================================================
// Validation Constants
// ============================================================================

/**
 * Validation constraints for query timeout
 */
export const QUERY_TIMEOUT_CONSTRAINTS = {
  MIN: 10,
  MAX: 300,
  DEFAULT: 30,
} as const;

/**
 * LocalStorage keys
 */
export const STORAGE_KEYS = {
  QUERY_TIMEOUT: 'tableChat:queryTimeout',
} as const;

/**
 * CSS class names for highlighting
 */
export const HIGHLIGHT_CLASSES = {
  ACTIVE_STATEMENT: 'active-sql-statement',
  ERROR_STATEMENT: 'error-sql-statement',
} as const;
