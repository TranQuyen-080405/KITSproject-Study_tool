import { describe, expect, it } from "vitest";
import { AppError } from "../src/errors.js";
import {
  gradeQuestion,
  inferCardId,
  inferVocabularyId,
  parseCardBatchInput,
  parseFlashcardInput,
  parseFolderInput,
  parseLessonInput,
  parseQuestionInput,
  parseVocabularyInput,
  serializePublicQuestion,
} from "../src/services/index.js";
import { assertTargetCard, assertTargetVocabulary } from "../src/validation.js";

describe("folder and flashcard input validation", () => {
  it("normalizes folder input", () => {
    expect(parseFolderInput({ name: "  Tiếng Hàn Sơ Cấp  ", description: " Cơ bản " })).toEqual({
      name: "Tiếng Hàn Sơ Cấp",
      description: "Cơ bản",
      userId: null,
    });
  });

  it("normalizes flashcard deck input with optional folder", () => {
    expect(
      parseFlashcardInput({
        title: "  Chào hỏi  ",
        description: " Các câu thông dụng ",
        folderId: "folder-1",
      }),
    ).toEqual({
      title: "Chào hỏi",
      description: "Các câu thông dụng",
      folderId: "folder-1",
      userId: null,
    });
  });

  it("normalizes card batch input with front and back", () => {
    expect(
      parseCardBatchInput({
        items: [
          { front: " 안녕하세요 ", back: " xin chào " },
          { front: "감사합니다", back: "cảm ơn" },
        ],
      }),
    ).toEqual([
      { front: "안녕하세요", back: "xin chào", hint: null, orderIndex: undefined },
      { front: "감사합니다", back: "cảm ơn", hint: null, orderIndex: undefined },
    ]);
  });

  it("supports legacy parseLessonInput and parseVocabularyInput", () => {
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
        cardId: "card-1",
        options: ["xin chào", "cảm ơn", "tạm biệt"],
        correctOptionIndex: 0,
      }),
    ).toThrow(new AppError("options must contain exactly 4 choices", 400));
  });

  it("accepts a general question with no target card", () => {
    expect(
      parseQuestionInput({
        prompt: "Chọn câu chào phù hợp",
        cardId: null,
        options: ["안녕하세요", "감사합니다", "죄송합니다", "안녕히 가세요"],
        correctOptionIndex: 0,
      }).cardId,
    ).toBeNull();
    expect(
      parseQuestionInput({
        prompt: "Chọn câu chào phù hợp",
        options: ["안녕하세요", "감사합니다", "죄송합니다", "안녕히 가세요"],
        correctOptionIndex: 0,
      }).cardId,
    ).toBeNull();
  });

  it("blocks a target card from another flashcard deck", () => {
    expect(() =>
      assertTargetCard("deck-a", "card-b", { flashcardId: "deck-b" }),
    ).toThrow(new AppError("cardId must belong to this flashcard deck", 400));
    expect(() => assertTargetCard("deck-a", null, null)).not.toThrow();

    // Legacy alias
    expect(() =>
      assertTargetVocabulary("lesson-a", "vocabulary-b", { lessonId: "lesson-b" }),
    ).toThrow(new AppError("vocabularyId must belong to this lesson", 400));
  });
});

describe("question grading and inference", () => {
  const question = { cardId: "card-1", vocabularyId: "card-1", correctOptionIndex: 2 };

  it("infers card from prompt or correct back text", () => {
    const cards = [
      { id: "card-1", front: "안녕하세요", back: "xin chào" },
      { id: "card-2", front: "감사합니다", back: "cảm ơn" },
    ];
    expect(
      inferCardId("안녕하세요 có nghĩa là gì?", ["xin chào", "cảm ơn", "xin lỗi", "tạm biệt"], 0, cards),
    ).toBe("card-1");
    expect(
      inferCardId("Chọn nghĩa", ["xin lỗi", "cảm ơn", "xin chào", "tạm biệt"], 1, cards),
    ).toBe("card-2");
    expect(
      inferVocabularyId("안녕하세요 có nghĩa là gì?", ["xin chào", "cảm ơn", "xin lỗi", "tạm biệt"], 0, cards),
    ).toBe("card-1");
  });

  it("returns a mastery candidate only for the correct answer", () => {
    expect(gradeQuestion(question, 2)).toEqual({
      correct: true,
      cardId: "card-1",
      vocabularyId: "card-1",
      masteryCandidateVocabularyId: "card-1",
    });
    expect(gradeQuestion(question, 1)).toEqual({
      correct: false,
      cardId: "card-1",
      vocabularyId: "card-1",
      masteryCandidateVocabularyId: null,
    });
  });

  it("rejects an invalid option index", () => {
    expect(() => gradeQuestion(question, 4)).toThrow(
      new AppError("selectedOptionIndex must be an integer from 0 to 3", 400),
    );
  });

  it("returns no mastery candidate for a correct general question", () => {
    expect(gradeQuestion({ cardId: null, vocabularyId: null, correctOptionIndex: 0 }, 0)).toEqual({
      correct: true,
      cardId: null,
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
