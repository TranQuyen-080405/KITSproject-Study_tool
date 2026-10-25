// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearTestDraft, restoreTestDraft, saveTestDraft, testDraftKey } from "../src/lib/deck-test-draft";
import type { TestSession } from "../src/api/deck-tests-api";

function session(userId = "7"): TestSession {
  return {
    id: "attempt", userId, flashcardId: "deck", sourceSessionId: null, deckTitle: "Deck",
    correctCount: 0, totalQuestions: 2, scorePercentage: 0, createdAt: "2026-10-24T10:00:00Z",
    completedAt: null, answers: [null, null],
    questions: [0, 1].map((index) => ({
      id: "q" + index, cardId: "c" + index, word: "word", translation: "meaning",
      prompt: "?", options: ["a", "b", "c", "d"], correctOptionIndex: 0, explanation: null,
    })),
  };
}
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("local test draft recovery", () => {
  it("restores unsynced choices while preserving server-acknowledged answers and account isolation", () => {
    const current = session();
    expect(saveTestDraft(current, [0, null])).toBe(true);
    expect(restoreTestDraft(current)).toEqual([0, null]);
    expect(restoreTestDraft({ ...current, answers: [1, null] })).toEqual([1, null]);
    expect(restoreTestDraft(session("8"))).toEqual([null, null]);
    expect(restoreTestDraft({ ...current, id: "another" })).toEqual([null, null]);
  });
  it("ignores malformed, invalid and discontinuous drafts", () => {
    const current = session();
    for (const value of [
      "not-json", JSON.stringify({ answers: [0] }), JSON.stringify({ answers: [null, 1] }),
      JSON.stringify({ answers: [-1, null] }), JSON.stringify({ answers: [4, null] }),
      JSON.stringify({ answers: ["0", null] }), JSON.stringify({ answers: [true, null] }),
    ]) {
      localStorage.setItem(testDraftKey(current), value);
      expect(restoreTestDraft(current)).toEqual([null, null]);
    }
  });
  it("uses completed server results and removes only the submitted session's draft", () => {
    const current = session();
    saveTestDraft(current, [0, 0]);
    saveTestDraft(session("8"), [1, null]);
    expect(restoreTestDraft({
      ...current, completedAt: "2026-10-24T10:05:00Z", answers: [1, 1],
    })).toEqual([1, 1]);
    clearTestDraft(current);
    expect(localStorage.getItem(testDraftKey(current))).toBeNull();
    expect(localStorage.getItem(testDraftKey(session("8")))).not.toBeNull();
  });
  it("reports unavailable local storage without crashing the attempt", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Quota exceeded"); });
    expect(saveTestDraft(session(), [0, null])).toBe(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Storage disabled"); });
    expect(restoreTestDraft(session())).toEqual([null, null]);
  });
});
