import axios from 'axios';
import type { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import type {
  DatabaseCreateRequest,
  DatabaseListResponse,
  DatabaseResponse,
  ErrorResponse,
  NaturalQueryRequest,
  NaturalQueryResponse,
  QueryRequest,
  QueryResponse,
} from '../types';
import type {
  QueryHistoryListResponse,
  QueryHistorySearchResponse,
} from '../types/history';
import type { DatabaseMetadata, TableListResponse, TableMetadata } from '../types/metadata';
import type {
  AgentEventHandlers,
  AgentQueryRequest,
  AgentStatusResponse,
  ThinkingEventData,
  ToolCallEventData,
  MessageEventData,
  SQLEventData,
  ErrorEventData,
  DoneEventData,
} from '../types/agent';
import type {
  EditorMemory,
  EditorMemoryCreate,
  EditorMemoryList,
} from '../types/editorMemory';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7888';

/**
 * Clean SQL by compressing whitespace outside of string literals
 * Preserves whitespace inside strings (single/double quotes)
 */
function cleanSQL(sql: string): string {
  const parts: Array<{ content: string; isString: boolean }> = [];
  let current = '';
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];

    // Handle escape sequences
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      current += char;
      escaped = true;
      continue;
    }

    // Handle string delimiters
    if ((char === "'" || char === '"' || char === '`') && !inString) {
      // Start of string literal
      if (current) {
        parts.push({ content: current, isString: false });
        current = '';
      }
      stringChar = char;
      inString = true;
      current += char;
    } else if (char === stringChar && inString) {
      // Check for doubled quotes (SQL escape: '' or "")
      if (sql[i + 1] === stringChar) {
        current += char + sql[i + 1];
        i++; // Skip next char
      } else {
        // End of string literal
        current += char;
        parts.push({ content: current, isString: true });
        current = '';
        inString = false;
        stringChar = '';
      }
    } else {
      current += char;
    }
  }

  // Handle remaining content
  if (current) {
    parts.push({ content: current, isString: inString });
  }

  // Compress whitespace only in non-string parts
  return parts
    .map(part => {
      if (part.isString) {
        return part.content; // Preserve strings exactly
      } else {
        return part.content.replace(/\s+/g, ' '); // Compress whitespace
      }
    })
    .join('')
    .trim();
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private handleError(error: AxiosError<ErrorResponse>): never {
    const message = error.response?.data?.error || error.message || 'Unknown error';
    const detail = error.response?.data?.detail;
    throw new Error(detail ? `${message}: ${detail}` : message);
  }

  // === Database Operations ===

  async listDatabases(): Promise<DatabaseListResponse> {
    try {
      const response: AxiosResponse<DatabaseListResponse> = await this.client.get('/dbs');
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  async getDatabase(name: string): Promise<DatabaseResponse> {
    try {
      const response: AxiosResponse<DatabaseResponse> = await this.client.get(`/dbs/${name}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  async createOrUpdateDatabase(name: string, data: DatabaseCreateRequest): Promise<DatabaseResponse> {
    try {
      const response: AxiosResponse<DatabaseResponse> = await this.client.put(`/dbs/${name}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  async deleteDatabase(name: string): Promise<void> {
    try {
      await this.client.delete(`/dbs/${name}`);
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // === Query Operations ===

  async executeQuery(dbName: string, data: QueryRequest): Promise<QueryResponse> {
    try {
      // Clean up SQL: compress whitespace outside of string literals
      const cleanedSql = cleanSQL(data.sql);

      const response: AxiosResponse<QueryResponse> = await this.client.post(
        `/dbs/${dbName}/query`,
        { ...data, sql: cleanedSql }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  async formatSql(sql: string, dialect?: string): Promise<string> {
    try {
      const response: AxiosResponse<{ formatted: string }> = await this.client.post(
        '/dbs/format',
        { sql, dialect }
      );
      return response.data.formatted;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  async naturalLanguageQuery(
    dbName: string,
    data: NaturalQueryRequest
  ): Promise<NaturalQueryResponse> {
    try {
      const response: AxiosResponse<NaturalQueryResponse> = await this.client.post(
        `/dbs/${dbName}/query/natural`,
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // === Metadata Operations ===

  async getDatabaseMetadata(dbName: string, refresh = false): Promise<DatabaseMetadata> {
    try {
      const response: AxiosResponse<DatabaseMetadata> = await this.client.get(
        `/dbs/${dbName}/metadata`,
        { params: { refresh } }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  async refreshDatabaseMetadata(dbName: string): Promise<DatabaseMetadata> {
    try {
      const response: AxiosResponse<DatabaseMetadata> = await this.client.post(
        `/dbs/${dbName}/metadata/refresh`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  async getTableList(dbName: string, refresh = false): Promise<TableListResponse> {
    try {
      const response: AxiosResponse<TableListResponse> = await this.client.get(
        `/dbs/${dbName}/metadata/tables`,
        { params: { refresh } }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  async getTableDetails(
    dbName: string,
    schemaName: string,
    tableName: string
  ): Promise<TableMetadata> {
    try {
      const response: AxiosResponse<TableMetadata> = await this.client.get(
        `/dbs/${dbName}/metadata/tables/${schemaName}/${tableName}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // === Query History Operations ===

  async getQueryHistory(
    dbName: string,
    limit: number = 20,
    before?: string
  ): Promise<QueryHistoryListResponse> {
    try {
      const response: AxiosResponse<QueryHistoryListResponse> = await this.client.get(
        `/dbs/${dbName}/history`,
        { params: { limit, before } }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  async searchQueryHistory(
    dbName: string,
    query: string,
    limit: number = 20
  ): Promise<QueryHistorySearchResponse> {
    try {
      const response: AxiosResponse<QueryHistorySearchResponse> = await this.client.get(
        `/dbs/${dbName}/history/search`,
        { params: { query, limit } }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // === Agent Operations ===

  async getAgentStatus(): Promise<AgentStatusResponse> {
    try {
      const response: AxiosResponse<AgentStatusResponse> = await this.client.get('/agent/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  /**
   * Start an agent query with SSE streaming.
   * Returns an AbortController that can be used to cancel the request.
   */
  agentQuery(
    dbName: string,
    request: AgentQueryRequest,
    handlers: AgentEventHandlers
  ): AbortController {
    const controller = new AbortController();

    const processStream = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/dbs/${dbName}/agent/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
          handlers.onError?.({
            error: errorData.error || `HTTP ${response.status}`,
            detail: errorData.detail,
          });
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          handlers.onError?.({ error: 'No response body' });
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        // Move outside while loop to persist across chunks
        let currentEvent = '';
        let currentData = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events
          // SSE uses \r\n (CRLF) line endings, so we split on \n and trim \r
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const rawLine of lines) {
            // Remove trailing \r (from CRLF line endings)
            const line = rawLine.replace(/\r$/, '');
            
            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              currentData = line.slice(5).trim();
            } else if (line === '') {
              // Empty line marks end of event
              if (currentEvent && currentData) {
                // Process the event
                try {
                  const data = JSON.parse(currentData);
                  console.log('[SSE] Event:', currentEvent, 'Data:', data);
                  switch (currentEvent) {
                    case 'thinking':
                      handlers.onThinking?.(data as ThinkingEventData);
                      break;
                    case 'text_delta':
                      handlers.onTextDelta?.(data as { text: string });
                      break;
                    case 'tool_call':
                      handlers.onToolCall?.(data as ToolCallEventData);
                      break;
                    case 'message':
                      handlers.onMessage?.(data as MessageEventData);
                      break;
                    case 'sql':
                      handlers.onSQL?.(data as SQLEventData);
                      break;
                    case 'error':
                      handlers.onError?.(data as ErrorEventData);
                      break;
                    case 'done':
                      handlers.onDone?.(data as DoneEventData);
                      break;
                    default:
                      console.log('[SSE] Unknown event:', currentEvent);
                  }
                } catch (e) {
                  console.error('Failed to parse SSE data:', e, 'Raw:', currentData);
                }
              }
              // Reset for next event
              currentEvent = '';
              currentData = '';
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          // Request was cancelled
          return;
        }
        handlers.onError?.({
          error: (error as Error).message || 'Unknown error',
        });
      }
    };

    processStream();
    return controller;
  }

  async cancelAgentQuery(dbName: string): Promise<{ cancelled: boolean }> {
    try {
      const response = await this.client.post(`/dbs/${dbName}/agent/cancel`);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  // === Editor Memory Operations ===

  async saveEditorMemory(data: EditorMemoryCreate): Promise<EditorMemory> {
    try {
      const response: AxiosResponse<EditorMemory> = await this.client.post(
        '/editor-memory',
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  async getEditorMemories(connectionId: string): Promise<EditorMemoryList> {
    try {
      const response: AxiosResponse<EditorMemoryList> = await this.client.get(
        `/editor-memory/${connectionId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  async getLatestEditorMemory(connectionId: string): Promise<EditorMemory | null> {
    try {
      const response: AxiosResponse<EditorMemory | null> = await this.client.get(
        `/editor-memory/latest/${connectionId}`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  async deleteEditorMemory(recordId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.delete(`/editor-memory/${recordId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }

  async deleteAllEditorMemories(connectionId: string): Promise<{
    success: boolean;
    message: string;
    deletedCount: number;
  }> {
    try {
      const response = await this.client.delete(`/editor-memory/connection/${connectionId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError<ErrorResponse>);
    }
  }
}

export const apiClient = new ApiClient();
