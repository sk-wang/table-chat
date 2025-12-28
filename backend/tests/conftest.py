"""Pytest configuration and fixtures."""

import asyncio

import pytest
from fastapi.testclient import TestClient


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
