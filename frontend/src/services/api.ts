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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
      const response: AxiosResponse<QueryResponse> = await this.client.post(
        `/dbs/${dbName}/query`,
        data
      );
      return response.data;
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
}

export const apiClient = new ApiClient();
