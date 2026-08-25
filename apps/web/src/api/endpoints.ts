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
    checkQuestion: (questionId: string) =>
      `/api/v1/content/questions/${encodeURIComponent(questionId)}/check`,
  },
  analytics: {
    reviews: "/api/v1/analytics/reviews",
    dashboard: (userId: string | number) =>
      `/api/v1/analytics/dashboard?userId=${encodeURIComponent(String(userId))}`,
  },
  ai: {
    health: "/api/v1/ai/health",
    conversations: "/api/v1/ai/conversations",
    conversation: (conversationId: string) =>
      `/api/v1/ai/conversations/${encodeURIComponent(conversationId)}`,
    messages: (conversationId: string) =>
      `/api/v1/ai/conversations/${encodeURIComponent(conversationId)}/messages`,
  },
} as const;
