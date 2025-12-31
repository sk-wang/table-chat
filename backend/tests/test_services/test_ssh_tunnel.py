"""Unit tests for SSH tunnel service."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.models.ssh import SSHConfig
from app.services.ssh_tunnel import SSHTunnelManager


class TestSSHConfig:
    """Test SSH configuration validation."""

    def test_ssh_config_password_auth(self):
        """Test creating SSH config with password authentication."""
        config = SSHConfig(
            host="example.com",
            port=22,
            username="user",
            auth_type="password",
            password="secret123",
        )
        assert config.host == "example.com"
        assert config.port == 22
        assert config.username == "user"
        assert config.auth_type == "password"
        assert config.password == "secret123"

    def test_ssh_config_key_auth(self):
        """Test creating SSH config with key authentication."""
        private_key = "-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----"
        config = SSHConfig(
            host="example.com",
            port=22,
            username="user",
            auth_type="key",
            private_key=private_key,
        )
        assert config.auth_type == "key"
        assert config.private_key == private_key

    def test_ssh_config_key_with_passphrase(self):
        """Test creating SSH config with key and passphrase."""
        config = SSHConfig(
            host="example.com",
            port=22,
            username="user",
            auth_type="key",
            private_key="-----BEGIN RSA PRIVATE KEY-----\nencrypted\n-----END RSA PRIVATE KEY-----",
            key_passphrase="my-passphrase",
        )
        assert config.key_passphrase == "my-passphrase"


class TestSSHTunnelManager:
    """Test SSH tunnel manager functionality."""

    def test_manager_initialization(self):
        """Test SSH tunnel manager initializes correctly."""
        manager = SSHTunnelManager()
        assert manager._tunnels == {}

    @pytest.mark.asyncio
    async def test_get_tunnel_password_auth_missing_password(self):
        """Test that missing password raises ValueError."""
        manager = SSHTunnelManager()
        config = SSHConfig(
            host="example.com",
            port=22,
            username="user",
            auth_type="password",
            password=None,
        )
        with pytest.raises(ValueError, match="password is required"):
            await manager.get_tunnel("testdb", config, "localhost", 5432)

    @pytest.mark.asyncio
    async def test_get_tunnel_key_auth_missing_key(self):
        """Test that missing private key raises ValueError."""
        manager = SSHTunnelManager()
        config = SSHConfig(
            host="example.com",
            port=22,
            username="user",
            auth_type="key",
            private_key=None,
        )
        with pytest.raises(ValueError, match="private key is required"):
            await manager.get_tunnel("testdb", config, "localhost", 5432)

    @pytest.mark.asyncio
    async def test_get_tunnel_invalid_key_format(self):
        """Test that invalid private key format raises ValueError."""
        manager = SSHTunnelManager()
        config = SSHConfig(
            host="example.com",
            port=22,
            username="user",
            auth_type="key",
            private_key="not-a-valid-key",
        )
        with pytest.raises(ValueError, match="Invalid private key format"):
            await manager.get_tunnel("testdb", config, "localhost", 5432)

    def test_normalize_newlines_in_key(self):
        """Test that private key newlines are normalized."""
        # Create a key with Windows-style line endings
        windows_key = "-----BEGIN RSA PRIVATE KEY-----\r\ntest\r\n-----END RSA PRIVATE KEY-----"
        
        # The normalization should convert \r\n to \n
        normalized = windows_key.replace('\r\n', '\n').replace('\r', '\n')
        
        assert '\r' not in normalized
        assert '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----' == normalized

    @pytest.mark.asyncio
    async def test_close_all_tunnels_empty(self):
        """Test closing tunnels when none exist."""
        manager = SSHTunnelManager()
        await manager.close_all()
        assert manager._tunnels == {}

    @pytest.mark.asyncio
    async def test_close_tunnel_not_exists(self):
        """Test closing a tunnel that doesn't exist."""
        manager = SSHTunnelManager()
        await manager.close_tunnel("nonexistent")
        # Should not raise any errors
        assert "nonexistent" not in manager._tunnels

