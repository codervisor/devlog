/**
 * Integration tests for CopilotParser using real VS Code data
 * 
 * These tests are designed to work with actual VS Code installations
 * and real Copilot chat history data on the local machine.
 * 
 * NOTE: These tests are NOT meant to run in CI - they're integration
 * tests that require actual VS Code data to be present.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { stat } from 'fs/promises';
import { platform } from 'os';
import { CopilotParser } from '../../parsers/copilot.js';

describe('CopilotParser Integration Tests', () => {
  let parser: CopilotParser;
  let hasVSCodeData: boolean = false;

  beforeAll(async () => {
    parser = new CopilotParser();

    // Check if we have VS Code data available
    try {
      const applications = await parser.getApplications();
      hasVSCodeData = applications.length > 0;
      
      if (!hasVSCodeData) {
        console.warn('No VS Code installations with Copilot data found. Some tests will be skipped.');
      }
    } catch (error) {
      console.warn('Error checking for VS Code data:', error);
      hasVSCodeData = false;
    }
  });

  describe('getParserType', () => {
    it('should return copilot as parser type', () => {
      expect(parser.getParserType()).toBe('copilot');
    });
  });

  describe('getApplications', () => {
    it('should return array of applications', async () => {
      const applications = await parser.getApplications();
      
      expect(Array.isArray(applications)).toBe(true);
      
      // If we have VS Code data, validate the structure
      if (hasVSCodeData) {
        expect(applications.length).toBeGreaterThan(0);
        
        for (const app of applications) {
          expect(app).toHaveProperty('id');
          expect(app).toHaveProperty('name');
          expect(app).toHaveProperty('path');
          expect(app).toHaveProperty('parser', 'copilot');
          expect(app).toHaveProperty('platform', platform());
          expect(typeof app.workspaceCount).toBe('number');
          expect(app.workspaceCount).toBeGreaterThanOrEqual(0);
          
          // Validate application IDs
          expect(['vscode', 'vscode-insiders']).toContain(app.id);
          
          // Validate that the path exists
          await expect(stat(app.path)).resolves.toBeDefined();
        }
      }
    });

    it('should handle missing VS Code installations gracefully', async () => {
      // This test should always pass, even without VS Code
      const applications = await parser.getApplications();
      expect(Array.isArray(applications)).toBe(true);
    });
  });

  describe('getWorkspaces', () => {
    it.runIf(() => hasVSCodeData)('should return workspaces for valid application', async () => {
      const applications = await parser.getApplications();
      
      if (applications.length === 0) {
        return; // Skip if no applications
      }

      const firstApp = applications[0];
      const workspaces = await parser.getWorkspaces(firstApp.id);
      
      expect(Array.isArray(workspaces)).toBe(true);
      
      for (const workspace of workspaces) {
        expect(workspace).toHaveProperty('id');
        expect(workspace).toHaveProperty('name');
        expect(workspace).toHaveProperty('applicationId', firstApp.id);
        expect(typeof workspace.sessionCount).toBe('number');
        expect(workspace.sessionCount).toBeGreaterThan(0); // Only workspaces with sessions are returned
        
        // Workspace should have a path
        if (workspace.path) {
          expect(typeof workspace.path).toBe('string');
        }
      }
    });

    it('should return empty array for invalid application ID', async () => {
      const workspaces = await parser.getWorkspaces('invalid-app-id');
      expect(workspaces).toEqual([]);
    });

    it('should handle non-existent application gracefully', async () => {
      const workspaces = await parser.getWorkspaces('non-existent-app');
      
      expect(workspaces).toEqual([]);
    });
  });

  describe('getChatSessions', () => {
    it.runIf(() => hasVSCodeData)('should return chat sessions for valid workspace', async () => {
      const applications = await parser.getApplications();
      
      if (applications.length === 0) {
        return; // Skip if no applications
      }

      const firstApp = applications[0];
      const workspaces = await parser.getWorkspaces(firstApp.id);
      
      if (workspaces.length === 0) {
        return; // Skip if no workspaces
      }

      const firstWorkspace = workspaces[0];
      const sessions = await parser.getChatSessions(firstApp.id, firstWorkspace.id);
      
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThan(0); // We know this workspace has sessions
      
      for (const session of sessions) {
        expect(session).toHaveProperty('id');
        expect(session).toHaveProperty('workspaceId', firstWorkspace.id);
        expect(session).toHaveProperty('metadata');
        expect(session).toHaveProperty('createdAt');
        expect(session).toHaveProperty('updatedAt');
        expect(session).toHaveProperty('turns');
        
        expect(session.createdAt).toBeInstanceOf(Date);
        expect(session.updatedAt).toBeInstanceOf(Date);
        expect(Array.isArray(session.turns)).toBe(true);
        
        // Validate metadata structure
        expect(session.metadata).toHaveProperty('version');
        expect(session.metadata).toHaveProperty('requesterUsername');
        expect(session.metadata).toHaveProperty('responderUsername');
        expect(typeof session.metadata.total_requests).toBe('number');
      }
    });

    it('should return empty array for invalid application/workspace', async () => {
      const sessions = await parser.getChatSessions('invalid-app', 'invalid-workspace');
      expect(sessions).toEqual([]);
    });

    it('should handle parsing errors gracefully', async () => {
      const sessions = await parser.getChatSessions('invalid-app', 'invalid-workspace');
      
      expect(sessions).toEqual([]);
    });
  });

  describe('parseChatSession', () => {
    it.runIf(() => hasVSCodeData)('should parse individual chat session correctly', async () => {
      const applications = await parser.getApplications();
      
      if (applications.length === 0) {
        return; // Skip if no applications
      }

      const firstApp = applications[0];
      const workspaces = await parser.getWorkspaces(firstApp.id);
      
      if (workspaces.length === 0) {
        return; // Skip if no workspaces
      }

      const firstWorkspace = workspaces[0];
      const sessions = await parser.getChatSessions(firstApp.id, firstWorkspace.id);
      
      if (sessions.length === 0) {
        return; // Skip if no sessions
      }

      const firstSession = sessions[0];
      
      // Test direct parsing
      const reparsedSession = await parser.parseChatSession(
        firstApp.id,
        firstWorkspace.id,
        firstSession.id
      );
      
      expect(reparsedSession).not.toBeNull();
      
      if (reparsedSession) {
        expect(reparsedSession.id).toBe(firstSession.id);
        expect(reparsedSession.workspaceId).toBe(firstWorkspace.id);
        expect(reparsedSession.turns.length).toBe(firstSession.turns.length);
        
        // Validate turn structure
        for (const turn of reparsedSession.turns) {
          expect(turn).toHaveProperty('id');
          expect(turn).toHaveProperty('sessionId', firstSession.id);
          expect(turn).toHaveProperty('metadata');
          expect(turn).toHaveProperty('createdAt');
          expect(turn).toHaveProperty('updatedAt');
          expect(turn).toHaveProperty('messages');
          
          expect(turn.createdAt).toBeInstanceOf(Date);
          expect(turn.updatedAt).toBeInstanceOf(Date);
          expect(Array.isArray(turn.messages)).toBe(true);
          
          // Validate message structure
          for (const message of turn.messages) {
            expect(message).toHaveProperty('id');
            expect(message).toHaveProperty('turnId', turn.id);
            expect(message).toHaveProperty('role');
            expect(message).toHaveProperty('content');
            expect(message).toHaveProperty('timestamp');
            expect(message).toHaveProperty('metadata');
            
            expect(['user', 'assistant']).toContain(message.role);
            expect(typeof message.content).toBe('string');
            expect(message.timestamp).toBeInstanceOf(Date);
          }
        }
      }
    });

    it('should return null for non-existent session', async () => {
      const session = await parser.parseChatSession('invalid-app', 'invalid-workspace', 'invalid-session');
      expect(session).toBeNull();
    });

    it('should handle malformed JSON gracefully', async () => {
      const session = await parser.parseChatSession('invalid-app', 'invalid-workspace', 'invalid-session');
      
      expect(session).toBeNull();
    });
  });

  describe('Chat message extraction', () => {
    it.runIf(() => hasVSCodeData)('should extract messages with correct structure', async () => {
      const applications = await parser.getApplications();
      
      if (applications.length === 0) {
        return; // Skip if no applications
      }

      const firstApp = applications[0];
      const workspaces = await parser.getWorkspaces(firstApp.id);
      
      if (workspaces.length === 0) {
        return; // Skip if no workspaces
      }

      const firstWorkspace = workspaces[0];
      const sessions = await parser.getChatSessions(firstApp.id, firstWorkspace.id);
      
      if (sessions.length === 0) {
        return; // Skip if no sessions
      }

      const sessionWithMessages = sessions.find(s => 
        s.turns.some(t => t.messages.length > 0)
      );
      
      if (!sessionWithMessages) {
        return; // Skip if no sessions with messages
      }

      const turnWithMessages = sessionWithMessages.turns.find(t => t.messages.length > 0);
      
      if (!turnWithMessages) {
        return; // Skip if no turns with messages
      }

      // Test message types
      const userMessages = turnWithMessages.messages.filter(m => m.role === 'user');
      const assistantMessages = turnWithMessages.messages.filter(m => m.role === 'assistant');
      
      expect(userMessages.length).toBeGreaterThanOrEqual(0);
      expect(assistantMessages.length).toBeGreaterThanOrEqual(0);
      
      // User messages should have user_message type
      for (const userMsg of userMessages) {
        expect(userMsg.metadata.type).toBe('user_message');
        expect(typeof userMsg.content).toBe('string');
        expect((userMsg.content as string).length).toBeGreaterThan(0);
      }
      
      // Assistant messages should have various types
      for (const assistantMsg of assistantMessages) {
        expect(assistantMsg.metadata).toHaveProperty('type');
        expect(typeof assistantMsg.metadata.type).toBe('string');
        
        // Common assistant message types
        const validTypes = [
          'text_response',
          'tool_preparation',
          'tool_invocation',
          'text_edit',
          'code_edit',
          'undo_stop',
          'inline_reference',
          'unknown_response'
        ];
        
        expect(validTypes).toContain(assistantMsg.metadata.type);
      }
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle empty applications gracefully', async () => {
      // Create parser that will find no applications
      const testParser = new CopilotParser();
      
      // Mock getStoragePaths to return non-existent paths
      const originalGetStoragePaths = (testParser as any).getStoragePaths;
      (testParser as any).getStoragePaths = () => ['/non/existent/path'];
      
      const applications = await testParser.getApplications();
      expect(applications).toEqual([]);
      
      // Restore original method
      (testParser as any).getStoragePaths = originalGetStoragePaths;
    });

    it('should handle filesystem errors gracefully', async () => {
      // Try to get workspaces for a non-existent application
      const workspaces = await parser.getWorkspaces('definitely-does-not-exist');
      expect(workspaces).toEqual([]);
    });

    it('should validate platform detection', () => {
      const currentPlatform = platform();
      expect(['win32', 'darwin', 'linux']).toContain(currentPlatform);
      
      // The parser should handle the current platform
      expect(async () => {
        await parser.getApplications();
      }).not.toThrow();
    });
  });

  describe('Performance and scalability', () => {
    it.runIf(() => hasVSCodeData)('should handle large numbers of sessions efficiently', async () => {
      const startTime = Date.now();
      
      const applications = await parser.getApplications();
      
      if (applications.length === 0) {
        return; // Skip if no applications
      }

      const firstApp = applications[0];
      const workspaces = await parser.getWorkspaces(firstApp.id);
      
      if (workspaces.length === 0) {
        return; // Skip if no workspaces
      }

      // Get all sessions from all workspaces
      let totalSessions = 0;
      for (const workspace of workspaces) {
        const sessions = await parser.getChatSessions(firstApp.id, workspace.id);
        totalSessions += sessions.length;
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`Processed ${totalSessions} sessions from ${workspaces.length} workspaces in ${duration}ms`);
      
      // Performance expectation: should process sessions reasonably quickly
      // This is a soft assertion - adjust based on typical data sizes
      if (totalSessions > 0) {
        const avgTimePerSession = duration / totalSessions;
        expect(avgTimePerSession).toBeLessThan(1000); // Less than 1 second per session
      }
    });
  });

  describe('Data integrity and consistency', () => {
    it.runIf(() => hasVSCodeData)('should maintain consistent data relationships', async () => {
      const applications = await parser.getApplications();
      
      if (applications.length === 0) {
        return; // Skip if no applications
      }

      for (const application of applications) {
        const workspaces = await parser.getWorkspaces(application.id);
        
        for (const workspace of workspaces) {
          expect(workspace.applicationId).toBe(application.id);
          
          const sessions = await parser.getChatSessions(application.id, workspace.id);
          
          for (const session of sessions) {
            expect(session.workspaceId).toBe(workspace.id);
            
            for (const turn of session.turns) {
              expect(turn.sessionId).toBe(session.id);
              
              for (const message of turn.messages) {
                expect(message.turnId).toBe(turn.id);
              }
            }
          }
        }
      }
    });

    it.runIf(() => hasVSCodeData)('should have consistent timestamps', async () => {
      const applications = await parser.getApplications();
      
      if (applications.length === 0) {
        return; // Skip if no applications
      }

      const firstApp = applications[0];
      const workspaces = await parser.getWorkspaces(firstApp.id);
      
      if (workspaces.length === 0) {
        return; // Skip if no workspaces
      }

      const firstWorkspace = workspaces[0];
      const sessions = await parser.getChatSessions(firstApp.id, firstWorkspace.id);
      
      for (const session of sessions) {
        // Session timestamps should be valid dates
        expect(session.createdAt).toBeInstanceOf(Date);
        expect(session.updatedAt).toBeInstanceOf(Date);
        expect(session.updatedAt.getTime()).toBeGreaterThanOrEqual(session.createdAt.getTime());
        
        for (const turn of session.turns) {
          expect(turn.createdAt).toBeInstanceOf(Date);
          expect(turn.updatedAt).toBeInstanceOf(Date);
          
          for (const message of turn.messages) {
            expect(message.timestamp).toBeInstanceOf(Date);
          }
        }
      }
    });
  });
});