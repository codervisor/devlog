/**
 * GitHub Copilot chat history parser for VS Code
 *
 * This module handles parsing GitHub Copilot chat sessions from VS Code's
 * JSON storage files to extract actual conversation history.
 */

import { readFile, stat } from 'fs/promises';
import { resolve } from 'path';
import { homedir, platform } from 'os';
import fg from 'fast-glob';
import chalk from 'chalk';
import {
  Application,
  ChatMessage,
  ChatSession,
  type ChatSessionMetadata,
  ChatTurn,
  ParserType,
  Workspace,
} from '../types/index.js';
import { BaseParser } from './base.js';

export class CopilotParser extends BaseParser {
  constructor() {
    super();
  }

  getParserType(): ParserType {
    return 'copilot';
  }

  /**
   * Get all available applications (VS Code installations) for GitHub Copilot
   */
  async getApplications(): Promise<Application[]> {
    const vscodePaths = this.getStoragePaths();
    const applications: Application[] = [];

    for (const basePath of vscodePaths) {
      try {
        await stat(basePath);

        // Determine application type from path
        const isInsiders = basePath.includes('Insiders');
        const appId = isInsiders ? 'vscode-insiders' : 'vscode';
        const appName = isInsiders ? 'VS Code Insiders' : 'VS Code';

        // Count workspaces in this application
        const workspaceMapping = await this.getWorkspaceMapping(basePath);
        const workspaceCount = Object.keys(workspaceMapping).length;

        if (workspaceCount > 0) {
          applications.push({
            id: appId,
            name: appName,
            path: basePath,
            parser: this.getParserType(),
            platform: platform(),
            workspaceCount,
          });
        }
      } catch (error) {
        // Skip inaccessible paths silently
      }
    }

    if (applications.length > 0) {
      const totalWorkspaces = applications.reduce((sum, app) => sum + (app.workspaceCount || 0), 0);
      console.log(
        chalk.green(
          `✓ Found ${applications.length} VS Code installation(s) with ${totalWorkspaces} total workspaces`,
        ),
      );
    }

    return applications;
  }

  /**
   * Get all workspaces from a specific application
   */
  async getWorkspaces(applicationId: string): Promise<Workspace[]> {
    // Find the application path based on applicationId
    const targetBasePath = this.getTargetBasePath(applicationId);
    if (!targetBasePath) {
      return [];
    }

    const workspaces: Workspace[] = [];

    try {
      // Build workspace mapping to discover workspaces
      const workspaceMapping = await this.getWorkspaceMapping(targetBasePath);

      // Count sessions for each workspace
      const chatSessionPattern = 'workspaceStorage/*/chatSessions/*.json';
      const sessionFiles = await fg(chatSessionPattern, { cwd: targetBasePath, absolute: true });

      // Group sessions by workspace ID
      const sessionCountByWorkspace: Record<string, number> = {};
      for (const sessionFile of sessionFiles) {
        const pathParts = sessionFile.split('/');
        const workspaceId = pathParts[pathParts.indexOf('workspaceStorage') + 1];
        if (workspaceId) {
          sessionCountByWorkspace[workspaceId] = (sessionCountByWorkspace[workspaceId] || 0) + 1;
        }
      }

      // Create WorkspaceInfo for each discovered workspace
      for (const [workspaceId, workspacePath] of Object.entries(workspaceMapping)) {
        const sessionCount = sessionCountByWorkspace[workspaceId] || 0;

        // Only include workspaces that have sessions
        if (sessionCount > 0) {
          workspaces.push({
            id: workspaceId, // Use just the workspace storage ID
            name: workspacePath.split('/').pop() || workspacePath, // Use folder name as display name
            path: workspacePath,
            applicationId,
            sessionCount,
          });
        }
      }
    } catch (error) {
      // Return empty array on error
    }

    return workspaces;
  }

  /**
   * Get all chat sessions from a specific workspace within an application
   */
  async getChatSessions(applicationId: string, workspaceId: string): Promise<ChatSession[]> {
    // Find the application path based on applicationId
    const targetBasePath = this.getTargetBasePath(applicationId);
    if (!targetBasePath) {
      return [];
    }

    try {
      // Look for chat session files in the specific workspace
      const chatSessionPattern = `workspaceStorage/${workspaceId}/chatSessions/*.json`;
      const sessionFiles = await fg(chatSessionPattern, { cwd: targetBasePath, absolute: true });

      const sessions: ChatSession[] = [];
      for (const sessionFile of sessionFiles) {
        const sessionId = sessionFile.split('/').pop()?.replace('.json', '');
        if (!sessionId) {
          continue;
        }
        const session = await this.parseChatSession(applicationId, workspaceId, sessionId);
        if (session) {
          sessions.push(session);
        }
      }

      return sessions;
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse actual chat session from JSON file by session ID
   */
  async parseChatSession(
    applicationId: string,
    workspaceId: string,
    sessionId: string,
  ): Promise<ChatSession | null> {
    const targetBasePath = this.getTargetBasePath(applicationId);
    if (!targetBasePath) {
      return null;
    }
    const filePath = resolve(
      targetBasePath,
      'workspaceStorage',
      workspaceId,
      'chatSessions',
      `${sessionId}.json`,
    );

    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const sessionData = JSON.parse(fileContent);

      const actualSessionId = sessionData.sessionId || sessionId;

      // Parse timestamps
      const creationDate = sessionData.creationDate;
      const lastMessageDate = sessionData.lastMessageDate;

      let timestamp: Date;
      if (creationDate) {
        try {
          timestamp = new Date(creationDate.replace('Z', '+00:00'));
        } catch {
          const fileStats = await stat(filePath);
          timestamp = new Date(fileStats.mtime);
        }
      } else {
        const fileStats = await stat(filePath);
        timestamp = new Date(fileStats.mtime);
      }

      const sessionMetadata: ChatSessionMetadata = {
        version: sessionData.version,
        requesterUsername: sessionData.requesterUsername,
        responderUsername: sessionData.responderUsername,
        initialLocation: sessionData.initialLocation,
        creationDate,
        lastMessageDate,
        isImported: sessionData.isImported,
        customTitle: sessionData.customTitle,
        type: 'chat_session',
        source_file: filePath,
        total_requests: (sessionData.requests || []).length,
      };

      const session: ChatSession = {
        id: actualSessionId,
        workspaceId,
        title: sessionData.customTitle, // Extract title from customTitle field
        metadata: sessionMetadata,
        createdAt: timestamp,
        updatedAt: timestamp,
        turns: this.extractChatTurns(sessionId, sessionData),
      };

      return session;
    } catch (error) {
      console.error(
        chalk.red(`Error parsing chat session ${sessionId}:`),
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * Get VS Code storage paths based on platform
   */
  private getStoragePaths(): string[] {
    const home = homedir();
    const paths: string[] = [];

    switch (platform()) {
      case 'win32': // Windows
        const appDataRoaming = resolve(home, 'AppData', 'Roaming');
        paths.push(
          resolve(appDataRoaming, 'Code', 'User'),
          resolve(appDataRoaming, 'Code - Insiders', 'User'),
        );
        break;

      case 'darwin': // macOS
        const applicationSupport = resolve(home, 'Library', 'Application Support');
        paths.push(
          resolve(applicationSupport, 'Code', 'User'),
          resolve(applicationSupport, 'Code - Insiders', 'User'),
        );
        break;

      default: // Linux and others
        const config = resolve(home, '.config');
        paths.push(resolve(config, 'Code', 'User'), resolve(config, 'Code - Insiders', 'User'));
        break;
    }

    return paths;
  }

  /**
   * Get the base path for the target application based on applicationId
   */
  private getTargetBasePath(applicationId: string): string | undefined {
    const vscodePaths = this.getStoragePaths();
    for (const basePath of vscodePaths) {
      const isInsiders = basePath.includes('Insiders');
      const appId = isInsiders ? 'vscode-insiders' : 'vscode';

      if (appId === applicationId) {
        try {
          stat(basePath);
          return basePath;
        } catch (error) {
          // Path not accessible, continue
        }
      }
    }
    return undefined;
  }

  /**
   * Get mapping from workspace storage directory to actual workspace path
   */
  private async getWorkspaceMapping(basePath: string): Promise<Record<string, string>> {
    const workspaceMapping: Record<string, string> = {};

    try {
      const workspaceStoragePath = resolve(basePath, 'workspaceStorage');

      // Get all workspace directories
      const workspaceDirs = await fg('*/', {
        cwd: workspaceStoragePath,
        onlyDirectories: true,
      });

      for (const workspaceDir of workspaceDirs) {
        const workspaceDirPath = resolve(workspaceStoragePath, workspaceDir);
        const workspaceJsonPath = resolve(workspaceDirPath, 'workspace.json');

        try {
          const workspaceJsonContent = await readFile(workspaceJsonPath, 'utf-8');
          const workspaceData = JSON.parse(workspaceJsonContent);

          const folderUri = workspaceData.folder || '';
          if (folderUri.startsWith('file://')) {
            const folderPath = folderUri.slice(7); // Remove file:// prefix

            // Use the full path as the workspace identifier
            workspaceMapping[workspaceDir.replace('/', '')] = folderPath;
          } else if (workspaceData.workspace) {
            // Multi-root workspace
            const workspaceRef = workspaceData.workspace || '';
            workspaceMapping[workspaceDir.replace('/', '')] = `multi-root: ${workspaceRef}`;
          }
        } catch (error) {
          // Failed to read workspace.json, skip this workspace
        }
      }
    } catch (error) {
      // Error building workspace mapping
    }

    return workspaceMapping;
  }

  /**
   * Extract all chat turns from a specific session
   */
  private extractChatTurns(sessionId: string, sessionData: any): ChatTurn[] {
    try {
      const turns: ChatTurn[] = [];

      for (const request of sessionData.requests || []) {
        const requestTimestamp = new Date(
          request.timestamp || sessionData.creationDate || Date.now(),
        );

        const turnId = request.requestId;

        const turn: ChatTurn = {
          id: turnId,
          sessionId,
          metadata: {
            turnType: 'request_response_cycle',
            status: request.isCanceled ? 'cancelled' : 'completed',
            startedAt: requestTimestamp,
            completedAt: requestTimestamp,
            requestId: request.requestId,
            responseId: request.responseId,
            modelId: sessionData.modelId || request.modelId,
            isCanceled: request.isCanceled,
            userRequest: request.message,
            variableData: request.variableData,
            followups: request.followups,
            contentReferences: request.contentReferences,
            codeCitations: request.codeCitations,
            timings: request.result?.timings,
            agentInfo: request.agent,
            messageCount: (request.response || []).length + 1, // +1 for user message
          },
          createdAt: requestTimestamp,
          updatedAt: requestTimestamp,
          messages: this.extractChatMessages(turnId, request),
        };

        turns.push(turn);
      }

      return turns;
    } catch (error) {
      return [];
    }
  }

  /**
   * Extract all chat messages from a specific turn
   */
  private extractChatMessages(turnId: string, requestData: any): ChatMessage[] {
    try {
      const requestTimestamp = new Date(requestData.timestamp || Date.now());
      const messages: ChatMessage[] = [];

      // User message
      const userMessageText = requestData.message?.text || '';
      if (userMessageText) {
        const userMessage: ChatMessage = {
          id: `${requestData.requestId}_user`,
          turnId,
          role: 'user',
          content: userMessageText,
          timestamp: requestTimestamp,
          metadata: {
            type: 'user_message',
            variableData: requestData.variableData || {},
          },
        };
        messages.push(userMessage);
      }

      // Parse assistant responses (response is an array)
      if (requestData.response && Array.isArray(requestData.response)) {
        for (let i = 0; i < requestData.response.length; i++) {
          const responseItem = requestData.response[i];
          const responseMessage = this.parseResponseItem(
            responseItem,
            requestData.requestId,
            i,
            requestTimestamp,
            turnId,
          );
          if (responseMessage) {
            messages.push(responseMessage);
          }
        }
      }

      return messages;
    } catch (error) {
      return [];
    }
  }

  /**
   * Parse a single response item from the response array
   */
  private parseResponseItem(
    responseItem: any,
    requestId: string,
    index: number,
    timestamp: Date,
    turnId: string,
  ): ChatMessage | null {
    if (!responseItem) return null;

    const messageId = `${requestId}_response_${index}`;

    // Handle different response kinds
    switch (responseItem.kind) {
      case 'prepareToolInvocation':
        return {
          id: messageId,
          turnId,
          role: 'assistant',
          content: `Preparing to use tool: ${responseItem.toolName || 'unknown'}`,
          timestamp,
          metadata: {
            type: 'tool_preparation',
            toolName: responseItem.toolName,
            kind: responseItem.kind,
          },
        };

      case 'toolInvocationSerialized':
        const toolMessage =
          responseItem.invocationMessage?.value ||
          responseItem.pastTenseMessage?.value ||
          'Tool invocation';
        return {
          id: messageId,
          turnId,
          role: 'assistant',
          content: toolMessage,
          timestamp,
          metadata: {
            type: 'tool_invocation',
            toolId: responseItem.toolId,
            toolCallId: responseItem.toolCallId,
            isConfirmed: responseItem.isConfirmed,
            isComplete: responseItem.isComplete,
            resultDetails: responseItem.resultDetails,
            toolSpecificData: responseItem.toolSpecificData,
            kind: responseItem.kind,
            invocationMessage: responseItem.invocationMessage,
            pastTenseMessage: responseItem.pastTenseMessage,
            originMessage: responseItem.originMessage,
          },
        };

      case 'textEditGroup':
        return {
          id: messageId,
          turnId,
          role: 'assistant',
          content: `Made text edits to ${responseItem.uri?.path || 'file'}`,
          timestamp,
          metadata: {
            type: 'text_edit',
            uri: responseItem.uri,
            edits: responseItem.edits,
            done: responseItem.done,
            kind: responseItem.kind,
          },
        };

      case 'codeblockUri':
        return {
          id: messageId,
          turnId,
          role: 'assistant',
          content: `Modified code in ${responseItem.uri?.path || 'file'}`,
          timestamp,
          metadata: {
            type: 'code_edit',
            uri: responseItem.uri,
            kind: responseItem.kind,
          },
        };

      case 'undoStop':
        return {
          id: messageId,
          turnId,
          role: 'assistant',
          content: 'Undo stop marker',
          timestamp,
          metadata: {
            type: 'undo_stop',
            kind: responseItem.kind,
          },
        };

      case 'inlineReference':
        const refPath = responseItem.inlineReference?.path || 'unknown file';
        return {
          id: messageId,
          turnId,
          role: 'assistant',
          content: `Referenced: ${refPath}`,
          timestamp,
          metadata: {
            type: 'inline_reference',
            inlineReference: responseItem.inlineReference,
            kind: responseItem.kind,
          },
        };

      default:
        // Handle plain text responses (no kind property)
        if (responseItem.value) {
          return {
            id: messageId,
            turnId,
            role: 'assistant',
            content: responseItem.value,
            timestamp,
            metadata: {
              type: 'text_response',
              value: responseItem.value,
              supportThemeIcons: responseItem.supportThemeIcons,
              supportHtml: responseItem.supportHtml,
              baseUri: responseItem.baseUri,
              uris: responseItem.uris,
              kind: responseItem.kind || 'text',
            },
          };
        }

        // Handle other unknown response types
        if (responseItem.kind) {
          return {
            id: messageId,
            turnId,
            role: 'assistant',
            content: `Unknown response type: ${responseItem.kind}`,
            timestamp,
            metadata: {
              type: 'unknown_response',
              kind: responseItem.kind,
            },
          };
        }

        return null;
    }
  }
}
