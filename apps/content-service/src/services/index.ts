import { AppError } from "../errors.js";
import {
  contentRepository,
  type ContentRepository,
  type CreateQuestionRecord,
  type CreateVocabularyRecord,
} from "../repositories/index.js";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`${field} is required`, 400);
  }
  const result = value.trim();
  if (result.length > maxLength) {
    throw new AppError(`${field} must be at most ${maxLength} characters`, 400);
  }
  return result;
}

export function parseLessonInput(body: unknown): { name: string; description: string } {
  if (!isRecord(body)) throw new AppError("JSON body is required", 400);
  return {
    name: requiredText(body.name, "name", 120),
    description: requiredText(body.description, "description", 1000),
  };
}

export function parseVocabularyInput(body: unknown): CreateVocabularyRecord[] {
  if (!isRecord(body) || !Array.isArray(body.items) || body.items.length === 0) {
    throw new AppError("items must be a non-empty array", 400);
  }
  if (body.items.length > 100) throw new AppError("items supports at most 100 entries", 400);

  const items = body.items.map((item, index) => {
    if (!isRecord(item)) throw new AppError(`items[${index}] must be an object`, 400);
    return {
      word: requiredText(item.word, `items[${index}].word`, 120),
      meaning: requiredText(item.meaning, `items[${index}].meaning`, 500),
    };
  });
  if (new Set(items.map(({ word }) => word)).size !== items.length) {
    throw new AppError("items contains duplicate words", 400);
  }
  return items;
}

export function parseQuestionInput(body: unknown): CreateQuestionRecord {
  if (!isRecord(body)) throw new AppError("JSON body is required", 400);
  if (!Array.isArray(body.options) || body.options.length !== 4) {
    throw new AppError("options must contain exactly 4 choices", 400);
  }
  const options = body.options.map((option, index) =>
    requiredText(option, `options[${index}]`, 300),
  );
  if (new Set(options).size !== options.length) {
    throw new AppError("options must be unique", 400);
  }
  if (
    !Number.isInteger(body.correctOptionIndex) ||
    Number(body.correctOptionIndex) < 0 ||
    Number(body.correctOptionIndex) >= options.length
  ) {
    throw new AppError("correctOptionIndex must be an integer from 0 to 3", 400);
  }
  if (
    body.vocabularyId !== undefined &&
    body.vocabularyId !== null &&
    typeof body.vocabularyId !== "string"
  ) {
    throw new AppError("vocabularyId must be a string or null", 400);
  }

  return {
    prompt: requiredText(body.prompt, "prompt", 500),
    vocabularyId:
      body.vocabularyId == null || body.vocabularyId === ""
        ? null
        : requiredText(body.vocabularyId, "vocabularyId", 100),
    options,
    correctOptionIndex: Number(body.correctOptionIndex),
  };
}

type VocabularyLink = { id: string; word: string; meaning: string };

/** ponytail: heuristic word/meaning match; upgrade path = require explicit vocabularyId in UI */
export function inferVocabularyId(
  prompt: string,
  options: string[],
  correctOptionIndex: number,
  vocabulary: VocabularyLink[],
): string | null {
  if (vocabulary.length === 0) return null;

  const correctText = options[correctOptionIndex]?.trim().toLowerCase() ?? "";
  const byMeaning = vocabulary.find((item) => item.meaning.trim().toLowerCase() === correctText);
  if (byMeaning) return byMeaning.id;

  const byWord = vocabulary.find((item) => item.word.trim().toLowerCase() === correctText);
  if (byWord) return byWord.id;

  const inPrompt = vocabulary.find((item) => prompt.includes(item.word));
  if (inPrompt) return inPrompt.id;

  for (const option of options) {
    const text = option.trim().toLowerCase();
    const match = vocabulary.find(
      (item) =>
        item.meaning.trim().toLowerCase() === text || item.word.trim().toLowerCase() === text,
    );
    if (match) return match.id;
  }

  return vocabulary.length === 1 ? vocabulary[0].id : null;
}

export function gradeQuestion(
  question: { vocabularyId: string | null; correctOptionIndex: number },
  selectedOptionIndex: unknown,
): { correct: boolean; vocabularyId: string | null; masteryCandidateVocabularyId: string | null } {
  if (
    !Number.isInteger(selectedOptionIndex) ||
    Number(selectedOptionIndex) < 0 ||
    Number(selectedOptionIndex) > 3
  ) {
    throw new AppError("selectedOptionIndex must be an integer from 0 to 3", 400);
  }
  const correct = Number(selectedOptionIndex) === question.correctOptionIndex;
  return {
    correct,
    vocabularyId: question.vocabularyId,
    masteryCandidateVocabularyId: correct ? question.vocabularyId : null,
  };
}

export function serializePublicQuestion<
  T extends { options: unknown; correctOptionIndex?: unknown },
>(question: T) {
  const { correctOptionIndex: _hiddenAnswer, ...publicFields } = question;
  return {
    ...publicFields,
    options: Array.isArray(question.options) ? question.options : [],
  };
}

export class ContentService {
  constructor(private readonly repository: ContentRepository = contentRepository) {}

  createLesson(body: unknown) {
    return this.repository.createLesson(parseLessonInput(body));
  }

  async listLessons() {
    const lessons = await this.repository.listLessons();
    return lessons.map(({ _count, ...lesson }) => ({
      ...lesson,
      vocabularyCount: _count.vocabulary,
      questionCount: _count.questions,
    }));
  }

  async getLesson(lessonId: string) {
    const lesson = await this.repository.getLessonDetail(lessonId);
    if (!lesson) throw new AppError("Lesson not found", 404);
    return {
      ...lesson,
      questions: lesson.questions.map(serializePublicQuestion),
    };
  }

  addVocabulary(lessonId: string, body: unknown) {
    return this.repository.addVocabulary(lessonId, parseVocabularyInput(body));
  }

  listVocabulary(lessonId: string) {
    return this.repository.listVocabulary(lessonId);
  }

  async createQuestion(lessonId: string, body: unknown) {
    const input = parseQuestionInput(body);
    if (!input.vocabularyId) {
      const vocabs = await this.repository.listVocabulary(lessonId);
      input.vocabularyId = inferVocabularyId(
        input.prompt,
        input.options,
        input.correctOptionIndex,
        vocabs,
      );
    }
    return this.repository.createQuestion(lessonId, input);
  }

  async listQuestions(lessonId: string) {
    return (await this.repository.listQuestions(lessonId)).map(serializePublicQuestion);
  }

  listManagedQuestions(lessonId: string) {
    return this.repository.listManagedQuestions(lessonId);
  }

  async getManagedQuestion(questionId: string) {
    const question = await this.repository.getManagedQuestion(questionId);
    if (!question) throw new AppError("Question not found", 404);
    return question;
  }

  async updateLesson(lessonId: string, body: unknown) {
    const lesson = await this.repository.updateLesson(lessonId, parseLessonInput(body));
    if (!lesson) throw new AppError("Lesson not found", 404);
    return lesson;
  }

  async deleteLesson(lessonId: string) {
    const deleted = await this.repository.deleteLesson(lessonId);
    if (!deleted) throw new AppError("Lesson not found", 404);
  }

  async updateQuestion(questionId: string, body: unknown) {
    const input = parseQuestionInput(body);
    const existing = await this.repository.getManagedQuestion(questionId);
    if (!existing) throw new AppError("Question not found", 404);
    if (!input.vocabularyId) {
      const vocabs = await this.repository.listVocabulary(existing.lessonId);
      input.vocabularyId = inferVocabularyId(
        input.prompt,
        input.options,
        input.correctOptionIndex,
        vocabs,
      );
    }
    const question = await this.repository.updateQuestion(questionId, input);
    if (!question) throw new AppError("Question not found", 404);
    return question;
  }

  async deleteQuestion(questionId: string) {
    const deleted = await this.repository.deleteQuestion(questionId);
    if (!deleted) throw new AppError("Question not found", 404);
  }

  async checkQuestion(questionId: string, body: unknown) {
    if (!isRecord(body)) throw new AppError("JSON body is required", 400);
    const question = await this.repository.getQuestionForCheck(questionId);
    if (!question) throw new AppError("Question not found", 404);

    let vocabularyId = question.vocabularyId;
    if (!vocabularyId) {
      const vocabs = await this.repository.listVocabulary(question.lessonId);
      const options = Array.isArray(question.options) ? question.options.map(String) : [];
      vocabularyId = inferVocabularyId(
        question.prompt,
        options,
        question.correctOptionIndex,
        vocabs,
      );
    }

    return gradeQuestion(
      { vocabularyId, correctOptionIndex: question.correctOptionIndex },
      body.selectedOptionIndex,
    );
  }
}

export const contentService = new ContentService();
