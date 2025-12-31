"""Database connection management service."""

import json
from typing import Any
from urllib.parse import urlparse

from app.config import settings
from app.connectors.factory import ConnectorFactory
from app.db.sqlite import db_manager
from app.models.ssh import SSHConfig
from app.services.ssh_tunnel import ssh_tunnel_manager


class DatabaseManager:
    """Manager for database connections and operations."""

    def _extract_db_host_port(self, url: str) -> tuple[str, int]:
        """Extract database host and port from connection URL.

        Args:
            url: Database connection URL

        Returns:
            Tuple of (host, port)
        """
        parsed = urlparse(url)
        # Extract host:port from netloc (format: user:pass@host:port or host:port)
        netloc = parsed.netloc
        if "@" in netloc:
            _, host_port = netloc.rsplit("@", 1)
        else:
            host_port = netloc

        # Split host and port
        if ":" in host_port:
            host, port_str = host_port.rsplit(":", 1)
            port = int(port_str)
        else:
            # Use default ports
            host = host_port
            port = 5432 if url.startswith("postgresql://") else 3306

        return host, port

    async def list_databases(self) -> list[dict[str, Any]]:
        """List all saved database connections."""
        return await db_manager.list_databases()

    async def get_database(self, name: str) -> dict[str, Any] | None:
        """Get a database connection by name."""
        return await db_manager.get_database(name)

    async def create_or_update_database(
        self, name: str, url: str, ssl_disabled: bool = False, ssh_config: SSHConfig | None = None
    ) -> dict[str, Any]:
        """
        Create or update a database connection.
        Tests the connection before saving.

        Args:
            name: Database name
            url: Database connection URL
            ssl_disabled: Whether to disable SSL (MySQL only)
            ssh_config: Optional SSH tunnel configuration

        Raises:
            ConnectionError: If connection test fails
        """
        # Detect database type
        db_type = ConnectorFactory.detect_db_type(url)
        connector = ConnectorFactory.get_connector(url)

        # Use appropriate timeout based on database type
        timeout = (
            settings.mysql_connect_timeout
            if db_type == "mysql"
            else settings.pg_connect_timeout
        )

        # Establish SSH tunnel if configured
        tunnel_endpoint: tuple[str, int] | None = None
        if ssh_config and ssh_config.enabled:
            # Extract remote database host and port from URL
            remote_host, remote_port = self._extract_db_host_port(url)

            # Create SSH tunnel
            tunnel_endpoint = await ssh_tunnel_manager.get_tunnel(
                name, ssh_config, remote_host, remote_port
            )

        try:
            # Test connection (with tunnel if configured)
            await connector.test_connection(url, timeout, tunnel_endpoint)
        except Exception as e:
            # If tunnel was created, close it since connection failed
            if tunnel_endpoint:
                await ssh_tunnel_manager.close_tunnel(name)
            raise e

        # Close the test tunnel (will be recreated on actual query)
        if tunnel_endpoint:
            await ssh_tunnel_manager.close_tunnel(name)

        # Serialize SSH config to JSON if provided
        ssh_config_json = ssh_config.model_dump_json() if ssh_config else None

        # Save to SQLite
        return await db_manager.create_or_update_database(
            name, url, db_type, ssl_disabled, ssh_config_json
        )

    async def delete_database(self, name: str) -> bool:
        """Delete a database connection."""
        # Close any active SSH tunnel
        await ssh_tunnel_manager.close_tunnel(name)
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

    async def get_tunnel_endpoint(self, db_name: str) -> tuple[str, int] | None:
        """
        Get or create SSH tunnel endpoint for a database if SSH is configured.

        Args:
            db_name: Database name

        Returns:
            Tuple of (host, port) if SSH tunnel is configured, None otherwise

        Raises:
            ValueError: If database not found
        """
        db = await self.get_database(db_name)
        if not db:
            raise ValueError(f"Database '{db_name}' not found")

        # Check if SSH config exists and is enabled
        ssh_config_json = db.get("ssh_config")
        if not ssh_config_json:
            return None

        ssh_config = SSHConfig(**json.loads(ssh_config_json))
        if not ssh_config.enabled:
            return None

        # Extract remote database host and port
        remote_host, remote_port = self._extract_db_host_port(db["url"])

        # Get or create tunnel
        return await ssh_tunnel_manager.get_tunnel(db_name, ssh_config, remote_host, remote_port)


# Global instance
database_manager = DatabaseManager()
