// This file will contain request handlers for the Analytics Service.
import type { Request, Response } from "express";
import { reviewRepository } from "../repositories/index.js";
import { scheduleReview, toDueIn, type ReviewInput } from "../services/index.js";

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function submitReview(request: Request, response: Response): Promise<void> {
  const body = request.body as Partial<ReviewInput>;
  if (!nonEmptyString(body.userId) || !nonEmptyString(body.vocabularyId) || typeof body.correct !== "boolean") {
    response.status(400).json({ error: "userId, vocabularyId, and boolean correct are required" });
    return;
  }
  try {
    const previous = await reviewRepository.get(body.userId.trim(), body.vocabularyId.trim());
    const review = scheduleReview(previous, { userId: body.userId.trim(), vocabularyId: body.vocabularyId.trim(), correct: body.correct, word: body.word, translation: body.translation, reviewedAt: body.reviewedAt });
    await reviewRepository.save(review);
    response.status(201).json({ review, mastered: review.status === "mastered" });
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "Unable to record review" });
  }
}

export async function getDueReviews(request: Request, response: Response): Promise<void> {
  const userId = request.query.userId;
  if (!nonEmptyString(userId)) { response.status(400).json({ error: "userId is required" }); return; }
  const requestedLimit = Number.parseInt(String(request.query.limit ?? "20"), 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
  const now = new Date();
  const reviews = (await reviewRepository.listByUser(userId.trim())).filter((review) => new Date(review.nextReviewAt) <= now).sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt)).slice(0, limit);
  response.json({ reviews, count: reviews.length });
}

export async function getDashboard(request: Request, response: Response): Promise<void> {
  const userId = request.query.userId;
  if (!nonEmptyString(userId)) { response.status(400).json({ error: "userId is required" }); return; }
  const now = new Date();
  const reviews = await reviewRepository.listByUser(userId.trim());
  const totalAnswers = reviews.reduce((sum, review) => sum + review.totalReviews, 0);
  const correctAnswers = reviews.reduce((sum, review) => sum + review.correctCount, 0);
  response.json({ totalWords: reviews.length, dueNow: reviews.filter((review) => toDueIn(review, now) === 0).length, learning: reviews.filter((review) => review.status === "learning").length, mastered: reviews.filter((review) => review.status === "mastered").length, accuracy: totalAnswers === 0 ? 0 : Math.round((correctAnswers / totalAnswers) * 100), nextReviewAt: reviews.length ? [...reviews].sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))[0].nextReviewAt : null });
}
