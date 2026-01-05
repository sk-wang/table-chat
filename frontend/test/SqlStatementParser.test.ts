/**
 * Unit tests for SqlStatementParser.
 * Tests parsing of multiple SQL statements and position detection.
 */

import { describe, it, expect } from "vitest";
import { parseStatements, getStatementAtPosition } from "../src/components/editor/SqlStatementParser";

describe("SqlStatementParser", () => {
  describe("parseStatements", () => {
    it("should parse a single statement", () => {
      const sql = "SELECT * FROM users";
      const result = parseStatements(sql);

      expect(result.statementCount).toBe(1);
      expect(result.statements[0].text).toBe("SELECT * FROM users");
    });

    it("should parse multiple statements separated by semicolons", () => {
      const sql = "SELECT * FROM users; SELECT * FROM orders;";
      const result = parseStatements(sql);

      expect(result.statementCount).toBe(2);
      expect(result.statements[0].text).toBe("SELECT * FROM users");
      expect(result.statements[1].text).toBe("SELECT * FROM orders");
    });

    it("should ignore semicolons inside string literals", () => {
      const sql = "SELECT 'hello; world' FROM users";
      const result = parseStatements(sql);

      expect(result.statementCount).toBe(1);
      expect(result.statements[0].text).toBe("SELECT 'hello; world' FROM users");
    });

    it("should ignore semicolons inside double quotes", () => {
      const sql = 'SELECT "test; value" FROM users';
      const result = parseStatements(sql);

      expect(result.statementCount).toBe(1);
      expect(result.statements[0].text).toBe('SELECT "test; value" FROM users');
    });

    it("should ignore semicolons in line comments", () => {
      const sql = "SELECT * FROM users -- comment with semicolon; here\n; SELECT 1";
      const result = parseStatements(sql);

      expect(result.statementCount).toBe(2);
      expect(result.statements[0].text).toContain("-- comment with semicolon");
    });

    it("should ignore semicolons in block comments", () => {
      const sql = "SELECT /* comment with ; semicolon */ * FROM users; SELECT 1";
      const result = parseStatements(sql);

      expect(result.statementCount).toBe(2);
    });

    it("should handle escaped quotes in strings", () => {
      const sql = "SELECT 'it\\'s a test' FROM users";
      const result = parseStatements(sql);

      expect(result.statementCount).toBe(1);
    });

    it("should handle empty statements between semicolons", () => {
      const sql = "SELECT * FROM users;; SELECT * FROM orders";
      const result = parseStatements(sql);

      expect(result.statementCount).toBe(2);
    });

    it("should track statement positions correctly", () => {
      const sql = "SELECT * FROM users;\nSELECT * FROM orders;";
      const result = parseStatements(sql);

      expect(result.statements[0].startLine).toBe(1);
      expect(result.statements[0].endLine).toBe(1);
      expect(result.statements[1].startLine).toBe(2);
      expect(result.statements[1].endLine).toBe(2);
    });

    it("should handle subqueries with parenthesis", () => {
      const sql = "SELECT * FROM (SELECT * FROM users) AS u; SELECT * FROM orders";
      const result = parseStatements(sql);

      expect(result.statementCount).toBe(2);
    });
  });

  describe("getStatementAtPosition", () => {
    it("should find statement when cursor is in first statement", () => {
      const sql = "SELECT * FROM users; SELECT * FROM orders;";
      const statement = getStatementAtPosition(sql, 1, 10);

      expect(statement).not.toBeNull();
      expect(statement?.text).toBe("SELECT * FROM users");
    });

    it("should find statement when cursor is in second statement", () => {
      const sql = "SELECT * FROM users;\nSELECT * FROM orders;";
      const statement = getStatementAtPosition(sql, 2, 10);

      expect(statement).not.toBeNull();
      expect(statement?.text).toBe("SELECT * FROM orders");
    });

    it("should return null for empty SQL", () => {
      const statement = getStatementAtPosition("", 1, 1);

      expect(statement).toBeNull();
    });

    it("should find nearest statement when cursor between statements", () => {
      const sql = "SELECT * FROM users;  SELECT * FROM orders;";
      const statement = getStatementAtPosition(sql, 1, 23); // Position between statements

      expect(statement).not.toBeNull();
      // Should find one of the statements
      expect(["SELECT * FROM users", "SELECT * FROM orders"]).toContain(statement?.text);
    });

    it("should handle multi-line statements", () => {
      const sql = "SELECT id,\nname\nFROM users;\nSELECT * FROM orders;";
      const statement = getStatementAtPosition(sql, 2, 5);

      expect(statement).not.toBeNull();
      expect(statement?.text).toContain("SELECT id");
    });
  });
});
