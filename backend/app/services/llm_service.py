"""LLM service for natural language to SQL conversion."""

import json
from typing import Any

from openai import OpenAI

from app.config import settings
from app.services.db_manager import database_manager


class LLMService:
    """Service for natural language to SQL conversion using LLM."""

    def __init__(self):
        """Initialize LLM service."""
        self._client: OpenAI | None = None

    @property
    def client(self) -> OpenAI:
        """Get or create OpenAI client."""
        if self._client is None:
            if not settings.is_llm_configured:
                raise ValueError(
                    "LLM API is not configured. Please set LLM_API_KEY environment variable."
                )
            
            self._client = OpenAI(
                api_key=settings.effective_llm_api_key,
                base_url=settings.effective_llm_api_base,
            )
        return self._client

    @property
    def is_available(self) -> bool:
        """Check if LLM service is available."""
        return settings.is_llm_configured

    async def build_schema_context(self, db_name: str) -> str:
        """
        Build schema context for LLM from database metadata.

        Args:
            db_name: Database name to get metadata for

        Returns:
            Schema context string for LLM prompt
        """
        try:
            # Get database metadata
            db_info = await database_manager.get_database(db_name)
            if not db_info:
                return "No schema information available."

            # Try to get cached metadata from SQLite
            from app.db.sqlite import db_manager
            
            metadata = await db_manager.get_metadata_for_database(db_name)
            
            if not metadata:
                return "No tables found in this database."

            # Build schema description
            lines = ["Database Schema:", "=" * 40, ""]
            
            for table_info in metadata:
                schema_name = table_info.get("schema_name", "public")
                table_name = table_info.get("table_name", "unknown")
                table_type = table_info.get("table_type", "table")
                # Note: get_metadata_for_database already parses columns_json to "columns"
                columns = table_info.get("columns", [])

                lines.append(f"Table: {schema_name}.{table_name} ({table_type})")
                lines.append("-" * 40)
                
                for col in columns:
                    col_name = col.get("name", "unknown")
                    col_type = col.get("dataType", col.get("data_type", "unknown"))
                    is_nullable = col.get("isNullable", col.get("is_nullable", True))
                    is_pk = col.get("isPrimaryKey", col.get("is_primary_key", False))
                    
                    nullable_str = "" if is_nullable else " NOT NULL"
                    pk_str = " PRIMARY KEY" if is_pk else ""
                    
                    lines.append(f"  - {col_name}: {col_type}{nullable_str}{pk_str}")
                
                lines.append("")

            return "\n".join(lines)

        except Exception as e:
            return f"Error fetching schema: {e}"

    async def generate_sql(
        self,
        db_name: str,
        prompt: str,
    ) -> tuple[str, str | None]:
        """
        Generate SQL from natural language prompt.

        Args:
            db_name: Database name for schema context
            prompt: Natural language description of the query

        Returns:
            Tuple of (generated_sql, explanation)

        Raises:
            ValueError: If LLM is not configured
            Exception: If LLM API call fails
        """
        # Build schema context
        schema_context = await self.build_schema_context(db_name)

        # Build the prompt
        system_prompt = """You are a SQL expert assistant. Your task is to generate PostgreSQL SELECT queries based on natural language descriptions.

RULES:
1. ONLY generate SELECT queries. Never generate INSERT, UPDATE, DELETE, or DDL statements.
2. Always use proper PostgreSQL syntax.
3. Use table aliases for readability.
4. Add appropriate LIMIT clause if not specified (default: 100).
5. Use schema-qualified table names when available (e.g., public.users).
6. Handle NULL values appropriately.
7. Use proper JOIN syntax when relating tables.

OUTPUT FORMAT:
Return a JSON object with two fields:
- "sql": The generated SQL query
- "explanation": A brief explanation of what the query does (in Chinese)

Example output:
{"sql": "SELECT * FROM public.users WHERE age > 18 LIMIT 100", "explanation": "查询所有年龄大于18岁的用户"}
"""

        user_prompt = f"""Schema Information:
{schema_context}

User Request: {prompt}

Generate a PostgreSQL SELECT query for this request. Return ONLY the JSON object with "sql" and "explanation" fields."""

        try:
            response = self.client.chat.completions.create(
                model=settings.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,  # Low temperature for more deterministic output
                max_tokens=1024,
            )

            # Parse response
            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from LLM")

            # Try to parse JSON from response
            # Handle case where LLM wraps in markdown code blocks
            content = content.strip()
            if content.startswith("```"):
                # Remove markdown code block
                lines = content.split("\n")
                content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
                content = content.strip()

            try:
                result = json.loads(content)
                sql = result.get("sql", "")
                explanation = result.get("explanation", None)
            except json.JSONDecodeError:
                # If not valid JSON, try to extract SQL directly
                sql = content
                explanation = None

            # Validate that it's a SELECT query
            sql_upper = sql.strip().upper()
            if not sql_upper.startswith("SELECT"):
                raise ValueError(f"Generated query is not a SELECT statement: {sql[:50]}...")

            return sql, explanation

        except Exception as e:
            raise ValueError(f"LLM generation failed: {e}") from e


# Global instance
llm_service = LLMService()

