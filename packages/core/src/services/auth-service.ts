/**
 * Authentication Service
 * Manages user authentication, registration, and session handling
 */

import 'reflect-metadata';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import {
  UserEntity,
  UserProviderEntity,
  EmailVerificationTokenEntity,
  PasswordResetTokenEntity,
} from '../entities/user.entity.js';
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
import { createDataSource } from '../utils/typeorm-config.js';

interface AuthServiceInstance {
  service: AuthService;
  createdAt: number;
}

export class AuthService {
  private static instances: Map<string, AuthServiceInstance> = new Map();
  private static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
  private database: DataSource;
  private userRepository: Repository<UserEntity>;
  private providerRepository: Repository<UserProviderEntity>;
  private emailTokenRepository: Repository<EmailVerificationTokenEntity>;
  private passwordResetRepository: Repository<PasswordResetTokenEntity>;
  private initPromise: Promise<void> | null = null;

  // Configuration
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRES_IN = '15m'; // Access token expiry
  private readonly JWT_REFRESH_EXPIRES_IN = '7d'; // Refresh token expiry
  private readonly BCRYPT_ROUNDS = 12;
  private readonly EMAIL_TOKEN_EXPIRES_HOURS = 24;
  private readonly PASSWORD_RESET_EXPIRES_HOURS = 1;

  private constructor() {
    this.database = createDataSource({
      entities: [
        UserEntity,
        UserProviderEntity,
        EmailVerificationTokenEntity,
        PasswordResetTokenEntity,
      ],
    });
    this.userRepository = this.database.getRepository(UserEntity);
    this.providerRepository = this.database.getRepository(UserProviderEntity);
    this.emailTokenRepository = this.database.getRepository(EmailVerificationTokenEntity);
    this.passwordResetRepository = this.database.getRepository(PasswordResetTokenEntity);

    // Get JWT secret from environment
    this.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
    if (this.JWT_SECRET === 'dev-secret-key' && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
  }

  /**
   * Get singleton instance with TTL
   */
  static getInstance(): AuthService {
    const instanceKey = 'default';
    const now = Date.now();
    const existingInstance = AuthService.instances.get(instanceKey);

    if (!existingInstance || now - existingInstance.createdAt > AuthService.TTL_MS) {
      const newService = new AuthService();
      AuthService.instances.set(instanceKey, {
        service: newService,
        createdAt: now,
      });
      return newService;
    }

    return existingInstance.service;
  }

  /**
   * Initialize the database connection if not already initialized
   */
  async ensureInitialized(): Promise<void> {
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
    if (!this.database.isInitialized) {
      await this.database.initialize();
    }
  }

  /**
   * Dispose of the service and close database connection
   */
  async dispose(): Promise<void> {
    if (this.database.isInitialized) {
      await this.database.destroy();
    }
    this.initPromise = null;
  }

  /**
   * Register a new user with email and password
   */
  async register(registration: UserRegistration): Promise<{ user: User; emailToken?: string }> {
    await this.ensureInitialized();

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registration.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registration.password, this.BCRYPT_ROUNDS);

    // Create user entity
    const userEntity = UserEntity.fromRegistration({
      email: registration.email,
      name: registration.name,
      passwordHash,
    });

    // Save user
    const savedUser = await this.userRepository.save(userEntity);

    // Generate email verification token
    const emailToken = await this.generateEmailVerificationToken(savedUser.id);

    return {
      user: savedUser.toUser(),
      emailToken: emailToken.token,
    };
  }

  /**
   * Login with email and password
   */
  async login(login: UserLogin): Promise<AuthResponse> {
    await this.ensureInitialized();

    // Find user by email
    const userEntity = await this.userRepository.findOne({
      where: { email: login.email },
    });

    if (!userEntity) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(login.password, userEntity.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    userEntity.updateLastLogin();
    await this.userRepository.save(userEntity);

    // Generate tokens
    const tokens = await this.generateTokens(userEntity);

    return {
      user: userEntity.toUser(),
      tokens,
    };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<User> {
    await this.ensureInitialized();

    const tokenEntity = await this.emailTokenRepository.findOne({
      where: { token },
    });

    if (!tokenEntity || tokenEntity.isExpired()) {
      throw new Error('Invalid or expired verification token');
    }

    // Find and update user
    const userEntity = await this.userRepository.findOne({
      where: { id: tokenEntity.userId },
    });

    if (!userEntity) {
      throw new Error('User not found');
    }

    userEntity.isEmailVerified = true;
    await this.userRepository.save(userEntity);

    // Delete used token
    await this.emailTokenRepository.remove(tokenEntity);

    return userEntity.toUser();
  }

  /**
   * Generate new access and refresh tokens
   */
  async generateTokens(user: UserEntity): Promise<AuthToken> {
    const now = Math.floor(Date.now() / 1000);
    
    // Access token payload
    const accessPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      type: 'access',
      iat: now,
      exp: now + 15 * 60, // 15 minutes
    };

    // Refresh token payload
    const refreshPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      type: 'refresh',
      iat: now,
      exp: now + 7 * 24 * 60 * 60, // 7 days
    };

    const accessToken = jwt.sign(accessPayload, this.JWT_SECRET);
    const refreshToken = jwt.sign(refreshPayload, this.JWT_SECRET);

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(accessPayload.exp * 1000).toISOString(),
    };
  }

  /**
   * Verify and decode JWT token
   */
  async verifyToken(token: string): Promise<SessionUser> {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      
      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // Get current user data
      const user = await this.getUserById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthToken> {
    try {
      const payload = jwt.verify(refreshToken, this.JWT_SECRET) as JWTPayload;
      
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Get user and generate new tokens
      const userEntity = await this.userRepository.findOne({
        where: { id: payload.userId },
      });

      if (!userEntity) {
        throw new Error('User not found');
      }

      return this.generateTokens(userEntity);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<User | null> {
    await this.ensureInitialized();

    const userEntity = await this.userRepository.findOne({
      where: { id },
    });

    return userEntity ? userEntity.toUser() : null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    await this.ensureInitialized();

    const userEntity = await this.userRepository.findOne({
      where: { email },
    });

    return userEntity ? userEntity.toUser() : null;
  }

  /**
   * Generate email verification token
   */
  async generateEmailVerificationToken(userId: number): Promise<EmailVerificationToken> {
    await this.ensureInitialized();

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.EMAIL_TOKEN_EXPIRES_HOURS);

    const tokenEntity = EmailVerificationTokenEntity.createToken(userId, token, expiresAt);
    const savedToken = await this.emailTokenRepository.save(tokenEntity);

    return savedToken.toEmailVerificationToken();
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<PasswordResetToken | null> {
    await this.ensureInitialized();

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists or not
      return null;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.PASSWORD_RESET_EXPIRES_HOURS);

    const tokenEntity = PasswordResetTokenEntity.createToken(user.id, token, expiresAt);
    const savedToken = await this.passwordResetRepository.save(tokenEntity);

    return savedToken.toPasswordResetToken();
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<User> {
    await this.ensureInitialized();

    const tokenEntity = await this.passwordResetRepository.findOne({
      where: { token },
    });

    if (!tokenEntity || !tokenEntity.isValid()) {
      throw new Error('Invalid or expired reset token');
    }

    // Find user and update password
    const userEntity = await this.userRepository.findOne({
      where: { id: tokenEntity.userId },
    });

    if (!userEntity) {
      throw new Error('User not found');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);
    userEntity.passwordHash = passwordHash;
    await this.userRepository.save(userEntity);

    // Mark token as used
    tokenEntity.markAsUsed();
    await this.passwordResetRepository.save(tokenEntity);

    return userEntity.toUser();
  }

  /**
   * Handle SSO login/registration
   */
  async handleSSOLogin(ssoInfo: SSOUserInfo): Promise<AuthResponse> {
    await this.ensureInitialized();

    // Check if user already exists with this provider
    let userEntity = await this.findUserByProvider(ssoInfo.provider, ssoInfo.providerId);

    if (!userEntity) {
      // Check if user exists with this email
      userEntity = await this.userRepository.findOne({
        where: { email: ssoInfo.email },
      });

      if (userEntity) {
        // Link SSO provider to existing user
        await this.linkSSOProvider(userEntity.id, ssoInfo);
      } else {
        // Create new user
        userEntity = await this.createUserFromSSO(ssoInfo);
      }
    }

    // Update last login
    userEntity.updateLastLogin();
    await this.userRepository.save(userEntity);

    // Generate tokens
    const tokens = await this.generateTokens(userEntity);

    return {
      user: userEntity.toUser(),
      tokens,
    };
  }

  /**
   * Find user by SSO provider
   */
  private async findUserByProvider(provider: string, providerId: string): Promise<UserEntity | null> {
    const providerEntity = await this.providerRepository.findOne({
      where: { provider, providerId },
      relations: ['user'],
    });

    return providerEntity?.user || null;
  }

  /**
   * Link SSO provider to existing user
   */
  private async linkSSOProvider(userId: number, ssoInfo: SSOUserInfo): Promise<void> {
    const providerEntity = UserProviderEntity.fromSSOInfo(userId, ssoInfo);
    await this.providerRepository.save(providerEntity);
  }

  /**
   * Create new user from SSO information
   */
  private async createUserFromSSO(ssoInfo: SSOUserInfo): Promise<UserEntity> {
    // Create user with random password (since they'll use SSO)
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, this.BCRYPT_ROUNDS);

    const userEntity = UserEntity.fromRegistration({
      email: ssoInfo.email,
      name: ssoInfo.name,
      passwordHash,
    });

    // SSO users are automatically email verified
    userEntity.isEmailVerified = true;
    userEntity.avatarUrl = ssoInfo.avatarUrl;

    const savedUser = await this.userRepository.save(userEntity);

    // Link SSO provider
    await this.linkSSOProvider(savedUser.id, ssoInfo);

    return savedUser;
  }

  /**
   * Update user profile
   */
  async updateUser(userId: number, updates: Partial<User>): Promise<User> {
    await this.ensureInitialized();

    const userEntity = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!userEntity) {
      throw new Error('User not found');
    }

    userEntity.updateFromUserData(updates);
    const savedUser = await this.userRepository.save(userEntity);

    return savedUser.toUser();
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    await this.ensureInitialized();

    const userEntity = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!userEntity) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userEntity.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash and save new password
    const passwordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);
    userEntity.passwordHash = passwordHash;
    await this.userRepository.save(userEntity);
  }
}