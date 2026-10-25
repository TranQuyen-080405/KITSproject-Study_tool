import type { Request, Response } from "express";
import { reviewRepository } from "../repositories/index.js";
import { calculateStreakDays, toDueIn } from "../services/index.js";
import { InputError, parseReview, parseStudyResult, recordReview, recordStudyResult } from "../services/study-results.js";

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function failure(error: unknown, response: Response) {
  if (error instanceof InputError) {
    response.status(400).json({ error: error.message });
  } else {
    console.error("Analytics write failed", error instanceof Error ? error.name : "Unknown error");
    response.status(503).json({ error: "Unable to persist analytics result" });
  }
}
export async function submitReview(request: Request, response: Response): Promise<void> {
  try {
    const review = await recordReview(parseReview({ ...request.body, userId: response.locals.analyticsUserId }));
    response.status(201).json({ review, mastered: review.status === "mastered" });
  } catch (error) { failure(error, response); }
}
export async function submitSession(request: Request, response: Response): Promise<void> {
  try {
    const { input } = parseStudyResult({ ...request.body, userId: response.locals.analyticsUserId });
    const { session, streak } = await recordStudyResult(input);
    response.status(201).json({ session, streak });
  } catch (error) { failure(error, response); }
}
export async function submitBatchSession(request: Request, response: Response): Promise<void> {
  try {
    const { input, reviews } = parseStudyResult({ ...request.body, userId: response.locals.analyticsUserId });
    response.status(201).json(await recordStudyResult(input, reviews));
  } catch (error) { failure(error, response); }
}

export async function getSessions(request: Request, response: Response): Promise<void> {
  const userId: string = response.locals.analyticsUserId;
  if (!nonEmptyString(userId)) {
    response.status(400).json({ error: "userId is required" });
    return;
  }
  const requestedLimit = Number.parseInt(String(request.query.limit ?? "20"), 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
  const deckId = typeof request.query.deckId === "string" && request.query.deckId.trim() ? request.query.deckId.trim() : undefined;

  const sessions = deckId
    ? (await reviewRepository.listSessionsByDeck(userId.trim(), deckId)).slice(0, limit)
    : (await reviewRepository.listSessionsByUser(userId.trim())).slice(0, limit);

  response.json({ sessions, count: sessions.length });
}

export async function getDeckReviews(request: Request, response: Response): Promise<void> {
  const userId: string = response.locals.analyticsUserId;
  const deckId = request.query.deckId;
  if (!nonEmptyString(userId) || !nonEmptyString(deckId)) {
    response.status(400).json({ error: "userId and deckId are required" });
    return;
  }
  const reviews = await reviewRepository.listByDeck(userId.trim(), deckId.trim());
  response.json({ reviews, count: reviews.length });
}

export async function getDueReviews(request: Request, response: Response): Promise<void> {
  const userId: string = response.locals.analyticsUserId;
  if (!nonEmptyString(userId)) {
    response.status(400).json({ error: "userId is required" });
    return;
  }
  const requestedLimit = Number.parseInt(String(request.query.limit ?? "50"), 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  const scope = request.query.scope === "queue" ? "queue" : "due";
  const now = new Date();
  let reviews = await reviewRepository.listByUser(userId.trim());
  if (scope === "due") {
    reviews = reviews.filter((review) => new Date(review.nextReviewAt) <= now);
  }
  reviews = reviews.sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt)).slice(0, limit);
  response.json({ reviews, count: reviews.length });
}

export async function getReviewQueue(request: Request, response: Response): Promise<void> {
  const userId: string = response.locals.analyticsUserId;
  if (!nonEmptyString(userId)) {
    response.status(400).json({ error: "userId is required" });
    return;
  }
  const requestedLimit = Number.parseInt(String(request.query.limit ?? "50"), 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  const reviews = (await reviewRepository.listByUser(userId.trim()))
    .sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))
    .slice(0, limit);
  response.json({ reviews, count: reviews.length });
}

export async function getDashboard(request: Request, response: Response): Promise<void> {
  const userId: string = response.locals.analyticsUserId;
  if (!nonEmptyString(userId)) {
    response.status(400).json({ error: "userId is required" });
    return;
  }
  const now = new Date();
  const [reviews, sessions, streakRecord] = await Promise.all([
    reviewRepository.listByUser(userId.trim()),
    reviewRepository.listSessionsByUser(userId.trim()),
    reviewRepository.getStreak(userId.trim()),
  ]);

  const totalAnswers = reviews.reduce((sum, review) => sum + review.totalReviews, 0);
  const correctAnswers = reviews.reduce((sum, review) => sum + review.correctCount, 0);

  // Compute average response latency
  const reviewsWithLatency = reviews.filter((r) => typeof r.averageResponseTimeMs === "number" && r.averageResponseTimeMs > 0);
  const overallAvgResponseTimeMs = reviewsWithLatency.length > 0
    ? Math.round(reviewsWithLatency.reduce((sum, r) => sum + (r.averageResponseTimeMs || 0), 0) / reviewsWithLatency.length)
    : undefined;

  // Use stored streak or fallback to calculating from timestamps
  const reviewTimestamps = reviews.map((r) => r.lastReviewedAt);
  const sessionTimestamps = sessions.map((s) => s.completedAt);
  const allTimestamps = [...reviewTimestamps, ...sessionTimestamps];
  const streakDays = streakRecord ? streakRecord.currentStreak : calculateStreakDays(allTimestamps);

  // Activity count by date for contribution heatmap
  const activityByDate: Record<string, number> = {};
  allTimestamps.forEach((ts) => {
    try {
      const d = new Date(ts);
      const dayKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      activityByDate[dayKey] = (activityByDate[dayKey] || 0) + 1;
    } catch {
      // ignore invalid date
    }
  });

  // Include every unmastered or due word, with overdue reviews first.
  const strugglingWords = [...reviews]
    .filter((review) => review.status !== "mastered" || toDueIn(review, now) === 0)
    .sort((a, b) =>
      Number(toDueIn(a, now) > 0) - Number(toDueIn(b, now) > 0) ||
      new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime() ||
      b.incorrectCount - a.incorrectCount,
    )
    .map((review) => ({
      cardId: review.cardId,
      word: review.word,
      translation: review.translation,
      status: review.status,
      dueNow: toDueIn(review, now) === 0,
      nextReviewAt: review.nextReviewAt,
      incorrectCount: review.incorrectCount,
      correctCount: review.correctCount,
      easeFactor: review.easeFactor,
    }));

  response.json({
    totalWords: reviews.length,
    dueNow: reviews.filter((review) => toDueIn(review, now) === 0).length,
    learning: reviews.filter((review) => review.status === "learning").length,
    mastered: reviews.filter((review) => review.status === "mastered").length,
    accuracy: totalAnswers === 0 ? 0 : Math.round((correctAnswers / totalAnswers) * 100),
    streakDays,
    longestStreak: streakRecord?.longestStreak ?? streakDays,
    averageResponseTimeMs: overallAvgResponseTimeMs,
    totalSessions: sessions.length,
    recentSessions: sessions.slice(0, 8),
    activityByDate,
    strugglingWords,
    nextReviewAt: reviews.length
      ? [...reviews].sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))[0].nextReviewAt
      : null,
    reviews: [...reviews].sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt)).slice(0, 50),
  });
}
