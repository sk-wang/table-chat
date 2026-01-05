/**
 * SQL Completion Provider for Monaco Editor.
 * Provides table and column name suggestions based on database schema.
 * Includes performance optimizations for large schemas and graceful degradation.
 */

import type * as monaco from "monaco-editor";
import type { CompletionContext, TableSummary, ColumnInfo } from "../../types/editor";
import { SqlContext, detectSqlContext } from "./SqlContextDetector";
import { CompletionItemKind } from "../../types/editor";
import { SQL_KEYWORDS } from "./sqlKeywords";

// Create a local type for Monaco's CompletionItem to avoid type conflicts
type MonacoCompletionItem = {
  label: string;
  kind: number;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
  range?: any;
};

/**
 * Maximum suggestions to return for performance.
 */
const MAX_SUGGESTIONS = 50;

/**
 * Schema data provider interface.
 * Allows the completion provider to access cached schema information.
 */
export interface SchemaDataProvider {
  getTables(): TableSummary[];
  getTableColumns(tableName: string): ColumnInfo[] | undefined;
  hasSchemaData(): boolean;
}

/**
 * SQL Completion Provider class.
 * Implements Monaco's CompletionItemProvider interface.
 */
export class SqlCompletionProvider implements monaco.languages.CompletionItemProvider {
  private schemaDataProvider: SchemaDataProvider | null = null;

  constructor() {}

  /**
   * Set the schema data provider.
   * Called when the editor is connected to a database.
   */
  setSchemaDataProvider(provider: SchemaDataProvider | null): void {
    this.schemaDataProvider = provider;
  }

  /**
   * Trigger characters for autocomplete.
   * Expanded to include comparison operators, parentheses, and commas.
   */
  readonly triggerCharacters = [".", " ", "=", "<", ">", "!", "(", ","];

  /**
   * Provide completion items based on context.
   * Includes error handling and performance optimization.
   */
  provideCompletionItems(
    _model: monaco.editor.ITextModel,
    _position: monaco.Position,
    _context: monaco.languages.CompletionContext,
    _token: monaco.CancellationToken
  ): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
    try {
      // For type compatibility, using any for Monaco types
      const sql = _model.getValue();
      const offset = _model.getOffsetAt(_position);
      const completionContext = detectSqlContext(sql, offset);

      console.log('[SqlCompletionProvider] provideCompletionItems called:', {
        position: _position,
        contextType: completionContext.contextType,
        prefix: completionContext.prefix,
        hasSchemaData: this.hasSchemaData()
      });

      const suggestions: MonacoCompletionItem[] = [];

      switch (completionContext.contextType) {
        case SqlContext.TABLE_NAME:
          suggestions.push(...this.getTableSuggestions(completionContext.prefix));
          console.log('[SqlCompletionProvider] TABLE_NAME suggestions:', suggestions.length);
          break;

        case SqlContext.COLUMN_NAME:
          suggestions.push(...this.getColumnSuggestions(completionContext));
          console.log('[SqlCompletionProvider] COLUMN_NAME suggestions:', suggestions.length);
          break;

        case SqlContext.ALIAS_COLUMN:
          suggestions.push(
            ...this.getAliasColumnSuggestions(completionContext.prefix, completionContext.currentAlias)
          );
          console.log('[SqlCompletionProvider] ALIAS_COLUMN suggestions:', suggestions.length);
          break;

        case SqlContext.KEYWORD:
        default:
          suggestions.push(...this.getKeywordSuggestions(completionContext.prefix));
          // Also add schema suggestions if available
          if (this.schemaDataProvider && this.hasSchemaData()) {
            const tableSuggestions = this.getTableSuggestions(completionContext.prefix);
            // Limit schema suggestions when showing with keywords
            suggestions.push(...tableSuggestions.slice(0, 10));
          }
          console.log('[SqlCompletionProvider] KEYWORD suggestions:', suggestions.length);
          break;
      }

      // Apply performance limit
      const limitedSuggestions = suggestions.slice(0, MAX_SUGGESTIONS);

      return {
        suggestions: limitedSuggestions.map((s) => ({
          ...s,
          range: this.getCompletionRange(_model, _position, completionContext.prefix),
          sortText: s.sortText || s.label,
        })) as any,
      };
    } catch (error) {
      // Graceful degradation - return keyword suggestions on error
      console.error("[SqlCompletionProvider] Autocomplete error:", error);
      const keywordSuggestions = this.getKeywordSuggestions("");
      return {
        suggestions: keywordSuggestions.map((s) => ({
          ...s,
          range: { startLineNumber: _position.lineNumber, startColumn: 1, endLineNumber: _position.lineNumber, endColumn: _position.column },
        })) as any,
      };
    }
  }

  /**
   * Check if schema data is available.
   */
  private hasSchemaData(): boolean {
    return (
      this.schemaDataProvider !== null &&
      this.schemaDataProvider.hasSchemaData() &&
      this.schemaDataProvider.getTables().length > 0
    );
  }

  /**
   * Get table name suggestions.
   * With pagination for large schemas.
   */
  private getTableSuggestions(prefix: string): MonacoCompletionItem[] {
    const suggestions: MonacoCompletionItem[] = [];

    if (!this.schemaDataProvider || !this.hasSchemaData()) {
      return suggestions;
    }

    const tables = this.schemaDataProvider.getTables();

    // Filter by prefix with optimization
    const filteredTables = prefix
      ? tables.filter((t) => t.tableName.toLowerCase().startsWith(prefix.toLowerCase()))
      : tables;

    // Limit results for performance
    const limitedTables = filteredTables.slice(0, MAX_SUGGESTIONS);

    for (const table of limitedTables) {
      suggestions.push({
        label: table.tableName,
        kind: CompletionItemKind.Class,
        detail: table.tableType === "table" ? "Table" : "View",
        documentation: table.comment || `Schema: ${table.schemaName}`,
        insertText: table.tableName,
        sortText: `0_${table.tableName}`, // Prioritize exact matches
      });
    }

    return suggestions;
  }

  /**
   * Get column name suggestions.
   * Fallback to all tables if no specific table context found.
   */
  private getColumnSuggestions(context: CompletionContext): MonacoCompletionItem[] {
    const suggestions: MonacoCompletionItem[] = [];

    if (!this.schemaDataProvider) {
      return suggestions;
    }

    // If no specific table context, suggest columns from all available tables
    const tablesToSearch = context.tableRefs.length > 0
      ? context.tableRefs
      : this.schemaDataProvider.getTables().map(t => ({
          schemaName: t.schemaName,
          tableName: t.tableName,
          alias: null
        }));

    // Collect columns from all referenced tables
    const columns: Map<string, ColumnInfo & { tableName?: string }> = new Map();

    for (const tableRef of tablesToSearch) {
      try {
        const tableColumns = this.schemaDataProvider.getTableColumns(tableRef.tableName);
        if (tableColumns) {
          for (const column of tableColumns) {
            // Add with table prefix for disambiguation
            const key = `${tableRef.tableName}.${column.name}`;
            if (!columns.has(key)) {
              columns.set(key, { ...column, tableName: tableRef.tableName });
            }
          }
        }
      } catch {
        // Skip this table if there's an error
        continue;
      }
    }

    // Filter by prefix
    const filteredColumns = context.prefix
      ? Array.from(columns.values()).filter((c) =>
          c.name.toLowerCase().startsWith(context.prefix.toLowerCase())
        )
      : Array.from(columns.values());

    // Limit results for performance
    const limitedColumns = filteredColumns.slice(0, MAX_SUGGESTIONS);

    // Add detail message when showing all tables
    const noSpecificContext = context.tableRefs.length === 0;

    for (const column of limitedColumns) {
      suggestions.push({
        label: column.name,
        kind: CompletionItemKind.Field,
        detail: column.dataType,
        documentation: noSpecificContext
          ? `From table: ${column.tableName || 'unknown'}`
          : (column.comment || ""),
        insertText: column.name,
      });
    }

    return suggestions;
  }

  /**
   * Get column suggestions for aliased table (alias.column).
   */
  private getAliasColumnSuggestions(
    prefix: string,
    tableName: string | null
  ): MonacoCompletionItem[] {
    const suggestions: MonacoCompletionItem[] = [];

    if (!this.schemaDataProvider || !tableName) {
      return suggestions;
    }

    const columns = this.schemaDataProvider.getTableColumns(tableName);
    if (!columns) {
      return suggestions;
    }

    const filteredColumns = prefix
      ? columns.filter((c) => c.name.toLowerCase().startsWith(prefix.toLowerCase()))
      : columns;

    // Limit results for large tables
    const limitedColumns = filteredColumns.slice(0, MAX_SUGGESTIONS);

    for (const column of limitedColumns) {
      suggestions.push({
        label: column.name,
        kind: CompletionItemKind.Field,
        detail: column.dataType,
        documentation: column.comment || "",
        insertText: column.name,
      });
    }

    return suggestions;
  }

  /**
   * Get SQL keyword suggestions.
   * Always available for graceful degradation.
   */
  private getKeywordSuggestions(prefix: string): MonacoCompletionItem[] {
    const filteredKeywords = prefix
      ? SQL_KEYWORDS.filter((k) => k.toLowerCase().startsWith(prefix.toLowerCase()))
      : SQL_KEYWORDS;

    return filteredKeywords.map((keyword) => ({
      label: keyword,
      kind: CompletionItemKind.Keyword,
      detail: "SQL Keyword",
      insertText: keyword,
      sortText: `1_${keyword}`, // Keywords come after schema matches
    }));
  }

  /**
   * Calculate the completion range for replacing text.
   */
  private getCompletionRange(
    _model: monaco.editor.ITextModel,
    position: monaco.Position,
    prefix: string
  ): any {
    const wordStart = {
      lineNumber: position.lineNumber,
      column: position.column - prefix.length,
    };
    return {
      startLineNumber: wordStart.lineNumber,
      startColumn: wordStart.column || 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    };
  }
}

// Global instance
let globalProvider: SqlCompletionProvider | null = null;

/**
 * Get or create the global SQL completion provider instance.
 */
export function getSqlCompletionProvider(): SqlCompletionProvider {
  if (!globalProvider) {
    globalProvider = new SqlCompletionProvider();
  }
  return globalProvider;
}
