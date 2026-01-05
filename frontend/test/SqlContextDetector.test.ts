/**
 * Unit tests for SqlContextDetector.
 * Tests SQL context detection for autocomplete.
 */

import { describe, it, expect } from "vitest";
import { detectSqlContext, type SqlContext } from "../src/components/editor/SqlContextDetector";

describe("SqlContextDetector", () => {
  describe("detectSqlContext", () => {
    it("should detect TABLE_NAME context after FROM keyword", () => {
      const sql = "SELECT * FROM ";
      const result = detectSqlContext(sql, sql.length);
      expect(result.contextType).toBe(SqlContext.TABLE_NAME);
      expect(result.prefix).toBe("");
    });

    it("should detect TABLE_NAME context after JOIN keyword", () => {
      const sql = "SELECT * FROM users INNER JOIN ";
      const result = detectSqlContext(sql, sql.length);
      expect(result.contextType).toBe(SqlContext.TABLE_NAME);
      expect(result.prefix).toBe("");
    });

    it("should detect TABLE_NAME context with partial table name", () => {
      const sql = "SELECT * FROM usr";
      const result = detectSqlContext(sql, sql.length);
      expect(result.contextType).toBe(SqlContext.TABLE_NAME);
      expect(result.prefix).toBe("usr");
    });

    it("should detect COLUMN_NAME context after SELECT", () => {
      const sql = "SELECT ";
      const result = detectSqlContext(sql, sql.length);
      expect(result.contextType).toBe(SqlContext.COLUMN_NAME);
      expect(result.prefix).toBe("");
    });

    it("should detect COLUMN_NAME context in WHERE clause", () => {
      const sql = "SELECT * FROM users WHERE ";
      const result = detectSqlContext(sql, sql.length);
      expect(result.contextType).toBe(SqlContext.COLUMN_NAME);
      expect(result.prefix).toBe("");
    });

    it("should detect KEYWORD context at start of query", () => {
      const sql = "SEL";
      const result = detectSqlContext(sql, sql.length);
      expect(result.contextType).toBe(SqlContext.KEYWORD);
      expect(result.prefix).toBe("SEL");
    });

    it("should detect ALIAS_COLUMN context after alias dot", () => {
      const sql = "SELECT u. FROM users u";
      const result = detectSqlContext(sql, sql.length - 1); // Position after "u."
      expect(result.contextType).toBe(SqlContext.ALIAS_COLUMN);
      expect(result.currentAlias).toBe("u");
    });

    it("should parse table references from query", () => {
      const sql = "SELECT * FROM users u INNER JOIN orders o ON u.id = o.user_id";
      const result = detectSqlContext(sql, sql.length);
      expect(result.tableRefs).toHaveLength(2);
      expect(result.tableRefs[0].tableName).toBe("users");
      expect(result.tableRefs[0].alias).toBe("u");
      expect(result.tableRefs[1].tableName).toBe("orders");
      expect(result.tableRefs[1].alias).toBe("o");
    });

    it("should handle comma-separated columns in SELECT", () => {
      const sql = "SELECT id, name, ";
      const result = detectSqlContext(sql, sql.length);
      expect(result.contextType).toBe(SqlContext.COLUMN_NAME);
      expect(result.prefix).toBe("");
    });

    it("should handle ON clause in JOIN", () => {
      const sql = "SELECT * FROM users u JOIN orders o ON ";
      const result = detectSqlContext(sql, sql.length);
      expect(result.contextType).toBe(SqlContext.COLUMN_NAME);
      expect(result.tableRefs).toHaveLength(2);
    });
  });
});
