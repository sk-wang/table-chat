"""Connector factory for creating database connectors based on URL."""

from app.connectors.base import DatabaseConnector
from app.connectors.mysql import MySQLConnector
from app.connectors.postgres import PostgreSQLConnector


class ConnectorFactory:
    """Factory for creating database connectors based on connection URL."""

    _connectors: dict[str, type[DatabaseConnector]] = {
        "postgresql": PostgreSQLConnector,
        "postgres": PostgreSQLConnector,
        "mysql": MySQLConnector,
    }

    @classmethod
    def get_connector(cls, url: str) -> DatabaseConnector:
        """Get the appropriate connector for the given URL.

        Args:
            url: Database connection URL (postgresql://, postgres://, or mysql://)

        Returns:
            DatabaseConnector instance

        Raises:
            ValueError: If URL scheme is not supported
        """
        db_type = cls.detect_db_type(url)
        connector_class = cls._connectors.get(db_type)
        if not connector_class:
            raise ValueError(f"No connector available for database type: {db_type}")
        return connector_class()

    @classmethod
    def detect_db_type(cls, url: str) -> str:
        """Detect database type from connection URL.

        Args:
            url: Database connection URL

        Returns:
            Database type ('postgresql' or 'mysql')

        Raises:
            ValueError: If URL scheme is not recognized
        """
        if url.startswith("postgresql://") or url.startswith("postgres://"):
            return "postgresql"
        elif url.startswith("mysql://"):
            return "mysql"
        else:
            raise ValueError(
                f"Unsupported database URL scheme: {url}. "
                "Supported schemes: postgresql://, postgres://, mysql://"
            )

    @classmethod
    def register_connector(cls, scheme: str, connector_class: type[DatabaseConnector]) -> None:
        """Register a new connector for a URL scheme.

        Args:
            scheme: URL scheme (e.g., 'postgresql', 'mysql')
            connector_class: Connector class to use
        """
        cls._connectors[scheme] = connector_class
