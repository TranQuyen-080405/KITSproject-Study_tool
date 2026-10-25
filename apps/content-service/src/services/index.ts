import { AppError } from "../errors.js";
import {
  contentRepository,
  type ContentRepository,
  type CreateCardRecord,
  type CreateFlashcardRecord,
  type CreateFolderRecord,
  type CreateQuestionRecord,
  type UpdateCardRecord,
  type UpdateFlashcardRecord,
  type UpdateFolderRecord,
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

function optionalText(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new AppError(`${field} must be a string`, 400);
  }
  const result = value.trim();
  if (result.length > maxLength) {
    throw new AppError(`${field} must be at most ${maxLength} characters`, 400);
  }
  return result || null;
}

// ===================== INPUT PARSERS =====================

export function parseFolderInput(body: unknown): CreateFolderRecord {
  if (!isRecord(body)) throw new AppError("JSON body is required", 400);
  return {
    name: requiredText(body.name, "name", 120),
    description: optionalText(body.description, "description", 1000),
    userId: optionalText(body.userId, "userId", 100),
  };
}

export function parseUpdateFolderInput(body: unknown): UpdateFolderRecord {
  if (!isRecord(body)) throw new AppError("JSON body is required", 400);
  const data: UpdateFolderRecord = {};
  if (body.name !== undefined) {
    data.name = requiredText(body.name, "name", 120);
  }
  if (body.description !== undefined) {
    data.description = optionalText(body.description, "description", 1000);
  }
  return data;
}

export function parseFlashcardInput(body: unknown): CreateFlashcardRecord & { cards?: CreateCardRecord[] } {
  if (!isRecord(body)) throw new AppError("JSON body is required", 400);
  const title = body.title !== undefined ? body.title : body.name; // allow title or name
  const result: CreateFlashcardRecord & { cards?: CreateCardRecord[] } = {
    title: requiredText(title, "title", 120),
    description: optionalText(body.description, "description", 1000),
    folderId: optionalText(body.folderId, "folderId", 100),
    userId: optionalText(body.userId, "userId", 100),
  };

  if (body.cards !== undefined) {
    if (!Array.isArray(body.cards)) {
      throw new AppError("cards must be an array", 400);
    }
    result.cards = parseCardList(body.cards);
  }
  return result;
}

export function parseUpdateFlashcardInput(body: unknown): UpdateFlashcardRecord {
  if (!isRecord(body)) throw new AppError("JSON body is required", 400);
  const data: UpdateFlashcardRecord = {};
  if (body.title !== undefined || body.name !== undefined) {
    data.title = requiredText(body.title ?? body.name, "title", 120);
  }
  if (body.description !== undefined) {
    data.description = optionalText(body.description, "description", 1000);
  }
  if (body.folderId !== undefined) {
    data.folderId = optionalText(body.folderId, "folderId", 100);
  }
  return data;
}

function parseCardList(items: unknown[]): CreateCardRecord[] {
  if (items.length > 200) throw new AppError("A maximum of 200 cards can be added at once", 400);

  return items.map((item, index) => {
    if (!isRecord(item)) throw new AppError(`items[${index}] must be an object`, 400);
    // Allow front/back or word/meaning
    const front = item.front !== undefined ? item.front : item.word;
    const back = item.back !== undefined ? item.back : item.meaning;
    return {
      front: requiredText(front, `items[${index}].front`, 500),
      back: requiredText(back, `items[${index}].back`, 2000),
      hint: optionalText(item.hint, `items[${index}].hint`, 500),
      orderIndex: typeof item.orderIndex === "number" ? item.orderIndex : undefined,
    };
  });
}

export function parseCardBatchInput(body: unknown): CreateCardRecord[] {
  if (!isRecord(body) || !Array.isArray(body.items) || body.items.length === 0) {
    throw new AppError("items must be a non-empty array", 400);
  }
  return parseCardList(body.items);
}

export function parseUpdateCardInput(body: unknown): UpdateCardRecord {
  if (!isRecord(body)) throw new AppError("JSON body is required", 400);
  const data: UpdateCardRecord = {};
  if (body.front !== undefined || body.word !== undefined) {
    data.front = requiredText(body.front ?? body.word, "front", 500);
  }
  if (body.back !== undefined || body.meaning !== undefined) {
    data.back = requiredText(body.back ?? body.meaning, "back", 2000);
  }
  if (body.hint !== undefined) {
    data.hint = optionalText(body.hint, "hint", 500);
  }
  if (typeof body.orderIndex === "number") {
    data.orderIndex = body.orderIndex;
  }
  return data;
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

  const cardId = body.cardId !== undefined ? body.cardId : body.vocabularyId;
  const effectiveId = cardId == null || cardId === "" ? null : requiredText(cardId, "cardId", 100);

  return {
    prompt: requiredText(body.prompt, "prompt", 500),
    cardId: effectiveId,
    vocabularyId: effectiveId,
    options,
    correctOptionIndex: Number(body.correctOptionIndex),
  };
}

// ===================== HELPER FUNCTIONS =====================

type CardLink = { id: string; front: string; back: string };

export function inferCardId(
  prompt: string,
  options: string[],
  correctOptionIndex: number,
  cards: CardLink[],
): string | null {
  if (cards.length === 0) return null;

  const correctText = options[correctOptionIndex]?.trim().toLowerCase() ?? "";
  const byBack = cards.find((item) => item.back.trim().toLowerCase() === correctText);
  if (byBack) return byBack.id;

  const byFront = cards.find((item) => item.front.trim().toLowerCase() === correctText);
  if (byFront) return byFront.id;

  const inPrompt = cards.find((item) => prompt.includes(item.front));
  if (inPrompt) return inPrompt.id;

  for (const option of options) {
    const text = option.trim().toLowerCase();
    const match = cards.find(
      (item) => item.back.trim().toLowerCase() === text || item.front.trim().toLowerCase() === text,
    );
    if (match) return match.id;
  }

  return cards.length === 1 ? cards[0].id : null;
}

export const inferVocabularyId = inferCardId;

export function parseLessonInput(body: unknown): { name: string; description: string } {
  if (!isRecord(body)) throw new AppError("JSON body is required", 400);
  return {
    name: requiredText(body.name, "name", 120),
    description: requiredText(body.description, "description", 1000),
  };
}

export function parseVocabularyInput(body: unknown): { word: string; meaning: string }[] {
  return parseCardBatchInput(body).map((c) => ({ word: c.front, meaning: c.back }));
}

export function gradeQuestion(
  question: { cardId?: string | null; vocabularyId?: string | null; correctOptionIndex: number },
  selectedOptionIndex: unknown,
): {
  correct: boolean;
  cardId: string | null;
  vocabularyId: string | null;
  masteryCandidateVocabularyId: string | null;
} {
  if (
    !Number.isInteger(selectedOptionIndex) ||
    Number(selectedOptionIndex) < 0 ||
    Number(selectedOptionIndex) > 3
  ) {
    throw new AppError("selectedOptionIndex must be an integer from 0 to 3", 400);
  }
  const effectiveId = question.cardId ?? question.vocabularyId ?? null;
  const correct = Number(selectedOptionIndex) === question.correctOptionIndex;
  return {
    correct,
    cardId: effectiveId,
    vocabularyId: effectiveId,
    masteryCandidateVocabularyId: correct ? effectiveId : null,
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

// ===================== SERVICE CLASS =====================

export class ContentService {
  constructor(private readonly repository: ContentRepository = contentRepository) {}

  // ===================== FOLDER =====================
  createFolder(body: unknown) {
    return this.repository.createFolder(parseFolderInput(body));
  }

  async listFolders(userId?: string) {
    const folders = await this.repository.listFolders(userId);
    return folders.map(({ _count, ...folder }) => ({
      ...folder,
      flashcardCount: _count.flashcards,
    }));
  }

  async getFolder(folderId: string) {
    const folder = await this.repository.getFolderDetail(folderId);
    if (!folder) throw new AppError("Folder not found", 404);
    return {
      ...folder,
      flashcards: folder.flashcards.map(({ _count, ...deck }) => ({
        ...deck,
        cardCount: _count.cards,
        questionCount: _count.questions,
      })),
    };
  }

  async updateFolder(folderId: string, body: unknown) {
    const folder = await this.repository.updateFolder(folderId, parseUpdateFolderInput(body));
    if (!folder) throw new AppError("Folder not found", 404);
    return folder;
  }

  async deleteFolder(folderId: string) {
    const deleted = await this.repository.deleteFolder(folderId);
    if (!deleted) throw new AppError("Folder not found", 404);
  }

  // ===================== FLASHCARD (DECK) =====================
  async createFlashcard(body: unknown) {
    const input = parseFlashcardInput(body);
    const { cards, ...deckData } = input;
    const flashcard = await this.repository.createFlashcard(deckData);
    if (cards && cards.length > 0) {
      await this.repository.addCards(flashcard.id, cards);
    }
    return this.getFlashcard(flashcard.id);
  }

  async listFlashcards(folderId?: string | null, userId?: string) {
    const flashcards = await this.repository.listFlashcards(folderId, userId);
    return flashcards.map(({ _count, ...item }) => ({
      ...item,
      cardCount: _count.cards,
      questionCount: _count.questions,
    }));
  }

  async getFlashcard(flashcardId: string) {
    const flashcard = await this.repository.getFlashcardDetail(flashcardId);
    if (!flashcard) throw new AppError("Flashcard deck not found", 404);
    const { _count, questions, ...rest } = flashcard;
    return {
      ...rest,
      cardCount: _count.cards,
      questionCount: _count.questions,
      questions: questions.map(serializePublicQuestion),
    };
  }

  async updateFlashcard(flashcardId: string, body: unknown) {
    const flashcard = await this.repository.updateFlashcard(
      flashcardId,
      parseUpdateFlashcardInput(body),
    );
    if (!flashcard) throw new AppError("Flashcard deck not found", 404);
    return flashcard;
  }

  async deleteFlashcard(flashcardId: string) {
    const deleted = await this.repository.deleteFlashcard(flashcardId);
    if (!deleted) throw new AppError("Flashcard deck not found", 404);
  }

  // ===================== CARD =====================
  addCards(flashcardId: string, body: unknown) {
    return this.repository.addCards(flashcardId, parseCardBatchInput(body));
  }

  listCards(flashcardId: string) {
    return this.repository.listCards(flashcardId);
  }

  async getCard(cardId: string) {
    const card = await this.repository.getCard(cardId);
    if (!card) throw new AppError("Card not found", 404);
    return card;
  }

  async updateCard(cardId: string, body: unknown) {
    const card = await this.repository.updateCard(cardId, parseUpdateCardInput(body));
    if (!card) throw new AppError("Card not found", 404);
    return card;
  }

  async deleteCard(cardId: string) {
    const deleted = await this.repository.deleteCard(cardId);
    if (!deleted) throw new AppError("Card not found", 404);
  }

  // ===================== QUESTION =====================
  async createQuestion(flashcardId: string, body: unknown) {
    const input = parseQuestionInput(body);
    if (!input.cardId) {
      const cards = await this.repository.listCards(flashcardId);
      input.cardId = inferCardId(input.prompt, input.options, input.correctOptionIndex, cards);
    }
    return this.repository.createQuestion(flashcardId, input);
  }

  async listQuestions(flashcardId: string) {
    return (await this.repository.listQuestions(flashcardId)).map(serializePublicQuestion);
  }

  listManagedQuestions(flashcardId: string) {
    return this.repository.listManagedQuestions(flashcardId);
  }

  async getManagedQuestion(questionId: string) {
    const question = await this.repository.getManagedQuestion(questionId);
    if (!question) throw new AppError("Question not found", 404);
    return question;
  }

  async updateQuestion(questionId: string, body: unknown) {
    const input = parseQuestionInput(body);
    const existing = await this.repository.getManagedQuestion(questionId);
    if (!existing) throw new AppError("Question not found", 404);
    if (!input.cardId) {
      const cards = await this.repository.listCards(existing.flashcardId);
      input.cardId = inferCardId(input.prompt, input.options, input.correctOptionIndex, cards);
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

    let cardId = question.cardId;
    if (!cardId) {
      const cards = await this.repository.listCards(question.flashcardId);
      const options = Array.isArray(question.options) ? question.options.map(String) : [];
      cardId = inferCardId(question.prompt, options, question.correctOptionIndex, cards);
    }

    return gradeQuestion(
      { cardId, correctOptionIndex: question.correctOptionIndex },
      body.selectedOptionIndex,
    );
  }

  // ===================== BACKWARD COMPATIBILITY ADAPTERS =====================
  createLesson(body: unknown) {
    if (isRecord(body) && body.title === undefined && "name" in body) {
      return this.createFlashcard({ ...body, title: requiredText(body.name, "name", 120) });
    }
    return this.createFlashcard(body);
  }

  async listLessons(userId?: string) {
    const flashcards = await this.listFlashcards(undefined, userId);
    return flashcards.map((f) => ({
      id: f.id,
      name: f.title,
      description: f.description ?? "",
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      vocabularyCount: f.cardCount,
      questionCount: f.questionCount,
    }));
  }

  async getLesson(lessonId: string) {
    const flashcard = await this.getFlashcard(lessonId);
    return {
      id: flashcard.id,
      name: flashcard.title,
      description: flashcard.description ?? "",
      createdAt: flashcard.createdAt,
      updatedAt: flashcard.updatedAt,
      vocabulary: flashcard.cards.map((c) => ({
        id: c.id,
        lessonId: flashcard.id,
        word: c.front,
        meaning: c.back,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      questions: flashcard.questions,
    };
  }

  async updateLesson(lessonId: string, body: unknown) {
    const flashcard = await this.updateFlashcard(lessonId, body);
    return {
      id: flashcard.id,
      name: flashcard.title,
      description: flashcard.description ?? "",
      createdAt: flashcard.createdAt,
      updatedAt: flashcard.updatedAt,
    };
  }

  deleteLesson(lessonId: string) {
    return this.deleteFlashcard(lessonId);
  }

  async addVocabulary(lessonId: string, body: unknown) {
    const cards = await this.addCards(lessonId, body);
    return cards.map((c) => ({
      id: c.id,
      lessonId,
      word: c.front,
      meaning: c.back,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  async listVocabulary(lessonId: string) {
    const cards = await this.listCards(lessonId);
    return cards.map((c) => ({
      id: c.id,
      lessonId,
      word: c.front,
      meaning: c.back,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }
}

export const contentService = new ContentService();
