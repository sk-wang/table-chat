"""Tests for configuration module (simplified architecture)."""

import os

import pytest
from pydantic import ValidationError


# Clear environment before importing Settings to avoid .env file interference
@pytest.fixture(autouse=True)
def clean_env():
    """Clear LLM-related environment variables before each test."""
    env_vars = [
        "LLM_API_KEY", "LLM_API_BASE", "LLM_MODEL",
        "UPSTREAM_API_TYPE", "UPSTREAM_API_BASE", "UPSTREAM_API_KEY",
        "AGENT_API_KEY", "AGENT_API_BASE", "AGENT_MODEL",
        "OPENAI_API_KEY", "OPENAI_BASE_URL",
    ]
    original = {k: os.environ.get(k) for k in env_vars}
    for k in env_vars:
        if k in os.environ:
            del os.environ[k]
    yield
    # Restore original values
    for k, v in original.items():
        if v is not None:
            os.environ[k] = v
        elif k in os.environ:
            del os.environ[k]


def create_settings(**kwargs):
    """Create Settings instance with isolated environment."""
    from app.config import Settings
    return Settings(**kwargs, _env_file=None)


class TestSimplifiedArchitecture:
    """Test simplified architecture configuration."""

    def test_default_api_base_is_proxy(self):
        """Default API base should be proxy address."""
        settings = create_settings()
        assert settings.llm_api_base == "http://proxy:8082"

    def test_default_model_is_claude_sonnet(self):
        """Default model should be claude-sonnet-4-5-20250929."""
        settings = create_settings()
        assert settings.llm_model == "claude-sonnet-4-5-20250929"

    def test_default_upstream_type_is_anthropic(self):
        """Default upstream API type should be anthropic."""
        settings = create_settings()
        assert settings.upstream_api_type == "anthropic"

    def test_effective_api_base_returns_proxy(self):
        """effective_api_base should return proxy address by default."""
        settings = create_settings()
        assert settings.effective_api_base == "http://proxy:8082"

    def test_effective_upstream_api_base_anthropic(self):
        """Anthropic upstream should default to api.anthropic.com."""
        settings = create_settings(upstream_api_type="anthropic")
        assert settings.effective_upstream_api_base == "https://api.anthropic.com"

    def test_effective_upstream_api_base_openai(self):
        """OpenAI upstream should default to api.openai.com."""
        settings = create_settings(upstream_api_type="openai")
        assert settings.effective_upstream_api_base == "https://api.openai.com/v1"

    def test_custom_upstream_api_base(self):
        """Custom upstream API base should override default."""
        settings = create_settings(upstream_api_base="http://custom:8000/v1")
        assert settings.effective_upstream_api_base == "http://custom:8000/v1"

    def test_invalid_upstream_type_raises_validation_error(self):
        """Invalid upstream API type should raise validation error."""
        with pytest.raises(ValidationError):
            create_settings(upstream_api_type="invalid")


class TestBackwardCompatibility:
    """Test backward compatibility with old environment variable names."""

    def test_agent_api_key_fallback(self):
        """agent_api_key should work as fallback."""
        settings = create_settings(agent_api_key="test-key")
        assert settings.effective_api_key == "test-key"

    def test_openai_api_key_fallback(self):
        """openai_api_key should work as fallback."""
        settings = create_settings(openai_api_key="test-key")
        assert settings.effective_api_key == "test-key"

    def test_llm_api_key_priority_over_agent_key(self):
        """llm_api_key should take priority over agent_api_key."""
        settings = create_settings(llm_api_key="primary", agent_api_key="fallback")
        assert settings.effective_api_key == "primary"

    def test_agent_api_base_fallback(self):
        """agent_api_base should work as fallback for effective_api_base."""
        settings = create_settings(agent_api_base="https://custom.anthropic.com")
        assert settings.effective_api_base == "https://custom.anthropic.com"

    def test_agent_model_fallback(self):
        """agent_model should work as fallback for effective_model."""
        settings = create_settings(agent_model="claude-3-opus-20240229")
        assert settings.effective_model == "claude-3-opus-20240229"

    def test_deprecated_properties_still_work(self):
        """Deprecated properties should still work."""
        settings = create_settings(llm_api_key="test-key")
        assert settings.effective_llm_api_key == settings.effective_api_key
        assert settings.effective_llm_api_base == settings.effective_api_base
        assert settings.is_llm_configured == settings.is_configured
        assert settings.is_agent_configured == settings.is_configured


class TestIsConfigured:
    """Test unified is_configured property."""

    def test_not_configured_when_no_key(self):
        """is_configured should be False when no API key."""
        settings = create_settings()
        assert settings.is_configured is False

    def test_configured_with_llm_api_key(self):
        """is_configured should be True with llm_api_key."""
        settings = create_settings(llm_api_key="test-key")
        assert settings.is_configured is True

    def test_configured_with_agent_api_key(self):
        """is_configured should be True with agent_api_key fallback."""
        settings = create_settings(agent_api_key="test-key")
        assert settings.is_configured is True


class TestValidateConfig:
    """Test configuration validation."""

    def test_validate_raises_when_not_configured(self):
        """validate_config should raise when no API key is set."""
        from unittest.mock import patch
        from app.config import ConfigurationError, validate_config
        
        with patch("app.config.settings", create_settings()):
            with pytest.raises(ConfigurationError) as exc_info:
                validate_config()
            assert "LLM_API_KEY" in str(exc_info.value)

    def test_validate_passes_with_key(self):
        """validate_config should pass with valid config."""
        from unittest.mock import patch
        from app.config import validate_config
        
        with patch("app.config.settings", create_settings(llm_api_key="test-key")):
            # Should not raise
            validate_config()


class TestEffectiveModel:
    """Test effective_model computation."""

    def test_default_model(self):
        """effective_model should return default when nothing set."""
        settings = create_settings()
        assert settings.effective_model == "claude-sonnet-4-5-20250929"

    def test_custom_llm_model(self):
        """effective_model should use custom llm_model."""
        settings = create_settings(llm_model="claude-3-opus-20240229")
        assert settings.effective_model == "claude-3-opus-20240229"

    def test_agent_model_fallback_when_llm_model_is_default(self):
        """agent_model should be used when llm_model is at default."""
        settings = create_settings(agent_model="custom-model")
        assert settings.effective_model == "custom-model"


class TestUpstreamConfig:
    """Test upstream API configuration for proxy."""

    def test_effective_upstream_api_key_defaults_to_llm_key(self):
        """effective_upstream_api_key should default to llm_api_key."""
        settings = create_settings(llm_api_key="test-key")
        assert settings.effective_upstream_api_key == "test-key"

    def test_explicit_upstream_api_key(self):
        """Explicit upstream_api_key should take priority."""
        settings = create_settings(llm_api_key="llm-key", upstream_api_key="upstream-key")
        assert settings.effective_upstream_api_key == "upstream-key"
