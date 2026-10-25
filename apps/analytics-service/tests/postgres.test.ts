import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { prisma } from "../src/db.js";
import { config } from "../src/config/index.js";
import { createApp } from "../src/app.js";
const app = createApp(async () => "u1");
import { ReviewRepository, reviewRepository } from "../src/repositories/index.js";
import { createStudySession, scheduleReview } from "../src/services/index.js";
import { recordReview, recordStudyResult, parseStudyResult } from "../src/services/study-results.js";
import { importLegacy } from "../src/legacy-import.js";

const schema = new URL(process.env.ANALYTICS_TEST_DATABASE_URL ?? "postgresql://localhost/db").searchParams.get("schema");
const integration = schema && /^analytics_test_[a-f0-9]{32}$/.test(schema) ? describe.sequential : describe.skip;
const body = {
  userId: "u1", deckId: "deck", deckTitle: "Deck", sessionType: "deck_study",
  totalCardsOrQuestions: 2, correctCount: 1, durationSeconds: 10,
  reviews: [
    { cardId: "c1", word: "물", translation: "nước", correct: true },
    { cardId: "c2", word: "사과", translation: "táo", correct: false },
  ],
};
integration("Analytics PostgreSQL", () => {
  beforeEach(async () => {
    await prisma.$transaction([
      prisma.userReview.deleteMany(), prisma.studySession.deleteMany(), prisma.userStreak.deleteMany(),
    ]);
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => { await prisma.$disconnect(); });

  it("persists reviews and ISO API fields across fresh clients with no in-memory store", async () => {
    const expected = scheduleReview(undefined, {
      userId: "u1", cardId: "c1", deckId: "deck", word: "물", translation: "nước",
      correct: true, reviewedAt: "2026-10-25T10:00:00.000Z", responseTimeMs: 1200,
    });
    await reviewRepository.save(expected);
    const adapter = new PrismaPg({ connectionString: config.databaseUrl }, { schema: schema! });
    const fresh = new PrismaClient({ adapter });
    try {
      const reloaded = await new ReviewRepository(fresh, fresh).get("u1", "c1");
      expect(reloaded).toEqual(expected);
      expect(reloaded?.vocabularyId).toBe("c1");
      expect(await new ReviewRepository(fresh, fresh).get("u2", "c1")).toBeUndefined();
    } finally { await fresh.$disconnect(); }
  });

  it("keeps session IDs, date ordering, deck filters and streaks in PostgreSQL", async () => {
    const older = createStudySession({
      userId: "u1", deckId: "one", sessionType: "mcq", totalCardsOrQuestions: 2,
      correctCount: 1, durationSeconds: 10, completedAt: "2026-10-24T10:00:00Z",
    });
    const newer = { ...older, id: "legacy-session-id", deckId: "two", completedAt: "2026-10-25T10:00:00.000Z" };
    await reviewRepository.saveSession(older);
    await reviewRepository.saveSession(newer);
    expect((await reviewRepository.listSessionsByUser("u1")).map((s) => s.id)).toEqual([newer.id, older.id]);
    expect((await reviewRepository.listSessionsByDeck("u1", "two"))).toEqual([newer]);
    const streak = { userId: "u1", currentStreak: 2, longestStreak: 3, lastStudiedDate: "2026-10-25", updatedAt: newer.completedAt };
    await reviewRepository.saveStreak(streak);
    expect(await new ReviewRepository().getStreak("u1")).toEqual(streak);
  });

  it("runs the existing HTTP batch/dashboard/queue endpoints with database storage", async () => {
    expect((await request(app).get("/health")).body.database).toBe("ok");
    const response = await request(app).post("/api/v1/analytics/sessions/submit").set("Authorization", "Bearer integration").send(body);
    expect(response.status).toBe(201);
    expect(response.body.reviewsCount).toBe(2);
    expect(response.body.streak.currentStreak).toBe(1);
    const stats = await request(app).get("/api/v1/analytics/dashboard?userId=u1").set("Authorization", "Bearer integration");
    expect(stats.status).toBe(200);
    expect(stats.body).toMatchObject({ totalWords: 2, totalSessions: 1, accuracy: 50, learning: 2 });
    expect((await request(app).get("/api/v1/analytics/reviews/deck?userId=u1&deckId=deck").set("Authorization", "Bearer integration")).body.count).toBe(2);
    expect((await request(app).get("/api/v1/analytics/reviews/queue?userId=u1").set("Authorization", "Bearer integration")).body.count).toBe(2);
    expect(await prisma.studySession.count()).toBe(1);
    expect(await prisma.userReview.count()).toBe(2);
    expect(await prisma.userStreak.count()).toBe(1);
  });

  it("rejects invalid review payloads before persisting any session", async () => {
    const response = await request(app).post("/api/v1/analytics/sessions/submit").set("Authorization", "Bearer integration").send({
      ...body, reviews: [{ cardId: "c1", correct: "false" }],
    });
    expect(response.status).toBe(400);
    expect(await prisma.studySession.count()).toBe(0);
    expect(await prisma.userReview.count()).toBe(0);
  });

  it("rolls back session and reviews if a later write fails", async () => {
    const original = ReviewRepository.prototype.save;
    vi.spyOn(ReviewRepository.prototype, "save").mockImplementation(async function(this: ReviewRepository, review) {
      if (review.cardId === "c2") throw new Error("Injected storage failure");
      return original.call(this, review);
    });
    const parsed = parseStudyResult(body);
    await expect(recordStudyResult(parsed.input, parsed.reviews)).rejects.toThrow("Injected storage failure");
    expect(await prisma.studySession.count()).toBe(0);
    expect(await prisma.userReview.count()).toBe(0);
    expect(await prisma.userStreak.count()).toBe(0);
  });

  it("serializes concurrent review updates so no counts are lost", async () => {
    await Promise.all(Array.from({ length: 8 }, () => recordReview({
      userId: "u1", cardId: "same-card", correct: true, word: "물",
    })));
    const review = await reviewRepository.get("u1", "same-card");
    expect(review?.totalReviews).toBe(8);
    expect(review?.correctCount).toBe(8);
    expect(review?.correctStreak).toBe(8);
  });

  it("imports legacy JSON idempotently without overwriting newer database data", async () => {
    const oldReview = scheduleReview(undefined, {
      userId: "u1", cardId: "c1", word: "물", correct: true, reviewedAt: "2026-10-24T10:00:00.000Z",
    });
    const oldSession = { ...createStudySession({
      userId: "u1", sessionType: "deck_study", totalCardsOrQuestions: 1, correctCount: 1,
      durationSeconds: 8, completedAt: "2026-10-24T10:00:00.000Z",
    }), id: "legacy-id" };
    const oldStreak = { userId: "u1", currentStreak: 1, longestStreak: 1, lastStudiedDate: "2026-10-24", updatedAt: oldSession.completedAt };
    const document = { reviews: { c1: oldReview }, sessions: { s: oldSession }, streaks: { u1: oldStreak } };
    const first = await importLegacy([document]);
    expect(first.inserted).toEqual({ reviews: 1, sessions: 1, streaks: 1 });
    await recordReview({ userId: "u1", cardId: "c1", word: "물", correct: true });
    const second = await importLegacy([document]);
    expect(second.inserted).toEqual({ reviews: 0, sessions: 0, streaks: 0 });
    expect((await reviewRepository.get("u1", "c1"))?.totalReviews).toBe(2);
    expect((await reviewRepository.listSessionsByUser("u1"))[0]).toEqual(oldSession);
  });

  it("returns 503 health status when PostgreSQL cannot be queried", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(new Error("Database offline"));
    const response = await request(app).get("/health");
    expect(response.status).toBe(503);
    expect(response.body.database).toBe("unavailable");
  });
});
