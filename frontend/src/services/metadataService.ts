/**
 * Metadata service for fetching database schema information.
 * Encapsulates API calls to /api/v1/dbs/* endpoints.
 */

import type {
  DatabaseMetadata,
  TableMetadata,
  TableSummary,
} from "../types/editor";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

/**
 * Metadata service for interacting with database schema endpoints.
 */
export class MetadataService {
  private readonly baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch table list (lightweight, no column details).
   */
  async getTableList(
    dbName: string,
    refresh: boolean = false
  ): Promise<{ name: string; schemas: string[]; tables: TableSummary[]; lastRefreshed: string | null }> {
    const params = new URLSearchParams();
    if (refresh) {
      params.append("refresh", "true");
    }
    const url = `${this.baseUrl}/api/v1/dbs/${encodeURIComponent(dbName)}/tables?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Database '${dbName}' not found`);
      }
      throw new Error(`Failed to fetch table list: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch specific table details with columns.
   */
  async getTableColumns(
    dbName: string,
    schemaName: string,
    tableName: string
  ): Promise<TableMetadata> {
    const url = `${this.baseUrl}/api/v1/dbs/${encodeURIComponent(dbName)}/tables/${encodeURIComponent(schemaName)}/${encodeURIComponent(tableName)}`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Table '${schemaName}.${tableName}' not found`);
      }
      throw new Error(`Failed to fetch table columns: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch full database metadata (all tables with columns).
   */
  async getFullMetadata(
    dbName: string,
    refresh: boolean = false
  ): Promise<DatabaseMetadata> {
    const params = new URLSearchParams();
    if (refresh) {
      params.append("refresh", "true");
    }
    const url = `${this.baseUrl}/api/v1/dbs/${encodeURIComponent(dbName)}/metadata?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Database '${dbName}' not found`);
      }
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    return response.json();
  }
}

// Singleton instance
export const metadataService = new MetadataService();
