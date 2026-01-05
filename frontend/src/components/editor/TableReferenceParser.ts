/**
 * Table Reference Parser for SQL queries.
 * Extracts table references and aliases from SQL queries.
 */

import type { TableReference } from "../../types/editor";
import { SQL_KEYWORD_SET } from "./sqlKeywords";

/**
 * Parses table references from a SQL query.
 *
 * @param sql - The SQL query text
 * @returns Array of table references with schema, table name, and alias
 */
export function parseTableReferences(sql: string): TableReference[] {
  const references: TableReference[] = [];

  // Remove string literals and comments
  const cleanSql = sql
    .replace(/'[^']*'/g, "")
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  // Match FROM/JOIN patterns
  // Pattern: FROM/JOIN followed by optional schema.table and optional alias
  const tableRegex =
    /(?:FROM|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN|JOIN|UPDATE|INSERT\s+INTO)\s+([a-zA-Z_][\w]*)\.?([a-zA-Z_][\w]*)?(?:\s+([a-zA-Z_][\w]*))?/gi;

  let match;
  const seenTables = new Set<string>();

  while ((match = tableRegex.exec(cleanSql)) !== null) {
    let schemaName: string | null = null;
    let tableName: string;
    let alias: string | null = null;

    // Check if match[3] is a SQL keyword (should not be treated as alias)
    const match3IsKeyword = match[3] && SQL_KEYWORD_SET.has(match[3].toUpperCase());
    const match2IsKeyword = match[2] && SQL_KEYWORD_SET.has(match[2].toUpperCase());

    if (match[3] && !match3IsKeyword) {
      // Has potential schema.table and alias
      if (match[2] && !match2IsKeyword) {
        // Has schema.table and alias: FROM schema.table alias
        schemaName = match[1];
        tableName = match[2];
        alias = match[3];
      } else {
        // Has table and alias (no schema): FROM table alias
        tableName = match[1];
        alias = match[3];
      }
    } else if (match[2] && !match2IsKeyword) {
      // Could be schema.table or table with alias
      // Check if the second word looks like an alias (no dot in it, not a keyword)
      if (!SQL_KEYWORD_SET.has(match[2].toUpperCase())) {
        tableName = match[1];
        alias = match[2];
      } else {
        schemaName = match[1];
        tableName = match[2];
      }
    } else {
      tableName = match[1];
    }

    // Avoid duplicates
    const tableKey = `${schemaName || "public"}.${tableName}`;
    if (!seenTables.has(tableKey)) {
      seenTables.add(tableKey);
      console.log('[TableReferenceParser] Found table reference:', { schemaName, tableName, alias });
      references.push({
        schemaName,
        tableName,
        alias,
      });
    }
  }

  return references;
}

/**
 * Finds a table reference by alias.
 */
export function findTableByAlias(
  references: TableReference[],
  alias: string
): TableReference | null {
  return references.find((r) => r.alias === alias) || null;
}

/**
 * Finds a table reference by table name.
 */
export function findTableByName(
  references: TableReference[],
  tableName: string
): TableReference | null {
  return references.find((r) => r.tableName === tableName) || null;
}
