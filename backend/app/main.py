"""FastAPI application entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as v1_router
from app.config import settings
from app.db.sqlite import db_manager
from app.services.tokenizer import initialize_jieba


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    """Application lifespan handler."""
    # Startup: Initialize jieba dictionary (preload for better performance)
    initialize_jieba()
    # Startup: Initialize database schema
    await db_manager.init_schema()
    yield
    # Shutdown: Nothing to clean up


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

