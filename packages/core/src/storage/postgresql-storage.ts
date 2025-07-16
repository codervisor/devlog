/**
 * PostgreSQL storage provider for production-grade devlog storage
 */

import { DevlogEntry, DevlogFilter, DevlogId, DevlogStats, DevlogStatus, DevlogType, DevlogPriority, ChatSession, ChatMessage, ChatFilter, ChatStats, ChatSessionId, ChatMessageId, ChatSearchResult, ChatDevlogLink, ChatWorkspace } from '../types/index.js';
import { StorageProvider } from '../types/index.js';
import { calculateDevlogStats } from '../utils/storage.js';

export class PostgreSQLStorageProvider implements StorageProvider {
  private connectionString: string;
  private options: Record<string, any>;
  private client: any = null;

  constructor(connectionString: string, options: Record<string, any> = {}) {
    this.connectionString = connectionString;
    this.options = options;
  }

  async initialize(): Promise<void> {
    // Dynamic import to make pg optional
    try {
      const pgModule = await import('pg' as any);
      const { Client } = pgModule;

      this.client = new Client({
        connectionString: this.connectionString,
        ...this.options,
      });

      await this.client.connect();
    } catch (error) {
      throw new Error(
        'pg is required for PostgreSQL storage. Install it with: npm install pg @types/pg',
      );
    }

    // Create tables and indexes
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS devlog_entries (
        id SERIAL PRIMARY KEY,
        key_field TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        priority TEXT NOT NULL DEFAULT 'medium',
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        assignee TEXT,
        files JSONB,
        related_devlogs JSONB,
        context JSONB,
        ai_context JSONB,
        external_references JSONB,
        notes JSONB
      );

      CREATE INDEX IF NOT EXISTS idx_devlog_key ON devlog_entries(key_field);
      CREATE INDEX IF NOT EXISTS idx_devlog_status ON devlog_entries(status);
      CREATE INDEX IF NOT EXISTS idx_devlog_type ON devlog_entries(type);
      CREATE INDEX IF NOT EXISTS idx_devlog_priority ON devlog_entries(priority);
      CREATE INDEX IF NOT EXISTS idx_devlog_assignee ON devlog_entries(assignee);
      CREATE INDEX IF NOT EXISTS idx_devlog_created_at ON devlog_entries(created_at);
      CREATE INDEX IF NOT EXISTS idx_devlog_updated_at ON devlog_entries(updated_at);
      CREATE INDEX IF NOT EXISTS idx_devlog_full_text ON devlog_entries USING GIN(to_tsvector('english', title || ' ' || description));
    `);
  }

  async exists(id: DevlogId): Promise<boolean> {
    const result = await this.client.query('SELECT 1 FROM devlog_entries WHERE id = $1', [id]);
    return result.rows.length > 0;
  }

  async get(id: DevlogId): Promise<DevlogEntry | null> {
    const result = await this.client.query('SELECT * FROM devlog_entries WHERE id = $1', [id]);

    if (result.rows.length === 0) return null;

    return this.rowToDevlogEntry(result.rows[0]);
  }

  async save(entry: DevlogEntry): Promise<void> {
    await this.client.query(
      `
      INSERT INTO devlog_entries (
        id, key_field, title, type, description, status, priority, created_at, updated_at,
        assignee, files, related_devlogs,
        context, ai_context, external_references, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (id) DO UPDATE SET
        key_field = EXCLUDED.key_field,
        title = EXCLUDED.title,
        type = EXCLUDED.type,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        updated_at = EXCLUDED.updated_at,
        assignee = EXCLUDED.assignee,
        files = EXCLUDED.files,
        related_devlogs = EXCLUDED.related_devlogs,
        context = EXCLUDED.context,
        ai_context = EXCLUDED.ai_context,
        external_references = EXCLUDED.external_references,
        notes = EXCLUDED.notes
    `,
      [
        entry.id,
        entry.key,
        entry.title,
        entry.type,
        entry.description,
        entry.status,
        entry.priority,
        entry.createdAt,
        entry.updatedAt,
        entry.assignee,
        JSON.stringify(entry.files),
        JSON.stringify(entry.relatedDevlogs),
        JSON.stringify(entry.context),
        JSON.stringify(entry.aiContext),
        JSON.stringify(entry.externalReferences || []),
        JSON.stringify(entry.notes),
      ],
    );
  }

  async delete(id: DevlogId): Promise<void> {
    await this.client.query('DELETE FROM devlog_entries WHERE id = $1', [id]);
  }

  async list(filter?: DevlogFilter): Promise<DevlogEntry[]> {
    let query = 'SELECT * FROM devlog_entries';
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (filter) {
      if (filter.status && filter.status.length > 0) {
        paramCount++;
        conditions.push(`status = ANY($${paramCount})`);
        params.push(filter.status);
      }

      if (filter.type && filter.type.length > 0) {
        paramCount++;
        conditions.push(`type = ANY($${paramCount})`);
        params.push(filter.type);
      }

      if (filter.priority && filter.priority.length > 0) {
        paramCount++;
        conditions.push(`priority = ANY($${paramCount})`);
        params.push(filter.priority);
      }

      if (filter.assignee) {
        paramCount++;
        conditions.push(`assignee = $${paramCount}`);
        params.push(filter.assignee);
      }

      if (filter.fromDate) {
        paramCount++;
        conditions.push(`created_at >= $${paramCount}`);
        params.push(filter.fromDate);
      }

      if (filter.toDate) {
        paramCount++;
        conditions.push(`created_at <= $${paramCount}`);
        params.push(filter.toDate);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY updated_at DESC';

    const result = await this.client.query(query, params);
    return result.rows.map((row: any) => this.rowToDevlogEntry(row));
  }

  async search(query: string): Promise<DevlogEntry[]> {
    const result = await this.client.query(
      `
      SELECT * FROM devlog_entries
      WHERE to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', $1)
      ORDER BY ts_rank(to_tsvector('english', title || ' ' || description), plainto_tsquery('english', $1)) DESC
    `,
      [query],
    );

    return result.rows.map((row: any) => this.rowToDevlogEntry(row));
  }

  async getStats(filter?: DevlogFilter): Promise<DevlogStats> {
    // Get filtered entries and calculate stats from them
    const entries = await this.list(filter);
    return calculateDevlogStats(entries);
  }

  async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  async getNextId(): Promise<DevlogId> {
    const result = await this.client.query(
      'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM devlog_entries',
    );
    return result.rows[0].next_id;
  }

  isRemoteStorage(): boolean {
    return false;
  }

  isGitBased(): boolean {
    return false;
  }

  private rowToDevlogEntry(row: any): DevlogEntry {
    return {
      id: row.id,
      key: row.key_field,
      title: row.title,
      type: row.type,
      description: row.description,
      status: row.status,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      assignee: row.assignee,
      files: row.files || [],
      relatedDevlogs: row.related_devlogs || [],
      context: row.context || {},
      aiContext: row.ai_context || {},
      notes: row.notes || [],
      externalReferences: row.external_references || [],
    };
  }

  // ===== Chat Storage Operations (TODO: Implement with proper PostgreSQL schema) =====

  async saveChatSession(): Promise<void> {
    throw new Error('Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.');
  }

  async getChatSession(): Promise<null> {
    throw new Error('Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.');
  }

  async listChatSessions(): Promise<[]> {
    throw new Error('Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.');
  }

  async deleteChatSession(): Promise<void> {
    throw new Error('Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.');
  }

  async saveChatMessages(): Promise<void> {
    throw new Error('Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.');
  }

  async getChatMessages(): Promise<[]> {
    throw new Error('Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.');
  }

  async searchChatContent(): Promise<[]> {
    throw new Error('Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.');
  }

  async getChatStats(): Promise<any> {
    throw new Error('Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.');
  }

  async saveChatDevlogLink(): Promise<void> {
    throw new Error('Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.');
  }

  async getChatDevlogLinks(): Promise<[]> {
    throw new Error('Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.');
  }

  async removeChatDevlogLink(): Promise<void> {
    throw new Error('Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.');
  }

  async getChatWorkspaces(): Promise<[]> {
    throw new Error('Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.');
  }

  async saveChatWorkspace(): Promise<void> {
    throw new Error('Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.');
  }
}
