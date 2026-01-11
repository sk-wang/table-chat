"""
SQL编辑器记忆API端点

提供RESTful API接口用于管理SQL编辑器的历史记录
"""

from typing import Any, Optional

from fastapi import APIRouter, HTTPException, status

from app.models.editor_memory import EditorMemory, EditorMemoryCreate, EditorMemoryList
from app.services import editor_memory_service

router = APIRouter(prefix="/editor-memory", tags=["Editor Memory"])


@router.post("", response_model=EditorMemory, status_code=status.HTTP_201_CREATED)
async def create_editor_memory(data: EditorMemoryCreate) -> EditorMemory:
    """
    创建新的编辑器记忆记录

    保存SQL编辑器当前的内容到历史记录
    """
    try:
        return await editor_memory_service.create_editor_memory(data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create editor memory: {str(e)}",
        )


@router.get("/{connection_id}", response_model=EditorMemoryList)
async def get_editor_memories_by_connection(connection_id: str) -> EditorMemoryList:
    """
    获取指定数据库连接的所有编辑器历史记录

    返回按时间倒序排列的历史记录列表
    """
    try:
        return await editor_memory_service.get_editor_memories_by_connection(connection_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get editor memories: {str(e)}",
        )


@router.get("/latest/{connection_id}", response_model=Optional[EditorMemory])
async def get_latest_editor_memory(connection_id: str) -> Optional[EditorMemory]:
    """
    获取指定数据库连接的最新编辑器记忆记录

    用于数据库切换时自动恢复上次的编辑器内容
    """
    try:
        return await editor_memory_service.get_latest_editor_memory(connection_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get latest editor memory: {str(e)}",
        )


@router.delete("/{record_id}", response_model=None)
async def delete_editor_memory(record_id: int) -> dict[str, Any]:
    """
    删除指定的编辑器历史记录

    Args:
        record_id: 记录ID

    Returns:
        删除结果
    """
    try:
        success = await editor_memory_service.delete_editor_memory(record_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
        return {"success": True, "message": "记录已删除"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete editor memory: {str(e)}",
        )


@router.delete("/connection/{connection_id}", response_model=None)
async def delete_all_editor_memories_by_connection(
    connection_id: str,
) -> dict[str, Any]:
    """
    清空指定数据库连接的所有编辑器历史记录

    Args:
        connection_id: 数据库连接ID

    Returns:
        删除结果和删除的记录数
    """
    try:
        deleted_count = await editor_memory_service.delete_all_editor_memories_by_connection(
            connection_id
        )
        return {
            "success": True,
            "message": "已清空连接的所有历史记录",
            "deletedCount": deleted_count,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete all editor memories: {str(e)}",
        )
