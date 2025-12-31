"""SSH tunnel management service."""

import logging
from typing import Any

import asyncssh

from app.models.ssh import SSHConfig

logger = logging.getLogger(__name__)


class SSHTunnelManager:
    """Manages SSH tunnels for database connections."""

    def __init__(self) -> None:
        """Initialize the SSH tunnel manager."""
        self._tunnels: dict[str, tuple[asyncssh.SSHClientConnection, asyncssh.SSHListener]] = {}

    async def get_tunnel(
        self, db_name: str, ssh_config: SSHConfig, remote_host: str, remote_port: int
    ) -> tuple[str, int]:
        """
        Get or create an SSH tunnel for a database connection.

        Args:
            db_name: Unique database identifier
            ssh_config: SSH configuration including host, port, auth details
            remote_host: Remote database host (from SSH server's perspective)
            remote_port: Remote database port

        Returns:
            Tuple of (local_host, local_port) to connect to

        Raises:
            Exception: If SSH connection or tunnel creation fails
        """
        # Check if tunnel already exists and is active
        if db_name in self._tunnels:
            try:
                conn, listener = self._tunnels[db_name]
                # Verify connection is still alive
                if not conn.is_closed():
                    local_port = listener.get_port()
                    logger.info(f"Reusing existing SSH tunnel for {db_name} on port {local_port}")
                    return ("127.0.0.1", local_port)
                # Connection is closed, remove it
                del self._tunnels[db_name]
            except Exception as e:
                logger.warning(f"Existing tunnel for {db_name} is invalid: {e}")
                del self._tunnels[db_name]

        # Build SSH connection options
        connect_kwargs: dict[str, Any] = {
            "host": ssh_config.host,
            "port": ssh_config.port,
            "username": ssh_config.username,
            "known_hosts": None,  # Disable host key checking for simplicity
            "keepalive_interval": 30,  # Keep connection alive
        }

        # Add authentication based on type
        if ssh_config.auth_type == "password":
            if not ssh_config.password:
                raise ValueError("SSH password is required for password authentication")
            connect_kwargs["password"] = ssh_config.password
        else:  # key authentication
            if not ssh_config.private_key:
                raise ValueError("SSH private key is required for key authentication")
            # Import private key
            try:
                # Normalize line endings: convert \r\n (Windows) and \r (old Mac) to \n (Unix)
                normalized_key = ssh_config.private_key.replace('\r\n', '\n').replace('\r', '\n')
                private_key = asyncssh.import_private_key(
                    normalized_key, passphrase=ssh_config.key_passphrase
                )
                connect_kwargs["client_keys"] = [private_key]
            except Exception as e:
                logger.error(f"Failed to import private key for {db_name}: {e}")
                raise ValueError(f"Invalid private key format: {e}") from e

        # Establish SSH connection
        try:
            logger.info(
                f"Establishing SSH connection to {ssh_config.host}:{ssh_config.port} "
                f"for {db_name} (auth: {ssh_config.auth_type})"
            )
            conn = await asyncssh.connect(**connect_kwargs)
        except asyncssh.Error as e:
            logger.error(
                f"SSH connection failed for {db_name} to {ssh_config.host}:{ssh_config.port}: {e}"
            )
            raise Exception(f"SSH connection failed: {e}") from e

        # Create port forwarding (dynamic local port allocation)
        try:
            listener = await conn.forward_local_port(
                "127.0.0.1", 0, remote_host, remote_port  # 0 = auto-assign port
            )
            local_port = listener.get_port()
            logger.info(
                f"SSH tunnel established for {db_name}: "
                f"{ssh_config.host}:{ssh_config.port} -> {remote_host}:{remote_port} "
                f"(local port: {local_port})"
            )
        except asyncssh.Error as e:
            await conn.close()
            logger.error(f"Failed to create port forwarding for {db_name}: {e}")
            raise Exception(f"Failed to create SSH tunnel: {e}") from e

        # Store tunnel for reuse
        self._tunnels[db_name] = (conn, listener)

        return ("127.0.0.1", local_port)

    async def close_tunnel(self, db_name: str) -> None:
        """
        Close SSH tunnel for a specific database.

        Args:
            db_name: Database identifier
        """
        if db_name in self._tunnels:
            try:
                conn, listener = self._tunnels[db_name]
                listener.close()
                await listener.wait_closed()
                conn.close()
                await conn.wait_closed()
                logger.info(f"SSH tunnel closed for {db_name}")
            except Exception as e:
                logger.error(f"Error closing SSH tunnel for {db_name}: {e}")
            finally:
                del self._tunnels[db_name]

    async def close_all(self) -> None:
        """Close all active SSH tunnels."""
        db_names = list(self._tunnels.keys())
        for db_name in db_names:
            await self.close_tunnel(db_name)
        logger.info(f"Closed {len(db_names)} SSH tunnel(s)")


# Global instance
ssh_tunnel_manager = SSHTunnelManager()
