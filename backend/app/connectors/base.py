"""Abstract base class for database connectors."""

from abc import ABC, abstractmethod
from typing import Any

from app.models.metadata import TableMetadata


class DatabaseConnector(ABC):
    """Abstract base class for database connectors.

    This defines the interface that all database connectors must implement.
    Following the Strategy Pattern, this allows for easy addition of new
    database types while maintaining a consistent interface.
    """

    @abstractmethod
    async def test_connection(
        self, url: str, timeout: int, tunnel_endpoint: tuple[str, int] | None = None
    ) -> None:
        """Test database connection.

        Args:
            url: Database connection URL
            timeout: Connection timeout in seconds
            tunnel_endpoint: Optional (host, port) tuple if using SSH tunnel

        Raises:
            ConnectionError: If connection fails
            ValueError: If URL is invalid
        """
        pass

    @abstractmethod
    async def fetch_metadata(
        self, url: str, tunnel_endpoint: tuple[str, int] | None = None
    ) -> tuple[list[str], list[TableMetadata]]:
        """Fetch database metadata (schemas, tables, columns).

        Args:
            url: Database connection URL
            tunnel_endpoint: Optional (host, port) tuple if using SSH tunnel

        Returns:
            Tuple of (schemas, tables)

        Raises:
            Exception: If metadata fetch fails
        """
        pass

    @abstractmethod
    async def execute_query(
        self, url: str, sql: str, tunnel_endpoint: tuple[str, int] | None = None
    ) -> tuple[list[str], list[dict[str, Any]], int]:
        """Execute SQL query and return results.

        Args:
            url: Database connection URL
            sql: SQL query to execute
            tunnel_endpoint: Optional (host, port) tuple if using SSH tunnel

        Returns:
            Tuple of (column_names, rows, execution_time_ms)
        """
        pass

    @abstractmethod
    def get_dialect(self) -> str:
        """Get sqlglot dialect name.

        Returns:
            Dialect name (e.g., 'postgres', 'mysql')
        """
        pass

    @abstractmethod
    def detect_db_type(self, url: str) -> str:
        """Detect database type from URL.

        Args:
            url: Database connection URL

        Returns:
            Database type ('postgresql' or 'mysql')
        """
        pass
