"""SSH tunnel configuration models."""

from typing import Literal

from pydantic import Field

from app.models.base import CamelModel


class SSHConfig(CamelModel):
    """SSH tunnel configuration model."""

    enabled: bool = Field(default=False, description="Whether SSH tunnel is enabled")
    host: str = Field(default="", description="SSH server address")
    port: int = Field(default=22, description="SSH port")
    username: str = Field(default="", description="SSH username")
    auth_type: Literal["password", "key"] = Field(
        default="password", description="Authentication method"
    )
    password: str | None = Field(default=None, description="SSH password")
    private_key: str | None = Field(default=None, description="SSH private key content")
    key_passphrase: str | None = Field(default=None, description="Private key passphrase")


class SSHConfigResponse(CamelModel):
    """SSH configuration response model (sanitized - no sensitive data)."""

    enabled: bool
    host: str
    port: int
    username: str
    auth_type: Literal["password", "key"]
    # Note: password, privateKey, and keyPassphrase are not included in response
