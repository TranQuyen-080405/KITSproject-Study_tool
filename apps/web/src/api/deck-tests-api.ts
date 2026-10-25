import { apiRequest } from "./client";

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
export type TestSessionSummary = {
  userId: string;
  id: string;
  flashcardId: string;
  sourceSessionId: string | null;
  deckTitle: string;
  correctCount: number;
  totalQuestions: number;
  scorePercentage: number;
  createdAt: string;
  completedAt: string | null;
};
export type TestSession = TestSessionSummary & {
  questions: TestQuestion[];
  answers: Array<number | null>;
};
export type TestProgress = Pick<TestSession,
  'id' | 'answers' | 'correctCount' | 'totalQuestions' | 'scorePercentage' | 'completedAt'>;
const base = (deckId: string) =>
  `/api/v1/content/flashcards/${encodeURIComponent(deckId)}/test-sessions`;

export const deckTestsApi = {
  async list(deckId: string, accessToken: string) {
    const { sessions } = await apiRequest<{ sessions: TestSessionSummary[] }>(base(deckId), { accessToken });
    return sessions;
  },
  async get(deckId: string, sessionId: string, accessToken: string) {
    const { session } = await apiRequest<{ session: TestSession }>(
      `${base(deckId)}/${encodeURIComponent(sessionId)}`, { accessToken },
    );
    return session;
  },
  async start(deckId: string, accessToken: string, sourceSessionId?: string) {
    const { session } = await apiRequest<{ session: TestSession }>(base(deckId), {
      accessToken, method: "POST", body: sourceSessionId ? { sourceSessionId } : {},
    });
    return session;
  },
  async saveAnswers(deckId: string, sessionId: string, answers: Array<number | null>, accessToken: string) {
    const { progress } = await apiRequest<{ progress: TestProgress }>(
      `${base(deckId)}/${encodeURIComponent(sessionId)}/answers`,
      { accessToken, method: "PUT", body: { answers } },
    );
    return progress;
  },
  async submit(deckId: string, sessionId: string, answers: Array<number | null>, accessToken: string) {
    const { progress } = await apiRequest<{ progress: TestProgress }>(
      `${base(deckId)}/${encodeURIComponent(sessionId)}/submit`,
      { accessToken, method: "POST", body: { answers } },
    );
    return progress;
  },
  async answer(deckId: string, sessionId: string, questionId: string, selectedOptionIndex: number, accessToken: string) {
    const { session } = await apiRequest<{ session: TestSession }>(
      `${base(deckId)}/${encodeURIComponent(sessionId)}/answer`,
      { accessToken, method: "PUT", body: { questionId, selectedOptionIndex } },
    );
    return session;
  },
};
