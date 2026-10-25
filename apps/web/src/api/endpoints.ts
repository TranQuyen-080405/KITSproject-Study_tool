// Public API paths exposed by the API Gateway.

export const endpoints = {
  auth: {
    login: "/api/v1/auth/login",
    register: "/api/v1/auth/register",
    verifyEmail: "/api/v1/auth/verify-email",
    google: "/api/v1/auth/google",
    forgotPassword: "/api/v1/auth/forgot-password",
    resetPassword: "/api/v1/auth/reset-password",
    logout: "/api/v1/auth/logout",
    refresh: "/api/v1/auth/refresh",
  },
  users: {
    me: "/api/v1/users/me",
  },
  content: {
    lessons: "/api/v1/content/lessons",
    lesson: (lessonId: string) =>
      `/api/v1/content/lessons/${encodeURIComponent(lessonId)}`,
    vocabularies: (lessonId: string) =>
      `/api/v1/content/lessons/${encodeURIComponent(lessonId)}/vocabularies`,
    questions: (lessonId: string) =>
      `/api/v1/content/lessons/${encodeURIComponent(lessonId)}/questions`,
    managedQuestions: (lessonId: string) =>
      `/api/v1/content/lessons/${encodeURIComponent(lessonId)}/questions/managed`,
    question: (questionId: string) =>
      `/api/v1/content/questions/${encodeURIComponent(questionId)}`,
    checkQuestion: (questionId: string) =>
      `/api/v1/content/questions/${encodeURIComponent(questionId)}/check`,
    flashcards: "/api/v1/content/flashcards",
    flashcard: (flashcardId: string) =>
      `/api/v1/content/flashcards/${encodeURIComponent(flashcardId)}`,
    cards: (flashcardId: string) =>
      `/api/v1/content/flashcards/${encodeURIComponent(flashcardId)}/cards`,
    card: (cardId: string) =>
      `/api/v1/content/cards/${encodeURIComponent(cardId)}`,
  },
  analytics: {
    reviews: "/api/v1/analytics/reviews",
    recordReview: "/api/v1/analytics/reviews",
    dashboard: "/api/v1/analytics/dashboard",
    reviewsDue: (limit = 20, scope?: "due" | "queue") => {
      const params = new URLSearchParams({
        limit: String(limit),
      });
      if (scope === "queue") params.set("scope", "queue");
      return `/api/v1/analytics/reviews/due?${params.toString()}`;
    },
    reviewsQueue: (limit = 50) =>
      `/api/v1/analytics/reviews/queue?limit=${limit}`,
    sessions: (limit = 20) =>
      `/api/v1/analytics/sessions?limit=${limit}`,
    deckSessions: (deckId: string, limit = 20) =>
      `/api/v1/analytics/sessions?deckId=${encodeURIComponent(deckId)}&limit=${limit}`,
    deckReviews: (deckId: string) =>
      `/api/v1/analytics/reviews/deck?deckId=${encodeURIComponent(deckId)}`,
    recordSession: "/api/v1/analytics/sessions",
    submitBatchSession: "/api/v1/analytics/sessions/submit",
  },
  ai: {
    health: "/api/v1/ai/health",
    conversations: "/api/v1/ai/conversations",
    conversation: (conversationId: string) =>
      `/api/v1/ai/conversations/${encodeURIComponent(conversationId)}`,
    messages: (conversationId: string) =>
      `/api/v1/ai/conversations/${encodeURIComponent(conversationId)}/messages`,
    generateFlashcards: "/api/v1/ai/flashcards/generate",
    completeFlashcards: "/api/v1/ai/flashcards/complete",
    generateQuestions: "/api/v1/ai/questions/generate",
  },
} as const;
