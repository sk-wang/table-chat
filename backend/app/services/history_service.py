"""Service for managing SQL query execution history."""

from datetime import datetime
from typing import Any

from app.db.sqlite import db_manager
from app.services.tokenizer import tokenize_for_search


class HistoryService:
    """Service for managing query history records."""

    async def create_history(
        self,
        db_name: str,
        sql_content: str,
        row_count: int,
        execution_time_ms: int,
        natural_query: str | None = None,
    ) -> int:
        """
        Create a new query history record.
        
        Args:
            db_name: Database connection name
            sql_content: The SQL statement that was executed
            row_count: Number of rows returned
            execution_time_ms: Execution time in milliseconds
            natural_query: Optional natural language description
            
        Returns:
            The ID of the created history record
        """
        # Tokenize SQL and natural query for FTS indexing
        sql_tokens = tokenize_for_search(sql_content)
        natural_tokens = tokenize_for_search(natural_query) if natural_query else ""

        history_id = await db_manager.create_query_history(
            db_name=db_name,
            sql_content=sql_content,
            sql_tokens=sql_tokens,
            natural_query=natural_query,
            natural_tokens=natural_tokens,
            row_count=row_count,
            execution_time_ms=execution_time_ms,
        )

        return history_id

    async def list_history(
        self,
        db_name: str,
        limit: int = 20,
        before: str | None = None,
    ) -> tuple[list[dict[str, Any]], int, bool, str | None]:
        """
        List query history for a database with cursor-based pagination.
        
        Args:
            db_name: Database connection name
            limit: Maximum number of records to return
            before: Cursor (ISO8601 timestamp) to get records before
            
        Returns:
            Tuple of (items, total_count, has_more, next_cursor)
        """
        items, total = await db_manager.list_query_history(
            db_name=db_name,
            limit=limit + 1,  # Fetch one extra to check if there are more
            before=before,
        )

        # Check if there are more results
        has_more = len(items) > limit
        if has_more:
            items = items[:limit]  # Remove the extra item

        # Get next cursor (executed_at of the last item)
        next_cursor = None
        if has_more and items:
            next_cursor = items[-1]["executed_at"]

        # Convert executed_at to datetime for Pydantic serialization
        for item in items:
            if isinstance(item["executed_at"], str):
                item["executed_at"] = datetime.fromisoformat(item["executed_at"])

        return items, total, has_more, next_cursor

    async def search_history(
        self,
        db_name: str,
        query: str,
        limit: int = 20,
    ) -> tuple[list[dict[str, Any]], int]:
        """
        Search query history using full-text search.
        
        Args:
            db_name: Database connection name
            query: Search query (will be tokenized)
            limit: Maximum number of records to return
            
        Returns:
            Tuple of (matching_items, total_count)
        """
        # Tokenize the search query
        query_tokens = tokenize_for_search(query)

        if not query_tokens.strip():
            # Return empty results for empty/whitespace-only queries
            return [], 0

        items, total = await db_manager.search_query_history(
            db_name=db_name,
            query_tokens=query_tokens,
            limit=limit,
        )

        # Convert executed_at to datetime for Pydantic serialization
        for item in items:
            if isinstance(item["executed_at"], str):
                item["executed_at"] = datetime.fromisoformat(item["executed_at"])

        return items, total


# Global singleton instance
history_service = HistoryService()

