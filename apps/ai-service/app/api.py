from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .auth import current_user_id
from .ai_errors import ai_http_error
from .deck_questions import generate_deck_questions
from .flashcard_completion import complete_flashcards
from .db import get_db
from .repositories import ConversationRepository
from .llm import generate_flashcards, generate_review_questions
from .schemas import (
    ChatResponse,
    ConversationCreate,
    ConversationResponse,
    FlashcardCompleteRequest,
    FlashcardCompleteResponse,
    FlashcardGenerateRequest,
    FlashcardGenerateResponse,
    MessageCreate,
    MessageResponse,
    ReviewQuestionsGenerateRequest,
    ReviewQuestionsGenerateResponse,
)
from .services import ChatService

router = APIRouter()


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


@router.post("/flashcards/generate", response_model=FlashcardGenerateResponse, status_code=200)
async def generate_flashcard_set(payload: FlashcardGenerateRequest):
    """Generate structured flashcards from a natural-language prompt.

    Example body: { "prompt": "create 10 words related to animals" }
    Returns a list of { question: Korean word, answer: Vietnamese meaning }.
    """
    try:
        items = await generate_flashcards(get_settings(), payload.prompt)
        return FlashcardGenerateResponse(flashcards=items)
    except Exception as error:
        raise ai_http_error(error) from None


@router.post("/internal/questions/generate", response_model=ReviewQuestionsGenerateResponse, status_code=200)
@router.post("/questions/generate", response_model=ReviewQuestionsGenerateResponse, status_code=200)
async def generate_review_question_set(payload: ReviewQuestionsGenerateRequest):
    """Generate multiple-choice review questions for a given list of Korean words.

    For internal microservice use (e.g. content-service, quiz/study runner).
    Accepts:
    - words: list of Korean words (strings or objects with optional meaning/vocabulary_id)
    - description: style of questions, e.g. "Revision word", "applied word question"
    - question_count: number of questions to generate

    Returns:
    - questions: list of question objects (prompt, options, correct_option_index, target_word, explanation)
    - total: number of questions generated
    """
    try:
        if payload.one_per_word:
            items = await generate_deck_questions(get_settings(), payload.words)
        else:
            items = await generate_review_questions(
                settings=get_settings(), words=payload.words,
                description=payload.description or "Revision and applied word questions",
                question_count=payload.question_count,
            )
        return ReviewQuestionsGenerateResponse(questions=items, total=len(items))
    except Exception as error:
        raise ai_http_error(error) from None


@router.post("/flashcards/complete", response_model=FlashcardCompleteResponse)
async def complete_flashcard_sides(payload: FlashcardCompleteRequest):
    try:
        cards = await complete_flashcards(get_settings(), payload.cards)
        return FlashcardCompleteResponse(cards=cards)
    except Exception as error:
        raise ai_http_error(error) from None
