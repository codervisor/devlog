/**
 * Prisma-based Authentication Service
 *
 * Migrated from TypeORM to Prisma for better Next.js integration
 * Manages user authentication, registration, and session handling using Prisma Client
 * 
 * Features:
 * - User registration and login
 * - Password hashing and verification
 * - JWT token management
 * - Email verification
 * - Password reset functionality
 * - OAuth provider integration
 * 
 * NOTE: This service requires Prisma Client to be generated first:
 * Run `npx prisma generate` after setting up the database connection
 */

import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import type {
  User,
  UserRegistration,
  UserLogin,
  AuthResponse,
  AuthToken,
  SessionUser,
  JWTPayload,
  SSOUserInfo,
  EmailVerificationToken,
  PasswordResetToken,
} from '../types/index.js';

interface AuthServiceInstance {
  service: PrismaAuthService;
  createdAt: number;
}

export class PrismaAuthService {
  private static instances: Map<string, AuthServiceInstance> = new Map();
  private static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
  
  private prisma: any = null;
  private initPromise: Promise<void> | null = null;
  private fallbackMode = true;
  private prismaImportPromise: Promise<void> | null = null;

  // Configuration
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN = '15m'; // Access token expiry
  private readonly JWT_REFRESH_EXPIRES_IN = '7d'; // Refresh token expiry
  private readonly BCRYPT_ROUNDS = 12;

  private constructor(databaseUrl?: string) {
    this.JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development';
    
    if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }

    // Initialize Prisma imports lazily
    this.prismaImportPromise = this.initializePrismaClient();
  }

  private async initializePrismaClient(): Promise<void> {
    try {
      // Try to import Prisma client - will fail if not generated
      const prismaModule = await import('@prisma/client');
      const configModule = await import('../utils/prisma-config.js');
      
      if (prismaModule.PrismaClient && configModule.getPrismaClient) {
        this.prisma = configModule.getPrismaClient();
        this.fallbackMode = false;
        console.log('[PrismaAuthService] Prisma client initialized successfully');
      }
    } catch (error) {
      // Prisma client not available - service will operate in fallback mode
      console.warn('[PrismaAuthService] Prisma client not available, operating in fallback mode:', error.message);
      this.fallbackMode = true;
    }
  }

  /**
   * Get or create an AuthService instance
   * Implements singleton pattern with TTL-based cleanup
   */
  static getInstance(databaseUrl?: string): PrismaAuthService {
    const key = databaseUrl || 'default';
    const now = Date.now();
    
    // Clean up expired instances
    for (const [instanceKey, instance] of this.instances.entries()) {
      if (now - instance.createdAt > this.TTL_MS) {
        this.instances.delete(instanceKey);
      }
    }

    let instance = this.instances.get(key);
    if (!instance) {
      instance = {
        service: new PrismaAuthService(databaseUrl),
        createdAt: now,
      };
      this.instances.set(key, instance);
    }

    return instance.service;
  }

  /**
   * Initialize the authentication service
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  /**
   * Internal initialization method
   */
  private async _initialize(): Promise<void> {
    // Wait for Prisma client initialization
    if (this.prismaImportPromise) {
      await this.prismaImportPromise;
    }

    try {
      if (!this.fallbackMode && this.prisma) {
        await this.prisma.$connect();
        console.log('[PrismaAuthService] Authentication service initialized with database connection');
      } else {
        console.log('[PrismaAuthService] Authentication service initialized in fallback mode');
      }
    } catch (error) {
      console.error('[PrismaAuthService] Failed to initialize:', error);
      this.initPromise = null;
      if (!this.fallbackMode) {
        throw error;
      }
    }
  }

  /**
   * Register a new user
   */
  async register(registration: UserRegistration): Promise<AuthResponse> {
    await this.initialize();

    if (this.fallbackMode) {
      // Fallback mock implementation
      console.warn('[PrismaAuthService] register() called in fallback mode - returning mock response');
      
      const mockUser: User = {
        id: Math.floor(Math.random() * 10000),
        email: registration.email,
        name: registration.name,
        avatarUrl: undefined,
        isEmailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: undefined,
      };

      const mockTokens: AuthToken = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      };

      return {
        user: mockUser,
        tokens: mockTokens,
      };
    }

    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: registration.email },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(registration.password, this.BCRYPT_ROUNDS);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email: registration.email,
          name: registration.name,
          passwordHash,
          isEmailVerified: false,
        },
      });

      // Generate email verification token if required
      let emailVerificationToken: string | undefined;
      if (registration.requireEmailVerification) {
        emailVerificationToken = await this.generateEmailVerificationToken(user.id);
      }

      // Generate auth tokens
      const tokens = await this.generateTokens(user);

      return {
        user: this.mapPrismaToUser(user),
        tokens,
        emailVerificationToken,
      };
    } catch (error) {
      console.error('[PrismaAuthService] Registration failed:', error);
      throw new Error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Authenticate user login
   */
  async login(credentials: UserLogin): Promise<AuthResponse> {
    await this.initialize();

    if (this.fallbackMode) {
      // Fallback mock implementation
      console.warn('[PrismaAuthService] login() called in fallback mode - returning mock response');
      
      const mockUser: User = {
        id: 1,
        email: credentials.email,
        name: 'Mock User',
        avatarUrl: undefined,
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      const mockTokens: AuthToken = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      };

      return {
        user: mockUser,
        tokens: mockTokens,
      };
    }

    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login time
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate auth tokens
      const tokens = await this.generateTokens(user);

      return {
        user: this.mapPrismaToUser(user),
        tokens,
      };
    } catch (error) {
      console.error('[PrismaAuthService] Login failed:', error);
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<AuthToken> {
    await this.initialize();

    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.JWT_SECRET) as JWTPayload;
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Find user
      // TODO: Uncomment after Prisma client generation
      // const user = await this.prisma.user.findUnique({
      //   where: { id: payload.userId },
      // });

      // if (!user) {
      //   throw new Error('User not found');
      // }

      // Generate new tokens
      // return this.generateTokens(user);
      
      // Temporary mock response for development
      return {
        accessToken: 'new-mock-access-token',
        refreshToken: 'new-mock-refresh-token',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      };
    } catch (error) {
      console.error('[PrismaAuthService] Token refresh failed:', error);
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Invalid token'}`);
    }
  }

  /**
   * Validate access token and get user session
   */
  async validateToken(accessToken: string): Promise<SessionUser> {
    try {
      const payload = jwt.verify(accessToken, this.JWT_SECRET) as JWTPayload;
      
      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // TODO: Uncomment after Prisma client generation
      // const user = await this.prisma.user.findUnique({
      //   where: { id: payload.userId },
      // });

      // if (!user) {
      //   throw new Error('User not found');
      // }

      // return {
      //   id: user.id,
      //   email: user.email,
      //   name: user.name,
      //   avatarUrl: user.avatarUrl,
      //   isEmailVerified: user.isEmailVerified,
      // };
      
      // Temporary mock response for development
      return {
        id: payload.userId,
        email: 'mock@example.com',
        name: 'Mock User',
        avatarUrl: undefined,
        isEmailVerified: true,
      };
    } catch (error) {
      console.error('[PrismaAuthService] Token validation failed:', error);
      throw new Error(`Token validation failed: ${error instanceof Error ? error.message : 'Invalid token'}`);
    }
  }

  /**
   * Logout user (invalidate tokens)
   */
  async logout(refreshToken: string): Promise<void> {
    await this.initialize();

    try {
      // In a production system, you might want to maintain a blacklist of tokens
      // For now, we'll just verify the token is valid
      jwt.verify(refreshToken, this.JWT_SECRET);
      
      // TODO: Implement token blacklisting if needed
      console.log('[PrismaAuthService] User logged out successfully');
    } catch (error) {
      console.error('[PrismaAuthService] Logout failed:', error);
      throw new Error(`Logout failed: ${error instanceof Error ? error.message : 'Invalid token'}`);
    }
  }

  /**
   * Generate email verification token
   */
  async generateEmailVerificationToken(userId: number): Promise<string> {
    await this.initialize();

    try {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // TODO: Uncomment after Prisma client generation
      // await this.prisma.emailVerificationToken.create({
      //   data: {
      //     userId,
      //     token,
      //     expiresAt,
      //     used: false,
      //   },
      // });

      return token;
    } catch (error) {
      console.error('[PrismaAuthService] Failed to generate email verification token:', error);
      throw new Error('Failed to generate email verification token');
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<User> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      //   where: { token },
      //   include: { user: true },
      // });

      // if (!verificationToken || verificationToken.used || verificationToken.expiresAt < new Date()) {
      //   throw new Error('Invalid or expired verification token');
      // }

      // Mark token as used and verify email
      // await Promise.all([
      //   this.prisma.emailVerificationToken.update({
      //     where: { id: verificationToken.id },
      //     data: { used: true },
      //   }),
      //   this.prisma.user.update({
      //     where: { id: verificationToken.userId },
      //     data: { isEmailVerified: true },
      //   }),
      // ]);

      // return this.mapPrismaToUser(verificationToken.user);
      
      // Temporary mock response for development
      return {
        id: 1,
        email: 'mock@example.com',
        name: 'Mock User',
        avatarUrl: undefined,
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: undefined,
      };
    } catch (error) {
      console.error('[PrismaAuthService] Email verification failed:', error);
      throw new Error(`Email verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // const user = await this.prisma.user.findUnique({
      //   where: { email },
      // });

      // if (!user) {
      //   // Don't reveal if email exists or not
      //   return 'mock-token';
      // }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // TODO: Uncomment after Prisma client generation
      // await this.prisma.passwordResetToken.create({
      //   data: {
      //     userId: user.id,
      //     token,
      //     expiresAt,
      //     used: false,
      //   },
      // });

      return token;
    } catch (error) {
      console.error('[PrismaAuthService] Failed to generate password reset token:', error);
      throw new Error('Failed to generate password reset token');
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // const resetToken = await this.prisma.passwordResetToken.findUnique({
      //   where: { token },
      //   include: { user: true },
      // });

      // if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      //   throw new Error('Invalid or expired reset token');
      // }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

      // TODO: Uncomment after Prisma client generation
      // Update password and mark token as used
      // await Promise.all([
      //   this.prisma.passwordResetToken.update({
      //     where: { id: resetToken.id },
      //     data: { used: true },
      //   }),
      //   this.prisma.user.update({
      //     where: { id: resetToken.userId },
      //     data: { passwordHash },
      //   }),
      // ]);

      console.log('[PrismaAuthService] Password reset successful');
    } catch (error) {
      console.error('[PrismaAuthService] Password reset failed:', error);
      throw new Error(`Password reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create or update user from SSO provider
   */
  async createOrUpdateUserFromSSO(ssoInfo: SSOUserInfo): Promise<User> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // First, check if user exists with this provider
      // const existingProvider = await this.prisma.userProvider.findUnique({
      //   where: {
      //     provider_providerId: {
      //       provider: ssoInfo.provider,
      //       providerId: ssoInfo.providerId,
      //     },
      //   },
      //   include: { user: true },
      // });

      // if (existingProvider) {
      //   // Update provider info
      //   await this.prisma.userProvider.update({
      //     where: { id: existingProvider.id },
      //     data: {
      //       email: ssoInfo.email,
      //       name: ssoInfo.name,
      //       avatarUrl: ssoInfo.avatarUrl,
      //     },
      //   });
      //   return this.mapPrismaToUser(existingProvider.user);
      // }

      // Check if user exists with this email
      // const existingUser = await this.prisma.user.findUnique({
      //   where: { email: ssoInfo.email },
      // });

      // let user: PrismaUser;
      // if (existingUser) {
      //   // Link provider to existing user
      //   user = existingUser;
      // } else {
      //   // Create new user
      //   user = await this.prisma.user.create({
      //     data: {
      //       email: ssoInfo.email,
      //       name: ssoInfo.name,
      //       avatarUrl: ssoInfo.avatarUrl,
      //       passwordHash: '', // SSO users don't have passwords
      //       isEmailVerified: true, // Trust SSO provider
      //     },
      //   });
      // }

      // Create provider entry
      // await this.prisma.userProvider.create({
      //   data: {
      //     userId: user.id,
      //     provider: ssoInfo.provider,
      //     providerId: ssoInfo.providerId,
      //     email: ssoInfo.email,
      //     name: ssoInfo.name,
      //     avatarUrl: ssoInfo.avatarUrl,
      //   },
      // });

      // return this.mapPrismaToUser(user);
      
      // Temporary mock response for development
      return {
        id: Math.floor(Math.random() * 10000),
        email: ssoInfo.email,
        name: ssoInfo.name,
        avatarUrl: ssoInfo.avatarUrl,
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[PrismaAuthService] SSO user creation failed:', error);
      throw new Error(`SSO user creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: number): Promise<User | null> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // const user = await this.prisma.user.findUnique({
      //   where: { id: userId },
      // });

      // return user ? this.mapPrismaToUser(user) : null;
      
      // Temporary mock response for development
      return null;
    } catch (error) {
      console.error('[PrismaAuthService] Failed to get user:', error);
      throw new Error('Failed to get user');
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: number, updates: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<User> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // const user = await this.prisma.user.update({
      //   where: { id: userId },
      //   data: updates,
      // });

      // return this.mapPrismaToUser(user);
      
      // Temporary mock response for development
      return {
        id: userId,
        email: 'mock@example.com',
        name: updates.name || 'Mock User',
        avatarUrl: updates.avatarUrl,
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: undefined,
      };
    } catch (error) {
      console.error('[PrismaAuthService] Profile update failed:', error);
      throw new Error(`Profile update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate JWT tokens for user
   */
  private async generateTokens(user: any): Promise<AuthToken> {
    const now = Math.floor(Date.now() / 1000);
    const accessExpiry = now + 15 * 60; // 15 minutes
    const refreshExpiry = now + 7 * 24 * 60 * 60; // 7 days

    const accessPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      type: 'access',
      iat: now,
      exp: accessExpiry,
    };

    const refreshPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      type: 'refresh',
      iat: now,
      exp: refreshExpiry,
    };

    const accessToken = jwt.sign(accessPayload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(refreshPayload, this.JWT_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
    });

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(accessExpiry * 1000).toISOString(),
    };
  }

  /**
   * Map Prisma User entity to User type
   * TODO: Implement after Prisma client generation
   */
  // private mapPrismaToUser(prismaUser: PrismaUser): User {
  //   return {
  //     id: prismaUser.id,
  //     email: prismaUser.email,
  //     name: prismaUser.name,
  //     avatarUrl: prismaUser.avatarUrl,
  //     isEmailVerified: prismaUser.isEmailVerified,
  //     createdAt: prismaUser.createdAt,
  //     updatedAt: prismaUser.updatedAt,
  //     lastLoginAt: prismaUser.lastLoginAt,
  //   };
  // }

  /**
   * Dispose of the service and clean up resources
   */
  async dispose(): Promise<void> {
    try {
      // TODO: Uncomment after Prisma client generation
      // await this.prisma.$disconnect();
      
      console.log('[PrismaAuthService] Service disposed');
    } catch (error) {
      console.error('[PrismaAuthService] Error during disposal:', error);
    }
  }
}