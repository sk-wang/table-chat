import type { DataProvider } from '@refinedev/core';
import { apiClient } from '../services/api';

/**
 * Custom data provider for Refine that wraps our API client.
 * This provides the standard CRUD operations that Refine expects.
 */
export const dataProvider: DataProvider = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getList: async ({ resource }): Promise<any> => {
    if (resource === 'databases') {
      const response = await apiClient.listDatabases();
      return {
        data: response.databases,
        total: response.databases.length,
      };
    }
    throw new Error(`Unknown resource: ${resource}`);
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getOne: async ({ resource, id }): Promise<any> => {
    if (resource === 'databases') {
      const data = await apiClient.getDatabase(id as string);
      return { data };
    }
    throw new Error(`Unknown resource: ${resource}`);
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: async ({ resource, variables }): Promise<any> => {
    if (resource === 'databases') {
      const { name, url } = variables as { name: string; url: string };
      const data = await apiClient.createOrUpdateDatabase(name, { url });
      return { data };
    }
    throw new Error(`Unknown resource: ${resource}`);
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: async ({ resource, id, variables }): Promise<any> => {
    if (resource === 'databases') {
      const { url } = variables as { url: string };
      const data = await apiClient.createOrUpdateDatabase(id as string, { url });
      return { data };
    }
    throw new Error(`Unknown resource: ${resource}`);
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteOne: async ({ resource, id }): Promise<any> => {
    if (resource === 'databases') {
      await apiClient.deleteDatabase(id as string);
      return { data: { id } };
    }
    throw new Error(`Unknown resource: ${resource}`);
  },

  getApiUrl: () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:7888',

  // Optional methods - not implemented for now
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getMany: async (): Promise<any> => {
    throw new Error('getMany not implemented');
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createMany: async (): Promise<any> => {
    throw new Error('createMany not implemented');
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateMany: async (): Promise<any> => {
    throw new Error('updateMany not implemented');
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteMany: async (): Promise<any> => {
    throw new Error('deleteMany not implemented');
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom: async (): Promise<any> => {
    throw new Error('custom not implemented');
  },
};
