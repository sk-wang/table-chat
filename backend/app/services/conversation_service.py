import json
import uuid
from datetime import datetime, timezone
from typing import Any

from app.db.sqlite import db_manager


class ConversationService:
    async def create_conversation(
        self, connection_id: str, title: str | None = None
    ) -> dict[str, Any]:
        conversation_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        actual_title = title or "New Conversation"

        async with db_manager.get_connection() as conn:
            await conn.execute(
                """
                INSERT INTO agent_conversations (id, connection_id, title, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (conversation_id, connection_id, actual_title, now, now),
            )
            await conn.commit()

        return {
            "id": conversation_id,
            "connection_id": connection_id,
            "title": actual_title,
            "created_at": now,
            "updated_at": now,
        }

    async def list_conversations(
        self, connection_id: str, limit: int = 50
    ) -> tuple[list[dict[str, Any]], int]:
        async with db_manager.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT COUNT(*) FROM agent_conversations WHERE connection_id = ?",
                (connection_id,),
            )
            row = await cursor.fetchone()
            total = row[0] if row else 0

            cursor = await conn.execute(
                """
                SELECT id, connection_id, title, created_at, updated_at
                FROM agent_conversations
                WHERE connection_id = ?
                ORDER BY updated_at DESC
                LIMIT ?
                """,
                (connection_id, limit),
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows], total

    async def get_conversation(
        self, conversation_id: str, message_limit: int = 100
    ) -> dict[str, Any] | None:
        async with db_manager.get_connection() as conn:
            cursor = await conn.execute(
                """
                SELECT id, connection_id, title, created_at, updated_at
                FROM agent_conversations
                WHERE id = ?
                """,
                (conversation_id,),
            )
            row = await cursor.fetchone()
            if not row:
                return None

            conversation = dict(row)

            cursor = await conn.execute(
                """
                SELECT id, conversation_id, role, content, tool_calls_json, created_at
                FROM agent_messages
                WHERE conversation_id = ?
                ORDER BY id ASC
                LIMIT ?
                """,
                (conversation_id, message_limit),
            )
            message_rows = await cursor.fetchall()
            messages = []
            for msg_row in message_rows:
                msg = dict(msg_row)
                tool_calls_json = msg.pop("tool_calls_json", None)
                msg["tool_calls"] = json.loads(tool_calls_json) if tool_calls_json else None
                messages.append(msg)

            conversation["messages"] = messages
            return conversation

    async def update_conversation(
        self, conversation_id: str, title: str
    ) -> dict[str, Any] | None:
        now = datetime.now(timezone.utc).isoformat()
        async with db_manager.get_connection() as conn:
            cursor = await conn.execute(
                """
                UPDATE agent_conversations
                SET title = ?, updated_at = ?
                WHERE id = ?
                """,
                (title, now, conversation_id),
            )
            await conn.commit()

            if cursor.rowcount == 0:
                return None

            cursor = await conn.execute(
                """
                SELECT id, connection_id, title, created_at, updated_at
                FROM agent_conversations
                WHERE id = ?
                """,
                (conversation_id,),
            )
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def delete_conversation(self, conversation_id: str) -> bool:
        async with db_manager.get_connection() as conn:
            cursor = await conn.execute(
                "DELETE FROM agent_conversations WHERE id = ?",
                (conversation_id,),
            )
            await conn.commit()
            return cursor.rowcount > 0

    async def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        tool_calls: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any] | None:
        now = datetime.now(timezone.utc).isoformat()
        tool_calls_json = json.dumps(tool_calls) if tool_calls else None

        async with db_manager.get_connection() as conn:
            cursor = await conn.execute(
                "SELECT id FROM agent_conversations WHERE id = ?",
                (conversation_id,),
            )
            if not await cursor.fetchone():
                return None

            cursor = await conn.execute(
                """
                INSERT INTO agent_messages (conversation_id, role, content, tool_calls_json, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (conversation_id, role, content, tool_calls_json, now),
            )
            message_id = cursor.lastrowid

            await conn.execute(
                "UPDATE agent_conversations SET updated_at = ? WHERE id = ?",
                (now, conversation_id),
            )
            await conn.commit()

        return {
            "id": message_id,
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "tool_calls": tool_calls,
            "created_at": now,
        }


conversation_service = ConversationService()
