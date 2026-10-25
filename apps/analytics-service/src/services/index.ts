// This file contains the Analytics Service business logic.
export type ReviewStatus = "new" | "learning" | "mastered";

export interface ReviewRecord {
  userId: string;
  cardId: string;
  deckId?: string;
  vocabularyId?: string; // backward compatibility alias for cardId
  word: string;
  front: string; // alias for word
  translation?: string;
  back?: string; // alias for translation
  status: ReviewStatus;
  correctCount: number;
  incorrectCount: number;
  correctStreak: number;
  totalReviews: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewAt: string;
  lastReviewedAt: string;
  lastResponseTimeMs?: number;
  averageResponseTimeMs?: number;
}

export interface ReviewInput {
  userId: string;
  cardId?: string;
  deckId?: string;
  vocabularyId?: string; // backward compatibility alias for cardId
  correct: boolean;
  word?: string;
  front?: string; // alias for word
  translation?: string;
  back?: string; // alias for translation
  reviewedAt?: string;
  responseTimeMs?: number;
}

export type SessionType = "deck_study" | "daily_review" | "mcq" | "flashcard";

export interface StudySessionRecord {
  id: string;
  userId: string;
  deckId?: string;
  deckTitle?: string;
  sessionType: SessionType;
  totalCardsOrQuestions: number;
  correctCount: number;
  scorePercentage: number;
  durationSeconds: number;
  averageResponseTimeMs?: number;
  completedAt: string;
}

export interface StudySessionInput {
  userId: string;
  deckId?: string;
  deckTitle?: string;
  sessionType: SessionType;
  totalCardsOrQuestions: number;
  correctCount: number;
  durationSeconds: number;
  completedAt?: string;
}

export interface UserStreakRecord {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastStudiedDate: string | null; // "YYYY-MM-DD"
  updatedAt: string;
}

export interface BatchReviewItem {
  cardId: string;
  deckId?: string;
  word?: string;
  front?: string;
  translation?: string;
  back?: string;
  correct: boolean;
  responseTimeMs?: number;
}

export interface BatchSessionSubmitInput {
  userId: string;
  deckId?: string;
  deckTitle?: string;
  sessionType: SessionType;
  totalCardsOrQuestions: number;
  correctCount: number;
  durationSeconds: number;
  completedAt?: string;
  reviews?: BatchReviewItem[];
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

  const effectiveId = (input.cardId ?? input.vocabularyId ?? "").trim();
  const wordText = (input.front ?? input.word ?? effectiveId).trim();
  const translationText = (input.back ?? input.translation ?? "").trim() || undefined;
  const deckId = input.deckId ?? previous?.deckId;

  const record: ReviewRecord = previous ?? {
    userId: input.userId,
    cardId: effectiveId,
    deckId,
    vocabularyId: effectiveId,
    word: wordText,
    front: wordText,
    translation: translationText,
    back: translationText,
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

  record.cardId = effectiveId || record.cardId;
  record.deckId = deckId || record.deckId;
  record.vocabularyId = effectiveId || record.vocabularyId;
  record.word = wordText || record.word;
  record.front = wordText || record.front;
  record.translation = translationText || record.translation;
  record.back = translationText || record.back;
  record.totalReviews += 1;
  record.lastReviewedAt = reviewedAt.toISOString();

  // Track response latency
  if (typeof input.responseTimeMs === "number" && input.responseTimeMs > 0) {
    record.lastResponseTimeMs = Math.round(input.responseTimeMs);
    if (record.averageResponseTimeMs) {
      record.averageResponseTimeMs = Math.round(
        (record.averageResponseTimeMs * (record.totalReviews - 1) + input.responseTimeMs) / record.totalReviews,
      );
    } else {
      record.averageResponseTimeMs = Math.round(input.responseTimeMs);
    }
  }

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

  // Ease bonus for fast reactions (< 2.5s)
  const isFastResponse = typeof input.responseTimeMs === "number" && input.responseTimeMs > 0 && input.responseTimeMs < 2500;
  const easeDelta = isFastResponse ? 0.08 : 0.05;
  record.easeFactor = Math.min(3, Number((record.easeFactor + easeDelta).toFixed(2)));

  if (record.correctStreak === 1) record.intervalDays = 1;
  else if (record.correctStreak === 2) record.intervalDays = 3;
  else record.intervalDays = Math.max(4, Math.round(Math.max(1, record.intervalDays) * record.easeFactor));

  record.status = record.correctStreak >= 3 ? "mastered" : "learning";
  record.nextReviewAt = addMilliseconds(reviewedAt, record.intervalDays * DAY);
  return record;
}

export function createStudySession(input: StudySessionInput): StudySessionRecord {
  const completedAt = input.completedAt ? new Date(input.completedAt).toISOString() : new Date().toISOString();
  const total = Math.max(1, input.totalCardsOrQuestions);
  const correct = Math.min(total, Math.max(0, input.correctCount));
  const scorePercentage = Math.round((correct / total) * 100);
  const durationSeconds = Math.max(0, input.durationSeconds);
  const averageResponseTimeMs = total > 0 ? Math.round((durationSeconds * 1000) / total) : undefined;

  return {
    id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId: input.userId,
    deckId: input.deckId,
    deckTitle: input.deckTitle,
    sessionType: input.sessionType,
    totalCardsOrQuestions: total,
    correctCount: correct,
    scorePercentage,
    durationSeconds,
    averageResponseTimeMs,
    completedAt,
  };
}

export function calculateStreakDays(timestamps: string[]): number {
  if (timestamps.length === 0) return 0;
  const daysSet = new Set(
    timestamps.map((ts) => {
      const d = new Date(ts);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    }),
  );

  const sortedDays = Array.from(daysSet).sort().reverse();
  const today = new Date();
  const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;

  const yesterday = new Date(today.getTime() - DAY);
  const yesterdayStr = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, "0")}-${String(yesterday.getUTCDate()).padStart(2, "0")}`;

  // If user hasn't studied today or yesterday, streak is 0
  if (!sortedDays.includes(todayStr) && !sortedDays.includes(yesterdayStr)) {
    return 0;
  }

  let streak = 0;
  let checkDate = sortedDays.includes(todayStr) ? today : yesterday;

  while (true) {
    const checkStr = `${checkDate.getUTCFullYear()}-${String(checkDate.getUTCMonth() + 1).padStart(2, "0")}-${String(checkDate.getUTCDate()).padStart(2, "0")}`;
    if (daysSet.has(checkStr)) {
      streak += 1;
      checkDate = new Date(checkDate.getTime() - DAY);
    } else {
      break;
    }
  }

  return streak;
}

export function updateStreak(
  currentStreak: number,
  longestStreak: number,
  lastStudiedDate: string | null,
  completedAtIso: string,
): { currentStreak: number; longestStreak: number; lastStudiedDate: string } {
  const completedDate = new Date(completedAtIso);
  const todayStr = `${completedDate.getUTCFullYear()}-${String(completedDate.getUTCMonth() + 1).padStart(2, "0")}-${String(completedDate.getUTCDate()).padStart(2, "0")}`;

  if (!lastStudiedDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(longestStreak, 1),
      lastStudiedDate: todayStr,
    };
  }

  if (lastStudiedDate === todayStr) {
    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      lastStudiedDate: todayStr,
    };
  }

  const lastDate = new Date(lastStudiedDate + "T00:00:00Z");
  const diffDays = Math.round((new Date(todayStr + "T00:00:00Z").getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));

  let nextStreak = currentStreak;
  if (diffDays === 1) {
    nextStreak += 1;
  } else if (diffDays > 1) {
    nextStreak = 1;
  }

  return {
    currentStreak: nextStreak,
    longestStreak: Math.max(longestStreak, nextStreak),
    lastStudiedDate: todayStr,
  };
}

export function toDueIn(record: ReviewRecord, now = new Date()): number {
  return Math.max(0, new Date(record.nextReviewAt).getTime() - now.getTime());
}
