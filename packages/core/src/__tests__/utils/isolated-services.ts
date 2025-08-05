/**
 * Isolated Service Factory
 *
 * Creates service instances that use isolated test databases
 * instead of the singleton global instances.
 */

import { DataSource } from 'typeorm';
import { DevlogService } from '../../services/devlog-service.js';
import { ProjectService } from '../../services/project-service.js';

/**
 * Creates a DevlogService instance that uses the provided test database
 * instead of the global singleton database connection
 */
export function createIsolatedDevlogService(
  testDatabase: DataSource,
  projectId?: number,
): DevlogService {
  // Create a custom DevlogService that bypasses the singleton pattern
  // and uses our test database directly
  const service = Object.create(DevlogService.prototype);

  // Initialize the service with our test database
  service.projectId = projectId;
  service.database = testDatabase;
  service.devlogRepository = testDatabase.getRepository('DevlogEntryEntity');
  service.noteRepository = testDatabase.getRepository('DevlogNoteEntity');

  // Override ensureInitialized to be a no-op since we're already initialized
  service.ensureInitialized = async () => Promise.resolve();

  return service;
}

/**
 * Creates a ProjectService instance that uses the provided test database
 * instead of the global singleton database connection
 */
export function createIsolatedProjectService(testDatabase: DataSource): ProjectService {
  // Create a custom ProjectService that bypasses the singleton pattern
  // and uses our test database directly
  const service = Object.create(ProjectService.prototype);

  // Initialize the service with our test database
  service.database = testDatabase;
  service.repository = testDatabase.getRepository('ProjectEntity');

  // Override ensureInitialized to be a no-op since we're already initialized
  service.ensureInitialized = async () => Promise.resolve();

  return service;
}

/**
 * Test suite isolation helper
 * Provides everything needed for an isolated test environment
 */
export interface IsolatedTestEnvironment {
  database: DataSource;
  projectService: ProjectService;
  devlogService: (projectId?: number) => DevlogService;
  cleanup: () => Promise<void>;
}

/**
 * Create a complete isolated test environment
 * Includes database, services, and cleanup functions
 */
export async function createIsolatedTestEnvironment(
  testSuiteName: string,
): Promise<IsolatedTestEnvironment> {
  // Import the test database utilities with environment already set
  const { createTestDatabase, cleanupTestDatabase } = await import('./test-env.js');

  const database = await createTestDatabase(testSuiteName);

  return {
    database,
    projectService: createIsolatedProjectService(database),
    devlogService: (projectId?: number) => createIsolatedDevlogService(database, projectId),
    cleanup: () => cleanupTestDatabase(database),
  };
}
