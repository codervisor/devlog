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
import {
  Application,
  ChatMessage,
  ChatSession,
  type ChatSessionMetadata,
  ParserType,
  Workspace,
} from '../types/index.js';
import { BaseParser } from './base.js';

export class CopilotParser extends BaseParser {
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
        this.logger.debug?.(`VS Code path not found: ${basePath}`);
      }
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
      this.logger.error?.(`Failed to get workspaces for application ${applicationId}:`, error);
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
          this.logger.warn?.(`Session file without ID found: ${sessionFile}`);
          continue;
        }
        const session = await this.parseChatSession(applicationId, workspaceId, sessionId);
        if (session) {
          sessions.push(session);
        }
      }

      return sessions;
    } catch (error) {
      this.logger.error?.(
        `Failed to get chat sessions for workspace ${workspaceId} in application ${applicationId}:`,
        error,
      );
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
      this.logger.error?.(`Application not found: ${applicationId}`);
      return null;
    }
    const filePath = resolve(targetBasePath, 'workspaceStorage', workspaceId, 'chatSessions', `${sessionId}.json`);

    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      const actualSessionId = data.sessionId || sessionId;

      // Parse timestamps
      const creationDate = data.creationDate;
      const lastMessageDate = data.lastMessageDate;

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

      // Extract messages from requests
      const messages: ChatMessage[] = [];
      for (const request of data.requests || []) {
        // User message
        const userMessageText = request.message?.text || '';
        if (userMessageText) {
          const userMessage: ChatMessage = {
            role: 'user',
            content: userMessageText,
            timestamp,
            id: request.requestId,
            metadata: {
              type: 'user_request',
              agent: request.agent || {},
              variableData: request.variableData || {},
              modelId: request.modelId,
            },
          };
          messages.push(userMessage);
        }

        // Parse assistant responses (response is an array)
        if (request.response && Array.isArray(request.response)) {
          for (let i = 0; i < request.response.length; i++) {
            const responseItem = request.response[i];
            const responseMessage = this.parseResponseItem(
              responseItem,
              request.requestId,
              i,
              timestamp,
            );
            if (responseMessage) {
              messages.push(responseMessage);
            }
          }
        }
      }

      const sessionMetadata: ChatSessionMetadata = {
        version: data.version,
        requesterUsername: data.requesterUsername,
        responderUsername: data.responderUsername,
        initialLocation: data.initialLocation,
        creationDate,
        lastMessageDate,
        isImported: data.isImported,
        customTitle: data.customTitle,
        type: 'chat_session',
        source_file: filePath,
        total_requests: (data.requests || []).length,
      };

      const session: ChatSession = {
        timestamp,
        workspaceId,
        id: actualSessionId,
        title: data.customTitle, // Extract title from customTitle field
        metadata: sessionMetadata,
      };

      this.logger.info?.(`Parsed chat session ${actualSessionId} with ${messages.length} messages`);
      return session;
    } catch (error) {
      this.logger.error?.(
        `Error parsing chat session ${sessionId}:`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
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
            this.logger.debug?.(`Mapped workspace ${workspaceDir} -> ${folderPath}`);
          } else if (workspaceData.workspace) {
            // Multi-root workspace
            const workspaceRef = workspaceData.workspace || '';
            workspaceMapping[workspaceDir.replace('/', '')] = `multi-root: ${workspaceRef}`;
            this.logger.debug?.(`Mapped workspace ${workspaceDir} -> multi-root: ${workspaceRef}`);
          }
        } catch (error) {
          this.logger.debug?.(
            `Failed to read workspace.json from ${workspaceJsonPath}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    } catch (error) {
      this.logger.error?.(
        'Error building workspace mapping:',
        error instanceof Error ? error.message : String(error),
      );
    }

    return workspaceMapping;
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
   * Parse a single response item from the response array
   */
  private parseResponseItem(
    responseItem: any,
    requestId: string,
    index: number,
    timestamp: Date,
  ): ChatMessage | null {
    if (!responseItem) return null;

    const messageId = `${requestId}_response_${index}`;

    // Handle different response kinds
    switch (responseItem.kind) {
      case 'prepareToolInvocation':
        return {
          role: 'assistant',
          content: `Preparing to use tool: ${responseItem.toolName || 'unknown'}`,
          timestamp,
          id: messageId,
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
          role: 'assistant',
          content: toolMessage,
          timestamp,
          id: messageId,
          metadata: {
            type: 'tool_invocation',
            toolId: responseItem.toolId,
            toolCallId: responseItem.toolCallId,
            isConfirmed: responseItem.isConfirmed,
            isComplete: responseItem.isComplete,
            resultDetails: responseItem.resultDetails,
            toolSpecificData: responseItem.toolSpecificData,
            kind: responseItem.kind,
          },
        };

      case 'textEditGroup':
        return {
          role: 'assistant',
          content: `Made text edits to ${responseItem.uri?.path || 'file'}`,
          timestamp,
          id: messageId,
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
          role: 'assistant',
          content: `Modified code in ${responseItem.uri?.path || 'file'}`,
          timestamp,
          id: messageId,
          metadata: {
            type: 'code_edit',
            uri: responseItem.uri,
            isEdit: responseItem.isEdit,
            kind: responseItem.kind,
          },
        };

      case 'undoStop':
        return {
          role: 'assistant',
          content: 'Undo stop marker',
          timestamp,
          id: messageId,
          metadata: {
            type: 'undo_stop',
            undoId: responseItem.id,
            kind: responseItem.kind,
          },
        };

      case 'inlineReference':
        const refPath = responseItem.inlineReference?.path || 'unknown file';
        return {
          role: 'assistant',
          content: `Referenced: ${refPath}`,
          timestamp,
          id: messageId,
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
            role: 'assistant',
            content: responseItem.value,
            timestamp,
            id: messageId,
            metadata: {
              type: 'text_response',
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
            role: 'assistant',
            content: `Unknown response type: ${responseItem.kind}`,
            timestamp,
            id: messageId,
            metadata: {
              type: 'unknown_response',
              kind: responseItem.kind,
              rawData: responseItem,
            },
          };
        }

        return null;
    }
  }

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
          this.logger.debug?.(`VS Code path not found: ${basePath}`);
        }
      }
    }
    this.logger.error?.(`Application not found: ${applicationId}`);
    return undefined;
  }
}
