from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ConversationCreate(BaseModel):
    title: str | None = None


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=20_000)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    conversation_id: UUID
    role: str
    content: str
    created_at: datetime


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime


class ChatResponse(BaseModel):
    user_message: MessageResponse
    assistant_message: MessageResponse
    provider: str
    model: str
    input_tokens: int | None = None
    output_tokens: int | None = None


class FlashcardItem(BaseModel):
    question: str  # Korean word in Hangul
    answer: str    # Vietnamese meaning


class FlashcardGenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=500, description="Natural language request, e.g. 'create 10 words related to animals'")


class FlashcardGenerateResponse(BaseModel):
    flashcards: list[FlashcardItem]


class WordInput(BaseModel):
    word: str
    meaning: str | None = None
    vocabulary_id: str | None = None


class ReviewQuestionItem(BaseModel):
    target_word: str
    prompt: str
    options: list[str] = Field(min_length=2, max_length=6)
    correct_option_index: int = Field(ge=0)
    correctOptionIndex: int | None = None
    explanation: str | None = None
    question_type: str | None = None
    vocabulary_id: str | None = None

    def model_post_init(self, __context):
        if self.correctOptionIndex is None:
            self.correctOptionIndex = self.correct_option_index


class ReviewQuestionsGenerateRequest(BaseModel):
    one_per_word: bool = Field(default=False, strict=True)
    words: list[str | WordInput] = Field(
        min_length=1,
        description="List of Korean words or word objects to review",
    )
    description: str | None = Field(
        default="Revision and applied word questions",
        description="Instruction or style of questions, e.g. 'Revision word', 'applied word question', 'fill-in-the-blank'",
    )
    question_count: int = Field(
        default=5,
        ge=1,
        le=50,
        description="Number of review questions to generate",
    )


    @model_validator(mode="after")
    def validate_deck_batch(self):
        if self.one_per_word:
            if len(self.words) > 20 or self.question_count != len(self.words):
                raise ValueError("Deck batches require one question per word, up to 20 words")
            if any(not isinstance(word, WordInput) or not word.word.strip() or not word.vocabulary_id for word in self.words):
                raise ValueError("Each deck word requires its vocabulary_id")
            if len({word.vocabulary_id for word in self.words}) != len(self.words):
                raise ValueError("Deck word IDs must be unique")
        return self


class ReviewQuestionsGenerateResponse(BaseModel):
    questions: list[ReviewQuestionItem]
    total: int


class PartialFlashcard(BaseModel):
    index: int = Field(ge=0, strict=True)
    front: str = Field(default="", max_length=500, strict=True)
    back: str = Field(default="", max_length=2000, strict=True)

    @field_validator("front", "back")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def needs_content(self):
        if not self.front and not self.back:
            raise ValueError("A card must have at least one non-empty side")
        return self


class FlashcardCompleteRequest(BaseModel):
    cards: list[PartialFlashcard] = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def unique_indexes(self):
        if len({card.index for card in self.cards}) != len(self.cards):
            raise ValueError("Card indexes must be unique")
        return self


class CompletedFlashcard(BaseModel):
    index: int
    front: str = Field(min_length=1, max_length=500)
    back: str = Field(min_length=1, max_length=2000)


class FlashcardCompleteResponse(BaseModel):
    cards: list[CompletedFlashcard]
