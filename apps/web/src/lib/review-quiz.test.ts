import { describe, expect, it } from "vitest";
import { buildReviewQuiz } from "./review-quiz";

const fixed = () => 0;

describe("buildReviewQuiz", () => {
  it("builds one question per due word and keeps the right answer", () => {
    const questions = buildReviewQuiz(
      [
        { cardId: "1", word: "사과", translation: "quả táo" },
        { cardId: "2", word: "물", translation: "nước" },
      ],
      [{ cardId: "3", word: "집", translation: "nhà" }],
      fixed,
    );

    expect(questions).toHaveLength(2);
    expect(questions[0].prompt).toBe("“사과” nghĩa là gì?");
    expect(questions[0].options).toContain("quả táo");
    expect(questions[0].options[questions[0].correctIndex]).toBe("quả táo");
    expect(questions[0].options).toHaveLength(4);
    expect(new Set(questions[0].options).size).toBe(4);
  });

  it("skips words without a meaning", () => {
    expect(buildReviewQuiz([{ cardId: "1", word: "사과" }], [], fixed)).toEqual([]);
  });
});
