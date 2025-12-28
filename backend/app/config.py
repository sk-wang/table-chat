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

    # OpenAI Configuration
    openai_base_url: str = "https://api.openai.com/v1"
    openai_api_key: str = ""

    # Database Configuration
    database_path: Path = Path("./scinew.db")

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # PostgreSQL Connection Timeout (seconds)
    pg_connect_timeout: int = 10


# Global settings instance
settings = Settings()

