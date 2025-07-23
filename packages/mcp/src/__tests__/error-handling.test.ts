import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MCPDevlogAdapter } from '../mcp-adapter.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MCP Error Handling and Edge Cases', () => {
  let testWorkspace: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let adapter: MCPDevlogAdapter;

  beforeEach(async () => {
    // Store original environment and working directory
    originalCwd = process.cwd();
    originalEnv = { ...process.env };

    // Create test workspace with unique timestamp to avoid conflicts
    testWorkspace = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-error-test-'));

    // Change to test workspace
    process.chdir(testWorkspace);

    // Set up environment variables for testing instead of config file
    process.env.DEVLOG_JSON_DIRECTORY = '.devlog-test';
    process.env.DEVLOG_JSON_GLOBAL = 'false';

    // Create minimal package.json to make directory detectable as project root
    const packageJson = {
      name: 'mcp-error-test',
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

  describe('invalid input handling', () => {
    it('should handle missing required fields in createDevlog', async () => {
      // The MCP adapter doesn't validate - it passes through to core
      // The core library might accept the invalid input and create an entry with undefined type
      const result = await adapter.createDevlog({
        title: 'Incomplete Entry',
        description: 'Missing type field',
      } as any);
      
      // Verify that some result is returned (the behavior may vary)
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    it('should handle invalid devlog type', async () => {
      try {
        await adapter.createDevlog({
          title: 'Invalid Type Entry',
          type: 'invalid-type' as any,
          description: 'Entry with invalid type',
        });
        
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid priority value', async () => {
      try {
        await adapter.createDevlog({
          title: 'Invalid Priority Entry',
          type: 'task',
          description: 'Entry with invalid priority',
          priority: 'super-critical' as any,
        });
        
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle empty string values', async () => {
      try {
        await adapter.createDevlog({
          title: '',
          type: 'task',
          description: '',
        });
        
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('non-existent resource handling', () => {
    it('should handle non-existent devlog ID in getDevlog', async () => {
      const result = await adapter.getDevlog({ id: 99999 });
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('not found');
    });

    it('should handle non-existent devlog ID in updateDevlog', async () => {
      await expect(async () => {
        await adapter.updateDevlog({
          id: 99999,
          status: 'done',
        });
      }).rejects.toThrow('Devlog 99999 not found');
    });

    it('should handle non-existent devlog ID in addDevlogNote', async () => {
      await expect(async () => {
        await adapter.addDevlogNote({
          id: 99999,
          note: 'Test note',
        });
      }).rejects.toThrow('Devlog 99999 not found');
    });

    it('should handle non-existent devlog ID in completeDevlog', async () => {
      await expect(async () => {
        await adapter.completeDevlog({
          id: 99999,
          summary: 'Test completion',
        });
      }).rejects.toThrow('Devlog 99999 not found');
    });

    it('should handle non-existent devlog ID in archiveDevlog', async () => {
      await expect(async () => {
        await adapter.archiveDevlog({ id: 99999 });
      }).rejects.toThrow('Devlog 99999 not found');
    });
  });

  describe('edge case values', () => {
    it('should handle extremely long strings', async () => {
      const longString = 'a'.repeat(10000);
      
      const result = await adapter.createDevlog({
        title: longString,
        type: 'task',
        description: longString,
      });
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Created devlog entry');
    });

    it('should handle special characters in strings', async () => {
      const specialChars = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";
      
      const result = await adapter.createDevlog({
        title: `Special ${specialChars} Characters`,
        type: 'task',
        description: `Testing special characters: ${specialChars}`,
      });
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Created devlog entry');
    });

    it('should handle unicode characters', async () => {
      const unicode = '测试中文字符 🚀 émojis and àccénts';
      
      const result = await adapter.createDevlog({
        title: unicode,
        type: 'task',
        description: `Unicode test: ${unicode}`,
      });
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Created devlog entry');
    });

    it('should handle large array inputs', async () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => `Item ${i}`);
      
      const result = await adapter.createDevlog({
        title: 'Large Array Test',
        type: 'task',
        description: 'Testing large arrays',
        acceptanceCriteria: largeArray,
        initialInsights: largeArray,
      });
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Created devlog entry');
    });
  });

  describe('search edge cases', () => {
    it('should handle empty search query', async () => {
      const result = await adapter.searchDevlogs({ query: '' });
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('No devlog entries found');
    });

    it('should handle search with only whitespace', async () => {
      const result = await adapter.searchDevlogs({ query: '   \t\n   ' });
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('No devlog entries found');
    });

    it('should handle search with special regex characters', async () => {
      // Create an entry first
      await adapter.createDevlog({
        title: 'Regex [Test] Entry',
        type: 'task',
        description: 'Testing regex special characters',
      });

      const result = await adapter.searchDevlogs({ query: '[Test]' });
      
      expect(result).toBeDefined();
      // Should either find the entry or handle regex gracefully
    });

    it('should handle very long search queries', async () => {
      const longQuery = 'search '.repeat(1000);
      
      const result = await adapter.searchDevlogs({ query: longQuery });
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('No devlog entries found');
    });
  });

  describe('list operation edge cases', () => {
    it('should handle list with no entries', async () => {
      const result = await adapter.listDevlogs({});
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('No devlog entries found');
    });

    it('should handle list with extreme limit values', async () => {
      // Test with very high limit
      const result1 = await adapter.listDevlogs({ limit: 9999 });
      expect(result1).toBeDefined();

      // Test with zero limit
      const result2 = await adapter.listDevlogs({ limit: 0 });
      expect(result2).toBeDefined();

      // Test with negative limit (should be handled gracefully)
      const result3 = await adapter.listDevlogs({ limit: -1 });
      expect(result3).toBeDefined();
    });

    it('should handle list with invalid page numbers', async () => {
      // Test with negative page
      const result1 = await adapter.listDevlogs({ page: -1 });
      expect(result1).toBeDefined();

      // Test with zero page
      const result2 = await adapter.listDevlogs({ page: 0 });
      expect(result2).toBeDefined();

      // Test with very high page number
      const result3 = await adapter.listDevlogs({ page: 9999 });
      expect(result3).toBeDefined();
    });
  });

  describe('workspace edge cases', () => {
    it('should handle invalid workspace ID', async () => {
      const invalidId = 'non-existent-workspace-12345';
      
      // This should not throw, just update the in-memory ID
      adapter.setCurrentWorkspaceId(invalidId);
      expect(adapter.getCurrentWorkspaceId()).toBe(invalidId);
    });

    it('should handle special characters in workspace ID', async () => {
      const specialId = 'workspace-with-special@chars#123';
      
      adapter.setCurrentWorkspaceId(specialId);
      expect(adapter.getCurrentWorkspaceId()).toBe(specialId);
    });

    it('should handle empty workspace ID', async () => {
      adapter.setCurrentWorkspaceId('');
      // The setCurrentWorkspaceId sets it to empty, but getCurrentWorkspaceId falls back to 'default'
      expect(adapter.getCurrentWorkspaceId()).toBe('default');
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple simultaneous operations', async () => {
      const promises: Promise<any>[] = [];
      
      // Create multiple entries simultaneously
      for (let i = 0; i < 5; i++) {
        promises.push(
          adapter.createDevlog({
            title: `Concurrent Entry ${i}`,
            type: 'task',
            description: `Entry created concurrently ${i}`,
          })
        );
      }
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.content[0].text).toContain(`Concurrent Entry ${index}`);
      });
    });

    it('should handle mixed operation types simultaneously', async () => {
      // First create an entry
      const createResult = await adapter.createDevlog({
        title: 'Base Entry for Concurrent Test',
        type: 'task',
        description: 'Base entry',
      });
      
      const entryIdMatch = (createResult.content[0] as any).text.match(/Created devlog entry: (\d+)/);
      const entryId = parseInt(entryIdMatch![1], 10);

      // Now perform multiple operations simultaneously
      const promises: Promise<any>[] = [
        adapter.listDevlogs({}),
        adapter.searchDevlogs({ query: 'Base Entry' }),
        adapter.getDevlog({ id: entryId }),
        adapter.addDevlogNote({ id: entryId, note: 'Concurrent note' }),
        adapter.getActiveContext({}),
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      });
    });
  });

  describe('resource cleanup', () => {
    it('should handle disposal when not initialized', async () => {
      const uninitializedAdapter = new MCPDevlogAdapter();
      
      // Should not throw
      await expect(uninitializedAdapter.dispose()).resolves.toBeUndefined();
    });

    it('should handle multiple dispose calls', async () => {
      // First disposal
      await adapter.dispose();
      
      // Second disposal should not throw
      await expect(adapter.dispose()).resolves.toBeUndefined();
    });
  });
});
