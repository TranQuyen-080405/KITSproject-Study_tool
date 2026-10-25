import { describe, expect, it } from "vitest";
import {
  createStudySession,
  scheduleReview,
  updateStreak,
} from "../src/services/index.js";

describe("SM-2 Spaced Repetition (scheduleReview)", () => {
  it("initializes a new word with correct answer and advances interval", () => {
    const reviewedAt = "2026-10-24T10:00:00.000Z";
    const res = scheduleReview(undefined, {
      userId: "u1",
      cardId: "card-1",
      deckId: "deck-1",
      word: "안녕하세요",
      translation: "Xin chào",
      correct: true,
      reviewedAt,
    });

    expect(res.userId).toBe("u1");
    expect(res.cardId).toBe("card-1");
    expect(res.deckId).toBe("deck-1");
    expect(res.word).toBe("안녕하세요");
    expect(res.translation).toBe("Xin chào");
    expect(res.status).toBe("learning");
    expect(res.correctCount).toBe(1);
    expect(res.correctStreak).toBe(1);
    expect(res.intervalDays).toBe(1);
    expect(new Date(res.nextReviewAt).getTime()).toBeGreaterThan(new Date(reviewedAt).getTime());
  });

  it("marks a word as mastered after 3 consecutive correct reviews", () => {
    let rev = scheduleReview(undefined, {
      userId: "u1",
      cardId: "card-1",
      word: "물",
      correct: true,
    });
    expect(rev.correctStreak).toBe(1);
    expect(rev.status).toBe("learning");

    rev = scheduleReview(rev, {
      userId: "u1",
      cardId: "card-1",
      correct: true,
    });
    expect(rev.correctStreak).toBe(2);
    expect(rev.intervalDays).toBe(3);

    rev = scheduleReview(rev, {
      userId: "u1",
      cardId: "card-1",
      correct: true,
    });
    expect(rev.correctStreak).toBe(3);
    expect(rev.status).toBe("mastered");
    expect(rev.intervalDays).toBeGreaterThan(6);
  });

  it("resets interval and streak when user answers incorrectly", () => {
    let rev = scheduleReview(undefined, {
      userId: "u1",
      cardId: "card-1",
      correct: true,
    });
    rev = scheduleReview(rev, {
      userId: "u1",
      cardId: "card-1",
      correct: true,
    });
    expect(rev.correctStreak).toBe(2);

    const failed = scheduleReview(rev, {
      userId: "u1",
      cardId: "card-1",
      correct: false,
    });

    expect(failed.correctStreak).toBe(0);
    expect(failed.incorrectCount).toBe(1);
    expect(failed.intervalDays).toBe(0);
    expect(failed.status).toBe("learning");
  });
});

describe("User Streak System (updateStreak)", () => {
  it("starts streak at 1 on first study session", () => {
    const res = updateStreak(0, 0, null, "2026-10-24T12:00:00.000Z");
    expect(res.currentStreak).toBe(1);
    expect(res.longestStreak).toBe(1);
    expect(res.lastStudiedDate).toBe("2026-10-24");
  });

  it("does not increment streak if studying multiple times on the same date", () => {
    const res = updateStreak(3, 5, "2026-10-24", "2026-10-24T18:00:00.000Z");
    expect(res.currentStreak).toBe(3);
    expect(res.longestStreak).toBe(5);
    expect(res.lastStudiedDate).toBe("2026-10-24");
  });

  it("increments streak by 1 when studying on the consecutive day", () => {
    const res = updateStreak(3, 5, "2026-10-23", "2026-10-24T09:00:00.000Z");
    expect(res.currentStreak).toBe(4);
    expect(res.longestStreak).toBe(5);
    expect(res.lastStudiedDate).toBe("2026-10-24");
  });

  it("updates longest streak when current streak exceeds previous longest", () => {
    const res = updateStreak(5, 5, "2026-10-23", "2026-10-24T09:00:00.000Z");
    expect(res.currentStreak).toBe(6);
    expect(res.longestStreak).toBe(6);
    expect(res.lastStudiedDate).toBe("2026-10-24");
  });

  it("resets current streak to 1 if user skips a day, but retains longest streak", () => {
    const res = updateStreak(7, 10, "2026-10-20", "2026-10-24T09:00:00.000Z");
    expect(res.currentStreak).toBe(1);
    expect(res.longestStreak).toBe(10);
    expect(res.lastStudiedDate).toBe("2026-10-24");
  });
});

describe("Study Session Creation (createStudySession)", () => {
  it("computes scorePercentage and fields accurately", () => {
    const session = createStudySession({
      userId: "u123",
      deckId: "d456",
      deckTitle: "TOPIK I Vocab",
      sessionType: "deck_study",
      totalCardsOrQuestions: 10,
      correctCount: 8,
      durationSeconds: 45,
    });

    expect(session.userId).toBe("u123");
    expect(session.deckId).toBe("d456");
    expect(session.deckTitle).toBe("TOPIK I Vocab");
    expect(session.scorePercentage).toBe(80);
    expect(session.totalCardsOrQuestions).toBe(10);
    expect(session.correctCount).toBe(8);
    expect(session.durationSeconds).toBe(45);
    expect(session.completedAt).toBeDefined();
  });
});
