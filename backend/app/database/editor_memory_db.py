"""
SQL编辑器记忆数据库操作模块

提供SQLite数据库操作接口，用于管理SQL编辑器的历史记录
"""

import aiosqlite
from datetime import datetime
from pathlib import Path
from typing import Optional


async def init_editor_memory_table(db_path: str) -> None:
    """
    初始化editor_memory表和相关索引

    Args:
        db_path: SQLite数据库文件路径
    """
    async with aiosqlite.connect(db_path) as db:
        # 创建editor_memory表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS editor_memory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                connection_id TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL
            )
        """)

        # 创建connection_id索引
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_connection_id
            ON editor_memory(connection_id)
        """)

        # 创建created_at索引
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_created_at
            ON editor_memory(created_at)
        """)

        await db.commit()


async def create_editor_memory(db_path: str, connection_id: str, content: str) -> dict[str, any]:
    """
    创建新的编辑器记忆记录

    Args:
        db_path: SQLite数据库文件路径
        connection_id: 数据库连接ID
        content: 编辑器内容（可为空字符串）

    Returns:
        包含新记录信息的字典，包括id, connection_id, content, created_at
    """
    created_at = datetime.utcnow()

    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute(
            """
            INSERT INTO editor_memory (connection_id, content, created_at)
            VALUES (?, ?, ?)
            """,
            (connection_id, content, created_at),
        )
        await db.commit()

        record_id = cursor.lastrowid

        return {
            "id": record_id,
            "connection_id": connection_id,
            "content": content,
            "created_at": created_at,
        }


async def get_editor_memories_by_connection(
    db_path: str, connection_id: str
) -> list[dict[str, any]]:
    """
    获取指定连接的所有编辑器记忆记录

    Args:
        db_path: SQLite数据库文件路径
        connection_id: 数据库连接ID

    Returns:
        记录列表，按created_at倒序排列
    """
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT id, connection_id, content, created_at
            FROM editor_memory
            WHERE connection_id = ?
            ORDER BY created_at DESC
            """,
            (connection_id,),
        )

        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_latest_editor_memory(db_path: str, connection_id: str) -> Optional[dict[str, any]]:
    """
    获取指定连接的最新编辑器记忆记录

    Args:
        db_path: SQLite数据库文件路径
        connection_id: 数据库连接ID

    Returns:
        最新记录字典，如果不存在则返回None
    """
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT id, connection_id, content, created_at
            FROM editor_memory
            WHERE connection_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (connection_id,),
        )

        row = await cursor.fetchone()
        return dict(row) if row else None


async def delete_editor_memory(db_path: str, record_id: int) -> bool:
    """
    删除指定的编辑器记忆记录

    Args:
        db_path: SQLite数据库文件路径
        record_id: 记录ID

    Returns:
        删除成功返回True，记录不存在返回False
    """
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("DELETE FROM editor_memory WHERE id = ?", (record_id,))
        await db.commit()
        return cursor.rowcount > 0


async def delete_all_editor_memories_by_connection(db_path: str, connection_id: str) -> int:
    """
    删除指定连接的所有编辑器记忆记录

    Args:
        db_path: SQLite数据库文件路径
        connection_id: 数据库连接ID

    Returns:
        删除的记录数量
    """
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute(
            "DELETE FROM editor_memory WHERE connection_id = ?", (connection_id,)
        )
        await db.commit()
        return cursor.rowcount
