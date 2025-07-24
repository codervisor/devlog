import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MCPDevlogAdapter } from '../adapters/mcp-adapter.js';
import { DevlogType, DevlogStatus, DevlogPriority } from '@devlog/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MCPDevlogAdapter', () => {
  let testWorkspace: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let adapter: MCPDevlogAdapter;

  beforeEach(async () => {
    // Store original environment and working directory
    originalCwd = process.cwd();
    originalEnv = { ...process.env };

    // Create test workspace with unique timestamp to avoid conflicts
    testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-adapter-test-'));

    // Change to test workspace
    process.chdir(testWorkspace);

    // Set up environment variables for testing instead of config file
    process.env.DEVLOG_JSON_DIRECTORY = '.devlog-test';
    process.env.DEVLOG_JSON_GLOBAL = 'false';

    // Create minimal package.json to make directory detectable as project root
    const packageJson = {
      name: 'mcp-adapter-test',
      version: '1.0.0',
      private: true,
    };
    await fs.writeFile(
      path.join(testWorkspace, 'package.json'),
      JSON.stringify(packageJson, null, 2),
    );

    // Initialize adapter
    adapter = new MCPDevlogAdapter();
    await adapter.initialize();
  });

  afterEach(async () => {
    // Clean up adapter
    await adapter.dispose();

    // Restore original environment and working directory
    process.env = originalEnv;
    process.chdir(originalCwd);

    // Clean up test workspace
    try {
      await fs.rm(testWorkspace, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Failed to clean up test workspace:', error);
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(adapter).toBeDefined();
      expect(adapter.manager).toBeDefined();
    });

    it('should have default workspace ID', () => {
      const workspaceId = adapter.getCurrentWorkspaceId();
      expect(workspaceId).toBe('default');
    });

    it('should allow setting workspace ID', () => {
      const testId = 'test-workspace-id';
      adapter.setCurrentWorkspaceId(testId);
      expect(adapter.getCurrentWorkspaceId()).toBe(testId);
    });
  });

  describe('devlog CRUD operations', () => {
    it('should create devlog entry', async () => {
      const createArgs = {
        title: 'Test Devlog Entry',
        type: 'task' as DevlogType,
        description: 'Test description for devlog entry',
        businessContext: 'Testing business context',
        technicalContext: 'Testing technical context',
        priority: 'medium' as DevlogPriority,
      };

      const result = await adapter.createDevlog(createArgs);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Created devlog entry:');
      expect(result.content[0].text).toContain('Test Devlog Entry');
    });

    it('should update devlog entry', async () => {
      // First create an entry
      const createArgs = {
        title: 'Entry to Update',
        type: 'task' as DevlogType,
        description: 'Entry that will be updated',
      };

      const createResult = await adapter.createDevlog(createArgs);
      const entryIdMatch = (createResult.content[0] as any).text.match(
        /Created devlog entry: (\d+)/,
      );
      expect(entryIdMatch).toBeTruthy();
      const entryId = parseInt(entryIdMatch![1], 10);

      // Update the entry
      const updateArgs = {
        id: entryId,
        status: 'in-progress' as DevlogStatus,
        blockers: 'Testing update functionality',
      };

      const updateResult = await adapter.updateDevlog(updateArgs);

      expect(updateResult).toBeDefined();
      expect(updateResult.content[0].text).toContain('Updated devlog entry');
      expect(updateResult.content[0].text).toContain('in-progress');
    });

    it('should retrieve devlog entry', async () => {
      // First create an entry
      const createArgs = {
        title: 'Entry to Retrieve',
        type: 'feature' as DevlogType,
        description: 'Entry that will be retrieved',
      };

      const createResult = await adapter.createDevlog(createArgs);
      const entryIdMatch = (createResult.content[0] as any).text.match(
        /Created devlog entry: (\d+)/,
      );
      const entryId = parseInt(entryIdMatch![1], 10);

      // Retrieve the entry
      const getResult = await adapter.getDevlog({ id: entryId });

      expect(getResult).toBeDefined();
      expect(getResult.content[0].text).toContain('Entry to Retrieve');
    });

    it('should list devlog entries', async () => {
      // Create some test entries
      await adapter.createDevlog({
        title: 'First Entry',
        type: 'task' as DevlogType,
        description: 'First test entry',
      });

      await adapter.createDevlog({
        title: 'Second Entry',
        type: 'bugfix' as DevlogType,
        description: 'Second test entry',
      });

      // List entries
      const listResult = await adapter.listDevlogs({});

      expect(listResult).toBeDefined();
      expect(listResult.content).toBeDefined();
      expect(listResult.content.length).toBeGreaterThan(0);

      const responseText = listResult.content[0].text;
      expect(responseText).toContain('First Entry');
      expect(responseText).toContain('Second Entry');
    });

    it('should search devlog entries', async () => {
      // Create entries with specific keywords
      await adapter.createDevlog({
        title: 'Authentication Feature',
        type: 'feature' as DevlogType,
        description: 'Implement user authentication system',
      });

      await adapter.createDevlog({
        title: 'Database Bugfix',
        type: 'bugfix' as DevlogType,
        description: 'Fix database connection issue',
      });

      // Search for specific terms
      const searchResult = await adapter.searchDevlogs({ query: 'authentication' });

      expect(searchResult).toBeDefined();
      expect(searchResult.content[0].text).toContain('Authentication Feature');
      expect(searchResult.content[0].text).not.toContain('Database Bugfix');
    });
  });

  describe('devlog note operations', () => {
    it('should add note to devlog entry', async () => {
      // Create an entry
      const createArgs = {
        title: 'Entry for Notes',
        type: 'task' as DevlogType,
        description: 'Entry to test note functionality',
      };

      const createResult = await adapter.createDevlog(createArgs);
      const entryIdMatch = (createResult.content[0] as any).text.match(
        /Created devlog entry: (\d+)/,
      );
      const entryId = parseInt(entryIdMatch![1], 10);

      // Add a note
      const noteResult = await adapter.addDevlogNote({
        id: entryId,
        note: 'This is a test note',
        category: 'progress',
      });

      expect(noteResult).toBeDefined();
      expect(noteResult.content[0].text).toContain('Added progress note');
      expect(noteResult.content[0].text).toContain('This is a test note');
    });

    it('should add decision to devlog entry', async () => {
      // Create an entry
      const createResult = await adapter.createDevlog({
        title: 'Decision Test Entry',
        type: 'task' as DevlogType,
        description: 'Entry to test decision functionality',
      });

      const entryIdMatch = (createResult.content[0] as any).text.match(
        /Created devlog entry: (\d+)/,
      );
      const entryId = parseInt(entryIdMatch![1], 10);

      // Add a decision
      const decisionResult = await adapter.addDecision({
        id: entryId,
        decision: 'Use TypeScript for implementation',
        rationale: 'Better type safety and developer experience',
        decisionMaker: 'ai-agent',
        alternatives: ['JavaScript', 'Python'],
      });

      expect(decisionResult).toBeDefined();
      expect(decisionResult.content[0].text).toContain('Added decision');
      expect(decisionResult.content[0].text).toContain('Use TypeScript for implementation');
    });

    it('should update devlog with note', async () => {
      // Create an entry
      const createResult = await adapter.createDevlog({
        title: 'Update with Note Test',
        type: 'task' as DevlogType,
        description: 'Test updating status and adding note',
      });

      const entryIdMatch = (createResult.content[0] as any).text.match(
        /Created devlog entry: (\d+)/,
      );
      const entryId = parseInt(entryIdMatch![1], 10);

      // Update with note
      const updateResult = await adapter.updateDevlogWithNote({
        id: entryId,
        status: 'in-progress' as DevlogStatus,
        note: 'Started working on this task',
        category: 'progress',
      });

      expect(updateResult).toBeDefined();
      expect(updateResult.content[0].text).toContain('Updated devlog');
      expect(updateResult.content[0].text).toContain('Started working on this task');
      expect(updateResult.content[0].text).toContain('in-progress');
    });
  });

  describe('devlog lifecycle operations', () => {
    let testEntryId: number;

    beforeEach(async () => {
      // Create a test entry for lifecycle operations
      const createResult = await adapter.createDevlog({
        title: 'Lifecycle Test Entry',
        type: 'task' as DevlogType,
        description: 'Entry to test lifecycle operations',
      });

      const entryIdMatch = (createResult.content[0] as any).text.match(
        /Created devlog entry: (\d+)/,
      );
      testEntryId = parseInt(entryIdMatch![1], 10);
    });

    it('should complete devlog entry', async () => {
      const completeResult = await adapter.completeDevlog({
        id: testEntryId,
        summary: 'Task completed successfully',
      });

      expect(completeResult).toBeDefined();
      expect((completeResult.content[0] as any).text).toContain('Completed devlog');
      expect((completeResult.content[0] as any).text).toContain('Task completed successfully');

      // Verify the completion note was added to the entry
      const completedEntry = await adapter.getDevlog({ id: testEntryId });
      expect(completedEntry).toBeDefined();
      const entryData = JSON.parse((completedEntry.content[0] as any).text);
      expect(entryData.status).toBe('done');
      expect(entryData.closedAt).toBeDefined();
      expect(entryData.notes).toBeDefined();
      expect(entryData.notes.length).toBeGreaterThan(0);

      // Find the completion note
      const completionNote = entryData.notes.find((note: any) =>
        note.content.includes('Completed: Task completed successfully'),
      );
      expect(completionNote).toBeDefined();
      expect(completionNote.category).toBe('progress');
    });

    it('should complete devlog entry without summary', async () => {
      // Create a new entry for this test
      const createResult = await adapter.createDevlog({
        title: 'Test Entry for Completion Without Summary',
        type: 'task',
        description: 'Test completion without summary',
      });

      const entryIdMatch = (createResult.content[0] as any).text.match(
        /Created devlog entry: (\d+)/,
      );
      const noSummaryEntryId = parseInt(entryIdMatch![1], 10);

      const completeResult = await adapter.completeDevlog({
        id: noSummaryEntryId,
      });

      expect(completeResult).toBeDefined();
      expect((completeResult.content[0] as any).text).toContain('Completed devlog');
      expect((completeResult.content[0] as any).text).not.toContain('with summary');

      // Verify the entry is completed but no completion note was added
      const completedEntry = await adapter.getDevlog({ id: noSummaryEntryId });
      expect(completedEntry).toBeDefined();
      const entryData = JSON.parse((completedEntry.content[0] as any).text);
      expect(entryData.status).toBe('done');
      expect(entryData.closedAt).toBeDefined();

      // Should not have any completion notes (no summary provided)
      const completionNote = entryData.notes.find((note: any) =>
        note.content.includes('Completed:'),
      );
      expect(completionNote).toBeUndefined();
    });

    it('should close devlog entry', async () => {
      // Create a new entry for this test since the previous tests modified testEntryId
      const createResult = await adapter.createDevlog({
        title: 'Test Entry for Closure',
        type: 'task',
        description: 'Test closure with reason',
      });

      const entryIdMatch = (createResult.content[0] as any).text.match(
        /Created devlog entry: (\d+)/,
      );
      const closeEntryId = parseInt(entryIdMatch![1], 10);

      const closeResult = await adapter.closeDevlog({
        id: closeEntryId,
        reason: 'No longer needed',
      });

      expect(closeResult).toBeDefined();
      expect((closeResult.content[0] as any).text).toContain('Closed devlog');
      expect((closeResult.content[0] as any).text).toContain('No longer needed');

      // Verify the closure note was added to the entry
      const closedEntry = await adapter.getDevlog({ id: closeEntryId });
      expect(closedEntry).toBeDefined();
      const entryData = JSON.parse((closedEntry.content[0] as any).text);
      expect(entryData.status).toBe('cancelled');
      expect(entryData.closedAt).toBeDefined();
      expect(entryData.notes).toBeDefined();
      expect(entryData.notes.length).toBeGreaterThan(0);

      // Find the closure note
      const closureNote = entryData.notes.find((note: any) =>
        note.content.includes('Cancelled: No longer needed'),
      );
      expect(closureNote).toBeDefined();
      expect(closureNote.category).toBe('progress');
    });

    it('should close devlog entry without reason', async () => {
      // Create a new entry for this test
      const createResult = await adapter.createDevlog({
        title: 'Test Entry for Closure Without Reason',
        type: 'task',
        description: 'Test closure without reason',
      });

      const entryIdMatch = (createResult.content[0] as any).text.match(
        /Created devlog entry: (\d+)/,
      );
      const noReasonEntryId = parseInt(entryIdMatch![1], 10);

      const closeResult = await adapter.closeDevlog({
        id: noReasonEntryId,
      });

      expect(closeResult).toBeDefined();
      expect((closeResult.content[0] as any).text).toContain('Closed devlog');
      expect((closeResult.content[0] as any).text).toContain('None provided');

      // Verify the entry is closed but no closure note was added
      const closedEntry = await adapter.getDevlog({ id: noReasonEntryId });
      expect(closedEntry).toBeDefined();
      const entryData = JSON.parse((closedEntry.content[0] as any).text);
      expect(entryData.status).toBe('cancelled');
      expect(entryData.closedAt).toBeDefined();

      // Should not have any closure notes (no reason provided)
      const closureNote = entryData.notes.find((note: any) => note.content.includes('Cancelled:'));
      expect(closureNote).toBeUndefined();
    });

    it('should archive and unarchive devlog entry', async () => {
      // Archive
      const archiveResult = await adapter.archiveDevlog({ id: testEntryId });
      expect(archiveResult).toBeDefined();
      expect(archiveResult.content[0].text).toContain('Archived devlog');

      // Unarchive
      const unarchiveResult = await adapter.unarchiveDevlog({ id: testEntryId });
      expect(unarchiveResult).toBeDefined();
      expect(unarchiveResult.content[0].text).toContain('Unarchived devlog');
    });
  });

  describe('AI context operations', () => {
    it('should get active context', async () => {
      // Create some active entries
      await adapter.createDevlog({
        title: 'Active Task 1',
        type: 'task' as DevlogType,
        description: 'First active task',
      });

      await adapter.createDevlog({
        title: 'Active Task 2',
        type: 'feature' as DevlogType,
        description: 'Second active task',
      });

      const contextResult = await adapter.getActiveContext({ limit: 5 });

      expect(contextResult).toBeDefined();
      expect(contextResult.content[0].text).toContain('Active Task 1');
      expect(contextResult.content[0].text).toContain('Active Task 2');
    });

    it('should get context for AI', async () => {
      const createResult = await adapter.createDevlog({
        title: 'AI Context Test',
        type: 'task' as DevlogType,
        description: 'Entry to test AI context retrieval',
      });

      const entryIdMatch = (createResult.content[0] as any).text.match(
        /Created devlog entry: (\d+)/,
      );
      const entryId = parseInt(entryIdMatch![1], 10);

      const aiContextResult = await adapter.getContextForAI({ id: entryId });

      expect(aiContextResult).toBeDefined();
      expect(aiContextResult.content[0].text).toContain('AI Context Test');
    });

    it('should discover related devlogs', async () => {
      // Create entries with related content
      await adapter.createDevlog({
        title: 'Authentication System',
        type: 'feature' as DevlogType,
        description: 'Implement JWT-based authentication',
      });

      await adapter.createDevlog({
        title: 'Login API',
        type: 'task' as DevlogType,
        description: 'Create login endpoint with authentication',
      });

      const discoverResult = await adapter.discoverRelatedDevlogs({
        workDescription: 'Add user login functionality with authentication',
        workType: 'feature',
        keywords: ['authentication', 'login'],
      });

      expect(discoverResult).toBeDefined();
      expect(discoverResult.content[0].text).toContain('related entries');
    });
  });

  describe('error handling', () => {
    it('should handle invalid devlog ID for get operation', async () => {
      const invalidResult = await adapter.getDevlog({ id: 99999 });

      expect(invalidResult).toBeDefined();
      expect(invalidResult.content[0].text).toContain('not found');
    });

    it('should handle invalid devlog ID for update operation', async () => {
      await expect(async () => {
        await adapter.updateDevlog({
          id: 99999,
          status: 'done',
        });
      }).rejects.toThrow('Devlog 99999 not found');
    });

    it('should handle search with no results', async () => {
      const noResultsSearch = await adapter.searchDevlogs({
        query: 'nonexistent-search-term-that-should-not-match-anything',
      });

      expect(noResultsSearch).toBeDefined();
      expect(noResultsSearch.content[0].text).toContain('No devlog entries found');
    });
  });
});
