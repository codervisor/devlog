/**
 * PostgreSQL storage provider for production-grade devlog storage
 */

import {
  DevlogEntry,
  DevlogFilter,
  DevlogId,
  DevlogStats,
  PaginatedResult,
  PostgreSQLStorageOptions,
  StorageProvider,
  TimeSeriesDataPoint,
  TimeSeriesRequest,
  TimeSeriesStats,
} from '../types/index.js';
import type { DevlogEvent } from '../events/devlog-events.js';
import { calculateDevlogStats } from '../utils/storage.js';
import { createPaginatedResult } from '../utils/common.js';

export class PostgreSQLStorageProvider implements StorageProvider {
  private connectionString: string;
  private options: PostgreSQLStorageOptions;
  private client: any = null;

  // Event subscription properties
  private eventCallbacks = new Set<(event: DevlogEvent) => void>();
  private notifyClient: any = null;
  private isWatching = false;

  constructor(connectionString: string, options: PostgreSQLStorageOptions = {}) {
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

    // Create trigger function for real-time notifications
    await this.client.query(`
      CREATE OR REPLACE FUNCTION notify_devlog_changes()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          PERFORM pg_notify('devlog_changes', json_build_object(
            'operation', 'created',
            'id', NEW.id,
            'timestamp', NEW.updated_at
          )::text);
          RETURN NEW;
        ELSIF TG_OP = 'UPDATE' THEN
          PERFORM pg_notify('devlog_changes', json_build_object(
            'operation', 'updated',
            'id', NEW.id,
            'timestamp', NEW.updated_at
          )::text);
          RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
          PERFORM pg_notify('devlog_changes', json_build_object(
            'operation', 'deleted',
            'id', OLD.id,
            'timestamp', NOW()
          )::text);
          RETURN OLD;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create triggers for INSERT, UPDATE, DELETE
    await this.client.query(`
      DROP TRIGGER IF EXISTS devlog_changes_trigger ON devlog_entries;
      CREATE TRIGGER devlog_changes_trigger
        AFTER INSERT OR UPDATE OR DELETE ON devlog_entries
        FOR EACH ROW EXECUTE FUNCTION notify_devlog_changes();
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

  async list(filter?: DevlogFilter): Promise<PaginatedResult<DevlogEntry>> {
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
    const entries = result.rows.map((row: any) => this.rowToDevlogEntry(row));

    // Return paginated result for consistency
    const pagination = filter?.pagination || { page: 1, limit: 100 };
    return createPaginatedResult(entries, pagination);
  }

  async search(query: string): Promise<PaginatedResult<DevlogEntry>> {
    const result = await this.client.query(
      `
      SELECT * FROM devlog_entries
      WHERE to_tsvector('english', title || ' ' || description) @@ plainto_tsquery('english', $1)
      ORDER BY ts_rank(to_tsvector('english', title || ' ' || description), plainto_tsquery('english', $1)) DESC
    `,
      [query],
    );

    const entries = result.rows.map((row: any) => this.rowToDevlogEntry(row));

    // Return paginated result for consistency
    return createPaginatedResult(entries, { page: 1, limit: 100 });
  }

  async getStats(filter?: DevlogFilter): Promise<DevlogStats> {
    // Get ALL entries for accurate statistics, not paginated results
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

    const result = await this.client.query(query, params);
    const entries = result.rows.map((row: any) => this.rowToDevlogEntry(row));
    return calculateDevlogStats(entries);
  }

  async getTimeSeriesStats(request: TimeSeriesRequest = {}): Promise<TimeSeriesStats> {
    await this.initialize();

    // Set defaults
    const days = request.days || 30;
    const endDate = request.to ? new Date(request.to) : new Date();
    const startDate = request.from ? new Date(request.from) : new Date(endDate);
    if (!request.from) {
      startDate.setDate(endDate.getDate() - days + 1);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Single efficient PostgreSQL query using CTEs and window functions
    const query = `
      WITH date_series AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS date
      ),
      daily_stats AS (
        SELECT 
          DATE(created_at) as created_date,
          COUNT(*) as daily_created
        FROM devlog_entries
        WHERE DATE(created_at) BETWEEN $3 AND $4
        GROUP BY DATE(created_at)
      ),
      daily_completed AS (
        SELECT 
          DATE(closed_at) as completed_date,
          COUNT(*) as daily_completed
        FROM devlog_entries
        WHERE DATE(closed_at) BETWEEN $5 AND $6 AND status = 'done'
        GROUP BY DATE(closed_at)
      ),
      cumulative_stats AS (
        SELECT 
          ds.date,
          COALESCE(dc.daily_created, 0) as daily_created,
          COALESCE(comp.daily_completed, 0) as daily_completed,
          (SELECT COUNT(*) FROM devlog_entries WHERE DATE(created_at) <= ds.date) as total_created,
          (SELECT COUNT(*) FROM devlog_entries WHERE DATE(created_at) <= ds.date AND status = 'done') as total_completed,
          (SELECT COUNT(*) FROM devlog_entries WHERE DATE(created_at) <= ds.date AND status = 'cancelled') as total_cancelled,
          (SELECT COUNT(*) FROM devlog_entries WHERE DATE(created_at) <= ds.date AND status = 'new') as current_new,
          (SELECT COUNT(*) FROM devlog_entries WHERE DATE(created_at) <= ds.date AND status = 'in-progress') as current_in_progress,
          (SELECT COUNT(*) FROM devlog_entries WHERE DATE(created_at) <= ds.date AND status = 'blocked') as current_blocked,
          (SELECT COUNT(*) FROM devlog_entries WHERE DATE(created_at) <= ds.date AND status = 'in-review') as current_in_review,
          (SELECT COUNT(*) FROM devlog_entries WHERE DATE(created_at) <= ds.date AND status = 'testing') as current_testing
        FROM date_series ds
        LEFT JOIN daily_stats dc ON ds.date = dc.created_date
        LEFT JOIN daily_completed comp ON ds.date = comp.completed_date
        ORDER BY ds.date
      )
      SELECT * FROM cumulative_stats;
    `;

    const result = await this.client.query(query, [
      startDateStr,
      endDateStr, // date_series parameters
      startDateStr,
      endDateStr, // daily_stats parameters
      startDateStr,
      endDateStr, // daily_completed parameters
    ]);

    const rows = result.rows as Array<{
      date: string;
      daily_created: number;
      daily_completed: number;
      total_created: number;
      total_completed: number;
      total_cancelled: number;
      current_new: number;
      current_in_progress: number;
      current_blocked: number;
      current_in_review: number;
      current_testing: number;
    }>;

    const dataPoints: TimeSeriesDataPoint[] = rows.map((row) => {
      const totalClosed = row.total_completed + row.total_cancelled;
      const currentOpen =
        row.current_new +
        row.current_in_progress +
        row.current_blocked +
        row.current_in_review +
        row.current_testing;

      return {
        date: row.date,

        // Cumulative data (primary Y-axis)
        totalCreated: row.total_created,
        totalCompleted: row.total_completed,
        totalClosed,

        // Snapshot data (secondary Y-axis)
        currentOpen,
        currentNew: row.current_new,
        currentInProgress: row.current_in_progress,
        currentBlocked: row.current_blocked,
        currentInReview: row.current_in_review,
        currentTesting: row.current_testing,

        // Daily activity
        dailyCreated: row.daily_created,
        dailyCompleted: row.daily_completed,
      };
    });

    return {
      dataPoints,
      dateRange: {
        from: startDateStr,
        to: endDateStr,
      },
    };
  }

  async cleanup(): Promise<void> {
    // Stop event listening
    await this.stopWatching();
    this.eventCallbacks.clear();

    if (this.notifyClient) {
      await this.notifyClient.end();
      this.notifyClient = null;
    }

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
    throw new Error(
      'Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.',
    );
  }

  async getChatSession(): Promise<null> {
    throw new Error(
      'Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.',
    );
  }

  async listChatSessions(): Promise<[]> {
    throw new Error(
      'Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.',
    );
  }

  async deleteChatSession(): Promise<void> {
    throw new Error(
      'Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.',
    );
  }

  async saveChatMessages(): Promise<void> {
    throw new Error(
      'Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.',
    );
  }

  async getChatMessages(): Promise<[]> {
    throw new Error(
      'Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.',
    );
  }

  async searchChatContent(): Promise<[]> {
    throw new Error(
      'Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.',
    );
  }

  async getChatStats(): Promise<any> {
    throw new Error(
      'Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.',
    );
  }

  async saveChatDevlogLink(): Promise<void> {
    throw new Error(
      'Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.',
    );
  }

  async getChatDevlogLinks(): Promise<[]> {
    throw new Error(
      'Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.',
    );
  }

  async removeChatDevlogLink(): Promise<void> {
    throw new Error(
      'Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.',
    );
  }

  async getChatWorkspaces(): Promise<[]> {
    throw new Error(
      'Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.',
    );
  }

  async saveChatWorkspace(): Promise<void> {
    throw new Error(
      'Chat storage not yet implemented for PostgreSQL provider. Implementation coming in Phase 2.',
    );
  }

  // ===== Event Subscription Operations =====

  /**
   * Subscribe to database changes using PostgreSQL LISTEN/NOTIFY
   */
  async subscribe(callback: (event: DevlogEvent) => void): Promise<() => void> {
    this.eventCallbacks.add(callback);

    // Start listening if this is the first subscription
    if (this.eventCallbacks.size === 1 && !this.isWatching) {
      await this.startWatching();
    }

    // Return unsubscribe function
    return () => {
      this.eventCallbacks.delete(callback);
      // Stop listening if no more callbacks
      if (this.eventCallbacks.size === 0 && this.isWatching) {
        this.stopWatching();
      }
    };
  }

  /**
   * Start listening for PostgreSQL notifications
   */
  async startWatching(): Promise<void> {
    if (this.isWatching || !this.client) {
      return;
    }

    try {
      // Create a separate client for notifications to avoid conflicts
      const pgModule = await import('pg' as any);
      const { Client } = pgModule;

      this.notifyClient = new Client({
        connectionString: this.connectionString,
        ...this.options,
      });

      await this.notifyClient.connect();

      // Listen for devlog_changes notifications
      await this.notifyClient.query('LISTEN devlog_changes');

      // Set up notification handler
      this.notifyClient.on('notification', (msg: any) => {
        this.handleNotification(msg).catch((error) => {
          console.error('[PostgreSQLStorage] Error handling notification:', error);
        });
      });

      this.isWatching = true;
      console.log('[PostgreSQLStorage] Started listening for database changes via LISTEN/NOTIFY');
    } catch (error) {
      console.error('[PostgreSQLStorage] Failed to start database watching:', error);
      throw error;
    }
  }

  /**
   * Stop listening for database changes
   */
  async stopWatching(): Promise<void> {
    if (this.notifyClient) {
      try {
        await this.notifyClient.query('UNLISTEN devlog_changes');
        await this.notifyClient.end();
        this.notifyClient = null;
      } catch (error) {
        console.error('[PostgreSQLStorage] Error stopping database watching:', error);
      }
    }
    this.isWatching = false;
    console.log('[PostgreSQLStorage] Stopped listening for database changes');
  }

  /**
   * Handle PostgreSQL notification messages
   */
  private async handleNotification(msg: any): Promise<void> {
    try {
      const payload = JSON.parse(msg.payload);
      const { operation, id, timestamp } = payload;

      let eventData: any = { id };

      // For created and updated events, fetch the full entry data
      if (operation === 'created' || operation === 'updated') {
        const entry = await this.get(id);
        if (entry) {
          eventData = entry;
        }
      }

      this.emitEvent({
        type: operation,
        timestamp: timestamp || new Date().toISOString(),
        data: eventData,
      });
    } catch (error) {
      console.error('[PostgreSQLStorage] Error parsing notification:', error);
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
        console.error('[PostgreSQLStorage] Error in event callback:', error);
      }
    }
  }
}
