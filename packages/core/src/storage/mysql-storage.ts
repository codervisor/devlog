/**
 * MySQL storage provider for production-grade devlog storage
 */

import {
  DevlogEntry,
  DevlogFilter,
  DevlogId,
  DevlogStats,
  MySQLStorageOptions,
  PaginatedResult,
  StorageProvider,
  TimeSeriesRequest,
  TimeSeriesStats,
} from '../types/index.js';
import type { DevlogEvent } from '../events/devlog-events.js';
import { calculateDevlogStats } from '../utils/storage.js';
import { 
  generateTimeSeriesSQL, 
  generateTimeSeriesParams, 
  mapSQLRowsToDataPoints, 
  generateDateRange 
} from '../utils/sql-time-series.js';
import { createPaginatedResult } from '../utils/common.js';

export class MySQLStorageProvider implements StorageProvider {
  private connectionString: string;
  private options: MySQLStorageOptions;
  private connection: any = null;

  // Event subscription properties
  private eventCallbacks = new Set<(event: DevlogEvent) => void>();
  private pollingInterval?: NodeJS.Timeout;
  private isWatching = false;
  private lastPollTimestamp = new Date().toISOString();
  private lastKnownEntryIds = new Set<number>();

  constructor(connectionString: string, options: MySQLStorageOptions = {}) {
    this.connectionString = connectionString;
    this.options = options;
  }

  async initialize(): Promise<void> {
    // Import mysql2 module - dependency should be present when using MySQL storage
    try {
      const mysql = await import('mysql2/promise');

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

  async list(filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
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
    const entries = (rows as any[]).map((row) => this.rowToDevlogEntry(row));

    // Return paginated result for consistency
    const pagination = filter?.pagination || { page: 1, limit: 100 };
    return createPaginatedResult(entries, pagination);
  }

  async search(query: string): Promise<PaginatedResult<DevlogEntry>> {
    const [rows] = await this.connection.execute(
      `
      SELECT * FROM devlog_entries
      WHERE MATCH(title, description) AGAINST(? IN BOOLEAN MODE)
      ORDER BY MATCH(title, description) AGAINST(? IN BOOLEAN MODE) DESC
    `,
      [query, query],
    );

    const entries = (rows as any[]).map((row) => this.rowToDevlogEntry(row));

    // Return paginated result for consistency
    return createPaginatedResult(entries, { page: 1, limit: 100 });
  }

  async getStats(filter?: DevlogFilter): Promise<DevlogStats> {
    // Get ALL entries for accurate statistics, not paginated results
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

    const [rows] = await this.connection.execute(query, params);
    const entries = (rows as any[]).map((row) => this.rowToDevlogEntry(row));
    return calculateDevlogStats(entries);
  }

  async getTimeSeriesStats(request: TimeSeriesRequest = {}): Promise<TimeSeriesStats> {
    await this.initialize();

    // Generate SQL query and parameters using shared utility  
    const query = generateTimeSeriesSQL('mysql');
    const params = generateTimeSeriesParams(request, 'mysql');

    // Execute query
    const [rows] = (await this.connection.execute(query, params)) as [
      Array<{
        date: string;
        daily_created: number;
        daily_closed: number;
        total_created: number;
        total_closed: number;
      }>,
      any,
    ];

    // Map results to TimeSeriesDataPoint objects
    const dataPoints = mapSQLRowsToDataPoints(rows);

    return {
      dataPoints,
      dateRange: generateDateRange(request),
    };
  }

  async cleanup(): Promise<void> {
    // Stop event polling
    await this.stopWatching();
    this.eventCallbacks.clear();

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

  // ===== Chat Storage Operations (TODO: Implement with proper MySQL schema) =====

  async saveChatSession(): Promise<void> {
    throw new Error(
      'Chat storage not yet implemented for MySQL provider. Implementation coming in Phase 2.',
    );
  }

  async getChatSession(): Promise<null> {
    throw new Error(
      'Chat storage not yet implemented for MySQL provider. Implementation coming in Phase 2.',
    );
  }

  async listChatSessions(): Promise<[]> {
    throw new Error(
      'Chat storage not yet implemented for MySQL provider. Implementation coming in Phase 2.',
    );
  }

  async deleteChatSession(): Promise<void> {
    throw new Error(
      'Chat storage not yet implemented for MySQL provider. Implementation coming in Phase 2.',
    );
  }

  async saveChatMessages(): Promise<void> {
    throw new Error(
      'Chat storage not yet implemented for MySQL provider. Implementation coming in Phase 2.',
    );
  }

  async getChatMessages(): Promise<[]> {
    throw new Error(
      'Chat storage not yet implemented for MySQL provider. Implementation coming in Phase 2.',
    );
  }

  async searchChatContent(): Promise<[]> {
    throw new Error(
      'Chat storage not yet implemented for MySQL provider. Implementation coming in Phase 2.',
    );
  }

  async getChatStats(): Promise<any> {
    throw new Error(
      'Chat storage not yet implemented for MySQL provider. Implementation coming in Phase 2.',
    );
  }

  async saveChatDevlogLink(): Promise<void> {
    throw new Error(
      'Chat storage not yet implemented for MySQL provider. Implementation coming in Phase 2.',
    );
  }

  async getChatDevlogLinks(): Promise<[]> {
    throw new Error(
      'Chat storage not yet implemented for MySQL provider. Implementation coming in Phase 2.',
    );
  }

  async removeChatDevlogLink(): Promise<void> {
    throw new Error(
      'Chat storage not yet implemented for MySQL provider. Implementation coming in Phase 2.',
    );
  }

  async getChatWorkspaces(): Promise<[]> {
    throw new Error(
      'Chat storage not yet implemented for MySQL provider. Implementation coming in Phase 2.',
    );
  }

  async saveChatWorkspace(): Promise<void> {
    throw new Error(
      'Chat storage not yet implemented for MySQL provider. Implementation coming in Phase 2.',
    );
  }

  // ===== Event Subscription Operations =====

  /**
   * Subscribe to database changes by polling for updates
   */
  async subscribe(callback: (event: DevlogEvent) => void): Promise<() => void> {
    this.eventCallbacks.add(callback);

    // Start polling if this is the first subscription
    if (this.eventCallbacks.size === 1 && !this.isWatching) {
      await this.startWatching();
    }

    // Return unsubscribe function
    return () => {
      this.eventCallbacks.delete(callback);
      // Stop polling if no more callbacks
      if (this.eventCallbacks.size === 0 && this.isWatching) {
        this.stopWatching();
      }
    };
  }

  /**
   * Start polling the database for changes
   */
  async startWatching(): Promise<void> {
    if (this.isWatching || !this.connection) {
      return;
    }

    try {
      this.isWatching = true;

      // Initialize known IDs with current state
      const [rows] = await this.connection.execute('SELECT id FROM devlog_entries');
      this.lastKnownEntryIds = new Set<number>(rows.map((row: any) => Number(row.id)));

      console.log(
        `[MySQLStorage] Started watching for database changes (tracking ${this.lastKnownEntryIds.size} entries)`,
      );

      // Poll every 3 seconds for changes (slightly slower than SQLite for network overhead)
      this.pollingInterval = setInterval(() => {
        this.pollForChanges().catch((error) => {
          console.error('[MySQLStorage] Error polling for changes:', error);
        });
      }, 3000);
    } catch (error) {
      console.error('[MySQLStorage] Failed to start database watching:', error);
      throw error;
    }
  }

  /**
   * Stop polling for database changes
   */
  async stopWatching(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
    this.isWatching = false;
    console.log('[MySQLStorage] Stopped watching database changes');
  }

  /**
   * Poll the database for recent changes
   */
  private async pollForChanges(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      const currentTimestamp = new Date().toISOString();

      // Query for entries updated since last poll
      const [changedEntries] = await this.connection.execute(
        'SELECT * FROM devlog_entries WHERE updated_at > ? ORDER BY updated_at ASC',
        [this.lastPollTimestamp],
      );

      for (const row of changedEntries as any[]) {
        const entry = this.rowToDevlogEntry(row);

        // Skip if entry.id is undefined (shouldn't happen but be safe)
        if (entry.id === undefined) {
          console.warn('[MySQLStorage] Skipping entry with undefined ID');
          continue;
        }

        // Determine if this is a creation or update by checking if we've seen this ID before
        const eventType = this.lastKnownEntryIds.has(entry.id) ? 'updated' : 'created';
        this.lastKnownEntryIds.add(entry.id);

        this.emitEvent({
          type: eventType,
          timestamp: currentTimestamp,
          data: entry,
        });
      }

      // Check for deletions by comparing current IDs with last known IDs
      const [allIdsResult] = await this.connection.execute('SELECT id FROM devlog_entries');
      const currentIds = new Set<number>((allIdsResult as any[]).map((row) => Number(row.id)));

      for (const lastKnownId of this.lastKnownEntryIds) {
        if (!currentIds.has(lastKnownId)) {
          // Entry was deleted
          this.emitEvent({
            type: 'deleted',
            timestamp: currentTimestamp,
            data: { id: lastKnownId },
          });
        }
      }

      // Update our tracking
      this.lastKnownEntryIds = currentIds;
      this.lastPollTimestamp = currentTimestamp;
    } catch (error) {
      console.error('[MySQLStorage] Error polling for changes:', error);
    }
  }

  /**
   * Emit event to all subscribers
   */
  private emitEvent(event: DevlogEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[MySQLStorage] Error in event callback:', error);
      }
    }
  }
}
