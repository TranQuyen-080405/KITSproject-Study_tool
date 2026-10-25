import { describe, expect, it } from "vitest";
import { normalizeDatabaseUrl } from "../src/config/index.js";
import { normalizeLegacy } from "../src/legacy-import.js";
import { parseReview, parseStudyResult } from "../src/services/study-results.js";

const input = {
  userId: "7", sessionType: "deck_study", totalCardsOrQuestions: 2, correctCount: 1,
  durationSeconds: 2.4, reviews: [{ cardId: "c", correct: true, word: "물", responseTimeMs: 123.4 }],
};
const legacy = {
  reviews: { c: {
    userId: "7", vocabularyId: "c", word: "물", translation: "nước", status: "learning",
    correctCount: 1, incorrectCount: 0, correctStreak: 1, totalReviews: 1, intervalDays: 1,
    easeFactor: 2.5, lastReviewedAt: "2026-10-24T12:00:00Z", nextReviewAt: "2026-10-25T12:00:00Z",
  } },
  sessions: { s: {
    id: "legacy-session", userId: "7", sessionType: "deck_study", totalCardsOrQuestions: 1,
    correctCount: 1, scorePercentage: 100, durationSeconds: 5, completedAt: "2026-10-24T12:00:00Z",
  } },
  streaks: { "7": {
    userId: "7", currentStreak: 1, longestStreak: 1, lastStudiedDate: "2026-10-24", updatedAt: "2026-10-24T12:00:00Z",
  } },
};
describe("PostgreSQL analytics inputs", () => {
  it("normalizes driver URLs and rejects non-PostgreSQL databases", () => {
    expect(normalizeDatabaseUrl("postgresql+psycopg://localhost/analytics")).toBe("postgresql://localhost/analytics");
    expect(() => normalizeDatabaseUrl("sqlite://test.db")).toThrow("PostgreSQL");
  });
  it("normalizes aliases and integer database fields", () => {
    const { input: session, reviews } = parseStudyResult(input);
    expect(session.durationSeconds).toBe(2);
    expect(reviews[0].responseTimeMs).toBe(123);
    expect(parseReview({ userId: "7", vocabularyId: "c", front: "물", correct: false }).cardId).toBe("c");
  });
  it("rejects invalid review types and counts before writing to PostgreSQL", () => {
    expect(() => parseStudyResult({ ...input, reviews: [{ cardId: "c", correct: "false" }] })).toThrow("boolean");
    expect(() => parseStudyResult({ ...input, totalCardsOrQuestions: 1.5 })).toThrow("integer");
    expect(() => parseStudyResult({ ...input, correctCount: 3 })).toThrow("exceed");
    expect(() => parseStudyResult({ ...input, sessionType: "unknown" })).toThrow("sessionType");
    expect(() => parseStudyResult({ ...input, completedAt: "bad" })).toThrow("timestamp");
  });
});
describe("legacy JSON normalization", () => {
  it("preserves legacy IDs, aliases and timestamps", () => {
    const data = normalizeLegacy([legacy]);
    expect(data.reviews[0]).toMatchObject({
      userId: "7", cardId: "c", vocabularyId: "c", front: "물", back: "nước",
      lastReviewedAt: "2026-10-24T12:00:00.000Z",
    });
    expect(data.sessions[0].id).toBe("legacy-session");
    expect(data.streaks[0].currentStreak).toBe(1);
  });
  it("chooses the newest snapshot across overlapping JSON files", () => {
    const newer = structuredClone(legacy);
    newer.reviews.c.correctCount = 2;
    newer.reviews.c.lastReviewedAt = "2026-10-25T12:00:00Z";
    const data = normalizeLegacy([newer, legacy]);
    expect(data.reviews).toHaveLength(1);
    expect(data.reviews[0].correctCount).toBe(2);
  });
  it("fails invalid JSON structure and records instead of silently dropping history", () => {
    expect(() => normalizeLegacy([{ hello: "world" }])).toThrow("format");
    const invalid = structuredClone(legacy);
    invalid.sessions.s.completedAt = "bad";
    expect(() => normalizeLegacy([legacy, invalid])).toThrow("completedAt");
  });
});
