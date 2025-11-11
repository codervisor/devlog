/**
 * Authentication and user management types
 */

export interface User {
  id: number;
  email: string;
  name?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserRegistration {
  email: string;
  password: string;
  name?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthToken;
}

export interface PasswordReset {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface EmailVerification {
  token: string;
}

// SSO Provider types
export type SSOProvider = 'github' | 'google' | 'wechat';

export interface SSOConfig {
  github?: GitHubSSOConfig;
  google?: GoogleSSOConfig;
  wechat?: WeChatSSOConfig;
}

export interface GitHubSSOConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleSSOConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface WeChatSSOConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface SSOUserInfo {
  provider: SSOProvider;
  providerId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface UserProvider {
  id: number;
  userId: number;
  provider: SSOProvider;
  providerId: string;
  createdAt: string;
}

// Session and JWT types
export interface JWTPayload {
  userId: number;
  email: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface SessionUser {
  id: number;
  email: string;
  name?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
}

// Email verification types
export interface EmailVerificationToken {
  id: number;
  userId: number;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface PasswordResetToken {
  id: number;
  userId: number;
  token: string;
  expiresAt: string;
  createdAt: string;
  used: boolean;
}

// Auth error types
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface AuthValidationError extends AuthError {
  field: string;
}
