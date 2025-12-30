"""Agent API endpoints for SQL generation with Anthropic Tool Use."""

import json
import logging

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse

from app.models.agent import AgentQueryRequest, AgentStatusResponse, CancelResponse
from app.models.error import ErrorResponse
from app.services.agent_service import agent_service
from app.services.db_manager import database_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Agent"])


@router.get(
    "/agent/status",
    response_model=AgentStatusResponse,
    summary="Get Agent service status",
)
async def get_agent_status() -> AgentStatusResponse:
    """
    Check if Agent service is configured and available.
    """
    from app.config import settings

    return AgentStatusResponse(
        available=agent_service.is_available,
        configured=settings.is_agent_configured,
        model=settings.agent_model if settings.is_agent_configured else None,
    )


@router.post(
    "/dbs/{name}/agent/query",
    responses={
        200: {"description": "SSE stream of agent events"},
        400: {"model": ErrorResponse, "description": "Invalid request"},
        404: {"model": ErrorResponse, "description": "Database not found"},
        503: {"model": ErrorResponse, "description": "Agent service unavailable"},
    },
    summary="Start Agent query session",
)
async def agent_query(name: str, request: AgentQueryRequest) -> StreamingResponse:
    """
    Start an Agent session to explore the database and generate SQL.

    Returns a Server-Sent Events stream with the following event types:
    - thinking: Agent is analyzing/planning
    - tool_call: Tool execution started/completed
    - message: Assistant message
    - sql: Final generated SQL
    - error: Error occurred
    - done: Processing complete
    """
    # Validate prompt
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt cannot be empty",
        )

    # Check if database exists
    try:
        db_info = await database_manager.get_database(name)
        if not db_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Database '{name}' not found",
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e

    # Check if agent is available
    if not agent_service.is_available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agent service is not configured. Please set AGENT_API_KEY environment variable.",
        )

    from sse_starlette.sse import EventSourceResponse, ServerSentEvent

    async def event_generator():
        """Generate SSE events from agent."""
        try:
            # Send initial connection event immediately
            yield ServerSentEvent(event="connected", data="{}")

            async for event in agent_service.run_agent(name, request.prompt, request.history):
                event_type = event.get("event", "message")
                event_data = event.get("data", {})

                logger.debug(f"SSE sending: {event_type}")
                yield ServerSentEvent(
                    event=event_type,
                    data=json.dumps(event_data, ensure_ascii=False),
                )

        except Exception as e:
            logger.exception(f"Agent stream error: {e}")
            error_event = {"error": str(e), "detail": None}
            yield ServerSentEvent(
                event="error",
                data=json.dumps(error_event, ensure_ascii=False),
            )

    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/dbs/{name}/agent/cancel",
    response_model=CancelResponse,
    responses={
        404: {"model": ErrorResponse, "description": "No active task found"},
    },
    summary="Cancel active Agent task",
)
async def cancel_agent_query(name: str) -> CancelResponse:
    """
    Cancel an active Agent task for the specified database.
    """
    cancelled = agent_service.cancel_task(name)
    return CancelResponse(cancelled=cancelled)

