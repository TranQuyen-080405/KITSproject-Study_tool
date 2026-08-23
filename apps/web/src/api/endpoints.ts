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
} as const;
