import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { DevlogManager } from '../devlog-manager.js';
import { ConfigurationManager } from '../configuration-manager.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('DevlogManager', () => {
  let manager: DevlogManager;
  let testTmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Store original working directory
    originalCwd = process.cwd();
    
    // Create a unique temporary directory for each test
    testTmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'devlog-test-'));
    
    // Create a test configuration file in the temp directory
    const testConfig = {
      storage: {
        type: 'json' as const,
        json: {
          directory: '.devlog-test', // Use different directory name to avoid confusion
          filePattern: '{id:auto}-{slug}.json',
          minPadding: 3,
          global: false, // Use local directory, not global
        },
      },
    };
    
    // Write the test config to the temp directory
    await fs.writeFile(
      path.join(testTmpDir, 'devlog.config.json'),
      JSON.stringify(testConfig, null, 2)
    );
    
    // Change to the test directory BEFORE creating DevlogManager
    // This ensures getWorkspaceRoot() finds our test directory
    process.chdir(testTmpDir);
    
    // Create isolated DevlogManager instance - this will now find our test config
    manager = new DevlogManager();
    
    // IMPORTANT: Initialize the manager while still in test directory
    // This ensures ConfigurationManager.initialize() captures the correct workspace root
    await manager.initialize();
    
    // Now we can safely restore the original working directory
    process.chdir(originalCwd);
    
    // DO NOT DELETE ENTRIES - The temp directory should start clean
    // and the DevlogManager should be isolated to that directory
  });

  afterEach(async () => {
    // Ensure we're back in original directory
    process.chdir(originalCwd);
    
    // Clean up the temporary directory after each test
    if (testTmpDir) {
      await fs.rm(testTmpDir, { recursive: true, force: true });
    }
  });

  describe('createDevlog', () => {
    it('should create a new devlog entry', async () => {
      const result = await manager.createDevlog({
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
      const result = await manager.createDevlog({
        title: 'Default Priority Test',
        type: 'bugfix',
        description: 'Testing default priority',
      });

      expect(result.priority).toBe('medium');
    });
  });

  describe('updateDevlog', () => {
    it('should update an existing devlog', async () => {
      const created = await manager.createDevlog({
        title: 'Update Test',
        type: 'feature',
        description: 'Testing updates',
      });

      const result = await manager.updateDevlog({
        id: created.id!,
        status: 'in-progress',
      });

      expect(result.status).toBe('in-progress');
      // Notes should not be created by updateDevlog - use addNote method instead
      expect(result.notes).toHaveLength(0);
    });

    it('should update multiple fields', async () => {
      const created = await manager.createDevlog({
        title: 'Multi Update Test',
        type: 'task',
        description: 'Testing multiple updates',
      });

      const result = await manager.updateDevlog({
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
      const created = await manager.createDevlog({
        title: 'Get Test',
        type: 'task',
        description: 'Testing retrieval',
      });

      const result = await manager.getDevlog(created.id!);

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Get Test');
      expect(result!.type).toBe('task');
      expect(result!.status).toBe('new');
    });

    it('should return null for non-existent devlog', async () => {
      const result = await manager.getDevlog(999); // Non-existent ID
      expect(result).toBeNull();
    });
  });

  describe('listDevlogs', () => {
    it('should list all devlogs', async () => {
      await manager.createDevlog({
        title: 'Feature 1',
        type: 'feature',
        description: 'First feature',
      });

      await manager.createDevlog({
        title: 'Bug Fix 1',
        type: 'bugfix',
        description: 'First bug fix',
      });

      const result = await manager.listDevlogs();

      expect(result).toHaveLength(2);
      expect(result.some((entry) => entry.title === 'Feature 1')).toBe(true);
      expect(result.some((entry) => entry.title === 'Bug Fix 1')).toBe(true);
    });

    it('should filter devlogs by status', async () => {
      const created1 = await manager.createDevlog({
        title: 'Todo Task',
        type: 'task',
        description: 'A todo task',
      });

      const created2 = await manager.createDevlog({
        title: 'Done Task',
        type: 'task',
        description: 'A done task',
      });

      await manager.updateDevlog({
        id: created2.id!,
        status: 'done',
      });

      const todoItems = await manager.listDevlogs({ status: ['new'] });
      const doneItems = await manager.listDevlogs({ status: ['done'] });

      expect(todoItems).toHaveLength(1);
      expect(todoItems[0].title).toBe('Todo Task');
      expect(doneItems).toHaveLength(1);
      expect(doneItems[0].title).toBe('Done Task');
    });

    it('should filter devlogs by type', async () => {
      await manager.createDevlog({
        title: 'Feature Task',
        type: 'feature',
        description: 'A feature',
      });

      await manager.createDevlog({
        title: 'Bug Task',
        type: 'bugfix',
        description: 'A bug fix',
      });

      const features = await manager.listDevlogs({ type: ['feature'] });
      const bugfixes = await manager.listDevlogs({ type: ['bugfix'] });

      expect(features).toHaveLength(1);
      expect(features[0].title).toBe('Feature Task');
      expect(bugfixes).toHaveLength(1);
      expect(bugfixes[0].title).toBe('Bug Task');
    });

    it('should exclude closed entries by default', async () => {
      const activeEntry = await manager.createDevlog({
        title: 'Active Task',
        type: 'task',
        description: 'An active task',
      });

      const closableEntry = await manager.createDevlog({
        title: 'Closable Task',
        type: 'task',
        description: 'A task to be closed',
      });

      // Close one entry
      await manager.closeDevlog(closableEntry.id!, 'Test closure');

      // Default list should exclude closed entries
      const defaultResults = await manager.listDevlogs();
      expect(defaultResults).toHaveLength(1);
      expect(defaultResults[0].title).toBe('Active Task');

      // Explicit filter for closed should show closed entries
      const closedResults = await manager.listDevlogs({ status: ['closed'] });
      expect(closedResults).toHaveLength(1);
      expect(closedResults[0].title).toBe('Closable Task');

      // All entries (including closed) should be accessible when explicitly requested
      const allResults = await manager.listDevlogs({ 
        status: ['new', 'in-progress', 'blocked', 'in-review', 'testing', 'done', 'closed'] 
      });
      expect(allResults).toHaveLength(2);
    });
  });

  describe('searchDevlogs', () => {
    it('should search devlogs by text', async () => {
      await manager.createDevlog({
        title: 'Authentication Feature',
        type: 'feature',
        description: 'Implement user authentication',
      });

      await manager.createDevlog({
        title: 'Database Bug',
        type: 'bugfix',
        description: 'Fix database connection issue',
      });

      const authResults = await manager.searchDevlogs('authentication');
      const dbResults = await manager.searchDevlogs('database');

      expect(authResults).toHaveLength(1);
      expect(authResults[0].title).toBe('Authentication Feature');
      expect(dbResults).toHaveLength(1);
      expect(dbResults[0].title).toBe('Database Bug');
    });

    it('should exclude closed entries from search by default', async () => {
      const activeEntry = await manager.createDevlog({
        title: 'Active Search Test',
        type: 'feature',
        description: 'Search functionality',
      });

      const closableEntry = await manager.createDevlog({
        title: 'Closed Search Test',
        type: 'feature',
        description: 'Search functionality',
      });

      // Close one entry
      await manager.closeDevlog(closableEntry.id!, 'Test closure');

      // Default search should exclude closed entries
      const defaultResults = await manager.searchDevlogs('search');
      expect(defaultResults).toHaveLength(1);
      expect(defaultResults[0].title).toBe('Active Search Test');

      // Search with explicit closed filter should show closed entries
      const closedResults = await manager.searchDevlogs('search', { status: ['closed'] });
      expect(closedResults).toHaveLength(1);
      expect(closedResults[0].title).toBe('Closed Search Test');
    });
  });

  describe('addNote', () => {
    it('should add a note to an existing devlog', async () => {
      const created = await manager.createDevlog({
        title: 'Note Test',
        type: 'task',
        description: 'Testing notes',
      });

      const result = await manager.addNote(
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
      const created = await manager.createDevlog({
        title: 'Complete Test',
        type: 'task',
        description: 'Testing completion',
      });

      const result = await manager.completeDevlog(created.id!, 'Task completed successfully');

      expect(result.status).toBe('done');
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0].content).toBe('Completed: Task completed successfully');
    });
  });

  describe('getActiveContext', () => {
    it('should return active devlogs only', async () => {
      const active1 = await manager.createDevlog({
        title: 'Active Task 1',
        type: 'task',
        description: 'An active task',
        priority: 'high',
      });

      const active2 = await manager.createDevlog({
        title: 'Active Task 2',
        type: 'feature',
        description: 'Another active task',
        priority: 'medium',
      });

      const completed = await manager.createDevlog({
        title: 'Completed Task',
        type: 'task',
        description: 'A completed task',
      });

      await manager.completeDevlog(completed.id!);

      const context = await manager.getActiveContext();

      expect(context).toHaveLength(2);
      expect(context.some((entry) => entry.title === 'Active Task 1')).toBe(true);
      expect(context.some((entry) => entry.title === 'Active Task 2')).toBe(true);
      expect(context.some((entry) => entry.title === 'Completed Task')).toBe(false);
    });

    it('should respect the limit parameter', async () => {
      for (let i = 1; i <= 5; i++) {
        await manager.createDevlog({
          title: `Task ${i}`,
          type: 'task',
          description: `Task number ${i}`,
        });
      }

      const context = await manager.getActiveContext(3);
      expect(context).toHaveLength(3);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      await manager.createDevlog({
        title: 'Feature 1',
        type: 'feature',
        description: 'A feature',
        priority: 'high',
      });

      const bugfix = await manager.createDevlog({
        title: 'Bug 1',
        type: 'bugfix',
        description: 'A bug fix',
        priority: 'medium',
      });

      await manager.completeDevlog(bugfix.id!);

      const stats = await manager.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.byType.feature).toBe(1);
      expect(stats.byType.bugfix).toBe(1);
      expect(stats.byStatus.new).toBe(1);
      expect(stats.byStatus.done).toBe(1);
      expect(stats.byPriority.high).toBe(1);
      expect(stats.byPriority.medium).toBe(1);
    });
  });

  describe('deleteDevlog', () => {
    it('should delete an existing devlog', async () => {
      const created = await manager.createDevlog({
        title: 'Delete Test',
        type: 'task',
        description: 'Testing deletion',
      });

      await manager.deleteDevlog(created.id!);

      const result = await manager.getDevlog(created.id!);
      expect(result).toBeNull();
    });

    it('should throw error for non-existent devlog', async () => {
      await expect(manager.deleteDevlog(999)).rejects.toThrow('not found');
    });
  });
});
