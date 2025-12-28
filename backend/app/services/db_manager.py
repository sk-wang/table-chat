"""Database connection management service."""

import asyncio
from datetime import datetime
from typing import Any

import psycopg2
from psycopg2.extensions import connection as PgConnection

from app.config import settings
from app.db.sqlite import db_manager


class DatabaseManager:
    """Manager for database connections and operations."""

    async def list_databases(self) -> list[dict[str, Any]]:
        """List all saved database connections."""
        return await db_manager.list_databases()

    async def get_database(self, name: str) -> dict[str, Any] | None:
        """Get a database connection by name."""
        return await db_manager.get_database(name)

    async def create_or_update_database(self, name: str, url: str) -> dict[str, Any]:
        """
        Create or update a database connection.
        Tests the connection before saving.

        Raises:
            ConnectionError: If connection test fails
        """
        # Test the connection first
        await self.test_connection(url)

        # Save to SQLite
        return await db_manager.create_or_update_database(name, url)

    async def delete_database(self, name: str) -> bool:
        """Delete a database connection."""
        return await db_manager.delete_database(name)

    async def test_connection(self, url: str) -> None:
        """
        Test PostgreSQL connection.

        Args:
            url: PostgreSQL connection URL

        Raises:
            ConnectionError: If connection fails
            ValueError: If URL is invalid
        """

        def _connect() -> PgConnection:
            """Synchronous connection attempt."""
            try:
                conn = psycopg2.connect(
                    url, connect_timeout=settings.pg_connect_timeout
                )
                conn.close()
                return conn
            except psycopg2.OperationalError as e:
                raise ConnectionError(f"Failed to connect to database: {e}") from e
            except Exception as e:
                raise ValueError(f"Invalid connection URL: {e}") from e

        # Run sync operation in thread pool
        await asyncio.to_thread(_connect)

    async def get_connection(self, db_name: str) -> str:
        """
        Get connection URL for a database.

        Args:
            db_name: Database name

        Returns:
            Connection URL

        Raises:
            ValueError: If database not found
        """
        db = await self.get_database(db_name)
        if not db:
            raise ValueError(f"Database '{db_name}' not found")
        return db["url"]


# Global instance
database_manager = DatabaseManager()

