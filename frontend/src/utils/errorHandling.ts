/**
 * Error Handling Utilities for SQL Query Execution
 *
 * Provides centralized error handling logic for different error types:
 * - Connection errors (503) → Modal with retry
 * - SQL syntax errors (400) → Inline display
 * - Timeout errors (408) → Suggestion to increase timeout
 * - Validation errors (400) → Inline display
 *
 * @feature 021-single-sql-execution
 * @date 2026-01-09
 */

import { Modal } from 'antd';

/**
 * Error types from backend (matches ErrorType from sql-execution.ts)
 */
export type ErrorType =
  | 'sql_error'
  | 'connection_error'
  | 'timeout_error'
  | 'validation_error';

/**
 * Parsed error information
 */
export interface ParsedError {
  type: ErrorType;
  message: string;
  details?: Record<string, unknown>;
  statusCode?: number;
}

/**
 * Parse error from API response
 *
 * Extracts error type, message, and details from various error formats
 *
 * @param error - Error from API call
 * @returns Parsed error information
 */
export function parseQueryError(error: any): ParsedError {
  // Axios error with response
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    // Determine error type based on status code
    let type: ErrorType;
    if (status === 408) {
      type = 'timeout_error';
    } else if (status === 503 || status === 500) {
      type = 'connection_error';
    } else if (status === 400) {
      // Could be SQL error or validation error
      type = data?.errorType === 'validation_error' ? 'validation_error' : 'sql_error';
    } else {
      type = 'connection_error'; // Default
    }

    return {
      type,
      message: data?.error || data?.detail || error.message || 'Unknown error',
      details: data?.details,
      statusCode: status,
    };
  }

  // Network error (no response)
  if (error.request) {
    return {
      type: 'connection_error',
      message: 'Network error: Unable to reach server',
      details: { originalError: error.message },
    };
  }

  // Other error
  return {
    type: 'connection_error',
    message: error.message || 'Unknown error occurred',
  };
}

/**
 * Handle connection error with modal and retry option
 *
 * Shows Ant Design Modal with retry button (research.md Decision 5)
 *
 * @param error - Parsed error
 * @param onRetry - Callback to retry the query
 */
export function handleConnectionError(
  error: ParsedError,
  onRetry: () => void
): void {
  Modal.error({
    title: 'Database Connection Failed',
    content: error.message || 'Please check network or database status',
    okText: 'Retry',
    onOk: onRetry,
    closable: true,
  });
}

/**
 * Handle timeout error with suggestion
 *
 * Shows modal suggesting to increase timeout setting
 *
 * @param error - Parsed error
 * @param currentTimeout - Current timeout value in seconds
 */
export function handleTimeoutError(
  error: ParsedError,
  currentTimeout: number
): void {
  Modal.error({
    title: 'Query Execution Timeout',
    content: `${error.message}\n\nQuery exceeded timeout of ${currentTimeout} seconds.\n\nConsider increasing the timeout in settings if you need to run longer queries.`,
    okText: 'OK',
    closable: true,
  });
}

/**
 * Format SQL error for inline display
 *
 * Creates user-friendly error message with line/column info if available
 *
 * @param error - Parsed error
 * @returns Formatted error message
 */
export function formatSQLError(error: ParsedError): string {
  let message = error.message;

  // Add line/column information if available
  if (error.details?.line || error.details?.column) {
    const line = error.details.line;
    const column = error.details.column;
    message += ` (at line ${line}, column ${column})`;
  }

  return message;
}

/**
 * Format validation error for inline display
 *
 * @param error - Parsed error
 * @returns Formatted error message
 */
export function formatValidationError(error: ParsedError): string {
  let message = error.message;

  // Add field information if available
  if (error.details?.field) {
    message = `${error.details.field}: ${message}`;
  }

  return message;
}

/**
 * Check if error is retryable
 *
 * Connection errors and timeouts are retryable,
 * SQL syntax errors are not
 *
 * @param error - Parsed error
 * @returns true if error can be retried
 */
export function isRetryableError(error: ParsedError): boolean {
  return error.type === 'connection_error' || error.type === 'timeout_error';
}

/**
 * Get error color for UI display
 *
 * @param errorType - Error type
 * @returns Ant Design color name
 */
export function getErrorColor(errorType: ErrorType): string {
  switch (errorType) {
    case 'sql_error':
    case 'validation_error':
      return 'error'; // Red
    case 'timeout_error':
      return 'warning'; // Orange
    case 'connection_error':
      return 'error'; // Red
    default:
      return 'error';
  }
}

/**
 * Get error icon name for UI display
 *
 * @param errorType - Error type
 * @returns Ant Design icon name
 */
export function getErrorIcon(errorType: ErrorType): string {
  switch (errorType) {
    case 'sql_error':
      return 'ExclamationCircleOutlined';
    case 'validation_error':
      return 'WarningOutlined';
    case 'timeout_error':
      return 'ClockCircleOutlined';
    case 'connection_error':
      return 'DisconnectOutlined';
    default:
      return 'ExclamationCircleOutlined';
  }
}

/**
 * Handle query error based on type
 *
 * Central error handler that routes to appropriate handler
 *
 * @param error - Error from API call
 * @param onRetry - Retry callback (for retryable errors)
 * @param currentTimeout - Current timeout setting
 * @returns Error info for inline display (if not modal)
 */
export function handleQueryError(
  error: any,
  onRetry?: () => void,
  currentTimeout = 30
): ParsedError | null {
  const parsedError = parseQueryError(error);

  // Handle based on error type
  switch (parsedError.type) {
    case 'connection_error':
      if (onRetry) {
        handleConnectionError(parsedError, onRetry);
      }
      return null; // Modal shown, no inline display

    case 'timeout_error':
      handleTimeoutError(parsedError, currentTimeout);
      return null; // Modal shown, no inline display

    case 'sql_error':
    case 'validation_error':
      // Return for inline display
      return parsedError;

    default:
      return parsedError;
  }
}

/**
 * Check if execution can proceed
 *
 * Validates that:
 * - No execution is currently in progress
 * - SQL content is not empty
 * - Editor is in a valid state
 *
 * @param isExecuting - Whether query is currently executing
 * @param sql - SQL content to execute
 * @returns Error message if cannot proceed, null if OK
 */
export function validateExecutionState(
  isExecuting: boolean,
  sql: string | null
): string | null {
  if (isExecuting) {
    return 'Another query is currently executing. Please wait for it to complete.';
  }

  if (!sql || !sql.trim()) {
    return 'No SQL statement to execute. Please enter a SQL query.';
  }

  return null; // OK to proceed
}

/**
 * Create retry function with exponential backoff
 *
 * @param operation - Async operation to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in ms (default: 1000)
 * @returns Promise that resolves when operation succeeds or max retries reached
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on non-retryable errors
      const parsedError = parseQueryError(error);
      if (!isRetryableError(parsedError)) {
        throw error;
      }

      // Don't delay after last attempt
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
