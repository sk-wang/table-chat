from fastapi import APIRouter, HTTPException, status

from app.models.conversation import (
    ConversationCreate,
    ConversationListResponse,
    ConversationResponse,
    ConversationUpdate,
    ConversationWithMessages,
    GenerateTitleRequest,
    GenerateTitleResponse,
    MessageCreate,
    MessageResponse,
)
from app.services.conversation_service import conversation_service

router = APIRouter(tags=["conversations"])


@router.get(
    "/dbs/{connection_id}/conversations",
    response_model=ConversationListResponse,
)
async def list_conversations(connection_id: str, limit: int = 50):
    items, total = await conversation_service.list_conversations(connection_id, limit)
    return ConversationListResponse(
        items=[ConversationResponse(**item) for item in items],
        total=total,
    )


@router.post(
    "/dbs/{connection_id}/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(connection_id: str, data: ConversationCreate | None = None):
    title = data.title if data else None
    result = await conversation_service.create_conversation(connection_id, title)
    return ConversationResponse(**result)


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationWithMessages,
)
async def get_conversation(conversation_id: str, message_limit: int = 100):
    result = await conversation_service.get_conversation(conversation_id, message_limit)
    if not result:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationWithMessages(
        id=result["id"],
        connection_id=result["connection_id"],
        title=result["title"],
        created_at=result["created_at"],
        updated_at=result["updated_at"],
        messages=[MessageResponse(**msg) for msg in result["messages"]],
    )


@router.patch(
    "/conversations/{conversation_id}",
    response_model=ConversationResponse,
)
async def update_conversation(conversation_id: str, data: ConversationUpdate):
    result = await conversation_service.update_conversation(conversation_id, data.title)
    if not result:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConversationResponse(**result)


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_conversation(conversation_id: str):
    deleted = await conversation_service.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return None


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_message(conversation_id: str, data: MessageCreate):
    result = await conversation_service.add_message(
        conversation_id,
        data.role,
        data.content,
        data.tool_calls,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return MessageResponse(**result)


@router.post(
    "/conversations/{conversation_id}/generate-title",
    response_model=GenerateTitleResponse,
)
async def generate_title(conversation_id: str, data: GenerateTitleRequest):
    from app.services.agent_service import agent_service

    if not agent_service:
        raise HTTPException(status_code=503, detail="LLM service unavailable")

    title = await agent_service.generate_title(data.first_message)

    result = await conversation_service.update_conversation(conversation_id, title)
    if not result:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return GenerateTitleResponse(title=title)
