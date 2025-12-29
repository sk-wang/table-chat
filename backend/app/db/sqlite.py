"""SQLite database manager for storing connection configs and metadata."""

import json
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncGenerator

import aiosqlite

from app.config import settings

# SQLite schema
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS databases (
    name TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    db_type TEXT NOT NULL DEFAULT 'postgresql',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS table_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    db_name TEXT NOT NULL,
    schema_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    table_type TEXT NOT NULL CHECK (table_type IN ('table', 'view')),
    table_comment TEXT,
    columns_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (db_name, schema_name, table_name),
    FOREIGN KEY (db_name) REFERENCES databases(name) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_metadata_db ON table_metadata(db_name);
"""

# Migration SQL for existing databases
MIGRATION_ADD_DB_TYPE = """
ALTER TABLE databases ADD COLUMN db_type TEXT DEFAULT 'postgresql';
"""

MIGRATION_ADD_TABLE_COMMENT = """
ALTER TABLE table_metadata ADD COLUMN table_comment TEXT;
"""

MIGRATION_ADD_SSL_DISABLED = """
ALTER TABLE databases ADD COLUMN ssl_disabled INTEGER DEFAULT 0;
"""


class SQLiteManager:
    """Async SQLite database manager."""

    def __init__(self, db_path: Path | None = None) -> None:
        self.db_path = db_path or settings.database_path

    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[aiosqlite.Connection, None]:
        """Get an async database connection."""
        async with aiosqlite.connect(self.db_path) as conn:
            conn.row_factory = aiosqlite.Row
            await conn.execute("PRAGMA foreign_keys = ON")
            yield conn

    async def init_schema(self) -> None:
        """Initialize the database schema."""
        async with self.get_connection() as conn:
            await conn.executescript(SCHEMA_SQL)
            await conn.commit()
            # Run migrations for existing databases
            await self._migrate_add_db_type(conn)
            await self._migrate_add_table_comment(conn)
            await self._migrate_add_ssl_disabled(conn)

    async def _migrate_add_db_type(self, conn: aiosqlite.Connection) -> None:
        """Add db_type column if it doesn't exist (migration for existing DBs)."""
        cursor = await conn.execute("PRAGMA table_info(databases)")
        columns = await cursor.fetchall()
        column_names = [col[1] for col in columns]
        if "db_type" not in column_names:
            try:
                await conn.execute(MIGRATION_ADD_DB_TYPE)
                await conn.commit()
            except Exception:
                # Column already exists or other error, ignore
                pass

    async def _migrate_add_table_comment(self, conn: aiosqlite.Connection) -> None:
        """Add table_comment column if it doesn't exist (migration for existing DBs)."""
        cursor = await conn.execute("PRAGMA table_info(table_metadata)")
        columns = await cursor.fetchall()
        column_names = [col[1] for col in columns]
        if "table_comment" not in column_names:
            try:
                await conn.execute(MIGRATION_ADD_TABLE_COMMENT)
                await conn.commit()
            except Exception:
                # Column already exists or other error, ignore
                pass

    async def _migrate_add_ssl_disabled(self, conn: aiosqlite.Connection) -> None:
        """Add ssl_disabled column if it doesn't exist (migration for existing DBs)."""
        cursor = await conn.execute("PRAGMA table_info(databases)")
        columns = await cursor.fetchall()
        column_names = [col[1] for col in columns]
        if "ssl_disabled" not in column_names:
            try:
                await conn.execute(MIGRATION_ADD_SSL_DISABLED)
                await conn.commit()
            except Exception:
                # Column already exists or other error, ignore
                pass

    # === Database CRUD Operations ===

    async def list_databases(self) -> list[dict[str, Any]]:
        """List all saved database connections."""
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT name, url, db_type, ssl_disabled, created_at, updated_at FROM databases ORDER BY name"
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def get_database(self, name: str) -> dict[str, Any] | None:
        """Get a database connection by name."""
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT name, url, db_type, ssl_disabled, created_at, updated_at FROM databases WHERE name = ?",
                (name,),
            )
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def create_or_update_database(
        self, name: str, url: str, db_type: str = "postgresql", ssl_disabled: bool = False
    ) -> dict[str, Any]:
        """Create or update a database connection."""
        now = datetime.now().isoformat()
        ssl_disabled_int = 1 if ssl_disabled else 0
        async with self.get_connection() as conn:
            # Check if exists
            existing = await self.get_database(name)
            if existing:
                await conn.execute(
                    "UPDATE databases SET url = ?, db_type = ?, ssl_disabled = ?, updated_at = ? WHERE name = ?",
                    (url, db_type, ssl_disabled_int, now, name),
                )
            else:
                await conn.execute(
                    "INSERT INTO databases (name, url, db_type, ssl_disabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (name, url, db_type, ssl_disabled_int, now, now),
                )
            await conn.commit()

        return await self.get_database(name)  # type: ignore

    async def delete_database(self, name: str) -> bool:
        """Delete a database connection. Returns True if deleted."""
        async with self.get_connection() as conn:
            cursor = await conn.execute("DELETE FROM databases WHERE name = ?", (name,))
            await conn.commit()
            return cursor.rowcount > 0

    # === Table Metadata Operations ===

    async def get_metadata_for_database(self, db_name: str) -> list[dict[str, Any]]:
        """Get all table metadata for a database."""
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                """
                SELECT schema_name, table_name, table_type, table_comment, columns_json, created_at
                FROM table_metadata
                WHERE db_name = ?
                ORDER BY schema_name, table_name
                """,
                (db_name,),
            )
            rows = await cursor.fetchall()
            result = []
            for row in rows:
                data = dict(row)
                data["columns"] = json.loads(data.pop("columns_json"))
                result.append(data)
            return result

    async def save_metadata(
        self,
        db_name: str,
        schema_name: str,
        table_name: str,
        table_type: str,
        columns: list[dict[str, Any]],
        table_comment: str | None = None,
    ) -> None:
        """Save or update table metadata."""
        columns_json = json.dumps(columns)
        now = datetime.now().isoformat()
        async with self.get_connection() as conn:
            await conn.execute(
                """
                INSERT INTO table_metadata (db_name, schema_name, table_name, table_type, table_comment, columns_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (db_name, schema_name, table_name) DO UPDATE SET
                    table_type = excluded.table_type,
                    table_comment = excluded.table_comment,
                    columns_json = excluded.columns_json,
                    created_at = excluded.created_at
                """,
                (db_name, schema_name, table_name, table_type, table_comment, columns_json, now),
            )
            await conn.commit()

    async def clear_metadata_for_database(self, db_name: str) -> None:
        """Clear all metadata for a database."""
        async with self.get_connection() as conn:
            await conn.execute("DELETE FROM table_metadata WHERE db_name = ?", (db_name,))
            await conn.commit()


# Global instance
db_manager = SQLiteManager()
