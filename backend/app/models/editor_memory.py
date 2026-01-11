"""
SQL编辑器记忆Pydantic模型

定义API请求和响应的数据模型，遵循TableChat宪法原则
"""

from datetime import datetime
from pydantic import BaseModel, Field
from humps import camelize


def to_camel(string: str) -> str:
    """将snake_case转换为camelCase"""
    return camelize(string)


class EditorMemory(BaseModel):
    """SQL编辑器记忆响应模型"""

    id: int = Field(..., description="记录ID")
    connection_id: str = Field(..., description="数据库连接ID")
    content: str = Field(..., description="编辑器内容（可为空字符串）")
    created_at: datetime = Field(..., description="创建时间")

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "connectionId": "conn_123",
                "content": "SELECT * FROM users;",
                "createdAt": "2026-01-10T12:00:00Z",
            }
        }


class EditorMemoryCreate(BaseModel):
    """创建SQL编辑器记忆请求模型"""

    connection_id: str = Field(..., description="数据库连接ID", min_length=1)
    content: str = Field(..., description="编辑器内容（可为空字符串）")

    class Config:
        alias_generator = to_camel
        populate_by_name = True
        json_schema_extra = {
            "example": {"connectionId": "conn_123", "content": "SELECT * FROM users;"}
        }


class EditorMemoryList(BaseModel):
    """SQL编辑器记忆列表响应"""

    items: list[EditorMemory] = Field(..., description="记忆列表")
    total: int = Field(..., description="总数")

    class Config:
        alias_generator = to_camel
        populate_by_name = True
