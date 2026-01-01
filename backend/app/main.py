"""FastAPI application entry point."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as v1_router
from app.config import ConfigurationError, print_config_summary, settings, validate_config
from app.db.sqlite import db_manager
from app.services.ssh_tunnel import ssh_tunnel_manager
from app.services.tokenizer import initialize_jieba

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    """Application lifespan handler."""
    # Startup: Validate configuration
    try:
        validate_config()
        print_config_summary()
    except ConfigurationError as e:
        logger.warning(f"配置警告:\n{e}")
        # Don't fail startup - allow running without LLM for development
    
    # Startup: Initialize jieba dictionary (preload for better performance)
    initialize_jieba()
    # Startup: Initialize database schema
    await db_manager.init_schema()
    yield
    # Shutdown: Close all SSH tunnels
    await ssh_tunnel_manager.close_all()


app = FastAPI(
    title="TableChat API",
    description="Database Query Tool - PostgreSQL metadata and SQL query execution",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS - allow all origins as per constitution
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(v1_router, prefix="/api/v1")


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )

