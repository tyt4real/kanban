export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  userId: string;
  email: string;
  expiresAt: number;
}

export interface JWTPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const PASSWORD_MIN_LENGTH = 12;
export const BCRYPT_COST = 12;