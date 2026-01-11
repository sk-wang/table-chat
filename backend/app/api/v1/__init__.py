"""API v1 router configuration."""

from fastapi import APIRouter

from app.api.v1.agent import router as agent_router
from app.api.v1.dbs import router as dbs_router
from app.api.v1.editor_memory import router as editor_memory_router
from app.api.v1.history import router as history_router
from app.api.v1.query import router as query_router

router = APIRouter()

# Include database management routes
router.include_router(dbs_router)

# Include query execution routes
router.include_router(query_router)

# Include query history routes
router.include_router(history_router)

# Include agent routes
router.include_router(agent_router)

# Include editor memory routes
router.include_router(editor_memory_router)
