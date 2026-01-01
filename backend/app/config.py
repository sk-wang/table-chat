"""Application configuration management."""

import logging
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        # 优先使用当前目录的 .env，回退到上级目录（项目根目录）
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ==========================================================================
    # 应用 LLM 配置（后端连接 proxy）
    # ==========================================================================
    # 简化版架构：后端始终通过 proxy 连接 LLM，无需区分 API 类型

    # API base URL（默认连接 Docker 内部的 proxy 服务）
    llm_api_base: str = "http://proxy:8082"

    # API key for LLM service（会传给 proxy）
    llm_api_key: str = ""

    # Model name (default: Claude Sonnet)
    llm_model: str = "claude-sonnet-4-5-20250929"

    # ==========================================================================
    # Proxy 上游配置（proxy 连接的后端 LLM 服务）
    # ==========================================================================

    # 上游 API 类型: "anthropic" (默认) 或 "openai"
    upstream_api_type: Literal["anthropic", "openai"] = "anthropic"

    # 上游 API 地址（留空则根据 upstream_api_type 使用默认值）
    upstream_api_base: str = ""

    # 上游 API Key（可选，如果和 llm_api_key 不同）
    upstream_api_key: str = ""

    # ==========================================================================
    # Backward Compatibility Aliases (deprecated, still supported)
    # ==========================================================================

    # Old OpenAI configuration (priority: llm_* > these)
    openai_base_url: str = ""
    openai_api_key: str = ""

    # Old Agent configuration (priority: llm_* > these)
    agent_api_base: str = ""
    agent_api_key: str = ""
    agent_model: str = ""

    # ==========================================================================
    # Agent Tuning (optional)
    # ==========================================================================

    agent_max_turns: int = 20
    agent_timeout: int = 120  # seconds

    # ==========================================================================
    # Database Configuration
    # ==========================================================================

    database_path: Path = Path("./scinew.db")

    # PostgreSQL Connection Timeout (seconds)
    pg_connect_timeout: int = 10

    # MySQL Connection Timeout (seconds)
    mysql_connect_timeout: int = 10

    # ==========================================================================
    # Server Configuration
    # ==========================================================================

    host: str = "0.0.0.0"
    port: int = 7888
    debug: bool = False

    # ==========================================================================
    # Unified Computed Properties
    # ==========================================================================

    @property
    def effective_api_key(self) -> str:
        """
        Get unified API key.
        
        Priority: llm_api_key > agent_api_key > openai_api_key
        """
        return self.llm_api_key or self.agent_api_key or self.openai_api_key

    @property
    def effective_api_base(self) -> str:
        """
        Get API base URL for backend to connect.
        
        简化版架构：始终返回 proxy 地址（或用户显式配置的地址）
        
        Priority: llm_api_base > agent_api_base > openai_base_url > default (proxy)
        """
        if self.llm_api_base and self.llm_api_base != "http://proxy:8082":
            return self.llm_api_base
        if self.agent_api_base:
            return self.agent_api_base
        if self.openai_base_url:
            return self.openai_base_url
        # 默认连接 proxy
        return self.llm_api_base

    @property
    def effective_model(self) -> str:
        """
        Get unified model name.
        
        Priority: llm_model (if not default) > agent_model > default
        """
        if self.llm_model and self.llm_model != "claude-sonnet-4-5-20250929":
            return self.llm_model
        if self.agent_model:
            return self.agent_model
        return self.llm_model or "claude-sonnet-4-5-20250929"

    @property
    def effective_upstream_api_base(self) -> str:
        """
        Get upstream API base URL for proxy to connect.
        
        根据 upstream_api_type 返回默认值。
        """
        if self.upstream_api_base:
            return self.upstream_api_base
        if self.upstream_api_type == "anthropic":
            return "https://api.anthropic.com"
        else:
            return "https://api.openai.com/v1"

    @property
    def effective_upstream_api_key(self) -> str:
        """
        Get upstream API key for proxy.
        
        默认使用 llm_api_key。
        """
        return self.upstream_api_key or self.effective_api_key

    @property
    def is_configured(self) -> bool:
        """
        Check if LLM is properly configured.
        
        Unified check that replaces both is_llm_configured and is_agent_configured.
        """
        return bool(self.effective_api_key)

    # ==========================================================================
    # Backward Compatibility Properties (deprecated)
    # ==========================================================================

    @property
    def effective_llm_api_base(self) -> str:
        """Deprecated: Use effective_api_base instead."""
        return self.effective_api_base

    @property
    def effective_llm_api_key(self) -> str:
        """Deprecated: Use effective_api_key instead."""
        return self.effective_api_key

    @property
    def is_llm_configured(self) -> bool:
        """Deprecated: Use is_configured instead."""
        return self.is_configured

    @property
    def is_agent_configured(self) -> bool:
        """Deprecated: Use is_configured instead."""
        return self.is_configured


# Global settings instance
settings = Settings()


class ConfigurationError(Exception):
    """Raised when configuration is invalid or incomplete."""

    pass


def validate_config() -> None:
    """
    Validate application configuration on startup.
    
    简化版：只检查 API key 是否配置。
    
    Raises:
        ConfigurationError: If configuration is invalid or incomplete
    """
    issues: list[str] = []
    
    # Check if API key is configured
    if not settings.is_configured:
        issues.append(
            "LLM API 未配置。请设置 LLM_API_KEY 环境变量。"
            "\n  提示: 也可以使用旧变量 AGENT_API_KEY（向后兼容）"
        )
    
    if issues:
        raise ConfigurationError("\n\n".join(issues))


def print_config_summary() -> None:
    """Print a summary of current configuration (for debugging)."""
    logger.info("=== LLM 配置摘要 ===")
    logger.info(f"  后端连接: {settings.effective_api_base}")
    logger.info(f"  上游类型: {settings.upstream_api_type}")
    logger.info(f"  上游地址: {settings.effective_upstream_api_base}")
    logger.info(f"  模型: {settings.effective_model}")
    logger.info(f"  已配置: {'是' if settings.is_configured else '否'}")
    logger.info("====================")
