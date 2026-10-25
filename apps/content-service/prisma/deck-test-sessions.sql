-- Additive update for an existing Flashcard/Card database.
-- Does not modify cards, legacy questions or existing session data.
CREATE TABLE IF NOT EXISTS "DeckTestSession" (
  "id" TEXT NOT NULL,
  "flashcardId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceSessionId" TEXT,
  "deckTitle" TEXT NOT NULL,
  "questions" JSONB NOT NULL,
  "answers" JSONB NOT NULL,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "totalQuestions" INTEGER NOT NULL,
  "scorePercentage" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "DeckTestSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeckTestSession_flashcardId_fkey" FOREIGN KEY ("flashcardId")
    REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DeckTestSession_flashcardId_userId_createdAt_idx"
  ON "DeckTestSession"("flashcardId", "userId", "createdAt");
