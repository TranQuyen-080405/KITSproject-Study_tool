from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import Conversation, Message


class ConversationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user_id: str, title: str | None) -> Conversation:
        conversation = Conversation(user_id=user_id, title=title or "Cuộc hội thoại mới")
        self.session.add(conversation)
        await self.session.flush()
        return conversation

    async def list_by_user(self, user_id: str) -> list[Conversation]:
        result = await self.session.scalars(
            select(Conversation).where(Conversation.user_id == user_id).order_by(Conversation.updated_at.desc())
        )
        return list(result)

    async def get(self, conversation_id: UUID) -> Conversation | None:
        return await self.session.scalar(
            select(Conversation).options(selectinload(Conversation.messages)).where(Conversation.id == conversation_id)
        )

    async def delete(self, conversation: Conversation) -> None:
        await self.session.delete(conversation)

    async def add_message(self, conversation_id: UUID, role: str, content: str) -> Message:
        message = Message(conversation_id=conversation_id, role=role, content=content)
        self.session.add(message)
        conversation = await self.session.get(Conversation, conversation_id)
        if conversation:
            conversation.updated_at = datetime.now(timezone.utc)
        await self.session.flush()
        return message
