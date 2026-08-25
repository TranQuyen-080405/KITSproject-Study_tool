import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAnalyticsDashboard, recordQuizReviews } from "../src/api/analytics-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("analytics API", () => {
  it("loads dashboard stats for the current user through the Gateway", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          totalWords: 2,
          dueNow: 1,
          learning: 1,
          mastered: 1,
          accuracy: 75,
          nextReviewAt: null,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const stats = await fetchAnalyticsDashboard(42, "token-1");

    expect(stats.accuracy).toBe(75);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [path, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(path).toBe("/api/v1/analytics/dashboard?userId=42");
    expect(new Headers(options.headers).get("authorization")).toBe("Bearer token-1");
  });

  it("records only quiz results that map to a vocabulary", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ review: {}, mastered: false }), {
          status: 201,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    await recordQuizReviews(
      42,
      [
        { correct: true, masteryCandidateVocabularyId: "vocab-1" },
        { correct: false, masteryCandidateVocabularyId: null },
        { correct: false, masteryCandidateVocabularyId: "vocab-2" },
      ],
      "token-1",
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const bodies = fetchMock.mock.calls.map(([, options]) =>
      JSON.parse(String((options as RequestInit).body)),
    );

    expect(bodies).toEqual([
      { userId: "42", vocabularyId: "vocab-1", correct: true },
      { userId: "42", vocabularyId: "vocab-2", correct: false },
    ]);
  });
});