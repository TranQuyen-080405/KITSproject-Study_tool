from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .db import get_db
from .repositories import ConversationRepository
from .schemas import ChatResponse, ConversationCreate, ConversationResponse, MessageCreate, MessageResponse
from .services import ChatService

router = APIRouter()


def current_user_id(x_user_id: str | None = Header(default=None, alias="x-user-id")) -> str:
    user_id = (x_user_id or "").strip()
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail={"code": "MISSING_USER_ID", "message": "Header x-user-id is required"},
        )
    return user_id


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    await db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}


@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(payload: ConversationCreate, user_id: str = Depends(current_user_id), db: AsyncSession = Depends(get_db)):
    conversation = await ConversationRepository(db).create(user_id, payload.title)
    await db.commit()
    return conversation


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(user_id: str = Depends(current_user_id), db: AsyncSession = Depends(get_db)):
    return await ConversationRepository(db).list_by_user(user_id)


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: UUID, user_id: str = Depends(current_user_id), db: AsyncSession = Depends(get_db)):
    conversation = await ChatService(db, get_settings()).conversation_for_user(conversation_id, user_id)
    return {"id": conversation.id, "user_id": conversation.user_id, "title": conversation.title, "messages": [MessageResponse.model_validate(message) for message in conversation.messages]}


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: UUID, user_id: str = Depends(current_user_id), db: AsyncSession = Depends(get_db)):
    service = ChatService(db, get_settings())
    conversation = await service.conversation_for_user(conversation_id, user_id)
    await service.repo.delete(conversation)
    await db.commit()
    return Response(status_code=204)


@router.post("/conversations/{conversation_id}/messages", response_model=ChatResponse, status_code=201)
async def send_message(conversation_id: UUID, payload: MessageCreate, user_id: str = Depends(current_user_id), db: AsyncSession = Depends(get_db)):
    user_message, assistant_message, result = await ChatService(db, get_settings()).send_message(conversation_id, user_id, payload.content)
    return ChatResponse(user_message=user_message, assistant_message=assistant_message, provider=result.provider, model=result.model, input_tokens=result.input_tokens, output_tokens=result.output_tokens)


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def list_messages(conversation_id: UUID, user_id: str = Depends(current_user_id), page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db)):
    conversation = await ChatService(db, get_settings()).conversation_for_user(conversation_id, user_id)
    start = (page - 1) * limit
    return conversation.messages[start:start + limit]
