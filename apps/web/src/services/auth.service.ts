// Auth operations against User Service through the API Gateway.
import { apiRequest } from "../api/client";
import { endpoints } from "../api/endpoints";
import type {
  Account,
  AuthSessionResponse,
  AuthUser,
  ForgotPasswordRequest,
  GoogleLoginRequest,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from "../types/auth";

function toAccount(session: AuthSessionResponse): Account {
  return {
    ...session.user,
    accessToken: session.accessToken,
  };
}

export const authService = {
  async login(credentials: LoginRequest): Promise<Account> {
    const session = await apiRequest<AuthSessionResponse>(endpoints.auth.login, {
      method: "POST",
      body: credentials,
    });
    return toAccount(session);
  },

  async register(payload: RegisterRequest): Promise<AuthUser> {
    const result = await apiRequest<RegisterResponse>(endpoints.auth.register, {
      method: "POST",
      body: payload,
    });
    return result.user;
  },

  async verifyEmail(payload: VerifyEmailRequest): Promise<VerifyEmailResponse> {
    return apiRequest<VerifyEmailResponse>(endpoints.auth.verifyEmail, {
      method: "POST",
      body: payload,
    });
  },

  async loginWithGoogle(payload: GoogleLoginRequest): Promise<Account> {
    const session = await apiRequest<AuthSessionResponse>(endpoints.auth.google, {
      method: "POST",
      body: payload,
    });
    return toAccount(session);
  },

  async forgotPassword(payload: ForgotPasswordRequest): Promise<MessageResponse> {
    return apiRequest<MessageResponse>(endpoints.auth.forgotPassword, {
      method: "POST",
      body: payload,
    });
  },

  async resetPassword(payload: ResetPasswordRequest): Promise<MessageResponse> {
    return apiRequest<MessageResponse>(endpoints.auth.resetPassword, {
      method: "POST",
      body: payload,
    });
  },

  async logout(): Promise<void> {
    await apiRequest<void>(endpoints.auth.logout, { method: "POST", body: {} });
  },

  async getMe(accessToken: string): Promise<AuthUser> {
    return apiRequest<AuthUser>(endpoints.users.me, {
      method: "GET",
      accessToken,
    });
  },
};
