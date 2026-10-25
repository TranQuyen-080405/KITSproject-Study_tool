-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "UserReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "deckId" TEXT,
    "word" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "translation" TEXT,
    "back" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "incorrectCount" INTEGER NOT NULL DEFAULT 0,
    "correctStreak" INTEGER NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "nextReviewAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastResponseTimeMs" INTEGER,
    "averageResponseTimeMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deckId" TEXT,
    "deckTitle" TEXT,
    "sessionType" TEXT NOT NULL DEFAULT 'deck_study',
    "totalCardsOrQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "scorePercentage" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "averageResponseTimeMs" INTEGER,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStreak" (
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStudiedDate" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "UserReview_userId_nextReviewAt_idx" ON "UserReview"("userId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "UserReview_userId_deckId_idx" ON "UserReview"("userId", "deckId");

-- CreateIndex
CREATE UNIQUE INDEX "UserReview_userId_cardId_key" ON "UserReview"("userId", "cardId");

-- CreateIndex
CREATE INDEX "StudySession_userId_completedAt_idx" ON "StudySession"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "StudySession_userId_deckId_idx" ON "StudySession"("userId", "deckId");
