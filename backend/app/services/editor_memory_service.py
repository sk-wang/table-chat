"""
SQL编辑器记忆服务层

提供业务逻辑层接口，处理编辑器历史记录的创建、查询和管理
"""

from datetime import datetime
from typing import Optional

from app.config import settings
from app.database import editor_memory_db
from app.models.editor_memory import EditorMemory, EditorMemoryCreate, EditorMemoryList


async def create_editor_memory(data: EditorMemoryCreate) -> EditorMemory:
    """
    创建新的编辑器记忆记录

    Args:
        data: 创建请求数据

    Returns:
        新创建的编辑器记忆对象
    """
    db_path = str(settings.database_path)

    record = await editor_memory_db.create_editor_memory(
        db_path=db_path, connection_id=data.connection_id, content=data.content
    )

    return EditorMemory(
        id=record["id"],
        connection_id=record["connection_id"],
        content=record["content"],
        created_at=record["created_at"],
    )


async def get_editor_memories_by_connection(connection_id: str) -> EditorMemoryList:
    """
    获取指定连接的所有编辑器记忆记录

    Args:
        connection_id: 数据库连接ID

    Returns:
        编辑器记忆列表
    """
    db_path = str(settings.database_path)

    records = await editor_memory_db.get_editor_memories_by_connection(
        db_path=db_path, connection_id=connection_id
    )

    items = [
        EditorMemory(
            id=r["id"],
            connection_id=r["connection_id"],
            content=r["content"],
            created_at=r["created_at"],
        )
        for r in records
    ]

    return EditorMemoryList(items=items, total=len(items))


async def get_latest_editor_memory(connection_id: str) -> Optional[EditorMemory]:
    """
    获取指定连接的最新编辑器记忆记录

    Args:
        connection_id: 数据库连接ID

    Returns:
        最新的编辑器记忆对象，如果不存在则返回None
    """
    db_path = str(settings.database_path)

    record = await editor_memory_db.get_latest_editor_memory(
        db_path=db_path, connection_id=connection_id
    )

    if not record:
        return None

    return EditorMemory(
        id=record["id"],
        connection_id=record["connection_id"],
        content=record["content"],
        created_at=record["created_at"],
    )


async def delete_editor_memory(record_id: int) -> bool:
    """
    删除指定的编辑器记忆记录

    Args:
        record_id: 记录ID

    Returns:
        删除成功返回True，记录不存在返回False
    """
    db_path = str(settings.database_path)
    return await editor_memory_db.delete_editor_memory(db_path=db_path, record_id=record_id)


async def delete_all_editor_memories_by_connection(connection_id: str) -> int:
    """
    删除指定连接的所有编辑器记忆记录

    Args:
        connection_id: 数据库连接ID

    Returns:
        删除的记录数量
    """
    db_path = str(settings.database_path)
    return await editor_memory_db.delete_all_editor_memories_by_connection(
        db_path=db_path, connection_id=connection_id
    )
