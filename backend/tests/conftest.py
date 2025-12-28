"""Pytest configuration and fixtures."""

import asyncio
from pathlib import Path

import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient


# Load .env file BEFORE any tests are collected
# This ensures environment variables like POSTGRES_URL are available
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)


@pytest.fixture
def anyio_backend() -> str:
    """Use asyncio for async tests."""
    return "asyncio"


@pytest.fixture(scope="session", autouse=True)
def init_database():
    """Initialize test database once for all tests."""
    from app.db.sqlite import db_manager
    
    # Run init_schema synchronously
    asyncio.run(db_manager.init_schema())


@pytest.fixture
def test_client():
    """Create FastAPI test client."""
    from app.main import app
    
    return TestClient(app)
