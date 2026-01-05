/**
 * Unit tests for metadataService.
 * Tests API calls to database metadata endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MetadataService } from "../src/services/metadataService";
import type { ColumnInfo, TableSummary } from "../src/types/editor";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("MetadataService", () => {
  let service: MetadataService;

  beforeEach(() => {
    service = new MetadataService("http://test-api");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getTableList", () => {
    it("should fetch table list successfully", async () => {
      const mockTables: TableSummary[] = [
        { schemaName: "public", tableName: "users", tableType: "table", comment: null },
        { schemaName: "public", tableName: "orders", tableType: "table", comment: null },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: "test-db",
          schemas: ["public"],
          tables: mockTables,
          lastRefreshed: "2026-01-03T10:00:00Z",
        }),
      });

      const result = await service.getTableList("test-db");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api/api/v1/dbs/test-db/tables?"
      );
      expect(result.tables).toEqual(mockTables);
    });

    it("should include refresh parameter when requested", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: "test-db",
          schemas: [],
          tables: [],
          lastRefreshed: null,
        }),
      });

      await service.getTableList("test-db", true);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("refresh=true")
      );
    });

    it("should throw 404 error when database not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(service.getTableList("unknown-db")).rejects.toThrow(
        "Database 'unknown-db' not found"
      );
    });

    it("should throw generic error on fetch failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

      await expect(service.getTableList("test-db")).rejects.toThrow(
        "Failed to fetch table list"
      );
    });
  });

  describe("getTableColumns", () => {
    it("should fetch table columns successfully", async () => {
      const mockColumns: ColumnInfo[] = [
        { name: "id", dataType: "integer", isNullable: false, isPrimaryKey: true, defaultValue: null, comment: null },
        { name: "name", dataType: "varchar(255)", isNullable: false, isPrimaryKey: false, defaultValue: null, comment: null },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          schemaName: "public",
          tableName: "users",
          tableType: "table",
          columns: mockColumns,
          rowCount: 100,
          comment: null,
        }),
      });

      const result = await service.getTableColumns("test-db", "public", "users");

      expect(result.columns).toEqual(mockColumns);
    });

    it("should throw 404 when table not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(
        service.getTableColumns("test-db", "public", "unknown")
      ).rejects.toThrow("Table 'public.unknown' not found");
    });
  });

  describe("getFullMetadata", () => {
    it("should fetch complete database metadata", async () => {
      const mockResponse = {
        name: "test-db",
        schemas: ["public", "sales"],
        tables: [
          {
            schemaName: "public",
            tableName: "users",
            tableType: "table",
            columns: [],
            rowCount: null,
            comment: null,
          },
        ],
        lastRefreshed: "2026-01-03T10:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.getFullMetadata("test-db");

      expect(result).toEqual(mockResponse);
    });
  });
});
