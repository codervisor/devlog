import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MCPApiAdapter, type MCPApiAdapterConfig } from '../adapters/mcp-api-adapter.js';
import { DevlogApiClient, DevlogApiClientError } from '../api/devlog-api-client.js';
import { DevlogType, DevlogStatus, DevlogPriority } from '@devlog/core';

// Mock the DevlogApiClient
vi.mock('../api/devlog-api-client.js', () => ({
  DevlogApiClient: vi.fn(),
  DevlogApiClientError: class extends Error {
    constructor(
      message: string,
      public statusCode?: number,
      public originalError?: Error,
    ) {
      super(message);
      this.name = 'DevlogApiClientError';
    }
  },
}));

describe('MCPApiAdapter', () => {
  let adapter: MCPApiAdapter;
  let mockApiClient: any;
  let config: MCPApiAdapterConfig;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock API client instance
    mockApiClient = {
      setCurrentWorkspace: vi.fn(),
      testConnection: vi.fn().mockResolvedValue(true),
      switchToWorkspace: vi.fn().mockResolvedValue(undefined),
      listWorkspaces: vi.fn(),
      getCurrentWorkspace: vi.fn(),
      createDevlog: vi.fn(),
      getDevlog: vi.fn(),
      updateDevlog: vi.fn(),
      listDevlogs: vi.fn(),
      searchDevlogs: vi.fn(),
      batchAddNotes: vi.fn(),
      archiveDevlog: vi.fn(),
      getWorkspaceStats: vi.fn(),
      updateAIContext: vi.fn(),
    };

    // Mock the DevlogApiClient constructor
    (DevlogApiClient as any).mockImplementation(() => mockApiClient);

    // Set up test configuration
    config = {
      apiClient: {
        baseUrl: 'http://localhost:3200',
        timeout: 5000,
        retries: 3,
      },
      defaultWorkspaceId: 'test-workspace',
    };

    adapter = new MCPApiAdapter(config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create adapter with correct configuration', () => {
      expect(DevlogApiClient).toHaveBeenCalledWith(config.apiClient);
      expect(mockApiClient.setCurrentWorkspace).toHaveBeenCalledWith('test-workspace');
    });

    it('should initialize successfully with valid API connection', async () => {
      mockApiClient.testConnection.mockResolvedValue(true);
      mockApiClient.switchToWorkspace.mockResolvedValue(undefined);

      await adapter.initialize();

      expect(mockApiClient.testConnection).toHaveBeenCalled();
      expect(mockApiClient.switchToWorkspace).toHaveBeenCalledWith('test-workspace');
    });

    it('should handle initialization failure when API connection fails', async () => {
      mockApiClient.testConnection.mockResolvedValue(false);

      await expect(adapter.initialize()).rejects.toThrow('Failed to connect to devlog web API');
    });

    it('should handle workspace switch failure gracefully', async () => {
      mockApiClient.testConnection.mockResolvedValue(true);
      mockApiClient.switchToWorkspace.mockRejectedValue(new Error('Workspace not found'));

      // Should not throw - should continue without workspace
      await adapter.initialize();

      expect(mockApiClient.testConnection).toHaveBeenCalled();
      expect(mockApiClient.switchToWorkspace).toHaveBeenCalledWith('test-workspace');
    });

    it('should not reinitialize if already initialized', async () => {
      mockApiClient.testConnection.mockResolvedValue(true);

      await adapter.initialize();
      await adapter.initialize();

      expect(mockApiClient.testConnection).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization with no default workspace', async () => {
      const configNoWorkspace = {
        ...config,
        defaultWorkspaceId: undefined,
      };
      const adapterNoWorkspace = new MCPApiAdapter(configNoWorkspace);

      // Reset the mock because the constructor already called setCurrentWorkspace with 'default'
      vi.clearAllMocks();
      mockApiClient.testConnection.mockResolvedValue(true);

      await adapterNoWorkspace.initialize();

      expect(mockApiClient.testConnection).toHaveBeenCalled();
      // The adapter defaults to 'default' workspace when undefined is passed
      expect(mockApiClient.switchToWorkspace).toHaveBeenCalledWith('default');
    });
  });

  describe('Workspace Management', () => {
    beforeEach(async () => {
      mockApiClient.testConnection.mockResolvedValue(true);
      await adapter.initialize();
    });

    it('should get current workspace', async () => {
      const mockWorkspace = { id: 'test-workspace', name: 'Test Workspace' };
      mockApiClient.getCurrentWorkspace.mockResolvedValue(mockWorkspace);

      const result = await adapter.getCurrentWorkspace();

      expect(result.content[0].text).toContain('test-workspace');
      expect(mockApiClient.getCurrentWorkspace).toHaveBeenCalled();
    });

    it('should switch workspace successfully', async () => {
      // Mock the underlying API call - the adapter's switchToWorkspace method
      // calls this.listWorkspaces() which calls this.apiClient.listWorkspaces()
      const mockWorkspaces = {
        workspaces: [
          { id: 'new-workspace', name: 'New Workspace', description: 'Test workspace' },
          { id: 'other-workspace', name: 'Other Workspace' },
        ],
      };

      // The switchToWorkspace method calls this.listWorkspaces() which returns a CallToolResult
      // So we need to mock what listWorkspaces returns
      const mockListResult = {
        content: [{ type: 'text' as const, text: JSON.stringify(mockWorkspaces, null, 2) }],
      };

      // Create a spy on the listWorkspaces method
      const listWorkspacesSpy = vi
        .spyOn(adapter, 'listWorkspaces')
        .mockResolvedValue(mockListResult);

      mockApiClient.switchToWorkspace.mockResolvedValue(undefined);
      mockApiClient.getCurrentWorkspace.mockResolvedValue({
        id: 'new-workspace',
        name: 'New Workspace',
        description: 'Test workspace',
      });

      const result = await adapter.switchToWorkspace('new-workspace');

      expect(result.content[0].text).toContain('Switched to workspace: new-workspace');
      expect(mockApiClient.switchToWorkspace).toHaveBeenCalledWith('new-workspace');

      listWorkspacesSpy.mockRestore();
    });

    it('should handle workspace switch failure', async () => {
      // Mock a workspace list that doesn't include the target workspace
      const mockWorkspaces = {
        workspaces: [{ id: 'existing-workspace', name: 'Existing Workspace' }],
      };

      const mockListResult = {
        content: [{ type: 'text' as const, text: JSON.stringify(mockWorkspaces, null, 2) }],
      };

      const listWorkspacesSpy = vi
        .spyOn(adapter, 'listWorkspaces')
        .mockResolvedValue(mockListResult);

      const result = await adapter.switchToWorkspace('invalid-workspace');

      expect(result.content[0].text).toContain("Workspace 'invalid-workspace' not found");
      expect(result.isError).toBe(true);

      listWorkspacesSpy.mockRestore();
    });

    it('should list workspaces', async () => {
      const mockWorkspaces = [
        { id: 'workspace1', name: 'Workspace 1' },
        { id: 'workspace2', name: 'Workspace 2' },
      ];
      mockApiClient.listWorkspaces.mockResolvedValue(mockWorkspaces);

      const result = await adapter.listWorkspaces();

      expect(result.content[0].text).toContain('workspace1');
      expect(result.content[0].text).toContain('workspace2');
      expect(mockApiClient.listWorkspaces).toHaveBeenCalled();
    });
  });

  describe('Devlog Operations', () => {
    beforeEach(async () => {
      mockApiClient.testConnection.mockResolvedValue(true);
      await adapter.initialize();
    });

    it('should create devlog successfully', async () => {
      const mockDevlog = {
        id: 1,
        title: 'Test Entry',
        type: 'task' as DevlogType,
        status: 'new' as DevlogStatus,
        priority: 'medium' as DevlogPriority,
        description: 'Test description',
        workspaceId: 'test-workspace',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockApiClient.createDevlog.mockResolvedValue(mockDevlog);

      const args = {
        title: 'Test Entry',
        type: 'task' as DevlogType,
        description: 'Test description',
        priority: 'medium' as DevlogPriority,
      };

      const result = await adapter.createDevlog(args);

      expect(result.content[0].text).toContain('Created devlog entry: 1');
      expect(result.content[0].text).toContain('Test Entry');
      expect(mockApiClient.createDevlog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Entry',
          type: 'task',
          description: 'Test description',
          priority: 'medium',
        }),
      );
    });

    it('should handle devlog creation failure', async () => {
      mockApiClient.createDevlog.mockRejectedValue(
        new DevlogApiClientError('Validation failed', 400),
      );

      const args = {
        title: 'Test Entry',
        type: 'task' as DevlogType,
        description: 'Test description',
      };

      await expect(adapter.createDevlog(args)).rejects.toThrow(
        'Create devlog failed: Validation failed',
      );
    });

    it('should get devlog by ID', async () => {
      const mockDevlog = {
        id: 1,
        title: 'Test Entry',
        type: 'task' as DevlogType,
        status: 'new' as DevlogStatus,
        priority: 'medium' as DevlogPriority,
        description: 'Test description',
        workspaceId: 'test-workspace',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockApiClient.getDevlog.mockResolvedValue(mockDevlog);

      const result = await adapter.getDevlog({ id: 1 });

      expect(result.content[0].text).toContain('Test Entry');
      expect(mockApiClient.getDevlog).toHaveBeenCalledWith(1);
    });

    it('should handle devlog not found', async () => {
      mockApiClient.getDevlog.mockRejectedValue(new DevlogApiClientError('Devlog not found', 404));

      await expect(adapter.getDevlog({ id: 999 })).rejects.toThrow(
        'Get devlog failed: Devlog not found',
      );
    });

    it('should update devlog successfully', async () => {
      const mockDevlog = {
        id: 1,
        title: 'Updated Entry',
        type: 'task' as DevlogType,
        status: 'in-progress' as DevlogStatus,
        priority: 'high' as DevlogPriority,
        description: 'Updated description',
        workspaceId: 'test-workspace',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockApiClient.updateDevlog.mockResolvedValue(mockDevlog);

      const args = {
        id: 1,
        status: 'in-progress' as DevlogStatus,
        priority: 'high' as DevlogPriority,
      };

      const result = await adapter.updateDevlog(args);

      expect(result.content[0].text).toContain('Updated devlog entry: 1');
      expect(mockApiClient.updateDevlog).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          id: 1,
          status: 'in-progress',
          priority: 'high',
        }),
      );
    });

    it('should list devlogs with pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            title: 'Entry 1',
            type: 'task' as DevlogType,
            status: 'new' as DevlogStatus,
            priority: 'medium' as DevlogPriority,
            workspaceId: 'test-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 2,
            title: 'Entry 2',
            type: 'feature' as DevlogType,
            status: 'in-progress' as DevlogStatus,
            priority: 'high' as DevlogPriority,
            workspaceId: 'test-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      mockApiClient.listDevlogs.mockResolvedValue(mockResponse);

      const result = await adapter.listDevlogs({ page: 1, limit: 20 });

      expect(result.content[0].text).toContain('Entry 1');
      expect(result.content[0].text).toContain('Entry 2');
      expect(mockApiClient.listDevlogs).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            page: 1,
            limit: 20,
            sortOrder: 'desc',
          }),
        }),
      );
    });

    it('should search devlogs', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            title: 'Test Entry',
            type: 'task' as DevlogType,
            status: 'new' as DevlogStatus,
            priority: 'medium' as DevlogPriority,
            workspaceId: 'test-workspace',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockApiClient.searchDevlogs.mockResolvedValue(mockResponse);

      const result = await adapter.searchDevlogs({ query: 'test' });

      expect(result.content[0].text).toContain('Test Entry');
      expect(mockApiClient.searchDevlogs).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          archived: undefined,
          priority: undefined,
          status: undefined,
          type: undefined,
        }),
      );
    });
  });

  describe('Devlog Note Operations', () => {
    beforeEach(async () => {
      mockApiClient.testConnection.mockResolvedValue(true);
      await adapter.initialize();
    });

    it('should add devlog note', async () => {
      const mockDevlog = {
        id: 1,
        title: 'Test Entry',
        notes: [{ id: 1, content: 'Test note', category: 'progress' }],
      };

      mockApiClient.batchAddNotes.mockResolvedValue([mockDevlog]);

      const args = {
        id: 1,
        note: 'Test note',
        category: 'progress' as const,
      };

      const result = await adapter.addDevlogNote(args);

      expect(result.content[0].text).toContain('Added note to devlog 1');
      expect(mockApiClient.batchAddNotes).toHaveBeenCalledWith([
        {
          id: 1,
          note: 'Test note',
          category: 'progress',
          codeChanges: undefined,
          files: undefined,
        },
      ]);
    });

    it('should update devlog with note', async () => {
      const mockDevlog = {
        id: 1,
        title: 'Test Entry',
        status: 'in-progress' as DevlogStatus,
        notes: [{ id: 1, content: 'Progress note', category: 'progress' }],
      };

      mockApiClient.updateDevlog.mockResolvedValue(mockDevlog);
      mockApiClient.batchAddNotes.mockResolvedValue([mockDevlog]);

      const args = {
        id: 1,
        note: 'Progress note',
        status: 'in-progress' as DevlogStatus,
      };

      const result = await adapter.updateDevlogWithNote(args);

      expect(result.content[0].text).toContain("Updated devlog '1' and added progress note");
      expect(mockApiClient.updateDevlog).toHaveBeenCalledWith(1, { status: 'in-progress' });
      expect(mockApiClient.batchAddNotes).toHaveBeenCalledWith([
        {
          id: 1,
          note: 'Progress note',
          category: 'progress',
          codeChanges: undefined,
          files: undefined,
        },
      ]);
    });
  });

  describe('Lifecycle Operations', () => {
    beforeEach(async () => {
      mockApiClient.testConnection.mockResolvedValue(true);
      await adapter.initialize();
    });

    it('should complete devlog', async () => {
      const mockDevlog = {
        id: 1,
        title: 'Test Entry',
        status: 'done' as DevlogStatus,
        completedAt: new Date(),
      };

      mockApiClient.batchAddNotes.mockResolvedValue([mockDevlog]);
      mockApiClient.updateDevlog.mockResolvedValue(mockDevlog);

      const result = await adapter.completeDevlog({ id: 1, summary: 'Task completed' });

      expect(result.content[0].text).toContain("Completed devlog 'Test Entry' (ID: 1)");
      expect(mockApiClient.batchAddNotes).toHaveBeenCalledWith([
        {
          id: 1,
          note: 'Completion Summary: Task completed',
          category: 'solution',
        },
      ]);
      expect(mockApiClient.updateDevlog).toHaveBeenCalledWith(1, { status: 'done' });
    });

    it('should close devlog', async () => {
      const mockDevlog = {
        id: 1,
        title: 'Test Entry',
        status: 'cancelled' as DevlogStatus,
      };

      mockApiClient.batchAddNotes.mockResolvedValue([mockDevlog]);
      mockApiClient.updateDevlog.mockResolvedValue(mockDevlog);

      const result = await adapter.closeDevlog({ id: 1, reason: 'Not needed' });

      expect(result.content[0].text).toContain("Closed devlog '1': Test Entry");
      expect(mockApiClient.batchAddNotes).toHaveBeenCalledWith([
        {
          id: 1,
          note: 'Closure Reason: Not needed',
          category: 'feedback',
        },
      ]);
      expect(mockApiClient.updateDevlog).toHaveBeenCalledWith(1, { status: 'cancelled' });
    });

    it('should archive devlog', async () => {
      const mockDevlog = {
        id: 1,
        archived: true,
      };

      mockApiClient.archiveDevlog.mockResolvedValue(mockDevlog);

      const result = await adapter.archiveDevlog({ id: 1 });

      expect(result.content[0].text).toContain('Archived devlog entry: 1');
      expect(mockApiClient.archiveDevlog).toHaveBeenCalledWith(1);
    });

    it('should unarchive devlog', async () => {
      const mockDevlog = {
        id: 1,
        title: 'Test Entry',
        archived: false,
      };

      mockApiClient.updateDevlog.mockResolvedValue(mockDevlog);

      const result = await adapter.unarchiveDevlog({ id: 1 });

      expect(result.content[0].text).toContain("Unarchived devlog '1': Test Entry");
      expect(mockApiClient.updateDevlog).toHaveBeenCalledWith(1, {
        id: 1,
        archived: false,
      });
    });
  });

  describe('AI Context Operations', () => {
    beforeEach(async () => {
      mockApiClient.testConnection.mockResolvedValue(true);
      await adapter.initialize();
    });

    it('should get active context', async () => {
      const mockResult = {
        items: [
          {
            id: 1,
            title: 'Active Entry',
            status: 'in-progress',
            type: 'task',
            priority: 'medium',
            notes: [{ content: 'Test note' }],
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      mockApiClient.listDevlogs.mockResolvedValue(mockResult);

      const result = await adapter.getActiveContext({ limit: 10 });

      expect(result.content[0].text).toContain('Active Entry');
      expect(mockApiClient.listDevlogs).toHaveBeenCalledWith({
        status: ['new', 'in-progress', 'blocked', 'in-review', 'testing'],
        pagination: { limit: 10 },
      });
    });

    it('should get context for AI', async () => {
      const mockEntry = {
        id: 1,
        title: 'Test Entry',
        description: 'Test description',
        status: 'in-progress',
        type: 'task',
        priority: 'medium',
      };

      mockApiClient.getDevlog.mockResolvedValue(mockEntry);

      const result = await adapter.getContextForAI({ id: 1 });

      expect(result.content[0].text).toContain('Test Entry');
      expect(mockApiClient.getDevlog).toHaveBeenCalledWith(1);
    });

    it('should discover related devlogs', async () => {
      const mockResult = {
        items: [
          {
            id: 2,
            title: 'Related Entry',
            description: 'Related description',
            status: 'done',
            type: 'task',
            priority: 'high',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
      };

      mockApiClient.searchDevlogs.mockResolvedValue(mockResult);

      const args = {
        workDescription: 'Test work',
        workType: 'task' as const,
        keywords: ['test'],
      };

      const result = await adapter.discoverRelatedDevlogs(args);

      expect(result.content[0].text).toContain('Related Entry');
      expect(mockApiClient.searchDevlogs).toHaveBeenCalledWith('Test work test');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      mockApiClient.testConnection.mockResolvedValue(true);
      await adapter.initialize();
    });

    it('should handle network errors gracefully', async () => {
      mockApiClient.getDevlog.mockRejectedValue(new Error('Network error'));

      await expect(adapter.getDevlog({ id: 1 })).rejects.toThrow(
        'Get devlog failed: Network error',
      );
    });

    it('should handle API client errors with status codes', async () => {
      mockApiClient.createDevlog.mockRejectedValue(new DevlogApiClientError('Bad request', 400));

      const args = {
        title: 'Test',
        type: 'task' as DevlogType,
        description: 'Test',
      };

      await expect(adapter.createDevlog(args)).rejects.toThrow('Create devlog failed: Bad request');
    });

    it('should handle unexpected errors', async () => {
      mockApiClient.listDevlogs.mockRejectedValue('Unexpected error');

      await expect(adapter.listDevlogs({})).rejects.toThrow(
        'List devlogs failed: Unexpected error',
      );
    });
  });

  describe('Disposal', () => {
    it('should clean up resources on disposal', async () => {
      mockApiClient.testConnection.mockResolvedValue(true);
      await adapter.initialize();

      await adapter.dispose();

      // Adapter should be marked as not initialized
      // This is tested by attempting to use it after disposal
      // (though the current implementation doesn't enforce this)
    });
  });
  it('should handle adapter disposal', async () => {
    await expect(adapter.dispose()).resolves.not.toThrow();
  });

  it('should handle initialization failure with invalid URL', async () => {
    // Create a fresh mock that will fail
    const failingMockApiClient = {
      setCurrentWorkspace: vi.fn(),
      testConnection: vi.fn().mockResolvedValue(false), // This will cause initialization to fail
      switchToWorkspace: vi.fn(),
      listWorkspaces: vi.fn(),
      getCurrentWorkspace: vi.fn(),
      createDevlog: vi.fn(),
      getDevlog: vi.fn(),
      updateDevlog: vi.fn(),
      searchDevlogs: vi.fn(),
      addDevlogNote: vi.fn(),
      updateDevlogWithNote: vi.fn(),
      addDecision: vi.fn(),
      completeDevlog: vi.fn(),
      closeDevlog: vi.fn(),
      archiveDevlog: vi.fn(),
      unarchiveDevlog: vi.fn(),
      getActiveContext: vi.fn(),
      getContextForAI: vi.fn(),
      discoverRelatedDevlogs: vi.fn(),
      updateAIContext: vi.fn(),
    };

    // Temporarily replace the DevlogApiClient mock to return our failing client
    const originalMock = (DevlogApiClient as any).getMockImplementation();
    (DevlogApiClient as any).mockImplementationOnce(() => failingMockApiClient);

    const invalidConfig = {
      apiClient: {
        baseUrl: 'http://invalid-url-that-does-not-exist:9999',
        timeout: 1000,
        retries: 1,
      },
      defaultWorkspaceId: 'test-workspace',
    };

    const invalidAdapter = new MCPApiAdapter(invalidConfig);

    await expect(invalidAdapter.initialize()).rejects.toThrow(
      'Failed to connect to devlog web API',
    );
    await invalidAdapter.dispose();

    // Restore original mock
    (DevlogApiClient as any).mockImplementation(originalMock);
  });
});
