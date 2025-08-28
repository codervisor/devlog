/**
 * Prisma-based Chat Service
 *
 * Migrated from TypeORM to Prisma for better Next.js integration
 * Manages chat sessions, messages, and devlog linking using Prisma Client
 * 
 * Features:
 * - Chat session management
 * - Message storage and retrieval
 * - Chat-devlog linking
 * - Search and filtering
 * 
 * NOTE: This service requires Prisma Client to be generated first:
 * Run `npx prisma generate` after setting up the database connection
 */

// TODO: Uncomment after Prisma client generation
// import type { PrismaClient, ChatSession as PrismaChatSession, ChatMessage as PrismaChatMessage } from '@prisma/client';
// import { getPrismaClient } from '../utils/prisma-config.js';

import type {
  ChatSession,
  ChatMessage,
  ChatSessionId,
  ChatMessageId,
  DevlogId,
  ChatStatus,
  AgentType,
} from '../types/index.js';

interface ChatServiceInstance {
  service: PrismaChatService;
  createdAt: number;
}

export class PrismaChatService {
  private static instances: Map<string, ChatServiceInstance> = new Map();
  private static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
  
  // TODO: Uncomment after Prisma client generation
  // private prisma: PrismaClient;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    // TODO: Uncomment after Prisma client generation
    // this.prisma = getPrismaClient();
  }

  /**
   * Get or create a ChatService instance
   * Implements singleton pattern with TTL-based cleanup
   */
  static getInstance(): PrismaChatService {
    const key = 'default';
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
        service: new PrismaChatService(),
        createdAt: now,
      };
      this.instances.set(key, instance);
    }

    return instance.service;
  }

  /**
   * Initialize the chat service
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
    try {
      // TODO: Uncomment after Prisma client generation
      // await this.prisma.$connect();
      
      console.log('[PrismaChatService] Chat service initialized');
    } catch (error) {
      console.error('[PrismaChatService] Failed to initialize:', error);
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Create a new chat session
   */
  async createSession(session: Omit<ChatSession, 'id'> & { id?: string }): Promise<ChatSession> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // const created = await this.prisma.chatSession.create({
      //   data: {
      //     id: session.id || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      //     agent: session.agent,
      //     timestamp: session.timestamp,
      //     workspace: session.workspace,
      //     workspacePath: session.workspacePath,
      //     title: session.title,
      //     status: session.status,
      //     messageCount: session.messageCount,
      //     duration: session.duration,
      //     metadata: session.metadata ? JSON.stringify(session.metadata) : '{}',
      //     updatedAt: session.updatedAt,
      //     archived: session.archived,
      //   },
      // });

      // return this.mapPrismaToSession(created);
      
      // Temporary mock return for development
      return {
        ...session,
        id: session.id || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error) {
      console.error('[PrismaChatService] Failed to create session:', error);
      throw new Error(`Failed to create chat session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a chat session by ID
   */
  async getSession(sessionId: ChatSessionId): Promise<ChatSession | null> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // const session = await this.prisma.chatSession.findUnique({
      //   where: { id: sessionId },
      //   include: {
      //     messages: {
      //       orderBy: { sequence: 'asc' },
      //     },
      //     devlogLinks: {
      //       include: {
      //         devlogEntry: true,
      //       },
      //     },
      //   },
      // });

      // return session ? this.mapPrismaToSession(session) : null;
      
      // Temporary mock return for development
      return null;
    } catch (error) {
      console.error('[PrismaChatService] Failed to get session:', error);
      throw new Error(`Failed to get chat session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List chat sessions with filtering and pagination
   */
  async listSessions(options?: {
    agent?: AgentType;
    status?: ChatStatus;
    workspace?: string;
    archived?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ sessions: ChatSession[]; total: number }> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // const where: any = {};
      
      // if (options?.agent) where.agent = options.agent;
      // if (options?.status) where.status = options.status;
      // if (options?.workspace) where.workspace = { contains: options.workspace };
      // if (options?.archived !== undefined) where.archived = options.archived;

      // const [sessions, total] = await Promise.all([
      //   this.prisma.chatSession.findMany({
      //     where,
      //     orderBy: { timestamp: 'desc' },
      //     take: options?.limit || 20,
      //     skip: options?.offset || 0,
      //     include: {
      //       messages: {
      //         orderBy: { sequence: 'asc' },
      //         take: 5, // Include first few messages for preview
      //       },
      //     },
      //   }),
      //   this.prisma.chatSession.count({ where }),
      // ]);

      // return {
      //   sessions: sessions.map(session => this.mapPrismaToSession(session)),
      //   total,
      // };
      
      // Temporary mock return for development
      return {
        sessions: [],
        total: 0,
      };
    } catch (error) {
      console.error('[PrismaChatService] Failed to list sessions:', error);
      throw new Error(`Failed to list chat sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a chat session
   */
  async updateSession(sessionId: ChatSessionId, updates: Partial<ChatSession>): Promise<ChatSession> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // const updateData: any = {};
      
      // if (updates.title !== undefined) updateData.title = updates.title;
      // if (updates.status !== undefined) updateData.status = updates.status;
      // if (updates.messageCount !== undefined) updateData.messageCount = updates.messageCount;
      // if (updates.duration !== undefined) updateData.duration = updates.duration;
      // if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata);
      // if (updates.updatedAt !== undefined) updateData.updatedAt = updates.updatedAt;
      // if (updates.archived !== undefined) updateData.archived = updates.archived;

      // const updated = await this.prisma.chatSession.update({
      //   where: { id: sessionId },
      //   data: updateData,
      //   include: {
      //     messages: {
      //       orderBy: { sequence: 'asc' },
      //     },
      //   },
      // });

      // return this.mapPrismaToSession(updated);
      
      // Temporary mock return for development
      const existing = await this.getSession(sessionId);
      if (!existing) {
        throw new Error('Chat session not found');
      }
      
      return {
        ...existing,
        ...updates,
      };
    } catch (error) {
      console.error('[PrismaChatService] Failed to update session:', error);
      throw new Error(`Failed to update chat session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: ChatSessionId): Promise<void> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // await this.prisma.chatSession.delete({
      //   where: { id: sessionId },
      // });
      
      // Temporary mock for development
      console.log('[PrismaChatService] Mock delete session:', sessionId);
    } catch (error) {
      console.error('[PrismaChatService] Failed to delete session:', error);
      throw new Error(`Failed to delete chat session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a message to a chat session
   */
  async addMessage(sessionId: ChatSessionId, message: Omit<ChatMessage, 'id' | 'sessionId'>): Promise<ChatMessage> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // const created = await this.prisma.chatMessage.create({
      //   data: {
      //     id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      //     sessionId,
      //     role: message.role,
      //     content: message.content,
      //     timestamp: message.timestamp,
      //     sequence: message.sequence,
      //     metadata: message.metadata ? JSON.stringify(message.metadata) : '{}',
      //     searchContent: message.searchContent,
      //   },
      // });

      // Update session message count
      // await this.prisma.chatSession.update({
      //   where: { id: sessionId },
      //   data: {
      //     messageCount: { increment: 1 },
      //     updatedAt: new Date().toISOString(),
      //   },
      // });

      // return this.mapPrismaToMessage(created);
      
      // Temporary mock return for development
      return {
        ...message,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
      };
    } catch (error) {
      console.error('[PrismaChatService] Failed to add message:', error);
      throw new Error(`Failed to add chat message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get messages for a chat session
   */
  async getMessages(sessionId: ChatSessionId, options?: {
    limit?: number;
    offset?: number;
  }): Promise<ChatMessage[]> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // const messages = await this.prisma.chatMessage.findMany({
      //   where: { sessionId },
      //   orderBy: { sequence: 'asc' },
      //   take: options?.limit,
      //   skip: options?.offset,
      // });

      // return messages.map(message => this.mapPrismaToMessage(message));
      
      // Temporary mock return for development
      return [];
    } catch (error) {
      console.error('[PrismaChatService] Failed to get messages:', error);
      throw new Error(`Failed to get chat messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search chat sessions and messages
   */
  async search(query: string, options?: {
    agent?: AgentType;
    workspace?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ sessions: ChatSession[]; total: number }> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // const where: any = {
      //   OR: [
      //     { title: { contains: query, mode: 'insensitive' } },
      //     { workspace: { contains: query, mode: 'insensitive' } },
      //     { 
      //       messages: {
      //         some: {
      //           OR: [
      //             { content: { contains: query, mode: 'insensitive' } },
      //             { searchContent: { contains: query, mode: 'insensitive' } },
      //           ],
      //         },
      //       },
      //     },
      //   ],
      // };

      // if (options?.agent) where.agent = options.agent;
      // if (options?.workspace) {
      //   where.AND = [
      //     ...(where.AND || []),
      //     { workspace: { contains: options.workspace } },
      //   ];
      // }

      // const [sessions, total] = await Promise.all([
      //   this.prisma.chatSession.findMany({
      //     where,
      //     orderBy: { timestamp: 'desc' },
      //     take: options?.limit || 20,
      //     skip: options?.offset || 0,
      //     include: {
      //       messages: {
      //         orderBy: { sequence: 'asc' },
      //         take: 3, // Include first few messages for context
      //       },
      //     },
      //   }),
      //   this.prisma.chatSession.count({ where }),
      // ]);

      // return {
      //   sessions: sessions.map(session => this.mapPrismaToSession(session)),
      //   total,
      // };
      
      // Temporary mock return for development
      return {
        sessions: [],
        total: 0,
      };
    } catch (error) {
      console.error('[PrismaChatService] Failed to search:', error);
      throw new Error(`Failed to search chat sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Link a chat session to a devlog entry
   */
  async linkToDevlog(sessionId: ChatSessionId, devlogId: DevlogId, linkReason?: string): Promise<void> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // await this.prisma.chatDevlogLink.create({
      //   data: {
      //     id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      //     sessionId,
      //     devlogId: Number(devlogId),
      //     timestamp: new Date(),
      //     linkReason: linkReason || 'Manual link',
      //   },
      // });

      // Update session status
      // await this.prisma.chatSession.update({
      //   where: { id: sessionId },
      //   data: { status: 'linked' },
      // });
      
      // Temporary mock for development
      console.log('[PrismaChatService] Mock link session to devlog:', sessionId, devlogId, linkReason);
    } catch (error) {
      console.error('[PrismaChatService] Failed to link to devlog:', error);
      throw new Error(`Failed to link chat to devlog: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get devlog entries linked to a chat session
   */
  async getLinkedDevlogs(sessionId: ChatSessionId): Promise<Array<{ devlogId: DevlogId; linkReason: string; timestamp: Date }>> {
    await this.initialize();

    try {
      // TODO: Uncomment after Prisma client generation
      // const links = await this.prisma.chatDevlogLink.findMany({
      //   where: { sessionId },
      //   include: { devlogEntry: true },
      //   orderBy: { timestamp: 'desc' },
      // });

      // return links.map(link => ({
      //   devlogId: link.devlogId,
      //   linkReason: link.linkReason,
      //   timestamp: link.timestamp,
      // }));
      
      // Temporary mock return for development
      return [];
    } catch (error) {
      console.error('[PrismaChatService] Failed to get linked devlogs:', error);
      throw new Error(`Failed to get linked devlogs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import chat sessions from external sources
   */
  async importSessions(sessions: Array<Omit<ChatSession, 'id'> & { id?: string }>): Promise<ChatSession[]> {
    await this.initialize();

    try {
      const imported: ChatSession[] = [];
      
      for (const session of sessions) {
        const created = await this.createSession(session);
        imported.push(created);
      }
      
      return imported;
    } catch (error) {
      console.error('[PrismaChatService] Failed to import sessions:', error);
      throw new Error(`Failed to import chat sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map Prisma entities to domain types
   * TODO: Implement after Prisma client generation
   */
  // private mapPrismaToSession(prismaSession: any): ChatSession {
  //   return {
  //     id: prismaSession.id,
  //     agent: prismaSession.agent,
  //     timestamp: prismaSession.timestamp,
  //     workspace: prismaSession.workspace,
  //     workspacePath: prismaSession.workspacePath,
  //     title: prismaSession.title,
  //     status: prismaSession.status,
  //     messageCount: prismaSession.messageCount,
  //     duration: prismaSession.duration,
  //     metadata: prismaSession.metadata ? JSON.parse(prismaSession.metadata) : {},
  //     updatedAt: prismaSession.updatedAt,
  //     archived: prismaSession.archived,
  //     messages: prismaSession.messages?.map((msg: any) => this.mapPrismaToMessage(msg)) || [],
  //   };
  // }

  // private mapPrismaToMessage(prismaMessage: any): ChatMessage {
  //   return {
  //     id: prismaMessage.id,
  //     sessionId: prismaMessage.sessionId,
  //     role: prismaMessage.role,
  //     content: prismaMessage.content,
  //     timestamp: prismaMessage.timestamp,
  //     sequence: prismaMessage.sequence,
  //     metadata: prismaMessage.metadata ? JSON.parse(prismaMessage.metadata) : {},
  //     searchContent: prismaMessage.searchContent,
  //   };
  // }

  /**
   * Dispose of the service and clean up resources
   */
  async dispose(): Promise<void> {
    try {
      // TODO: Uncomment after Prisma client generation
      // await this.prisma.$disconnect();
      
      console.log('[PrismaChatService] Service disposed');
    } catch (error) {
      console.error('[PrismaChatService] Error during disposal:', error);
    }
  }
}