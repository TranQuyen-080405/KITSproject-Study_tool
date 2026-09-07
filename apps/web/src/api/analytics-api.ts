import { apiRequest } from "./client";
import { endpoints } from "./endpoints";

export type AnalyticsDashboard = {
  totalWords: number;
  dueNow: number;
  learning: number;
  mastered: number;
  accuracy: number;
  nextReviewAt: string | null;
};

export type QuizReviewResult = {
  correct: boolean;
  masteryCandidateVocabularyId: string | null;
};

export async function fetchAnalyticsDashboard(
  userId: string | number,
  accessToken?: string,
): Promise<AnalyticsDashboard> {
  return apiRequest(endpoints.analytics.dashboard(userId), { accessToken });
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
        },
      }),
    ),
  );
}
