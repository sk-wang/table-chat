"""Application configuration management."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # LLM Configuration (OpenAI-compatible API)
    llm_api_base: str = "https://api.openai.com/v1"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o-mini"

    # Backward compatibility aliases
    openai_base_url: str = ""
    openai_api_key: str = ""

    # Database Configuration
    database_path: Path = Path("./scinew.db")

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 7888
    debug: bool = False

    # PostgreSQL Connection Timeout (seconds)
    pg_connect_timeout: int = 10

    # MySQL Connection Timeout (seconds)
    mysql_connect_timeout: int = 10

    # Agent Configuration (Anthropic Python Client)
    agent_api_base: str = ""  # Optional: custom base URL (default: api.anthropic.com)
    agent_api_key: str = ""   # Required: ANTHROPIC_API_KEY
    agent_model: str = "claude-sonnet-4-5-20250929"
    agent_max_turns: int = 20
    agent_timeout: int = 120  # seconds

    @property
    def effective_llm_api_base(self) -> str:
        """Get effective LLM API base URL."""
        return self.llm_api_base or self.openai_base_url or "https://api.openai.com/v1"

    @property
    def effective_llm_api_key(self) -> str:
        """Get effective LLM API key."""
        return self.llm_api_key or self.openai_api_key

    @property
    def is_llm_configured(self) -> bool:
        """Check if LLM is properly configured."""
        return bool(self.effective_llm_api_key)

    @property
    def is_agent_configured(self) -> bool:
        """Check if Agent is properly configured (only API key is required)."""
        return bool(self.agent_api_key)


# Global settings instance
settings = Settings()

