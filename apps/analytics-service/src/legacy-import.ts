import { prisma } from "./db.js";
import type { PrismaClient } from "./generated/prisma/client.js";
import { reviewData, sessionData } from "./repositories/index.js";
import type { ReviewRecord, StudySessionRecord, UserStreakRecord } from "./services/index.js";

type Row = Record<string, unknown>;
function row(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Legacy record must be an object");
  return value as Row;
}
function entries(value: unknown): Row[] {
  if (value === undefined) return [];
  if (!value || typeof value !== "object") throw new Error("Legacy collections must be objects or arrays");
  return Object.values(value).map(row);
}
function string(value: unknown, field: string): string {
  if ((typeof value !== "string" && typeof value !== "number") || !String(value).trim()) throw new Error("Invalid legacy " + field);
  return String(value).trim();
}
function optional(value: unknown): string | undefined {
  return value == null ? undefined : string(value, "text");
}
function count(value: unknown, field: string, fallback = 0): number {
  const number = value === undefined ? fallback : value;
  if (typeof number !== "number" || !Number.isFinite(number) || number < 0) throw new Error("Invalid legacy " + field);
  return Math.round(number);
}
function date(value: unknown, field: string): string {
  const result = string(value, field);
  const parsed = new Date(result);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid legacy " + field);
  return parsed.toISOString();
}
function review(value: Row): ReviewRecord {
  const cardId = string(value.cardId ?? value.vocabularyId, "cardId");
  const correctCount = count(value.correctCount, "correctCount");
  const incorrectCount = count(value.incorrectCount, "incorrectCount");
  const correctStreak = count(value.correctStreak, "correctStreak");
  const status = value.status ?? (correctStreak >= 3 ? "mastered" : "learning");
  if (!["new", "learning", "mastered"].includes(String(status))) throw new Error("Invalid legacy review status");
  const word = optional(value.word ?? value.front) ?? cardId;
  const translation = optional(value.translation ?? value.back);
  const easeFactor = value.easeFactor ?? 2.5;
  if (typeof easeFactor !== "number" || !Number.isFinite(easeFactor) || easeFactor <= 0) throw new Error("Invalid legacy easeFactor");
  return {
    userId: string(value.userId, "userId"), cardId, vocabularyId: cardId, deckId: optional(value.deckId),
    word, front: optional(value.front) ?? word, translation, back: optional(value.back) ?? translation,
    status: status as ReviewRecord["status"], correctCount, incorrectCount, correctStreak,
    totalReviews: count(value.totalReviews, "totalReviews", correctCount + incorrectCount),
    intervalDays: count(value.intervalDays, "intervalDays"), easeFactor,
    nextReviewAt: date(value.nextReviewAt, "nextReviewAt"), lastReviewedAt: date(value.lastReviewedAt, "lastReviewedAt"),
    lastResponseTimeMs: value.lastResponseTimeMs == null ? undefined : count(value.lastResponseTimeMs, "lastResponseTimeMs"),
    averageResponseTimeMs: value.averageResponseTimeMs == null ? undefined : count(value.averageResponseTimeMs, "averageResponseTimeMs"),
  };
}
function session(value: Row): StudySessionRecord {
  const type = string(value.sessionType, "sessionType");
  if (!["deck_study", "daily_review", "mcq", "flashcard"].includes(type)) throw new Error("Invalid legacy sessionType");
  const total = count(value.totalCardsOrQuestions, "totalCardsOrQuestions");
  const correct = count(value.correctCount, "correctCount");
  if (total < 1 || correct > total) throw new Error("Invalid legacy session counts");
  return {
    id: string(value.id, "session.id"), userId: string(value.userId, "session.userId"),
    deckId: optional(value.deckId), deckTitle: optional(value.deckTitle), sessionType: type as StudySessionRecord["sessionType"],
    totalCardsOrQuestions: total, correctCount: correct, scorePercentage: count(value.scorePercentage, "scorePercentage", Math.round(correct / total * 100)),
    durationSeconds: count(value.durationSeconds, "durationSeconds"),
    averageResponseTimeMs: value.averageResponseTimeMs == null ? undefined : count(value.averageResponseTimeMs, "averageResponseTimeMs"),
    completedAt: date(value.completedAt, "completedAt"),
  };
}
function streak(value: Row): UserStreakRecord {
  const lastStudiedDate = value.lastStudiedDate == null ? null : string(value.lastStudiedDate, "lastStudiedDate");
  if (lastStudiedDate && !/^\d{4}-\d{2}-\d{2}$/.test(lastStudiedDate)) throw new Error("Invalid legacy lastStudiedDate");
  return {
    userId: string(value.userId, "streak.userId"), currentStreak: count(value.currentStreak, "currentStreak"),
    longestStreak: count(value.longestStreak, "longestStreak"), lastStudiedDate,
    updatedAt: date(value.updatedAt, "streak.updatedAt"),
  };
}
export function normalizeLegacy(documents: unknown[]) {
  const reviews = new Map<string, ReviewRecord>();
  const sessions = new Map<string, StudySessionRecord>();
  const streaks = new Map<string, UserStreakRecord>();
  for (const document of documents) {
    const database = row(document);
    if (!("reviews" in database) && !("sessions" in database) && !("streaks" in database)) throw new Error("Unrecognized legacy JSON format");
    for (const input of entries(database.reviews)) {
      const value = review(input), key = value.userId + "::" + value.cardId;
      if (!reviews.has(key) || reviews.get(key)!.lastReviewedAt <= value.lastReviewedAt) reviews.set(key, value);
    }
    for (const input of entries(database.sessions)) {
      const value = session(input);
      if (!sessions.has(value.id) || sessions.get(value.id)!.completedAt <= value.completedAt) sessions.set(value.id, value);
    }
    for (const input of entries(database.streaks)) {
      const value = streak(input);
      if (!streaks.has(value.userId) || streaks.get(value.userId)!.updatedAt <= value.updatedAt) streaks.set(value.userId, value);
    }
  }
  return { reviews: [...reviews.values()], sessions: [...sessions.values()], streaks: [...streaks.values()] };
}

export async function importLegacy(documents: unknown[], database: PrismaClient = prisma) {
  const normalized = normalizeLegacy(documents);
  return database.$transaction(async (transaction) => {
    let reviews = 0, sessions = 0, streaks = 0;
    for (let offset = 0; offset < normalized.reviews.length; offset += 500) {
      reviews += (await transaction.userReview.createMany({
        data: normalized.reviews.slice(offset, offset + 500).map(reviewData), skipDuplicates: true,
      })).count;
    }
    for (let offset = 0; offset < normalized.sessions.length; offset += 500) {
      sessions += (await transaction.studySession.createMany({
        data: normalized.sessions.slice(offset, offset + 500).map(sessionData), skipDuplicates: true,
      })).count;
    }
    for (let offset = 0; offset < normalized.streaks.length; offset += 500) {
      streaks += (await transaction.userStreak.createMany({
        data: normalized.streaks.slice(offset, offset + 500).map((value) => ({ ...value, updatedAt: new Date(value.updatedAt) })),
        skipDuplicates: true,
      })).count;
    }
    return { inserted: { reviews, sessions, streaks }, available: {
      reviews: normalized.reviews.length, sessions: normalized.sessions.length, streaks: normalized.streaks.length,
    } };
  }, { timeout: 60_000 });
}
