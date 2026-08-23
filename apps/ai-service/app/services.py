from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from .config import Settings
from .llm import invoke_llm
from .memory import build_context
from .repositories import ConversationRepository


class ChatService:
    def __init__(self, session: AsyncSession, settings: Settings):
        self.repo = ConversationRepository(session)
        self.session = session
        self.settings = settings

    async def conversation_for_user(self, conversation_id: UUID, user_id: str):
        conversation = await self.repo.get(conversation_id)
        if not conversation or conversation.user_id != user_id:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation

    async def send_message(self, conversation_id: UUID, user_id: str, content: str):
        conversation = await self.conversation_for_user(conversation_id, user_id)
        user_message = await self.repo.add_message(conversation.id, "user", content.strip())
        context = build_context(self.settings, conversation.messages, content.strip())
        result = await invoke_llm(self.settings, context)
        assistant_message = await self.repo.add_message(conversation.id, "assistant", result.content)
        await self.session.commit()
        return user_message, assistant_message, result
