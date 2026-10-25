import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app.js";
import { reviewRepository } from "../src/repositories/index.js";
import { scheduleReview, type ReviewRecord } from "../src/services/index.js";

afterEach(() => vi.restoreAllMocks());
function setup(reviews: ReviewRecord[]) {
  vi.spyOn(reviewRepository, "listByUser").mockResolvedValue(reviews);
  vi.spyOn(reviewRepository, "listSessionsByUser").mockResolvedValue([]);
  vi.spyOn(reviewRepository, "getStreak").mockResolvedValue(undefined);
  return createApp(async () => "7");
}
function review(cardId: string, status: ReviewRecord["status"], nextReviewAt: number): ReviewRecord {
  return {
    ...scheduleReview(undefined, { userId: "7", cardId, word: cardId, correct: true }),
    status, nextReviewAt: new Date(nextReviewAt).toISOString(),
  };
}
describe("dashboard words to reinforce", () => {
  it("includes unmastered words with no mistakes and mastered words due for review, without a five-word cap", async () => {
    const now = Date.now();
    const learning = Array.from({ length: 8 }, (_, index) => review(
      "learning-" + index, index === 0 ? "new" : "learning",
      index === 1 ? now - 2000 : now + (index + 1) * 3600_000,
    ));
    const masteredDue = review("mastered-due", "mastered", now - 5000);
    const masteredFuture = { ...review("mastered-future", "mastered", now + 3600_000), incorrectCount: 99 };
    const response = await request(setup([...learning, masteredFuture, masteredDue]))
      .get("/api/v1/analytics/dashboard").set("Authorization", "Bearer signed");
    expect(response.status).toBe(200);
    const words = response.body.strugglingWords;
    expect(words).toHaveLength(9);
    expect(words.slice(0, 2).map((word: { cardId: string }) => word.cardId)).toEqual(["mastered-due", "learning-1"]);
    expect(words[0]).toMatchObject({ status: "mastered", dueNow: true });
    expect(words.find((word: { cardId: string }) => word.cardId === "learning-0")).toMatchObject({ status: "new", dueNow: false, incorrectCount: 0 });
    expect(words.some((word: { cardId: string }) => word.cardId === "mastered-future")).toBe(false);
    expect(response.body.dueNow).toBe(2);
  });
  it("returns an empty list when all reviewed words are mastered and not due", async () => {
    const response = await request(setup([review("mastered", "mastered", Date.now() + 3600_000)]))
      .get("/api/v1/analytics/dashboard").set("Authorization", "Bearer signed");
    expect(response.status).toBe(200);
    expect(response.body.strugglingWords).toEqual([]);
  });
});
