/**
 * User Entity for authentication and user management
 */

import 'reflect-metadata';
import { Column, CreateDateColumn, Entity, OneToMany, ManyToOne, JoinColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { User } from '../types/index.js';
import { getTimestampType, TimestampColumn } from './decorators.js';

@Entity('devlog_users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'boolean', default: false })
  isEmailVerified!: boolean;

  @CreateDateColumn({
    type: getTimestampType(),
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: getTimestampType(),
    name: 'updated_at',
  })
  updatedAt!: Date;

  @TimestampColumn({ name: 'last_login_at', nullable: true })
  lastLoginAt?: Date;

  @OneToMany(() => UserProviderEntity, provider => provider.user)
  providers?: UserProviderEntity[];

  /**
   * Convert entity to User type (without password hash)
   */
  toUser(): User {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      avatarUrl: this.avatarUrl,
      isEmailVerified: this.isEmailVerified,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      lastLoginAt: this.lastLoginAt?.toISOString(),
    };
  }

  /**
   * Create entity from user registration data
   */
  static fromRegistration(
    registration: { email: string; name?: string; passwordHash: string },
  ): UserEntity {
    const entity = new UserEntity();
    entity.email = registration.email;
    entity.name = registration.name;
    entity.passwordHash = registration.passwordHash;
    entity.isEmailVerified = false;
    return entity;
  }

  /**
   * Update entity with partial user data
   */
  updateFromUserData(updates: Partial<User>): void {
    if (updates.name !== undefined) this.name = updates.name;
    if (updates.avatarUrl !== undefined) this.avatarUrl = updates.avatarUrl;
    if (updates.isEmailVerified !== undefined) this.isEmailVerified = updates.isEmailVerified;
    this.updatedAt = new Date();
  }

  /**
   * Update last login timestamp
   */
  updateLastLogin(): void {
    this.lastLoginAt = new Date();
  }
}

@Entity('devlog_user_providers')
export class UserProviderEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  userId!: number;

  @Column({ type: 'varchar', length: 50 })
  provider!: string; // 'github' | 'google' | 'wechat'

  @Column({ type: 'varchar', length: 255 })
  providerId!: string;

  @CreateDateColumn({
    type: getTimestampType(),
    name: 'created_at',
  })
  createdAt!: Date;

  @ManyToOne(() => UserEntity, user => user.providers)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  /**
   * Convert entity to UserProvider type
   */
  toUserProvider(): import('../types/index.js').UserProvider {
    return {
      id: this.id,
      userId: this.userId,
      provider: this.provider as import('../types/index.js').SSOProvider,
      providerId: this.providerId,
      createdAt: this.createdAt.toISOString(),
    };
  }

  /**
   * Create entity from SSO user info
   */
  static fromSSOInfo(
    userId: number,
    ssoInfo: import('../types/index.js').SSOUserInfo,
  ): UserProviderEntity {
    const entity = new UserProviderEntity();
    entity.userId = userId;
    entity.provider = ssoInfo.provider;
    entity.providerId = ssoInfo.providerId;
    return entity;
  }
}

@Entity('devlog_email_verification_tokens')
export class EmailVerificationTokenEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  userId!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @TimestampColumn({ name: 'expires_at' })
  expiresAt!: Date;

  @CreateDateColumn({
    type: getTimestampType(),
    name: 'created_at',
  })
  createdAt!: Date;

  /**
   * Convert entity to EmailVerificationToken type
   */
  toEmailVerificationToken(): import('../types/index.js').EmailVerificationToken {
    return {
      id: this.id,
      userId: this.userId,
      token: this.token,
      expiresAt: this.expiresAt.toISOString(),
      createdAt: this.createdAt.toISOString(),
    };
  }

  /**
   * Create entity from token data
   */
  static createToken(userId: number, token: string, expiresAt: Date): EmailVerificationTokenEntity {
    const entity = new EmailVerificationTokenEntity();
    entity.userId = userId;
    entity.token = token;
    entity.expiresAt = expiresAt;
    return entity;
  }

  /**
   * Check if token is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}

@Entity('devlog_password_reset_tokens')
export class PasswordResetTokenEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  userId!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @TimestampColumn({ name: 'expires_at' })
  expiresAt!: Date;

  @CreateDateColumn({
    type: getTimestampType(),
    name: 'created_at',
  })
  createdAt!: Date;

  @Column({ type: 'boolean', default: false })
  used!: boolean;

  /**
   * Convert entity to PasswordResetToken type
   */
  toPasswordResetToken(): import('../types/index.js').PasswordResetToken {
    return {
      id: this.id,
      userId: this.userId,
      token: this.token,
      expiresAt: this.expiresAt.toISOString(),
      createdAt: this.createdAt.toISOString(),
      used: this.used,
    };
  }

  /**
   * Create entity from token data
   */
  static createToken(userId: number, token: string, expiresAt: Date): PasswordResetTokenEntity {
    const entity = new PasswordResetTokenEntity();
    entity.userId = userId;
    entity.token = token;
    entity.expiresAt = expiresAt;
    entity.used = false;
    return entity;
  }

  /**
   * Check if token is expired or used
   */
  isValid(): boolean {
    return !this.used && new Date() <= this.expiresAt;
  }

  /**
   * Mark token as used
   */
  markAsUsed(): void {
    this.used = true;
  }
}