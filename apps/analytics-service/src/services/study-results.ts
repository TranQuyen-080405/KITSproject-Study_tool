import { ReviewRepository, reviewRepository } from "../repositories/index.js";
import { createStudySession, scheduleReview, updateStreak, type ReviewInput, type StudySessionInput } from "./index.js";

export class InputError extends Error {}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("JSON object is required");
  return value as Record<string, unknown>;
}
function text(value: unknown, name: string, required = false): string | undefined {
  if (value === undefined || value === null) {
    if (required) throw new InputError(name + " is required");
    return undefined;
  }
  if (typeof value !== "string" || (required && !value.trim())) throw new InputError(name + " must be a non-empty string");
  return value.trim() || undefined;
}
function number(value: unknown, name: string, integer = false): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) {
    throw new InputError(name + " must be a non-negative " + (integer ? "integer" : "number"));
  }
  return value;
}
function timestamp(value: unknown, name: string): string | undefined {
  const result = text(value, name);
  if (result && (!/^\d{4}-\d{2}-\d{2}T/.test(result) || Number.isNaN(Date.parse(result)))) {
    throw new InputError(name + " must be a valid ISO timestamp");
  }
  return result;
}

export function parseReview(value: unknown, userId?: string, deckId?: string, reviewedAt?: string): ReviewInput {
  const body = object(value);
  if (typeof body.correct !== "boolean") throw new InputError("correct must be a boolean");
  const word = text(body.word ?? body.front, "word");
  const translation = text(body.translation ?? body.back, "translation");
  return {
    userId: userId ?? text(body.userId, "userId", true)!,
    cardId: text(body.cardId ?? body.vocabularyId, "cardId", true)!,
    deckId: text(body.deckId, "deckId") ?? deckId, correct: body.correct,
    word, front: word, translation, back: translation,
    reviewedAt: reviewedAt ?? timestamp(body.reviewedAt, "reviewedAt"),
    responseTimeMs: body.responseTimeMs == null ? undefined : Math.round(number(body.responseTimeMs, "responseTimeMs")),
  };
}
export function parseStudyResult(value: unknown) {
  const body = object(value);
  const userId = text(body.userId, "userId", true)!;
  const sessionType = text(body.sessionType, "sessionType", true);
  if (!["deck_study", "daily_review", "mcq", "flashcard"].includes(sessionType!)) {
    throw new InputError("sessionType is invalid");
  }
  const totalCardsOrQuestions = number(body.totalCardsOrQuestions, "totalCardsOrQuestions", true);
  const correctCount = number(body.correctCount, "correctCount", true);
  if (totalCardsOrQuestions < 1 || correctCount > totalCardsOrQuestions) {
    throw new InputError("totalCardsOrQuestions must be positive and correctCount cannot exceed it");
  }
  const input: StudySessionInput = {
    userId, sessionType: sessionType as StudySessionInput["sessionType"],
    deckId: text(body.deckId, "deckId"), deckTitle: text(body.deckTitle, "deckTitle"),
    totalCardsOrQuestions, correctCount,
    durationSeconds: Math.round(number(body.durationSeconds, "durationSeconds")),
    completedAt: timestamp(body.completedAt, "completedAt"),
  };
  if (body.reviews !== undefined && !Array.isArray(body.reviews)) throw new InputError("reviews must be an array");
  const reviews = ((body.reviews ?? []) as unknown[]).map((item) => parseReview(item, userId, input.deckId, input.completedAt));
  return { input, reviews };
}

export async function recordReview(input: ReviewInput, repository: ReviewRepository = reviewRepository) {
  return repository.transaction(input.userId, async (transaction) => {
    const previous = await transaction.get(input.userId, input.cardId!);
    return transaction.save(scheduleReview(previous, input));
  });
}
export async function recordStudyResult(
  input: StudySessionInput, reviews: ReviewInput[] = [], repository: ReviewRepository = reviewRepository,
) {
  const session = createStudySession(input);
  return repository.transaction(input.userId, async (transaction) => {
    const saved = await transaction.saveSession(session);
    for (const inputReview of reviews) {
      const previous = await transaction.get(input.userId, inputReview.cardId!);
      await transaction.save(scheduleReview(previous, { ...inputReview, reviewedAt: session.completedAt }));
    }
    const previousStreak = await transaction.getStreak(input.userId);
    const streak = updateStreak(
      previousStreak?.currentStreak ?? 0, previousStreak?.longestStreak ?? 0,
      previousStreak?.lastStudiedDate ?? null, session.completedAt,
    );
    await transaction.saveStreak({ userId: input.userId, ...streak, updatedAt: new Date().toISOString() });
    return { session: saved, reviewsCount: reviews.length, streak };
  });
}
