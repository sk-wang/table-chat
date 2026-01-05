/**
 * SQL Context Detector for autocomplete.
 * Analyzes SQL text and cursor position to determine the current context.
 * Detects whether the user is typing a table name, column name, keyword, or aliased column.
 */

import { SqlContext, type CompletionContext } from "../../types/editor";
import { parseTableReferences } from "./TableReferenceParser";
import { SQL_KEYWORD_SET } from "./sqlKeywords";

// Re-export SqlContext for use in other modules
export { SqlContext };

/**
 * SQL keywords that suggest table context follows.
 */
const TABLE_CONTEXT_KEYWORDS = [
  "FROM",
  "JOIN",
  "INNER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "FULL JOIN",
  "CROSS JOIN",
  "INTO", // INSERT INTO
  "UPDATE", // UPDATE table
  "TABLE", // CREATE TABLE, ALTER TABLE
];

/**
 * SQL keywords that suggest column context follows.
 * Expanded to include SET, VALUES, comparison operators, and CASE statement keywords.
 */
const COLUMN_CONTEXT_KEYWORDS = [
  "SELECT",
  "WHERE",
  "AND",
  "OR",
  "ORDER BY",
  "GROUP BY",
  "HAVING",
  "ON",
  "SET",
  "VALUES",
  "IN",
  "LIKE",
  "BETWEEN",
  "WHEN",
  "THEN",
  "ELSE",
  "CASE",
];

/**
 * Detects the SQL completion context at the given position.
 *
 * @param sql - The full SQL text
 * @param position - The cursor position (character offset)
 * @returns The completion context
 */
export function detectSqlContext(sql: string, position: number): CompletionContext {
  const textBefore = sql.slice(0, position);

  // Extract the current word/prefix being typed
  const prefixMatch = textBefore.match(/(\w*)$/);
  const prefix = prefixMatch ? prefixMatch[1] : "";

  // Check if we're after a dot (alias.column pattern)
  const aliasMatch = textBefore.match(/(\w+)\.\s*$/);
  if (aliasMatch) {
    const alias = aliasMatch[1];
    const tableRefs = parseTableReferences(sql);
    const matchingTable = tableRefs.find((t) => t.alias === alias);

    const context = {
      contextType: SqlContext.ALIAS_COLUMN,
      prefix,
      tableRefs,
      currentAlias: matchingTable ? matchingTable.tableName : alias,
    };
    console.log('[SqlContextDetector] Context:', {
      type: 'ALIAS_COLUMN',
      alias,
      tableName: context.currentAlias,
      prefix,
      tableRefsCount: tableRefs.length
    });
    return context;
  }

  // Find the last significant keyword BEFORE the current word being typed
  // Remove the prefix to avoid it interfering with keyword detection
  const textForKeywordSearch = prefix ? textBefore.slice(0, -prefix.length).trimEnd() : textBefore;
  const lastKeyword = findLastKeyword(textForKeywordSearch);

  console.log('[SqlContextDetector] Debug:', {
    textBefore: textBefore.slice(-50),
    prefix,
    textForKeywordSearch: textForKeywordSearch.slice(-50),
    lastKeyword
  });

  // Determine context based on keyword
  if (lastKeyword) {
    const upperKeyword = lastKeyword.toUpperCase();

    if (TABLE_CONTEXT_KEYWORDS.some((k) => upperKeyword.endsWith(k))) {
      const context = {
        contextType: SqlContext.TABLE_NAME,
        prefix,
        tableRefs: parseTableReferences(sql),
        currentAlias: null,
      };
      console.log('[SqlContextDetector] Context:', {
        type: 'TABLE_NAME',
        lastKeyword,
        prefix,
        tableRefsCount: context.tableRefs.length
      });
      return context;
    }

    if (COLUMN_CONTEXT_KEYWORDS.some((k) => upperKeyword.endsWith(k))) {
      const context = {
        contextType: SqlContext.COLUMN_NAME,
        prefix,
        tableRefs: parseTableReferences(sql),
        currentAlias: null,
      };
      console.log('[SqlContextDetector] Context:', {
        type: 'COLUMN_NAME',
        lastKeyword,
        prefix,
        tableRefsCount: context.tableRefs.length
      });
      return context;
    }
  }

  // Default to keyword suggestions if no specific context
  const context = {
    contextType: SqlContext.KEYWORD,
    prefix,
    tableRefs: [],
    currentAlias: null,
  };
  console.log('[SqlContextDetector] Context:', {
    type: 'KEYWORD',
    lastKeyword: lastKeyword || 'none',
    prefix
  });
  return context;
}

/**
 * Finds the last SQL keyword before the given position.
 */
function findLastKeyword(text: string): string | null {
  // Remove string literals to avoid false matches
  const withoutStrings = text.replace(/'[^']*'/g, "''");
  const withoutComments = withoutStrings.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

  // Get last word sequence
  const words = withoutComments.split(/\s+/);
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i]?.toUpperCase();
    if (word && SQL_KEYWORD_SET.has(word)) {
      // Reconstruct the phrase (handle "INNER JOIN" etc.)
      let phrase = word;
      for (let j = i - 1; j >= 0 && j >= i - 2; j--) {
        const prevWord = words[j]?.toUpperCase();
        if (prevWord && SQL_KEYWORD_SET.has(prevWord)) {
          phrase = `${prevWord} ${phrase}`;
        } else {
          break;
        }
      }
      return phrase;
    }
  }

  return null;
}
