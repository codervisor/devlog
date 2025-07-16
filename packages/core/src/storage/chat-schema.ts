/**
 * Chat storage schema for SQLite database
 * 
 * This file contains the database schema and initialization logic for chat-related tables
 */

export const CHAT_SCHEMA_VERSION = 1;

export const CHAT_TABLES_SQL = `
-- Chat sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY, -- ChatSessionId
  agent TEXT NOT NULL, -- AgentType 
  timestamp TEXT NOT NULL, -- ISO string
  workspace TEXT, -- workspace identifier
  workspace_path TEXT, -- file system path
  title TEXT, -- conversation title
  status TEXT NOT NULL DEFAULT 'imported', -- ChatStatus
  message_count INTEGER NOT NULL DEFAULT 0,
  duration INTEGER, -- milliseconds
  metadata TEXT NOT NULL DEFAULT '{}', -- JSON object
  tags TEXT NOT NULL DEFAULT '[]', -- JSON array
  imported_at TEXT NOT NULL, -- ISO string
  updated_at TEXT NOT NULL, -- ISO string
  archived INTEGER NOT NULL DEFAULT 0 -- boolean as integer
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY, -- ChatMessageId
  session_id TEXT NOT NULL, -- foreign key to chat_sessions
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL, -- ISO string
  sequence INTEGER NOT NULL, -- order within session
  metadata TEXT NOT NULL DEFAULT '{}', -- JSON object
  search_content TEXT, -- optimized for search
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Chat workspaces table  
CREATE TABLE IF NOT EXISTS chat_workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT,
  source TEXT NOT NULL, -- e.g., "VS Code", "cursor"
  first_seen TEXT NOT NULL, -- ISO string
  last_seen TEXT NOT NULL, -- ISO string  
  session_count INTEGER NOT NULL DEFAULT 0,
  devlog_workspace TEXT, -- mapped devlog workspace
  metadata TEXT NOT NULL DEFAULT '{}' -- JSON object
);

-- Chat-devlog linking table
CREATE TABLE IF NOT EXISTS chat_devlog_links (
  session_id TEXT NOT NULL,
  devlog_id INTEGER NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  reason TEXT NOT NULL CHECK (reason IN ('temporal', 'content', 'workspace', 'manual')),
  evidence TEXT NOT NULL DEFAULT '{}', -- JSON object
  confirmed INTEGER NOT NULL DEFAULT 0, -- boolean as integer
  created_at TEXT NOT NULL, -- ISO string
  created_by TEXT NOT NULL, -- 'system', 'user', or user identifier
  PRIMARY KEY (session_id, devlog_id),
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (devlog_id) REFERENCES devlog_entries(id) ON DELETE CASCADE
);

-- Import progress tracking table
CREATE TABLE IF NOT EXISTS chat_import_progress (
  import_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  source TEXT NOT NULL,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  processed_sessions INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  processed_messages INTEGER NOT NULL DEFAULT 0,
  imported_sessions INTEGER NOT NULL DEFAULT 0,
  imported_messages INTEGER NOT NULL DEFAULT 0,
  linked_sessions INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  warnings TEXT NOT NULL DEFAULT '[]', -- JSON array
  started_at TEXT NOT NULL, -- ISO string
  completed_at TEXT, -- ISO string
  error_message TEXT,
  error_details TEXT DEFAULT '{}' -- JSON object
);
`;

export const CHAT_INDEXES_SQL = `
-- Chat sessions indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent ON chat_sessions(agent);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_timestamp ON chat_sessions(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_workspace ON chat_sessions(workspace);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_imported_at ON chat_sessions(imported_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_archived ON chat_sessions(archived);

-- Chat messages indexes  
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sequence ON chat_messages(session_id, sequence);

-- Chat workspaces indexes
CREATE INDEX IF NOT EXISTS idx_chat_workspaces_source ON chat_workspaces(source);
CREATE INDEX IF NOT EXISTS idx_chat_workspaces_devlog_workspace ON chat_workspaces(devlog_workspace);

-- Chat-devlog links indexes
CREATE INDEX IF NOT EXISTS idx_chat_devlog_links_session ON chat_devlog_links(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_devlog_links_devlog ON chat_devlog_links(devlog_id);
CREATE INDEX IF NOT EXISTS idx_chat_devlog_links_reason ON chat_devlog_links(reason);
CREATE INDEX IF NOT EXISTS idx_chat_devlog_links_confirmed ON chat_devlog_links(confirmed);

-- Import progress indexes
CREATE INDEX IF NOT EXISTS idx_chat_import_status ON chat_import_progress(status);
CREATE INDEX IF NOT EXISTS idx_chat_import_started_at ON chat_import_progress(started_at);
`;

export const CHAT_FTS_SQL = `
-- Full-text search for chat content
CREATE VIRTUAL TABLE IF NOT EXISTS chat_messages_fts USING fts5(
  session_id,
  role,
  content,
  search_content,
  content=chat_messages,
  content_rowid=rowid
);

-- Triggers to keep chat FTS table in sync
CREATE TRIGGER IF NOT EXISTS chat_fts_insert AFTER INSERT ON chat_messages BEGIN
  INSERT INTO chat_messages_fts(rowid, session_id, role, content, search_content) 
  VALUES (new.rowid, new.session_id, new.role, new.content, new.search_content);
END;

CREATE TRIGGER IF NOT EXISTS chat_fts_update AFTER UPDATE ON chat_messages BEGIN
  UPDATE chat_messages_fts SET 
    session_id = new.session_id,
    role = new.role,
    content = new.content,
    search_content = new.search_content
  WHERE rowid = new.rowid;
END;

CREATE TRIGGER IF NOT EXISTS chat_fts_delete AFTER DELETE ON chat_messages BEGIN
  DELETE FROM chat_messages_fts WHERE rowid = old.rowid;
END;
`;

export const CHAT_VIEWS_SQL = `
-- Useful views for chat queries

-- Session summary view with message counts and date ranges
CREATE VIEW IF NOT EXISTS chat_session_summary AS
SELECT 
  s.id,
  s.agent,
  s.workspace,
  s.title,
  s.status,
  s.timestamp as session_start,
  s.message_count,
  s.duration,
  s.archived,
  COUNT(l.devlog_id) as linked_devlogs_count,
  MIN(m.timestamp) as first_message_time,
  MAX(m.timestamp) as last_message_time
FROM chat_sessions s
LEFT JOIN chat_messages m ON s.id = m.session_id
LEFT JOIN chat_devlog_links l ON s.id = l.session_id AND l.confirmed = 1
GROUP BY s.id;

-- Workspace activity summary
CREATE VIEW IF NOT EXISTS chat_workspace_activity AS
SELECT 
  workspace,
  COUNT(*) as session_count,
  SUM(message_count) as total_messages,
  MIN(timestamp) as first_session,
  MAX(timestamp) as last_session,
  COUNT(CASE WHEN archived = 0 THEN 1 END) as active_sessions
FROM chat_sessions 
WHERE workspace IS NOT NULL
GROUP BY workspace;

-- Devlog linking summary
CREATE VIEW IF NOT EXISTS chat_devlog_link_summary AS
SELECT 
  d.id as devlog_id,
  d.title as devlog_title,
  d.type as devlog_type,
  d.status as devlog_status,
  COUNT(l.session_id) as linked_sessions,
  COUNT(CASE WHEN l.confirmed = 1 THEN 1 END) as confirmed_links,
  COUNT(CASE WHEN l.reason = 'manual' THEN 1 END) as manual_links,
  AVG(l.confidence) as avg_confidence
FROM devlog_entries d
LEFT JOIN chat_devlog_links l ON d.id = l.devlog_id
GROUP BY d.id;
`;

/**
 * Initialize chat tables in SQLite database
 */
export function initializeChatTables(db: any): void {
  console.log('[SQLiteStorage] Creating chat tables...');
  
  try {
    // Create tables
    db.exec(CHAT_TABLES_SQL);
    console.log('[SQLiteStorage] Chat tables created successfully');
    
    // Create indexes  
    db.exec(CHAT_INDEXES_SQL);
    console.log('[SQLiteStorage] Chat indexes created successfully');
    
    // Create FTS tables and triggers
    db.exec(CHAT_FTS_SQL);
    console.log('[SQLiteStorage] Chat FTS search tables created successfully');
    
    // Create views
    db.exec(CHAT_VIEWS_SQL);
    console.log('[SQLiteStorage] Chat views created successfully');
    
  } catch (error: any) {
    console.error('[SQLiteStorage] Failed to create chat tables:', error);
    throw new Error('Failed to create chat tables: ' + error.message);
  }
}

/**
 * Get chat schema version for migrations
 */
export function getChatSchemaVersion(db: any): number {
  try {
    const result = db.prepare('PRAGMA user_version').get();
    return result.user_version || 0;
  } catch {
    return 0;
  }
}

/**
 * Set chat schema version for migrations
 */
export function setChatSchemaVersion(db: any, version: number): void {
  db.exec(`PRAGMA user_version = ${version}`);
}
