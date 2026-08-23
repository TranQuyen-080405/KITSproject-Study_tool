// Auth types for the User Service contract via API Gateway.

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
};

export type Account = AuthUser & {
  accessToken: string;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
  displayName: string;
};

export type VerifyEmailRequest = {
  email: string;
  code: string;
};

export type AuthSessionResponse = {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
};

export type RegisterResponse = {
  user: AuthUser;
};

export type VerifyEmailResponse = {
  message: string;
  user: AuthUser;
};

export type GoogleLoginRequest = {
  idToken: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  email: string;
  code: string;
  newPassword: string;
};

export type MessageResponse = {
  message: string;
};
