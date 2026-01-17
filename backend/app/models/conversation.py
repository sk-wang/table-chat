"""Pydantic models for agent conversations and messages."""

from datetime import datetime
from typing import Any

from humps import camelize
from pydantic import BaseModel, Field


def to_camel(string: str) -> str:
    return camelize(string)


class ConversationBase(BaseModel):
    model_config = {"alias_generator": to_camel, "populate_by_name": True}


class ConversationCreate(ConversationBase):
    title: str | None = Field(default=None, max_length=200)


class ConversationUpdate(ConversationBase):
    title: str = Field(..., min_length=1, max_length=200)


class ConversationResponse(ConversationBase):
    id: str
    connection_id: str
    title: str
    created_at: datetime
    updated_at: datetime


class MessageCreate(ConversationBase):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str
    tool_calls: list[dict[str, Any]] | None = None


class MessageResponse(ConversationBase):
    id: int
    conversation_id: str
    role: str
    content: str
    tool_calls: list[dict[str, Any]] | None = None
    created_at: datetime


class ConversationWithMessages(ConversationResponse):
    messages: list[MessageResponse] = []


class ConversationListResponse(ConversationBase):
    items: list[ConversationResponse]
    total: int


class GenerateTitleRequest(ConversationBase):
    first_message: str = Field(..., max_length=1000)


class GenerateTitleResponse(ConversationBase):
    title: str
