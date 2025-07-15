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
} from '../types/index.js';
import { StorageProvider } from '../types/index.js';

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

    return {
      totalEntries: total,
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
}
