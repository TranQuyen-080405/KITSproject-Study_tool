import { randomUUID } from "node:crypto";
import { AppError } from "../errors.js";

export type TestCard = { id: string; front: string; back: string };
export type TestQuestion = {
  id: string;
  cardId: string;
  word: string;
  translation: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string | null;
};
export type TestSession = {
  id: string;
  flashcardId: string;
  userId: string;
  sourceSessionId: string | null;
  deckTitle: string;
  questions: TestQuestion[];
  answers: Array<number | null>;
  correctCount: number;
  totalQuestions: number;
  scorePercentage: number;
  version: number;
  createdAt: Date;
  completedAt: Date | null;
};
export type NewTestSession = Pick<TestSession,
  "flashcardId" | "userId" | "sourceSessionId" | "deckTitle" | "questions" | "answers" | "totalQuestions">;
export interface TestStore {
  deck(id: string): Promise<{ id: string; title: string; userId: string | null; cards: TestCard[] } | null>;
  list(deckId: string, userId: string): Promise<Omit<TestSession, "questions" | "answers">[]>;
  get(id: string, deckId: string, userId: string): Promise<TestSession | null>;
  create(data: NewTestSession): Promise<TestSession>;
  saveAnswer(session: TestSession, answers: Array<number | null>, completedAt: Date | null): Promise<TestSession | null>;
}
export type GenerateQuestions = (cards: TestCard[], description: string, authorization?: string) => Promise<TestQuestion[]>;

export async function generateTestQuestions(cards: TestCard[], description: string, authorization?: string): Promise<TestQuestion[]> {
  let response: Response;
  try {
    response = await fetch(
      `${(process.env.AI_SERVICE_URL ?? "http://localhost:3004").replace(/\/$/, "")}/api/v1/ai/questions/generate`,
      {
        method: "POST",
        headers: { "content-type": "application/json", ...(authorization ? { authorization } : {}) },
        signal: AbortSignal.timeout(60_000),
        body: JSON.stringify({
          words: cards.map((card) => ({ word: card.front, meaning: card.back, vocabulary_id: card.id })),
          question_count: cards.length, one_per_word: true, description,
        }),
      },
    );
  } catch { throw new AppError("Không thể kết nối AI hoặc AI phản hồi quá lâu. Vui lòng thử lại.", 504); }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: { code?: unknown; message?: unknown } } | null;
    const detail = body?.detail;
    if (detail && typeof detail.code === "string" && ["AI_QUOTA_EXCEEDED", "AI_RATE_LIMITED", "AI_TIMEOUT", "AI_PROVIDER_AUTH_FAILED"].includes(detail.code) && typeof detail.message === "string") {
      throw new AppError(detail.message, [429, 503, 504].includes(response.status) ? response.status : 502);
    }
    if (response.status === 429) throw new AppError("AI đang hết quota hoặc chạm giới hạn request. Vui lòng kiểm tra hạn mức AI.", 429);
    if (response.status === 401 || response.status === 403) throw new AppError("Vui lòng đăng nhập lại để tạo đề.", 401);
    throw new AppError("AI chưa tạo được câu hỏi hợp lệ cho bộ thẻ. Vui lòng thử lại.", 502);
  }
  const body = await response.json() as { questions?: Array<{
    vocabulary_id?: unknown; prompt?: unknown; options?: unknown; correct_option_index?: unknown; explanation?: unknown;
  }> };
  if (!Array.isArray(body.questions) || body.questions.length !== cards.length) throw new AppError("AI chưa tạo đủ câu hỏi cho các thẻ.", 502);
  const expected = new Map(cards.map((card) => [card.id, card]));
  const result = new Map<string, TestQuestion>();
  for (const question of body.questions) {
    const card = typeof question?.vocabulary_id === "string" ? expected.get(question.vocabulary_id) :
      cards.length === 1 && question?.vocabulary_id == null ? cards[0] : undefined;
    if (!card || result.has(card.id) || typeof question.prompt !== "string" || !question.prompt.trim() ||
        !Array.isArray(question.options) || question.options.length !== 4 ||
        question.options.some((option) => typeof option !== "string" || !option.trim()) ||
        new Set(question.options.map((option) => String(option).trim())).size !== 4 ||
        !Number.isInteger(question.correct_option_index) || Number(question.correct_option_index) < 0 || Number(question.correct_option_index) > 3) {
      throw new AppError("AI trả về câu hỏi không khớp hoặc không hợp lệ. Vui lòng thử lại.", 502);
    }
    result.set(card.id, {
      id: randomUUID(), cardId: card.id, word: card.front, translation: card.back,
      prompt: question.prompt.trim(), options: question.options.map((option) => String(option).trim()),
      correctOptionIndex: Number(question.correct_option_index),
      explanation: typeof question.explanation === "string" ? question.explanation : null,
    });
  }
  return cards.map((card) => result.get(card.id)!);
}

export async function generateTestQuestion(card: TestCard, description: string, authorization?: string): Promise<TestQuestion> {
  return (await generateTestQuestions([card], description, authorization))[0];
}

export class DeckTestService {
  constructor(private readonly store: TestStore, private readonly generate: GenerateQuestions = generateTestQuestions) {}

  private async requireDeck(deckId: string, userId: string) {
    const deck = await this.store.deck(deckId);
    // Legacy public decks remain usable; attempts are always private to the authenticated user.
    if (!deck || (deck.userId !== null && deck.userId !== userId)) {
      throw new AppError("Không tìm thấy bộ từ vựng.", 404);
    }
    return deck;
  }

  async list(deckId: string, userId: string) {
    await this.requireDeck(deckId, userId);
    return this.store.list(deckId, userId);
  }

  async get(deckId: string, sessionId: string, userId: string) {
    await this.requireDeck(deckId, userId);
    const session = await this.store.get(sessionId, deckId, userId);
    if (!session) throw new AppError("Không tìm thấy phiên kiểm tra.", 404);
    return session;
  }

  async start(deckId: string, userId: string, sourceSessionId?: unknown, authorization?: string) {
    const deck = await this.requireDeck(deckId, userId);
    if (sourceSessionId !== undefined && (typeof sourceSessionId !== "string" || !sourceSessionId.trim())) {
      throw new AppError("sourceSessionId không hợp lệ.", 400);
    }
    let questions: TestQuestion[];
    let deckTitle = deck.title;
    if (typeof sourceSessionId === "string") {
      const source = await this.get(deckId, sourceSessionId, userId);
      if (!source.completedAt) throw new AppError("Hãy hoàn thành phiên cũ trước khi làm lại.", 409);
      questions = structuredClone(source.questions);
      deckTitle = source.deckTitle;
    } else {
      if (!deck.cards.length) throw new AppError("Thêm từ vựng vào bộ trước khi kiểm tra.", 400);
      // One model call for up to twenty cards; persist only after every batch succeeds.
      questions = [];
      for (let offset = 0; offset < deck.cards.length; offset += 20) {
        questions.push(...await this.generate(deck.cards.slice(offset, offset + 20), deck.title, authorization));
      }
    }
    return this.store.create({
      flashcardId: deckId, userId, sourceSessionId: typeof sourceSessionId === "string" ? sourceSessionId : null,
      deckTitle, questions, answers: questions.map(() => null), totalQuestions: questions.length,
    });
  }

  async saveAnswers(deckId: string, sessionId: string, userId: string, body: unknown, finalize = false) {
    return this.persistAnswers(await this.get(deckId, sessionId, userId), body, finalize);
  }

  private async persistAnswers(session: TestSession, body: unknown, finalize: boolean) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new AppError("Cần danh sách đáp án.", 400);
    }
    const incoming = (body as Record<string, unknown>).answers;
    if (!Array.isArray(incoming) || incoming.length !== session.totalQuestions) {
      throw new AppError("Danh sách đáp án phải khớp số câu trong đề.", 400);
    }
    let foundUnanswered = false;
    const answers = incoming.map((answer: unknown, index: number): number | null => {
      if (answer === null) { foundUnanswered = true; return null; }
      if (foundUnanswered || !Number.isInteger(answer) ||
          Number(answer) < 0 || Number(answer) >= session.questions[index].options.length) {
        throw new AppError("Đáp án không hợp lệ hoặc bỏ qua câu chưa trả lời.", 400);
      }
      return Number(answer);
    });
    if (finalize && answers.some((answer) => answer === null)) {
      throw new AppError("Hãy trả lời đủ các câu trước khi nộp bài.", 400);
    }
    for (let index = 0; index < answers.length; index++) {
      const previous = session.answers[index];
      if (previous === null) continue;
      if (answers[index] !== null && answers[index] !== previous) {
        throw new AppError("Đáp án đã được lưu và không thể thay đổi.", 409);
      }
      // An older autosave cannot erase progress already saved by another request.
      answers[index] = previous;
    }
    const changed = answers.some((answer, index) => answer !== session.answers[index]);
    if (session.completedAt) {
      if (!changed) return session;
      throw new AppError("Phiên kiểm tra đã hoàn thành.", 409);
    }
    if (!changed && !finalize) return session;
    const saved = await this.store.saveAnswer(session, answers, finalize ? new Date() : null);
    if (!saved) throw new AppError("Phiên đã thay đổi ở cửa sổ khác. Vui lòng tải lại.", 409);
    return saved;
  }

  // Compatibility for clients using the original single-answer endpoint.
  async answer(deckId: string, sessionId: string, userId: string, body: unknown) {
    const session = await this.get(deckId, sessionId, userId);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("Cần dữ liệu đáp án.", 400);
    const { questionId, selectedOptionIndex } = body as Record<string, unknown>;
    const index = session.questions.findIndex((question) => question.id === questionId);
    if (index < 0 || !Number.isInteger(selectedOptionIndex) ||
        Number(selectedOptionIndex) < 0 || Number(selectedOptionIndex) >= session.questions[index].options.length) {
      throw new AppError("Câu hỏi hoặc đáp án không hợp lệ.", 400);
    }
    const answers = [...session.answers];
    answers[index] = Number(selectedOptionIndex);
    return this.persistAnswers(session, { answers }, answers.every((answer) => answer !== null));
  }
}
