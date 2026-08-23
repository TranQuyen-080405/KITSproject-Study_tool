// This file will contain the Analytics Service business logic.
export type ReviewStatus = "new" | "learning" | "mastered";

export interface ReviewRecord {
  userId: string;
  vocabularyId: string;
  word: string;
  translation?: string;
  status: ReviewStatus;
  correctCount: number;
  incorrectCount: number;
  correctStreak: number;
  totalReviews: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewAt: string;
  lastReviewedAt: string;
}

export interface ReviewInput {
  userId: string;
  vocabularyId: string;
  correct: boolean;
  word?: string;
  translation?: string;
  reviewedAt?: string;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

function addMilliseconds(date: Date, milliseconds: number): string {
  return new Date(date.getTime() + milliseconds).toISOString();
}

/** A compact SM-2-inspired schedule for correct/incorrect quiz results. */
export function scheduleReview(previous: ReviewRecord | undefined, input: ReviewInput): ReviewRecord {
  const reviewedAt = input.reviewedAt ? new Date(input.reviewedAt) : new Date();
  if (Number.isNaN(reviewedAt.getTime())) throw new Error("reviewedAt must be a valid ISO date");

  const record: ReviewRecord = previous ?? {
    userId: input.userId,
    vocabularyId: input.vocabularyId,
    word: input.word?.trim() || input.vocabularyId,
    translation: input.translation?.trim() || undefined,
    status: "new",
    correctCount: 0,
    incorrectCount: 0,
    correctStreak: 0,
    totalReviews: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    nextReviewAt: reviewedAt.toISOString(),
    lastReviewedAt: reviewedAt.toISOString(),
  };

  record.word = input.word?.trim() || record.word;
  record.translation = input.translation?.trim() || record.translation;
  record.totalReviews += 1;
  record.lastReviewedAt = reviewedAt.toISOString();

  if (!input.correct) {
    record.incorrectCount += 1;
    record.correctStreak = 0;
    record.status = "learning";
    record.easeFactor = Math.max(1.3, Number((record.easeFactor - 0.2).toFixed(2)));
    record.intervalDays = 0;
    record.nextReviewAt = addMilliseconds(reviewedAt, 10 * MINUTE);
    return record;
  }

  record.correctCount += 1;
  record.correctStreak += 1;
  record.easeFactor = Math.min(3, Number((record.easeFactor + 0.05).toFixed(2)));
  if (record.correctStreak === 1) record.intervalDays = 1;
  else if (record.correctStreak === 2) record.intervalDays = 3;
  else record.intervalDays = Math.max(4, Math.round(Math.max(1, record.intervalDays) * record.easeFactor));

  record.status = record.correctStreak >= 3 ? "mastered" : "learning";
  record.nextReviewAt = addMilliseconds(reviewedAt, record.intervalDays * DAY);
  return record;
}

export function toDueIn(record: ReviewRecord, now = new Date()): number {
  return Math.max(0, new Date(record.nextReviewAt).getTime() - now.getTime());
}
