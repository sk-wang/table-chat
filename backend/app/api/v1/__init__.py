"""API v1 router configuration."""

from fastapi import APIRouter

from app.api.v1.dbs import router as dbs_router
from app.api.v1.query import router as query_router

router = APIRouter()

# Include database management routes
router.include_router(dbs_router)

# Include query execution routes
router.include_router(query_router)
