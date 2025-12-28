"""Database connection management service."""

from typing import Any

from app.config import settings
from app.connectors.factory import ConnectorFactory
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
        # Detect database type and test the connection
        db_type = ConnectorFactory.detect_db_type(url)
        connector = ConnectorFactory.get_connector(url)

        # Use appropriate timeout based on database type
        timeout = (
            settings.mysql_connect_timeout
            if db_type == "mysql"
            else settings.pg_connect_timeout
        )

        await connector.test_connection(url, timeout)

        # Save to SQLite (now includes db_type)
        return await db_manager.create_or_update_database(name, url, db_type)

    async def delete_database(self, name: str) -> bool:
        """Delete a database connection."""
        return await db_manager.delete_database(name)

    async def test_connection(self, url: str) -> None:
        """
        Test database connection.

        Args:
            url: Database connection URL

        Raises:
            ConnectionError: If connection fails
            ValueError: If URL is invalid
        """
        db_type = ConnectorFactory.detect_db_type(url)
        connector = ConnectorFactory.get_connector(url)

        timeout = (
            settings.mysql_connect_timeout
            if db_type == "mysql"
            else settings.pg_connect_timeout
        )

        await connector.test_connection(url, timeout)

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
