/**
 * Unit tests for TableReferenceParser.
 * Tests parsing of table references and aliases from SQL queries.
 */

import { describe, it, expect } from "vitest";
import { parseTableReferences, type TableReference } from "../src/components/editor/TableReferenceParser";

describe("TableReferenceParser", () => {
  describe("parseTableReferences", () => {
    it("should parse single table without alias", () => {
      const sql = "SELECT * FROM users";
      const result = parseTableReferences(sql);
      expect(result).toHaveLength(1);
      expect(result[0].tableName).toBe("users");
      expect(result[0].alias).toBeNull();
    });

    it("should parse single table with alias", () => {
      const sql = "SELECT * FROM users u";
      const result = parseTableReferences(sql);
      expect(result).toHaveLength(1);
      expect(result[0].tableName).toBe("users");
      expect(result[0].alias).toBe("u");
    });

    it("should parse multiple tables with aliases", () => {
      const sql = "SELECT * FROM users u INNER JOIN orders o ON u.id = o.user_id";
      const result = parseTableReferences(sql);
      expect(result).toHaveLength(2);
      expect(result[0].tableName).toBe("users");
      expect(result[0].alias).toBe("u");
      expect(result[1].tableName).toBe("orders");
      expect(result[1].alias).toBe("o");
    });

    it("should parse table with schema prefix", () => {
      const sql = "SELECT * FROM public.users";
      const result = parseTableReferences(sql);
      expect(result).toHaveLength(1);
      expect(result[0].schemaName).toBe("public");
      expect(result[0].tableName).toBe("users");
    });

    it("should handle multiple JOIN types", () => {
      const sql = "SELECT * FROM users u LEFT JOIN orders o ON u.id = o.user_id RIGHT JOIN products p ON o.product_id = p.id";
      const result = parseTableReferences(sql);
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.tableName)).toEqual(["users", "orders", "products"]);
    });

    it("should handle subqueries (ignore tables in subqueries)", () => {
      const sql = "SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)";
      const result = parseTableReferences(sql);
      // Should only parse the outer query's FROM clause
      expect(result).toHaveLength(1);
      expect(result[0].tableName).toBe("users");
    });

    it("should handle empty query", () => {
      const result = parseTableReferences("");
      expect(result).toHaveLength(0);
    });

    it("should handle query without FROM clause", () => {
      const result = parseTableReferences("SELECT 1");
      expect(result).toHaveLength(0);
    });

    it("should parse UPDATE statement", () => {
      const sql = "UPDATE users SET name = 'test'";
      const result = parseTableReferences(sql);
      expect(result).toHaveLength(1);
      expect(result[0].tableName).toBe("users");
    });

    it("should parse INSERT INTO statement", () => {
      const sql = "INSERT INTO users (name) VALUES ('test')";
      const result = parseTableReferences(sql);
      expect(result).toHaveLength(1);
      expect(result[0].tableName).toBe("users");
    });
  });
});
