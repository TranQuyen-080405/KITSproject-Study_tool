import { describe, expect, it } from "vitest";
import { AppError } from "../src/errors.js";
import {
  gradeQuestion,
  inferVocabularyId,
  parseLessonInput,
  parseQuestionInput,
  parseVocabularyInput,
  serializePublicQuestion,
} from "../src/services/index.js";
import { assertTargetVocabulary } from "../src/validation.js";

describe("content input validation", () => {
  it("normalizes a lesson and vocabulary list", () => {
    expect(parseLessonInput({ name: "  Chào hỏi  ", description: " Cơ bản " })).toEqual({
      name: "Chào hỏi",
      description: "Cơ bản",
    });
    expect(
      parseVocabularyInput({
        items: [
          { word: " 안녕하세요 ", meaning: " xin chào " },
          { word: "감사합니다", meaning: "cảm ơn" },
        ],
      }),
    ).toEqual([
      { word: "안녕하세요", meaning: "xin chào" },
      { word: "감사합니다", meaning: "cảm ơn" },
    ]);
  });

  it("requires exactly four unique question choices", () => {
    expect(() =>
      parseQuestionInput({
        prompt: "Chọn nghĩa đúng",
        vocabularyId: "vocabulary-1",
        options: ["xin chào", "cảm ơn", "tạm biệt"],
        correctOptionIndex: 0,
      }),
    ).toThrow(new AppError("options must contain exactly 4 choices", 400));
  });

  it("accepts a general question with no target vocabulary", () => {
    expect(
      parseQuestionInput({
        prompt: "Chọn câu chào phù hợp",
        vocabularyId: null,
        options: ["안녕하세요", "감사합니다", "죄송합니다", "안녕히 가세요"],
        correctOptionIndex: 0,
      }).vocabularyId,
    ).toBeNull();
    expect(
      parseQuestionInput({
        prompt: "Chọn câu chào phù hợp",
        options: ["안녕하세요", "감사합니다", "죄송합니다", "안녕히 가세요"],
        correctOptionIndex: 0,
      }).vocabularyId,
    ).toBeNull();
  });

  it("blocks a target vocabulary from another lesson", () => {
    expect(() =>
      assertTargetVocabulary("lesson-a", "vocabulary-b", { lessonId: "lesson-b" }),
    ).toThrow(new AppError("vocabularyId must belong to this lesson", 400));
    expect(() => assertTargetVocabulary("lesson-a", null, null)).not.toThrow();
  });
});

describe("question grading", () => {
  const question = { vocabularyId: "vocabulary-1", correctOptionIndex: 2 };

  it("infers vocabulary from prompt or correct meaning", () => {
    const vocabulary = [
      { id: "vocabulary-1", word: "안녕하세요", meaning: "xin chào" },
      { id: "vocabulary-2", word: "감사합니다", meaning: "cảm ơn" },
    ];
    expect(
      inferVocabularyId("안녕하세요 có nghĩa là gì?", ["xin chào", "cảm ơn", "xin lỗi", "tạm biệt"], 0, vocabulary),
    ).toBe("vocabulary-1");
    expect(
      inferVocabularyId("Chọn nghĩa", ["xin lỗi", "cảm ơn", "xin chào", "tạm biệt"], 1, vocabulary),
    ).toBe("vocabulary-2");
  });

  it("returns a mastery candidate only for the correct answer", () => {
    expect(gradeQuestion(question, 2)).toEqual({
      correct: true,
      vocabularyId: "vocabulary-1",
      masteryCandidateVocabularyId: "vocabulary-1",
    });
    expect(gradeQuestion(question, 1)).toEqual({
      correct: false,
      vocabularyId: "vocabulary-1",
      masteryCandidateVocabularyId: null,
    });
  });

  it("rejects an invalid option index", () => {
    expect(() => gradeQuestion(question, 4)).toThrow(
      new AppError("selectedOptionIndex must be an integer from 0 to 3", 400),
    );
  });

  it("returns no mastery candidate for a correct general question", () => {
    expect(gradeQuestion({ vocabularyId: null, correctOptionIndex: 0 }, 0)).toEqual({
      correct: true,
      vocabularyId: null,
      masteryCandidateVocabularyId: null,
    });
  });
});

describe("public question serializer", () => {
  it("never exposes the correct option index", () => {
    expect(
      serializePublicQuestion({
        id: "question-1",
        options: ["a", "b", "c", "d"],
        correctOptionIndex: 2,
      }),
    ).toEqual({ id: "question-1", options: ["a", "b", "c", "d"] });
  });
});
