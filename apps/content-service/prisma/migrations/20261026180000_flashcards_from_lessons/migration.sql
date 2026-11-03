-- Current app reads Folder / Flashcard / Card. Older migrations only created
-- Lesson / Vocabulary. Copy those rows across, then drop the unused tables.

CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL,
    "folderId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "flashcardId" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "hint" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeckTestSession" (
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
    CONSTRAINT "DeckTestSession_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Flashcard" ("id", "title", "description", "createdAt", "updatedAt")
SELECT "id", "name", "description", "createdAt", "updatedAt"
FROM "Lesson";

INSERT INTO "Card" ("id", "flashcardId", "front", "back", "orderIndex", "createdAt", "updatedAt")
SELECT
    "id",
    "lessonId",
    "word",
    "meaning",
    (ROW_NUMBER() OVER (PARTITION BY "lessonId" ORDER BY "createdAt", "id") - 1)::INTEGER,
    "createdAt",
    "updatedAt"
FROM "Vocabulary";

ALTER TABLE "Question" DROP CONSTRAINT "Question_lessonId_fkey";
ALTER TABLE "Question" DROP CONSTRAINT "Question_vocabularyId_fkey";
DROP INDEX "Question_lessonId_idx";
DROP INDEX "Question_vocabularyId_idx";
ALTER TABLE "Question" RENAME COLUMN "lessonId" TO "flashcardId";
ALTER TABLE "Question" RENAME COLUMN "vocabularyId" TO "cardId";

CREATE INDEX "Folder_userId_idx" ON "Folder"("userId");
CREATE INDEX "Flashcard_folderId_idx" ON "Flashcard"("folderId");
CREATE INDEX "Flashcard_userId_idx" ON "Flashcard"("userId");
CREATE INDEX "Card_flashcardId_idx" ON "Card"("flashcardId");
CREATE INDEX "Question_flashcardId_idx" ON "Question"("flashcardId");
CREATE INDEX "Question_cardId_idx" ON "Question"("cardId");
CREATE INDEX "DeckTestSession_flashcardId_userId_createdAt_idx" ON "DeckTestSession"("flashcardId", "userId", "createdAt");

ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Card" ADD CONSTRAINT "Card_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeckTestSession" ADD CONSTRAINT "DeckTestSession_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE "Vocabulary";
DROP TABLE "Lesson";
