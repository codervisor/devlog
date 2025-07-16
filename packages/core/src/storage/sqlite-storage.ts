/**
 * SQLite storage provider for local devlog storage
 */

import {
  DevlogEntry,
  DevlogFilter,
  DevlogId,
  DevlogPriority,
  DevlogStats,
  DevlogStatus,
  DevlogType,
  ChatSession,
  ChatMessage,
  ChatFilter,
  ChatStats,
  ChatSessionId,
  ChatMessageId,
  ChatSearchResult,
  ChatDevlogLink,
  ChatWorkspace,
} from '../types/index.js';
import { StorageProvider } from '../types/index.js';
import { initializeChatTables } from './chat-schema.js';

export class SQLiteStorageProvider implements StorageProvider {
  private db: any = null;
  private filePath: string;
  private options: Record<string, any>;

  constructor(filePath: string, options: Record<string, any> = {}) {
    console.log(`[SQLiteStorage] Creating SQLiteStorageProvider with path: ${filePath}`);
    console.log(`[SQLiteStorage] Constructor options:`, options);
    this.filePath = filePath;
    this.options = options;
  }

  async initialize(): Promise<void> {
    console.log(`[SQLiteStorage] Initializing SQLite storage at path: ${this.filePath}`);
    console.log(`[SQLiteStorage] Options:`, this.options);

    // Check if directory exists
    const path = await import('path');
    const fs = await import('fs');
    const dirname = path.dirname(this.filePath);

    console.log(`[SQLiteStorage] Database directory: ${dirname}`);

    try {
      await fs.promises.access(dirname);
      console.log(`[SQLiteStorage] Directory exists: ${dirname}`);
    } catch (error) {
      console.log(`[SQLiteStorage] Directory does not exist, creating: ${dirname}`);
      try {
        await fs.promises.mkdir(dirname, { recursive: true });
        console.log(`[SQLiteStorage] Successfully created directory: ${dirname}`);
      } catch (mkdirError: any) {
        console.error(`[SQLiteStorage] Failed to create directory: ${dirname}`, mkdirError);
        throw new Error(`Cannot create database directory: ${dirname} - ${mkdirError.message}`);
      }
    }

    // Dynamic import to make better-sqlite3 optional
    try {
      console.log(`[SQLiteStorage] Attempting to import better-sqlite3...`);

      // Try different import approaches for better compatibility
      let sqlite3Module;
      try {
        // Standard dynamic import
        sqlite3Module = await import('better-sqlite3');
        console.log(`[SQLiteStorage] Successfully imported better-sqlite3 via standard import`);
      } catch (importError) {
        console.log(`[SQLiteStorage] Standard import failed, trying eval approach...`);
        // Fallback to eval approach for environments that require it
        const dynamicImport = eval('(specifier) => import(specifier)');
        sqlite3Module = await dynamicImport('better-sqlite3');
        console.log(`[SQLiteStorage] Successfully imported better-sqlite3 via eval import`);
      }

      const Database = sqlite3Module.default;
      console.log(`[SQLiteStorage] Creating database instance...`);

      this.db = new Database(this.filePath, this.options);
      console.log(`[SQLiteStorage] Successfully created database instance`);
    } catch (error: any) {
      console.error(`[SQLiteStorage] Failed to initialize SQLite storage:`, error);
      console.error(`[SQLiteStorage] Error type:`, typeof error);
      console.error(`[SQLiteStorage] Error message:`, error.message);
      console.error(`[SQLiteStorage] Error stack:`, error.stack);
      throw new Error('Failed to initialize SQLite storage: ' + error.message);
    }

    // Create tables
    console.log(`[SQLiteStorage] Creating database tables...`);
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS devlog_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key_field TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          type TEXT NOT NULL,
          description TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'new',
          priority TEXT NOT NULL DEFAULT 'medium',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          assignee TEXT,
          files TEXT, -- JSON array
          related_devlogs TEXT, -- JSON array
          context TEXT, -- JSON object
          ai_context TEXT, -- JSON object
          external_references TEXT, -- JSON array
          notes TEXT -- JSON array
        );

        CREATE INDEX IF NOT EXISTS idx_devlog_key ON devlog_entries(key_field);
        CREATE INDEX IF NOT EXISTS idx_devlog_status ON devlog_entries(status);
        CREATE INDEX IF NOT EXISTS idx_devlog_type ON devlog_entries(type);
        CREATE INDEX IF NOT EXISTS idx_devlog_priority ON devlog_entries(priority);
        CREATE INDEX IF NOT EXISTS idx_devlog_assignee ON devlog_entries(assignee);
        CREATE INDEX IF NOT EXISTS idx_devlog_created_at ON devlog_entries(created_at);
        CREATE INDEX IF NOT EXISTS idx_devlog_updated_at ON devlog_entries(updated_at);

        -- Full-text search table
        CREATE VIRTUAL TABLE IF NOT EXISTS devlog_fts USING fts5(
          id,
          title,
          description,
          content=devlog_entries,
          content_rowid=rowid
        );

        -- Triggers to keep FTS table in sync
        CREATE TRIGGER IF NOT EXISTS devlog_fts_insert AFTER INSERT ON devlog_entries BEGIN
          INSERT INTO devlog_fts(rowid, id, title, description) VALUES (new.rowid, new.id, new.title, new.description);
        END;

        CREATE TRIGGER IF NOT EXISTS devlog_fts_delete AFTER DELETE ON devlog_entries BEGIN
          INSERT INTO devlog_fts(devlog_fts, rowid, id, title, description) VALUES ('delete', old.rowid, old.id, old.title, old.description);
        END;

        CREATE TRIGGER IF NOT EXISTS devlog_fts_update AFTER UPDATE ON devlog_entries BEGIN
          INSERT INTO devlog_fts(devlog_fts, rowid, id, title, description) VALUES ('delete', old.rowid, old.id, old.title, old.description);
          INSERT INTO devlog_fts(rowid, id, title, description) VALUES (new.rowid, new.id, new.title, new.description);
        END;
      `);
      console.log(`[SQLiteStorage] Successfully created database tables and indexes`);
    } catch (tableError: any) {
      console.error(`[SQLiteStorage] Failed to create database tables:`, tableError);
      throw new Error(`Failed to create database tables: ${tableError.message}`);
    }

    // Initialize chat tables
    try {
      initializeChatTables(this.db);
    } catch (chatError: any) {
      console.error(`[SQLiteStorage] Failed to create chat tables:`, chatError);
      throw new Error(`Failed to create chat tables: ${chatError.message}`);
    }

    console.log(`[SQLiteStorage] Initialization completed successfully`);
  }

  async exists(id: DevlogId): Promise<boolean> {
    console.log(`[SQLiteStorage] Checking if entry exists: ${id}`);
    if (!this.db) {
      console.error(`[SQLiteStorage] Database not initialized when checking exists for: ${id}`);
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare('SELECT 1 FROM devlog_entries WHERE id = ?');
      const result = stmt.get(id) !== undefined;
      console.log(`[SQLiteStorage] Entry exists result for ${id}: ${result}`);
      return result;
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error checking if entry exists:`, error);
      throw error;
    }
  }

  async get(id: DevlogId): Promise<DevlogEntry | null> {
    console.log(`[SQLiteStorage] Getting entry: ${id}`);
    if (!this.db) {
      console.error(`[SQLiteStorage] Database not initialized when getting: ${id}`);
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM devlog_entries WHERE id = ?');
      const row = stmt.get(id) as any;

      if (!row) {
        console.log(`[SQLiteStorage] Entry not found: ${id}`);
        return null;
      }

      console.log(`[SQLiteStorage] Found entry: ${id}`);
      return this.rowToDevlogEntry(row);
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error getting entry:`, error);
      throw error;
    }
  }

  async save(entry: DevlogEntry): Promise<void> {
    console.log(`[SQLiteStorage] Saving entry: ${entry.id} - ${entry.title}`);
    if (!this.db) {
      console.error(`[SQLiteStorage] Database not initialized when saving: ${entry.id}`);
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO devlog_entries (
          id, key_field, title, type, description, status, priority, created_at, updated_at,
          assignee, files, related_devlogs,
          context, ai_context, external_references, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
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
      );

      console.log(`[SQLiteStorage] Successfully saved entry: ${entry.id}`);
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error saving entry:`, error);
      throw error;
    }
  }

  async delete(id: DevlogId): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM devlog_entries WHERE id = ?');
    stmt.run(id);
  }

  async list(filter?: DevlogFilter): Promise<DevlogEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM devlog_entries';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filter) {
      if (filter.status && filter.status.length > 0) {
        conditions.push(`status IN (${filter.status.map(() => '?').join(', ')})`);
        params.push(...filter.status);
      }

      if (filter.type && filter.type.length > 0) {
        conditions.push(`type IN (${filter.type.map(() => '?').join(', ')})`);
        params.push(...filter.type);
      }

      if (filter.priority && filter.priority.length > 0) {
        conditions.push(`priority IN (${filter.priority.map(() => '?').join(', ')})`);
        params.push(...filter.priority);
      }

      if (filter.assignee) {
        conditions.push('assignee = ?');
        params.push(filter.assignee);
      }

      if (filter.fromDate) {
        conditions.push('created_at >= ?');
        params.push(filter.fromDate);
      }

      if (filter.toDate) {
        conditions.push('created_at <= ?');
        params.push(filter.toDate);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY updated_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => this.rowToDevlogEntry(row));
  }

  async search(query: string): Promise<DevlogEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT devlog_entries.* FROM devlog_entries
      JOIN devlog_fts ON devlog_entries.rowid = devlog_fts.rowid
      WHERE devlog_fts MATCH ?
      ORDER BY rank
    `);

    const rows = stmt.all(query) as any[];
    return rows.map((row) => this.rowToDevlogEntry(row));
  }

  async getStats(): Promise<DevlogStats> {
    if (!this.db) throw new Error('Database not initialized');

    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM devlog_entries');
    const total = (totalStmt.get() as any).count;

    const statusStmt = this.db.prepare(
      'SELECT status, COUNT(*) as count FROM devlog_entries GROUP BY status',
    );
    const statusRows = statusStmt.all() as any[];
    const byStatus = {} as Record<DevlogStatus, number>;
    statusRows.forEach((row) => {
      byStatus[row.status as DevlogStatus] = row.count;
    });

    const typeStmt = this.db.prepare(
      'SELECT type, COUNT(*) as count FROM devlog_entries GROUP BY type',
    );
    const typeRows = typeStmt.all() as any[];
    const byType = {} as Record<DevlogType, number>;
    typeRows.forEach((row) => {
      byType[row.type as DevlogType] = row.count;
    });

    const priorityStmt = this.db.prepare(
      'SELECT priority, COUNT(*) as count FROM devlog_entries GROUP BY priority',
    );
    const priorityRows = priorityStmt.all() as any[];
    const byPriority = {} as Record<DevlogPriority, number>;
    priorityRows.forEach((row) => {
      byPriority[row.priority as DevlogPriority] = row.count;
    });

    // Calculate open and closed counts
    const openEntries = (['new', 'in-progress', 'blocked', 'in-review', 'testing'] as DevlogStatus[])
      .reduce((sum, status) => sum + (byStatus[status] || 0), 0);
    const closedEntries = (['done', 'cancelled'] as DevlogStatus[])
      .reduce((sum, status) => sum + (byStatus[status] || 0), 0);

    return {
      totalEntries: total,
      openEntries,
      closedEntries,
      byStatus,
      byType,
      byPriority,
    };
  }

  async cleanup(): Promise<void> {
    console.log(`[SQLiteStorage] Disposing database connection`);
    if (this.db) {
      try {
        this.db.close();
        console.log(`[SQLiteStorage] Database connection closed successfully`);
      } catch (error: any) {
        console.error(`[SQLiteStorage] Error closing database:`, error);
      }
      this.db = null;
    } else {
      console.log(`[SQLiteStorage] No database connection to dispose`);
    }
  }

  async getNextId(): Promise<DevlogId> {
    const stmt = this.db.prepare('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM devlog_entries');
    const result = stmt.get();
    return (result as any).next_id;
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
      files: JSON.parse(row.files || '[]'),
      relatedDevlogs: JSON.parse(row.related_devlogs || '[]'),
      context: JSON.parse(row.context || '{}'),
      aiContext: JSON.parse(row.ai_context || '{}'),
      notes: JSON.parse(row.notes || '[]'),
      externalReferences: JSON.parse(row.external_references || '[]'),
    };
  }

  // ===== Chat Storage Operations =====

  async saveChatSession(session: ChatSession): Promise<void> {
    console.log(`[SQLiteStorage] Saving chat session: ${session.id}`);
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO chat_sessions (
          id, agent, timestamp, workspace, workspace_path, title, status,
          message_count, duration, metadata, tags, imported_at, updated_at, archived
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        session.id,
        session.agent,
        session.timestamp,
        session.workspace || null,
        session.workspacePath || null,
        session.title || null,
        session.status,
        session.messageCount,
        session.duration || null,
        JSON.stringify(session.metadata),
        JSON.stringify(session.tags),
        session.importedAt,
        session.updatedAt,
        session.archived ? 1 : 0
      );

      console.log(`[SQLiteStorage] Chat session saved successfully: ${session.id}`);
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error saving chat session:`, error);
      throw error;
    }
  }

  async getChatSession(id: ChatSessionId): Promise<ChatSession | null> {
    console.log(`[SQLiteStorage] Getting chat session: ${id}`);
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM chat_sessions WHERE id = ?');
      const row = stmt.get(id);

      if (!row) {
        console.log(`[SQLiteStorage] Chat session not found: ${id}`);
        return null;
      }

      return this.rowToChatSession(row);
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error getting chat session:`, error);
      throw error;
    }
  }

  async listChatSessions(filter?: ChatFilter, offset = 0, limit = 50): Promise<ChatSession[]> {
    console.log(`[SQLiteStorage] Listing chat sessions with filter:`, filter);
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const conditions: string[] = [];
      const params: any[] = [];

      if (filter) {
        if (filter.agent && filter.agent.length > 0) {
          conditions.push(`agent IN (${filter.agent.map(() => '?').join(', ')})`);
          params.push(...filter.agent);
        }

        if (filter.status && filter.status.length > 0) {
          conditions.push(`status IN (${filter.status.map(() => '?').join(', ')})`);
          params.push(...filter.status);
        }

        if (filter.workspace && filter.workspace.length > 0) {
          conditions.push(`workspace IN (${filter.workspace.map(() => '?').join(', ')})`);
          params.push(...filter.workspace);
        }

        if (filter.linkedDevlog) {
          conditions.push(`id IN (SELECT session_id FROM chat_devlog_links WHERE devlog_id = ? AND confirmed = 1)`);
          params.push(filter.linkedDevlog);
        }

        if (filter.fromDate) {
          conditions.push('timestamp >= ?');
          params.push(filter.fromDate);
        }

        if (filter.toDate) {
          conditions.push('timestamp <= ?');
          params.push(filter.toDate);
        }

        if (!filter.includeArchived) {
          conditions.push('archived = 0');
        }

        if (filter.minMessages) {
          conditions.push('message_count >= ?');
          params.push(filter.minMessages);
        }

        if (filter.maxMessages) {
          conditions.push('message_count <= ?');
          params.push(filter.maxMessages);
        }
      }

      let query = 'SELECT * FROM chat_sessions';
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);

      const sessions = rows.map((row: any) => this.rowToChatSession(row));
      console.log(`[SQLiteStorage] Found ${sessions.length} chat sessions`);
      return sessions;
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error listing chat sessions:`, error);
      throw error;
    }
  }

  async deleteChatSession(id: ChatSessionId): Promise<void> {
    console.log(`[SQLiteStorage] Deleting chat session: ${id}`);
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Delete session (messages and links will be cascade deleted)
      const stmt = this.db.prepare('DELETE FROM chat_sessions WHERE id = ?');
      stmt.run(id);
      console.log(`[SQLiteStorage] Chat session deleted: ${id}`);
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error deleting chat session:`, error);
      throw error;
    }
  }

  async saveChatMessages(messages: ChatMessage[]): Promise<void> {
    console.log(`[SQLiteStorage] Saving ${messages.length} chat messages`);
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO chat_messages (
          id, session_id, role, content, timestamp, sequence, metadata, search_content
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const message of messages) {
        stmt.run(
          message.id,
          message.sessionId,
          message.role,
          message.content,
          message.timestamp,
          message.sequence,
          JSON.stringify(message.metadata),
          message.searchContent || message.content
        );
      }

      console.log(`[SQLiteStorage] ${messages.length} chat messages saved successfully`);
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error saving chat messages:`, error);
      throw error;
    }
  }

  async getChatMessages(sessionId: ChatSessionId, offset = 0, limit = 100): Promise<ChatMessage[]> {
    console.log(`[SQLiteStorage] Getting messages for session: ${sessionId}`);
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(`
        SELECT * FROM chat_messages 
        WHERE session_id = ? 
        ORDER BY sequence ASC 
        LIMIT ? OFFSET ?
      `);
      const rows = stmt.all(sessionId, limit, offset);

      const messages = rows.map((row: any) => this.rowToChatMessage(row));
      console.log(`[SQLiteStorage] Found ${messages.length} messages for session ${sessionId}`);
      return messages;
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error getting chat messages:`, error);
      throw error;
    }
  }

  async searchChatContent(query: string, filter?: ChatFilter, limit = 50): Promise<ChatSearchResult[]> {
    console.log(`[SQLiteStorage] Searching chat content for: ${query}`);
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Use FTS search for content
      let searchQuery = `
        SELECT 
          m.*, 
          s.*,
          highlight(chat_messages_fts, 2, '<mark>', '</mark>') as highlighted_content,
          rank
        FROM chat_messages_fts 
        JOIN chat_messages m ON chat_messages_fts.rowid = m.rowid
        JOIN chat_sessions s ON m.session_id = s.id
        WHERE chat_messages_fts MATCH ?
      `;

      const conditions: string[] = [];
      const params: any[] = [query];

      if (filter) {
        if (filter.agent && filter.agent.length > 0) {
          conditions.push(`s.agent IN (${filter.agent.map(() => '?').join(', ')})`);
          params.push(...filter.agent);
        }

        if (filter.workspace && filter.workspace.length > 0) {
          conditions.push(`s.workspace IN (${filter.workspace.map(() => '?').join(', ')})`);
          params.push(...filter.workspace);
        }

        if (!filter.includeArchived) {
          conditions.push('s.archived = 0');
        }
      }

      if (conditions.length > 0) {
        searchQuery += ' AND ' + conditions.join(' AND ');
      }

      searchQuery += ' ORDER BY rank LIMIT ?';
      params.push(limit);

      const stmt = this.db.prepare(searchQuery);
      const rows = stmt.all(...params);

      // Group results by session
      const sessionMap = new Map<string, any>();
      for (const row of rows) {
        if (!sessionMap.has(row.session_id)) {
          sessionMap.set(row.session_id, {
            session: this.rowToChatSession(row),
            messages: []
          });
        }

        const message = this.rowToChatMessage(row);
        sessionMap.get(row.session_id)!.messages.push({
          message,
          matchPositions: [], // TODO: Extract from FTS
          context: row.highlighted_content || message.content,
          score: row.rank || 1.0
        });
      }

      const results: ChatSearchResult[] = Array.from(sessionMap.values()).map(item => ({
        session: item.session,
        messages: item.messages,
        relevance: Math.max(...item.messages.map((m: any) => m.score)),
        searchContext: {
          query,
          matchType: 'exact' as const,
          totalMatches: item.messages.length
        }
      }));

      console.log(`[SQLiteStorage] Found ${results.length} chat search results`);
      return results;
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error searching chat content:`, error);
      throw error;
    }
  }

  async getChatStats(filter?: ChatFilter): Promise<ChatStats> {
    console.log(`[SQLiteStorage] Getting chat statistics`);
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // TODO: Implement comprehensive stats with proper filtering
      const totalSessionsStmt = this.db.prepare('SELECT COUNT(*) as count FROM chat_sessions');
      const totalMessagesStmt = this.db.prepare('SELECT COUNT(*) as count FROM chat_messages');
      
      const totalSessions = totalSessionsStmt.get().count;
      const totalMessages = totalMessagesStmt.get().count;

      return {
        totalSessions,
        totalMessages,
        byAgent: {
          'GitHub Copilot': 0,
          'Cursor': 0,
          'Windsurf': 0,
          'Claude': 0,
          'ChatGPT': 0,
          'Other': 0
        },
        byStatus: {
          'imported': 0,
          'linked': 0,
          'archived': 0,
          'processed': 0
        },
        byWorkspace: {},
        dateRange: {
          earliest: null,
          latest: null
        },
        linkageStats: {
          linked: 0,
          unlinked: 0,
          multiLinked: 0
        }
      };
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error getting chat stats:`, error);
      throw error;
    }
  }

  async saveChatDevlogLink(link: ChatDevlogLink): Promise<void> {
    console.log(`[SQLiteStorage] Saving chat-devlog link: ${link.sessionId} -> ${link.devlogId}`);
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO chat_devlog_links (
          session_id, devlog_id, confidence, reason, evidence, confirmed, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        link.sessionId,
        link.devlogId,
        link.confidence,
        link.reason,
        JSON.stringify(link.evidence),
        link.confirmed ? 1 : 0,
        link.createdAt,
        link.createdBy
      );

      console.log(`[SQLiteStorage] Chat-devlog link saved successfully`);
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error saving chat-devlog link:`, error);
      throw error;
    }
  }

  async getChatDevlogLinks(sessionId?: ChatSessionId, devlogId?: DevlogId): Promise<ChatDevlogLink[]> {
    console.log(`[SQLiteStorage] Getting chat-devlog links for session: ${sessionId}, devlog: ${devlogId}`);
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      let query = 'SELECT * FROM chat_devlog_links';
      const conditions: string[] = [];
      const params: any[] = [];

      if (sessionId) {
        conditions.push('session_id = ?');
        params.push(sessionId);
      }

      if (devlogId) {
        conditions.push('devlog_id = ?');
        params.push(devlogId);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params);

      const links = rows.map((row: any) => this.rowToChatDevlogLink(row));
      console.log(`[SQLiteStorage] Found ${links.length} chat-devlog links`);
      return links;
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error getting chat-devlog links:`, error);
      throw error;
    }
  }

  async removeChatDevlogLink(sessionId: ChatSessionId, devlogId: DevlogId): Promise<void> {
    console.log(`[SQLiteStorage] Removing chat-devlog link: ${sessionId} -> ${devlogId}`);
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare('DELETE FROM chat_devlog_links WHERE session_id = ? AND devlog_id = ?');
      stmt.run(sessionId, devlogId);
      console.log(`[SQLiteStorage] Chat-devlog link removed successfully`);
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error removing chat-devlog link:`, error);
      throw error;
    }
  }

  async getChatWorkspaces(): Promise<ChatWorkspace[]> {
    console.log(`[SQLiteStorage] Getting chat workspaces`);
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM chat_workspaces ORDER BY last_seen DESC');
      const rows = stmt.all();

      const workspaces = rows.map((row: any) => this.rowToChatWorkspace(row));
      console.log(`[SQLiteStorage] Found ${workspaces.length} chat workspaces`);
      return workspaces;
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error getting chat workspaces:`, error);
      throw error;
    }
  }

  async saveChatWorkspace(workspace: ChatWorkspace): Promise<void> {
    console.log(`[SQLiteStorage] Saving chat workspace: ${workspace.id}`);
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO chat_workspaces (
          id, name, path, source, first_seen, last_seen, session_count, devlog_workspace, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        workspace.id,
        workspace.name,
        workspace.path || null,
        workspace.source,
        workspace.firstSeen,
        workspace.lastSeen,
        workspace.sessionCount,
        workspace.devlogWorkspace || null,
        JSON.stringify(workspace.metadata)
      );

      console.log(`[SQLiteStorage] Chat workspace saved successfully: ${workspace.id}`);
    } catch (error: any) {
      console.error(`[SQLiteStorage] Error saving chat workspace:`, error);
      throw error;
    }
  }

  // Helper methods for converting database rows to objects

  private rowToChatSession(row: any): ChatSession {
    return {
      id: row.id,
      agent: row.agent,
      timestamp: row.timestamp,
      workspace: row.workspace,
      workspacePath: row.workspace_path,
      title: row.title,
      status: row.status,
      messageCount: row.message_count,
      duration: row.duration,
      metadata: JSON.parse(row.metadata || '{}'),
      tags: JSON.parse(row.tags || '[]'),
      importedAt: row.imported_at,
      updatedAt: row.updated_at,
      linkedDevlogs: [], // TODO: Load from links table
      archived: row.archived === 1
    };
  }

  private rowToChatMessage(row: any): ChatMessage {
    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      sequence: row.sequence,
      metadata: JSON.parse(row.metadata || '{}'),
      searchContent: row.search_content
    };
  }

  private rowToChatWorkspace(row: any): ChatWorkspace {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      source: row.source,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
      sessionCount: row.session_count,
      devlogWorkspace: row.devlog_workspace,
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  private rowToChatDevlogLink(row: any): ChatDevlogLink {
    return {
      sessionId: row.session_id,
      devlogId: row.devlog_id,
      confidence: row.confidence,
      reason: row.reason,
      evidence: JSON.parse(row.evidence || '{}'),
      confirmed: row.confirmed === 1,
      createdAt: row.created_at,
      createdBy: row.created_by
    };
  }
}
