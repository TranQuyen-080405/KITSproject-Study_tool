import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

export type StudySession = {
  id: string;
  userId: string;
  deckId?: string;
  deckTitle?: string;
  sessionType: "mcq" | "flashcard" | "deck_study" | "daily_review";
  totalCardsOrQuestions: number;
  correctCount: number;
  scorePercentage: number;
  durationSeconds: number;
  averageResponseTimeMs?: number;
  completedAt: string;
};

export type StrugglingWord = {
  cardId: string;
  status: "new" | "learning" | "mastered";
  dueNow: boolean;
  nextReviewAt: string;
  word: string;
  translation?: string;
  incorrectCount: number;
  correctCount: number;
  easeFactor: number;
};

export type AnalyticsDashboard = {
  totalWords: number;
  dueNow: number;
  learning: number;
  mastered: number;
  accuracy: number;
  streakDays?: number;
  averageResponseTimeMs?: number;
  totalSessions?: number;
  recentSessions?: StudySession[];
  activityByDate?: Record<string, number>;
  strugglingWords?: StrugglingWord[];
  nextReviewAt: string | null;
  reviews?: Array<{
    word: string;
    translation?: string;
    status: string;
    easeFactor: number;
    intervalDays: number;
    nextReviewAt: string;
  }>;
};

export type QuizReviewResult = {
  correct: boolean;
  masteryCandidateVocabularyId: string | null;
  responseTimeMs?: number;
  word?: string;
  translation?: string;
};

export async function fetchAnalyticsDashboard(
  accessToken?: string,
): Promise<AnalyticsDashboard> {
  return apiRequest(endpoints.analytics.dashboard, { accessToken });
}

export async function recordQuizReviews(
  userId: string | number,
  results: QuizReviewResult[],
  accessToken?: string,
): Promise<void> {
  const reviewableResults = results.filter(
    (result): result is QuizReviewResult & { masteryCandidateVocabularyId: string } =>
      Boolean(result.masteryCandidateVocabularyId),
  );

  await Promise.all(
    reviewableResults.map((result) =>
      apiRequest(endpoints.analytics.reviews, {
        method: "POST",
        accessToken,
        body: {
          userId: String(userId),
          vocabularyId: result.masteryCandidateVocabularyId,
          correct: result.correct,
          responseTimeMs: result.responseTimeMs,
          word: result.word,
          translation: result.translation,
        },
      }),
    ),
  );
}

export type ReviewRecord = {
  vocabularyId: string;
  word: string;
  translation: string;
  correct?: boolean;
};

export async function recordStudySession(
  session: {
    userId: string | number;
    deckId: string;
    deckTitle?: string;
    sessionType: "mcq" | "flashcard";
    totalCardsOrQuestions: number;
    correctCount: number;
    durationSeconds: number;
  },
  accessToken?: string,
): Promise<StudySession> {
  const res = await apiRequest<{ session: StudySession }>(endpoints.analytics.recordSession, {
    method: "POST",
    accessToken,
    body: {
      ...session,
      userId: String(session.userId),
    },
  });
  return res.session;
}

export async function fetchStudySessions(
  limit = 20,
  accessToken?: string,
): Promise<StudySession[]> {
  const res = await apiRequest<{ sessions: StudySession[]; count: number }>(
    endpoints.analytics.sessions(limit),
    { accessToken },
  );
  return res.sessions;
}

export type BatchReviewItem = {
  cardId: string;
  deckId?: string;
  word: string;
  translation?: string;
  correct: boolean;
  responseTimeMs?: number;
};

export type BatchSessionSubmitPayload = {
  userId: string | number;
  deckId?: string;
  deckTitle?: string;
  sessionType: "deck_study" | "daily_review" | "mcq" | "flashcard";
  totalCardsOrQuestions: number;
  correctCount: number;
  durationSeconds: number;
  completedAt?: string;
  reviews?: BatchReviewItem[];
};

export type BatchSessionSubmitResult = {
  session: StudySession;
  reviewsCount: number;
  streak: { currentStreak: number; longestStreak: number; lastStudiedDate: string };
};

export async function submitBatchStudySession(
  payload: BatchSessionSubmitPayload,
  accessToken?: string,
): Promise<BatchSessionSubmitResult> {
  return apiRequest<BatchSessionSubmitResult>(endpoints.analytics.submitBatchSession, {
    method: "POST",
    accessToken,
    body: {
      ...payload,
      userId: String(payload.userId),
    },
  });
}

export async function fetchDeckStudySessions(
  deckId: string,
  limit = 20,
  accessToken?: string,
): Promise<StudySession[]> {
  const res = await apiRequest<{ sessions: StudySession[]; count: number }>(
    endpoints.analytics.deckSessions(deckId, limit),
    { accessToken },
  );
  return res.sessions;
}

export type DeckCardReview = {
  userId: string;
  cardId: string;
  deckId?: string;
  word: string;
  translation?: string;
  status: "new" | "learning" | "mastered";
  correctCount: number;
  incorrectCount: number;
  correctStreak: number;
  totalReviews: number;
  intervalDays: number;
  nextReviewAt: string;
  lastReviewedAt: string;
};

export async function fetchDeckReviews(
  deckId: string,
  accessToken?: string,
): Promise<DeckCardReview[]> {
  const res = await apiRequest<{ reviews: DeckCardReview[]; count: number }>(
    endpoints.analytics.deckReviews(deckId),
    { accessToken },
  );
  return res.reviews;
}

export const analyticsApi = {
  async recordReview(
    data: {
      userId: string;
      vocabularyId: string;
      correct: boolean;
      word?: string;
      translation?: string;
      responseTimeMs?: number;
    },
    accessToken?: string,
  ): Promise<void> {
    await apiRequest(endpoints.analytics.recordReview, {
      method: "POST",
      accessToken,
      body: data,
    });
  },
  recordSession: recordStudySession,
  submitBatchSession: submitBatchStudySession,
  fetchSessions: fetchStudySessions,
  fetchDeckSessions: fetchDeckStudySessions,
  fetchDeckReviews: fetchDeckReviews,
};
