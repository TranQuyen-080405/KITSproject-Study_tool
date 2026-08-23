import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (Index("ix_conversations_user_id_updated_at", "user_id", "updated_at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column("user_id", String, nullable=False)
    title: Mapped[str] = mapped_column(String, default="Cuộc hội thoại mới", nullable=False)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime(timezone=True), default=utcnow, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column("updated_at", DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (Index("ix_messages_conversation_id_created_at", "conversation_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column("created_at", DateTime(timezone=True), default=utcnow, server_default=func.now())
    conversation: Mapped[Conversation] = relationship(back_populates="messages")
