import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { DevlogManager } from '../devlog-manager.js';
import { ConfigurationManager } from '../configuration-manager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('DevlogManager', () => {
  let devlogManager: DevlogManager;
  let testTmpDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Store original working directory and environment
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    
    // Create a unique temporary directory for each test
    testTmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devlog-test-'));
    
    // Set up environment variables for testing instead of config file
    process.env.DEVLOG_JSON_DIRECTORY = '.devlog-test';
    process.env.DEVLOG_JSON_GLOBAL = 'false';
    process.env.DEVLOG_JSON_MIN_PADDING = '3';
    
    // Change to the test directory BEFORE creating DevlogManager
    // This ensures getWorkspaceRoot() finds our test directory
    process.chdir(testTmpDir);

    // Create package.json to make it look like a project root  
    await fs.writeFile(
      path.join(testTmpDir, 'package.json'), 
      JSON.stringify({ name: 'test-project' }, null, 2)
    );

    // Create isolated DevlogManager instance - this will now find our test config
    devlogManager = new DevlogManager();
    
    // Initialize the manager (this will load config from environment and create storage)
    // This ensures ConfigurationManager.initialize() captures the correct workspace root
    await devlogManager.initialize();
    
  });

  afterEach(async () => {
    // Restore original environment
    process.env = originalEnv;
    
    // Ensure we're back in original directory
    process.chdir(originalCwd);
    
    // Clean up the temporary directory after each test
    if (testTmpDir) {
      await fs.rm(testTmpDir, { recursive: true, force: true });
    }
  });

  describe('createDevlog', () => {
    it('should create a new devlog entry', async () => {
      const result = await devlogManager.createDevlog({
        title: 'Test Feature',
        type: 'feature',
        description: 'A test feature',
        priority: 'high',
        businessContext: 'Important business requirement',
        technicalContext: 'Uses TypeScript',
      });

      expect(result.title).toBe('Test Feature');
      expect(result.type).toBe('feature');
      expect(result.description).toBe('A test feature');
      expect(result.priority).toBe('high');
      expect(result.status).toBe('new');
      expect(result.context?.businessContext).toBe('Important business requirement');
      expect(result.context?.technicalContext).toBe('Uses TypeScript');
    });

    it('should create a devlog with default priority', async () => {
      const result = await devlogManager.createDevlog({
        title: 'Default Priority Test',
        type: 'bugfix',
        description: 'Testing default priority',
      });

      expect(result.priority).toBe('medium');
    });
  });

  describe('updateDevlog', () => {
    it('should update an existing devlog', async () => {
      const created = await devlogManager.createDevlog({
        title: 'Update Test',
        type: 'feature',
        description: 'Testing updates',
      });

      const result = await devlogManager.updateDevlog({
        id: created.id!,
        status: 'in-progress',
      });

      expect(result.status).toBe('in-progress');
      // Notes should not be created by updateDevlog - use addNote method instead
      expect(result.notes).toHaveLength(0);
    });

    it('should update multiple fields', async () => {
      const created = await devlogManager.createDevlog({
        title: 'Multi Update Test',
        type: 'task',
        description: 'Testing multiple updates',
      });

      const result = await devlogManager.updateDevlog({
        id: created.id!,
        title: 'Updated Title',
        priority: 'critical',
        files: ['file1.ts', 'file2.ts'],
      });

      expect(result.title).toBe('Updated Title');
      expect(result.priority).toBe('critical');
      expect(result.files).toEqual(['file1.ts', 'file2.ts']);
    });
  });

  describe('getDevlog', () => {
    it('should retrieve an existing devlog', async () => {
      const created = await devlogManager.createDevlog({
        title: 'Get Test',
        type: 'task',
        description: 'Testing retrieval',
      });

      const result = await devlogManager.getDevlog(created.id!);

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Get Test');
      expect(result!.type).toBe('task');
      expect(result!.status).toBe('new');
    });

    it('should return null for non-existent devlog', async () => {
      const result = await devlogManager.getDevlog(999); // Non-existent ID
      expect(result).toBeNull();
    });
  });

  describe('listDevlogs', () => {
    it('should list all devlogs', async () => {
      await devlogManager.createDevlog({
        title: 'Feature 1',
        type: 'feature',
        description: 'First feature',
      });

      await devlogManager.createDevlog({
        title: 'Bug Fix 1',
        type: 'bugfix',
        description: 'First bug fix',
      });

      const result = await devlogManager.listDevlogs();

      expect(result.items).toHaveLength(2);
      expect(result.items.some((entry) => entry.title === 'Feature 1')).toBe(true);
      expect(result.items.some((entry) => entry.title === 'Bug Fix 1')).toBe(true);
    });

    it('should filter devlogs by status', async () => {
      const created1 = await devlogManager.createDevlog({
        title: 'Todo Task',
        type: 'task',
        description: 'A todo task',
      });

      const created2 = await devlogManager.createDevlog({
        title: 'Done Task',
        type: 'task',
        description: 'A done task',
      });

      await devlogManager.updateDevlog({
        id: created2.id!,
        status: 'done',
      });

      const todoItems = await devlogManager.listDevlogs({ status: ['new'] });
      const doneItems = await devlogManager.listDevlogs({ status: ['done'] });

      expect(todoItems.items).toHaveLength(1);
      expect(todoItems.items[0].title).toBe('Todo Task');
      expect(doneItems.items).toHaveLength(1);
      expect(doneItems.items[0].title).toBe('Done Task');
    });

    it('should filter devlogs by type', async () => {
      await devlogManager.createDevlog({
        title: 'Feature Task',
        type: 'feature',
        description: 'A feature',
      });

      await devlogManager.createDevlog({
        title: 'Bug Task',
        type: 'bugfix',
        description: 'A bug fix',
      });

      const features = await devlogManager.listDevlogs({ type: ['feature'] });
      const bugfixes = await devlogManager.listDevlogs({ type: ['bugfix'] });

      expect(features.items).toHaveLength(1);
      expect(features.items[0].title).toBe('Feature Task');
      expect(bugfixes.items).toHaveLength(1);
      expect(bugfixes.items[0].title).toBe('Bug Task');
    });

    it('should exclude cancelled entries by default', async () => {
      const activeEntry = await devlogManager.createDevlog({
        title: 'Active Task',
        type: 'task',
        description: 'An active task',
      });

      const closableEntry = await devlogManager.createDevlog({
        title: 'Closable Task',
        type: 'task',
        description: 'A task to be cancelled',
      });

      // Close one entry
      await devlogManager.closeDevlog(closableEntry.id!, 'Test closure');

      // Default list should exclude cancelled entries
      const defaultResults = await devlogManager.listDevlogs();
      expect(defaultResults.items).toHaveLength(1);
      expect(defaultResults.items[0].title).toBe('Active Task');

      // Explicit filter for cancelled should show cancelled entries
      const cancelledResults = await devlogManager.listDevlogs({ status: ['cancelled'] });
      expect(cancelledResults.items).toHaveLength(1);
      expect(cancelledResults.items[0].title).toBe('Closable Task');

      // All entries (including cancelled) should be accessible when explicitly requested
      const allResults = await devlogManager.listDevlogs({ 
        status: ['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'cancelled'] 
      });
      expect(allResults.items).toHaveLength(2);
    });
  });

  describe('searchDevlogs', () => {
    it('should search devlogs by text', async () => {
      await devlogManager.createDevlog({
        title: 'Authentication Feature',
        type: 'feature',
        description: 'Implement user authentication',
      });

      await devlogManager.createDevlog({
        title: 'Database Bug',
        type: 'bugfix',
        description: 'Fix database connection issue',
      });

      const authResults = await devlogManager.searchDevlogs('authentication');
      const dbResults = await devlogManager.searchDevlogs('database');

      expect(authResults).toHaveLength(1);
      expect(authResults[0].title).toBe('Authentication Feature');
      expect(dbResults).toHaveLength(1);
      expect(dbResults[0].title).toBe('Database Bug');
    });

    it('should exclude cancelled entries from search by default', async () => {
      const activeEntry = await devlogManager.createDevlog({
        title: 'Active Search Test',
        type: 'feature',
        description: 'Search functionality',
      });

      const closableEntry = await devlogManager.createDevlog({
        title: 'Cancelled Search Test',
        type: 'feature',
        description: 'Search functionality',
      });

      // Close one entry
      await devlogManager.closeDevlog(closableEntry.id!, 'Test closure');

      // Default search should exclude cancelled entries
      const defaultResults = await devlogManager.searchDevlogs('search');
      expect(defaultResults).toHaveLength(1);
      expect(defaultResults[0].title).toBe('Active Search Test');

      // Search with explicit cancelled filter should show cancelled entries
      const cancelledResults = await devlogManager.searchDevlogs('search', { status: ['cancelled'] });
      expect(cancelledResults).toHaveLength(1);
      expect(cancelledResults[0].title).toBe('Cancelled Search Test');
    });
  });

  describe('addNote', () => {
    it('should add a note to an existing devlog', async () => {
      const created = await devlogManager.createDevlog({
        title: 'Note Test',
        type: 'task',
        description: 'Testing notes',
      });

      const result = await devlogManager.addNote(
        created.id!,
        'Made some progress on this task',
        'progress',
      );

      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].content).toBe('Made some progress on this task');
      expect(result.notes[0].category).toBe('progress');
    });
  });

  describe('completeDevlog', () => {
    it('should mark a devlog as complete', async () => {
      const created = await devlogManager.createDevlog({
        title: 'Complete Test',
        type: 'task',
        description: 'Testing completion',
      });

      const result = await devlogManager.completeDevlog(created.id!, 'Task completed successfully');

      expect(result.status).toBe('done');
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].content).toBe('Completed: Task completed successfully');
    });
  });

  describe('getActiveContext', () => {
    it('should return active devlogs only', async () => {
      const active1 = await devlogManager.createDevlog({
        title: 'Active Task 1',
        type: 'task',
        description: 'An active task',
        priority: 'high',
      });

      const active2 = await devlogManager.createDevlog({
        title: 'Active Task 2',
        type: 'feature',
        description: 'Another active task',
        priority: 'medium',
      });

      const completed = await devlogManager.createDevlog({
        title: 'Completed Task',
        type: 'task',
        description: 'A completed task',
      });

      await devlogManager.completeDevlog(completed.id!);

      const context = await devlogManager.getActiveContext();

      expect(context).toHaveLength(2);
      expect(context.some((entry) => entry.title === 'Active Task 1')).toBe(true);
      expect(context.some((entry) => entry.title === 'Active Task 2')).toBe(true);
      expect(context.some((entry) => entry.title === 'Completed Task')).toBe(false);
    });

    it('should respect the limit parameter', async () => {
      for (let i = 1; i <= 5; i++) {
        await devlogManager.createDevlog({
          title: `Task ${i}`,
          type: 'task',
          description: `Task number ${i}`,
        });
      }

      const context = await devlogManager.getActiveContext(3);
      expect(context).toHaveLength(3);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await devlogManager.createDevlog({
        title: 'Feature 1',
        type: 'feature',
        description: 'A feature',
        priority: 'high',
      });

      const bugfix = await devlogManager.createDevlog({
        title: 'Bug 1',
        type: 'bugfix',
        description: 'A bug fix',
        priority: 'medium',
      });

      await devlogManager.completeDevlog(bugfix.id!);

      const stats = await devlogManager.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.byType.feature).toBe(1);
      expect(stats.byType.bugfix).toBe(1);
      expect(stats.byStatus.new).toBe(1);
      expect(stats.byStatus.done).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.medium).toBe(1);
    });

    it('should include cancelled entries in statistics', async () => {
      // Create entries with different statuses
      const activeEntry = await devlogManager.createDevlog({
        title: 'Active Task',
        type: 'task',
        description: 'An active task',
      });

      const cancelledEntry = await devlogManager.createDevlog({
        title: 'Cancelled Task',
        type: 'feature',
        description: 'A task to be cancelled',
      });

      const completedEntry = await devlogManager.createDevlog({
        title: 'Completed Task',
        type: 'bugfix',
        description: 'A completed task',
      });

      // Close one entry (cancelled)
      await devlogManager.closeDevlog(cancelledEntry.id!, 'Not needed anymore');

      // Complete one entry
      await devlogManager.completeDevlog(completedEntry.id!);

      const stats = await devlogManager.getStats();

      // All entries should be included (cancelled should not be excluded from stats)
      expect(stats.totalEntries).toBe(3);
      expect(stats.byStatus.new).toBe(1);      // activeEntry
      expect(stats.byStatus.cancelled).toBe(1); // cancelledEntry
      expect(stats.byStatus.done).toBe(1);     // completedEntry
      expect(stats.openEntries).toBe(1);       // activeEntry only
      expect(stats.closedEntries).toBe(2);     // cancelled + done
    });

    it('should exclude archived entries from statistics', async () => {
      // Create regular entries
      const activeEntry = await devlogManager.createDevlog({
        title: 'Active Task',
        type: 'task',
        description: 'An active task',
      });

      const archivedEntry = await devlogManager.createDevlog({
        title: 'Archived Task',
        type: 'feature',
        description: 'A task to be archived',
      });

      // Archive one entry
      await devlogManager.archiveDevlog(archivedEntry.id!);

      const stats = await devlogManager.getStats();

      // Only non-archived entries should be included
      expect(stats.totalEntries).toBe(1);
      expect(stats.byStatus.new).toBe(1);      // activeEntry only
      expect(stats.byType.task).toBe(1);       // activeEntry only
      expect(stats.byType.feature).toBeUndefined(); // archivedEntry excluded
    });
  });

  describe('deleteDevlog', () => {
    it('should delete an existing devlog', async () => {
      const created = await devlogManager.createDevlog({
        title: 'Delete Test',
        type: 'task',
        description: 'Testing deletion',
      });

      await devlogManager.deleteDevlog(created.id!);

      const result = await devlogManager.getDevlog(created.id!);
      expect(result).toBeNull();
    });

    it('should throw error for non-existent devlog', async () => {
      await expect(devlogManager.deleteDevlog(999)).rejects.toThrow('not found');
    });
  });
});
