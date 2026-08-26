import { ApiError, apiRequest } from "./client";
import { endpoints } from "./endpoints";

export type AnalyticsDashboardData = {
  totalWords: number;
  dueNow: number;
  learning: number;
  mastered: number;
  accuracy: number;
  nextReviewAt: string | null;
  reviews?: ReviewRecord[];
};

export type RecordReviewPayload = {
  userId: string;
  vocabularyId: string;
  correct: boolean;
  word?: string;
  translation?: string;
};

export type ReviewRecord = {
  userId: string;
  vocabularyId: string;
  word?: string;
  translation?: string;
  status: "new" | "learning" | "mastered";
  correctCount: number;
  incorrectCount: number;
  correctStreak: number;
  totalReviews: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewAt: string;
  lastReviewedAt: string;
};

export type DueReviewsResponse = {
  reviews: ReviewRecord[];
  count: number;
};

export type ReviewQueueResponse = {
  reviews: ReviewRecord[];
  count: number;
};

export const analyticsApi = {
  async getDashboard(userId: string | number, token: string): Promise<AnalyticsDashboardData> {
    return apiRequest<AnalyticsDashboardData>(endpoints.analytics.dashboard(userId), {
      accessToken: token,
      userId: String(userId),
    });
  },

  async recordReview(payload: RecordReviewPayload, token: string): Promise<void> {
    await apiRequest(endpoints.analytics.recordReview, {
      method: "POST",
      body: payload,
      accessToken: token,
      userId: payload.userId,
    });
  },

  async getDueReviews(userId: string | number, token: string, limit = 20): Promise<DueReviewsResponse> {
    return apiRequest<DueReviewsResponse>(endpoints.analytics.reviewsDue(userId, limit), {
      accessToken: token,
      userId: String(userId),
    });
  },

  async getReviewQueue(userId: string | number, token: string, limit = 50): Promise<ReviewQueueResponse> {
    const requestOptions = { accessToken: token, userId: String(userId) };
    try {
      return await apiRequest<ReviewQueueResponse>(endpoints.analytics.reviewsQueue(userId, limit), requestOptions);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 503)) {
        return apiRequest<ReviewQueueResponse>(
          endpoints.analytics.reviewsDue(userId, limit, "queue"),
          requestOptions,
        );
      }
      throw error;
    }
  },
};
