/**
 * Test Database Utilities
 *
 * Provides isolated database instances for testing to prevent interference
 * between test runs and ensure clean state for each test suite.
 */

import { DataSource } from 'typeorm';
import { createDataSource, type TypeORMStorageOptions } from '../../utils/typeorm-config.js';
import type { DevlogType, DevlogStatus, DevlogPriority } from '../../types/index.js';
import {
  ChatDevlogLinkEntity,
  ChatMessageEntity,
  ChatSessionEntity,
  DevlogDependencyEntity,
  DevlogEntryEntity,
  DevlogNoteEntity,
  ProjectEntity,
} from '../../entities/index.js';

/**
 * Test database configuration
 * Uses in-memory SQLite for fast, isolated tests
 */
export function createTestDatabaseConfig(testName: string): TypeORMStorageOptions {
  return {
    type: 'sqlite',
    database_path: `:memory:`, // In-memory for isolation
    synchronize: true, // Auto-create schema for tests
    logging: false, // Disable logging to reduce noise
  };
}

/**
 * Create an isolated test database instance
 * Each test suite gets its own database to prevent interference
 */
export async function createTestDatabase(testName: string): Promise<DataSource> {
  const config = createTestDatabaseConfig(testName);

  // For SQLite tests, create DataSource without entities to avoid enum validation
  // We'll add entities after initialization
  const dataSource = new DataSource({
    type: 'better-sqlite3',
    database: ':memory:',
    synchronize: false,
    logging: false,
    entities: [], // Empty initially to avoid enum validation
  });

  await dataSource.initialize();

  // Manually create tables with SQLite-compatible schema
  await createSQLiteSchema(dataSource);

  console.log(`[TestDB] Initialized isolated database for: ${testName}`);
  return dataSource;
}

/**
 * Create SQLite-compatible schema manually
 */
async function createSQLiteSchema(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_accessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS devlog_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_field VARCHAR(255) UNIQUE NOT NULL,
      title VARCHAR(500) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'task',
      description TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'new',
      priority VARCHAR(50) NOT NULL DEFAULT 'medium',
      assignee VARCHAR(255),
      project_id INTEGER NOT NULL,
      tags TEXT,
      files TEXT,
      dependencies TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME,
      completed_at DATETIME,
      estimated_hours INTEGER DEFAULT 0,
      actual_hours INTEGER DEFAULT 0,
      metadata TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  await dataSource.query(`
    CREATE TABLE IF NOT EXISTS devlog_notes (
      id VARCHAR(255) PRIMARY KEY,
      devlog_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'progress',
      author VARCHAR(255),
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      files TEXT,
      metadata TEXT,
      FOREIGN KEY (devlog_id) REFERENCES devlog_entries(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_devlog_status ON devlog_entries(status)`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_devlog_type ON devlog_entries(type)`);
  await dataSource.query(
    `CREATE INDEX IF NOT EXISTS idx_devlog_project ON devlog_entries(project_id)`,
  );
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_notes_devlog ON devlog_notes(devlog_id)`);

  console.log('[TestDB] SQLite schema created successfully');
}

/**
 * Clean up test database
 * Properly closes the database connection
 */
export async function cleanupTestDatabase(dataSource: DataSource): Promise<void> {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
    console.log('[TestDB] Database connection closed');
  }
}

/**
 * Clear all data from test database
 * Useful for cleanup between tests within a suite
 */
export async function clearTestDatabase(dataSource: DataSource): Promise<void> {
  if (!dataSource?.isInitialized) return;

  const entities = [
    ChatDevlogLinkEntity,
    ChatMessageEntity,
    ChatSessionEntity,
    DevlogDependencyEntity,
    DevlogNoteEntity,
    DevlogEntryEntity,
    ProjectEntity,
  ];

  // Clear in reverse order to handle foreign key constraints
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity);
    await repository.clear();
  }

  console.log('[TestDB] All data cleared from test database');
}

/**
 * Test project factory
 * Creates a test project with predictable data
 */
export async function createTestProject(
  dataSource: DataSource,
  overrides: Partial<{ name: string; description: string }> = {},
): Promise<ProjectEntity> {
  const repository = dataSource.getRepository(ProjectEntity);

  const project = new ProjectEntity();
  project.name = overrides.name || `Test Project ${Date.now()}`;
  project.description = overrides.description || 'Test project for isolated testing';
  project.createdAt = new Date();
  project.lastAccessedAt = new Date();

  return await repository.save(project);
}

/**
 * Test devlog factory
 * Creates a test devlog entry with predictable data
 */
export async function createTestDevlog(
  dataSource: DataSource,
  projectId: number,
  overrides: Partial<{
    title: string;
    description: string;
    type: DevlogType;
    status: DevlogStatus;
    priority: DevlogPriority;
  }> = {},
): Promise<DevlogEntryEntity> {
  const repository = dataSource.getRepository(DevlogEntryEntity);

  const devlog = new DevlogEntryEntity();
  devlog.key = `test-devlog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  devlog.title = overrides.title || `Test Devlog ${Date.now()}`;
  devlog.description = overrides.description || 'Test devlog for isolated testing';
  devlog.type = overrides.type || 'task';
  devlog.status = overrides.status || 'new';
  devlog.priority = overrides.priority || 'medium';
  devlog.projectId = projectId;
  devlog.createdAt = new Date();
  devlog.updatedAt = new Date();

  return await repository.save(devlog);
}
