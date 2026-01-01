"""LLM service for natural language to SQL conversion."""

import json
import logging
import re

from openai import OpenAI


def strip_think_tags(content: str) -> str:
    """
    Remove <think>...</think> tags from LLM response.
    
    Some open-source reasoning models (e.g., DeepSeek-R1, Qwen-QwQ) 
    output their reasoning process wrapped in <think> tags before 
    the actual response.
    
    Args:
        content: Raw LLM response content
        
    Returns:
        Content with <think> block removed (if present)
        
    Raises:
        ValueError: If <think> tag is present but not closed (truncated output)
    """
    # First strip leading/trailing whitespace
    content = content.strip()
    
    # Check for truncated think tags (opened but not closed)
    if content.startswith("<think>") and "</think>" not in content:
        raise ValueError(
            "LLM output was truncated during reasoning. "
            "The model's thinking process exceeded the token limit. "
            "Please try a shorter query or increase max_tokens."
        )
    
    # Pattern matches <think>...</think> including newlines
    # Using non-greedy match to handle potential edge cases
    pattern = r"^<think>.*?</think>\s*"
    return re.sub(pattern, "", content, count=1, flags=re.DOTALL)

from app.config import settings
from app.services.db_manager import database_manager

logger = logging.getLogger(__name__)

# === Prompt Chain Configuration ===
# Skip table selection phase if table count is at or below this threshold
TABLE_SELECTION_THRESHOLD = 3
# Maximum number of tables to select in phase 1
MAX_SELECTED_TABLES = 10
# Max tokens for phase 1 (only need to return table names)
PHASE1_MAX_TOKENS = 256


class LLMService:
    """Service for natural language to SQL conversion using LLM."""

    # Table selection prompts (Phase 1)
    TABLE_SELECTION_PROMPT = {
        "system": """You are a database schema analyst. Given a list of tables and a user query,
identify which tables are most likely needed to answer the query.

Rules:
1. Return ONLY a JSON array of table names, no other text or explanation
2. Include tables that might be needed for JOINs or relationships
3. If unsure about a table, include it (prefer false positives over false negatives)
4. Return empty array [] only if truly no table matches the query
5. Consider table names AND comments when making decisions

Example output: ["orders", "customers", "order_items"]""",
    }

    # SQL dialect prompts (Phase 2)
    DIALECT_PROMPTS = {
        "postgresql": {
            "system": """You are a SQL expert assistant. Your task is to generate PostgreSQL SELECT queries based on natural language descriptions.

RULES:
1. ONLY generate SELECT queries. Never generate INSERT, UPDATE, DELETE, or DDL statements.
2. Always use proper PostgreSQL syntax.
3. Use table aliases for readability.
4. Add appropriate LIMIT clause if not specified (default: 100).
5. Use schema-qualified table names when available (e.g., public.users).
6. Handle NULL values appropriately.
7. Use proper JOIN syntax when relating tables.
8. Use PostgreSQL-specific functions and operators when appropriate.
9. Recognize export intent: If the user mentions "导出", "export", "下载", "download", "保存为", "save as" with a format (csv/json/excel/xlsx), set the export_format field.

OUTPUT FORMAT:
Return a JSON object with three fields:
- "sql": The generated SQL query
- "explanation": A brief explanation of what the query does (in Chinese)
- "export_format": (optional) One of "csv", "json", or "xlsx" if export intent is detected, otherwise null

Example outputs:
{"sql": "SELECT * FROM public.users WHERE age > 18 LIMIT 100", "explanation": "查询所有年龄大于18岁的用户", "export_format": null}
{"sql": "SELECT * FROM public.orders LIMIT 1000", "explanation": "查询订单数据并导出为CSV", "export_format": "csv"}
""",
            "user_suffix": "Generate a PostgreSQL SELECT query for this request.",
        },
        "mysql": {
            "system": """You are a SQL expert assistant. Your task is to generate MySQL SELECT queries based on natural language descriptions.

RULES:
1. ONLY generate SELECT queries. Never generate INSERT, UPDATE, DELETE, or DDL statements.
2. Always use proper MySQL syntax.
3. Use table aliases for readability.
4. Add appropriate LIMIT clause if not specified (default: 100).
5. Use backtick quotes for table and column names (e.g., `table_name`).
6. Handle NULL values appropriately with IS NULL/IS NOT NULL.
7. Use proper JOIN syntax when relating tables.
8. Use MySQL-specific functions when appropriate (e.g., IFNULL, COALESCE, DATE_FORMAT).
9. For LIMIT with offset, use LIMIT offset, count syntax.
10. Recognize export intent: If the user mentions "导出", "export", "下载", "download", "保存为", "save as" with a format (csv/json/excel/xlsx), set the export_format field.

OUTPUT FORMAT:
Return a JSON object with three fields:
- "sql": The generated SQL query
- "explanation": A brief explanation of what the query does (in Chinese)
- "export_format": (optional) One of "csv", "json", or "xlsx" if export intent is detected, otherwise null

Example outputs:
{"sql": "SELECT * FROM `users` WHERE `age` > 18 LIMIT 100", "explanation": "查询所有年龄大于18岁的用户", "export_format": null}
{"sql": "SELECT * FROM `orders` LIMIT 1000", "explanation": "查询订单数据并导出为Excel", "export_format": "xlsx"}
""",
            "user_suffix": "Generate a MySQL SELECT query for this request.",
        },
    }

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

    async def build_table_summary_context(self, db_name: str) -> tuple[str, int, list[str]]:
        """
        Build table summary context for LLM table selection (Phase 1).
        
        Only includes table name, type, and comment - no column details.
        
        Args:
            db_name: Database name to get metadata for
            
        Returns:
            Tuple of (summary_context, table_count, all_table_names)
        """
        try:
            from app.db.sqlite import db_manager

            metadata = await db_manager.get_metadata_for_database(db_name)

            if not metadata:
                return "No tables found.", 0, []

            lines = []
            all_table_names: list[str] = []

            for table_info in metadata:
                schema_name = table_info.get("schema_name", "public")
                table_name = table_info.get("table_name", "unknown")
                table_type = table_info.get("table_type", "table")
                table_comment = table_info.get("table_comment", "")

                full_table_name = f"{schema_name}.{table_name}"
                all_table_names.append(full_table_name)

                comment_str = f" - {table_comment}" if table_comment else ""
                lines.append(f"Table: {full_table_name} ({table_type}){comment_str}")

            return "\n".join(lines), len(metadata), all_table_names

        except Exception as e:
            logger.error(f"Error building table summary: {e}")
            return f"Error fetching tables: {e}", 0, []

    async def select_relevant_tables(
        self,
        db_name: str,
        prompt: str,
        _db_type: str = "postgresql",  # Reserved for future dialect-specific table selection
    ) -> tuple[list[str], bool]:
        """
        Select relevant tables for a natural language query (Phase 1).
        
        Args:
            db_name: Database connection name
            prompt: User's natural language query
            db_type: Database type ('postgresql' or 'mysql')
            
        Returns:
            Tuple of (selected_tables, fallback_used)
            - selected_tables: List of table names
            - fallback_used: True if fallback to all tables was used
        """
        # Get table summary
        table_summary, table_count, all_table_names = await self.build_table_summary_context(db_name)

        # Skip phase 1 if table count is small
        if table_count <= TABLE_SELECTION_THRESHOLD:
            logger.debug(f"Skipping table selection: only {table_count} tables (threshold: {TABLE_SELECTION_THRESHOLD})")
            return all_table_names, False

        if table_count == 0:
            return [], True

        # Build the prompt for table selection
        user_prompt = f"""Available Tables:
{table_summary}

User Query: {prompt}

Return a JSON array of relevant table names. Example: ["public.orders", "public.customers"]"""

        try:
            response = self.client.chat.completions.create(
                model=settings.llm_model,
                messages=[
                    {"role": "system", "content": self.TABLE_SELECTION_PROMPT["system"]},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
                max_tokens=PHASE1_MAX_TOKENS,
            )

            content = response.choices[0].message.content
            if not content:
                logger.warning("Empty response from LLM in table selection, using fallback")
                return all_table_names, True

            # Strip <think>...</think> tags from reasoning models (e.g., DeepSeek-R1)
            content = strip_think_tags(content)

            # Parse JSON response
            content = content.strip()
            # Handle markdown code blocks
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:-1]) if len(lines) > 2 else content
                content = content.strip()

            try:
                selected = json.loads(content)
                if not isinstance(selected, list):
                    logger.warning(f"LLM returned non-list: {type(selected)}, using fallback")
                    return all_table_names, True

                # Filter to only valid table names
                valid_tables = [t for t in selected if t in all_table_names]

                # Also try matching without schema prefix
                if len(valid_tables) < len(selected):
                    table_name_map = {t.split(".")[-1]: t for t in all_table_names}
                    for t in selected:
                        if t not in all_table_names:
                            # Try matching just the table name
                            simple_name = t.split(".")[-1] if "." in t else t
                            if simple_name in table_name_map and table_name_map[simple_name] not in valid_tables:
                                valid_tables.append(table_name_map[simple_name])

                if not valid_tables:
                    logger.warning("No valid tables selected by LLM, using fallback")
                    return all_table_names, True

                # Limit to max selected tables
                if len(valid_tables) > MAX_SELECTED_TABLES:
                    valid_tables = valid_tables[:MAX_SELECTED_TABLES]

                logger.info(f"Selected {len(valid_tables)} tables from {table_count}: {valid_tables}")
                return valid_tables, False

            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse table selection JSON: {e}, using fallback")
                return all_table_names, True

        except Exception as e:
            logger.warning(f"Table selection failed: {e}, using fallback")
            return all_table_names, True

    async def build_schema_context(
        self,
        db_name: str,
        table_names: list[str] | None = None,
    ) -> str:
        """
        Build schema context for LLM from database metadata.

        Args:
            db_name: Database name to get metadata for
            table_names: Optional list of table names to include (format: "schema.table").
                        If None, include all tables (backward compatible).

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

            # Create a set of table names for filtering (if specified)
            filter_tables: set[str] | None = None
            if table_names is not None:
                # Support both "schema.table" and just "table" formats
                filter_tables = set()
                for t in table_names:
                    filter_tables.add(t)
                    # Also add just the table name for matching
                    if "." in t:
                        filter_tables.add(t.split(".")[-1])

            for table_info in metadata:
                schema_name = table_info.get("schema_name", "public")
                table_name = table_info.get("table_name", "unknown")
                full_table_name = f"{schema_name}.{table_name}"

                # Filter tables if specified
                if filter_tables is not None:
                    if full_table_name not in filter_tables and table_name not in filter_tables:
                        continue

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
        db_type: str = "postgresql",
    ) -> tuple[str, str | None, str | None]:
        """
        Generate SQL from natural language prompt using prompt chain.
        
        Phase 1: Select relevant tables (if table count > threshold)
        Phase 2: Generate SQL using selected tables' schema

        Args:
            db_name: Database name for schema context
            prompt: Natural language description of the query
            db_type: Database type ('postgresql' or 'mysql')

        Returns:
            Tuple of (generated_sql, explanation, export_format)
            export_format will be 'csv', 'json', 'xlsx', or None

        Raises:
            ValueError: If LLM is not configured
            Exception: If LLM API call fails
        """
        # Phase 1: Select relevant tables
        selected_tables, fallback_used = await self.select_relevant_tables(
            db_name, prompt, db_type
        )

        if fallback_used:
            logger.debug("Using fallback: all tables for SQL generation")

        # Get dialect prompts
        dialect_config = self.DIALECT_PROMPTS.get(db_type, self.DIALECT_PROMPTS["postgresql"])
        system_prompt = dialect_config["system"]
        user_suffix = dialect_config["user_suffix"]

        # Phase 2: Build schema context with selected tables only
        schema_context = await self.build_schema_context(
            db_name,
            table_names=selected_tables if selected_tables else None
        )

        # Build the prompt
        user_prompt = f"""Schema Information:
{schema_context}

User Request: {prompt}

{user_suffix} Return ONLY the JSON object with "sql" and "explanation" fields."""

        try:
            response = self.client.chat.completions.create(
                model=settings.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,  # Low temperature for more deterministic output
                max_tokens=4096,  # Increased for reasoning models with <think> tags
            )

            # Parse response
            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from LLM")

            # Strip <think>...</think> tags from reasoning models (e.g., DeepSeek-R1)
            content = strip_think_tags(content)

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
                export_format = result.get("export_format", None)
                
                # Validate export_format if present
                if export_format and export_format not in ["csv", "json", "xlsx"]:
                    logger.warning(f"Invalid export_format '{export_format}', ignoring")
                    export_format = None
                    
            except json.JSONDecodeError:
                # If not valid JSON, try to extract SQL directly
                sql = content
                explanation = None
                export_format = None

            # Validate that it's a SELECT query
            sql_upper = sql.strip().upper()
            if not sql_upper.startswith("SELECT"):
                raise ValueError(f"Generated query is not a SELECT statement: {sql[:50]}...")

            return sql, explanation, export_format

        except Exception as e:
            raise ValueError(f"LLM generation failed: {e}") from e


# Global instance
llm_service = LLMService()
