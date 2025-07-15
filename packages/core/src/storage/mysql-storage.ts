/**
 * MySQL storage provider for production-grade devlog storage
 */

import { DevlogEntry, DevlogFilter, DevlogId, DevlogStats } from '../types/index.js';
import { StorageProvider } from '../types/index.js';

export class MySQLStorageProvider implements StorageProvider {
  private connectionString: string;
  private options: Record<string, any>;
  private connection: any = null;

  constructor(connectionString: string, options: Record<string, any> = {}) {
    this.connectionString = connectionString;
    this.options = options;
  }

  async initialize(): Promise<void> {
    // Dynamic import to make mysql2 optional
    try {
      const mysql = await import('mysql2/promise' as any);

      this.connection = await mysql.createConnection({
        uri: this.connectionString,
        ...this.options,
      });
    } catch (error) {
      throw new Error('mysql2 is required for MySQL storage. Install it with: npm install mysql2');
    }

    // Create tables and indexes
    await this.connection.execute(`
      CREATE TABLE IF NOT EXISTS devlog_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        key_field VARCHAR(255) UNIQUE NOT NULL,
        title TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'new',
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        assignee VARCHAR(255),
        files JSON,
        related_devlogs JSON,
        context JSON,
        ai_context JSON,
        external_references JSON,
        notes JSON,
        
        INDEX idx_devlog_key (key_field),
        INDEX idx_devlog_status (status),
        INDEX idx_devlog_type (type),
        INDEX idx_devlog_priority (priority),
        INDEX idx_devlog_assignee (assignee),
        INDEX idx_devlog_created_at (created_at),
        INDEX idx_devlog_updated_at (updated_at),
        FULLTEXT INDEX idx_devlog_full_text (title, description)
      )
    `);
  }

  async exists(id: DevlogId): Promise<boolean> {
    const [rows] = await this.connection.execute('SELECT 1 FROM devlog_entries WHERE id = ?', [id]);
    return (rows as any[]).length > 0;
  }

  async get(id: DevlogId): Promise<DevlogEntry | null> {
    const [rows] = await this.connection.execute('SELECT * FROM devlog_entries WHERE id = ?', [id]);
    const results = rows as any[];

    if (results.length === 0) return null;

    return this.rowToDevlogEntry(results[0]);
  }

  async save(entry: DevlogEntry): Promise<void> {
    await this.connection.execute(
      `
      INSERT INTO devlog_entries (
        id, key_field, title, type, description, status, priority, created_at, updated_at,
        assignee, files, related_devlogs,
        context, ai_context, external_references, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        key_field = VALUES(key_field),
        title = VALUES(title),
        type = VALUES(type),
        description = VALUES(description),
        status = VALUES(status),
        priority = VALUES(priority),
        updated_at = VALUES(updated_at),
        assignee = VALUES(assignee),
        files = VALUES(files),
        related_devlogs = VALUES(related_devlogs),
        context = VALUES(context),
        ai_context = VALUES(ai_context),
        external_references = VALUES(external_references),
        notes = VALUES(notes)
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
    await this.connection.execute('DELETE FROM devlog_entries WHERE id = ?', [id]);
  }

  async list(filter?: DevlogFilter): Promise<DevlogEntry[]> {
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

    const [rows] = await this.connection.execute(query, params);
    return (rows as any[]).map((row) => this.rowToDevlogEntry(row));
  }

  async search(query: string): Promise<DevlogEntry[]> {
    const [rows] = await this.connection.execute(
      `
      SELECT * FROM devlog_entries
      WHERE MATCH(title, description) AGAINST(? IN BOOLEAN MODE)
      ORDER BY MATCH(title, description) AGAINST(? IN BOOLEAN MODE) DESC
    `,
      [query, query],
    );

    return (rows as any[]).map((row) => this.rowToDevlogEntry(row));
  }

  async getStats(): Promise<DevlogStats> {
    const [totalRows] = await this.connection.execute(
      'SELECT COUNT(*) as count FROM devlog_entries',
    );
    const total = (totalRows as any[])[0].count;

    const [statusRows] = await this.connection.execute(
      'SELECT status, COUNT(*) as count FROM devlog_entries GROUP BY status',
    );
    const byStatus: any = {};
    (statusRows as any[]).forEach((row) => {
      byStatus[row.status] = row.count;
    });

    const [typeRows] = await this.connection.execute(
      'SELECT type, COUNT(*) as count FROM devlog_entries GROUP BY type',
    );
    const byType: any = {};
    (typeRows as any[]).forEach((row) => {
      byType[row.type] = row.count;
    });

    const [priorityRows] = await this.connection.execute(
      'SELECT priority, COUNT(*) as count FROM devlog_entries GROUP BY priority',
    );
    const byPriority: any = {};
    (priorityRows as any[]).forEach((row) => {
      byPriority[row.priority] = row.count;
    });

    return {
      totalEntries: total,
      byStatus,
      byType,
      byPriority,
    };
  }

  async cleanup(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  async getNextId(): Promise<DevlogId> {
    const [rows] = await this.connection.execute(
      'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM devlog_entries',
    );
    return (rows as any[])[0].next_id;
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
      files: row.files ? JSON.parse(row.files) : [],
      relatedDevlogs: row.related_devlogs ? JSON.parse(row.related_devlogs) : [],
      context: row.context ? JSON.parse(row.context) : {},
      aiContext: row.ai_context ? JSON.parse(row.ai_context) : {},
      notes: row.notes ? JSON.parse(row.notes) : [],
      externalReferences: row.external_references ? JSON.parse(row.external_references) : [],
    };
  }
}
