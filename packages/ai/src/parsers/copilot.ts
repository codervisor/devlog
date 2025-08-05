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
  ChatSession,
  ChatSessionData,
  ChatMessage,
  ChatMessageData,
  Workspace,
  WorkspaceDataContainer,
  ApplicationInfo,
  WorkspaceInfo,
  type ChatSessionMetadata,
} from '../models/index.js';
import { BaseParser } from './base.js';
import { Logger } from './utils.js';

export class CopilotParser extends BaseParser {
  private sessionIdToFilePathMap: Map<string, string> = new Map();
  private workspaceIdToPathMap: Map<string, string> = new Map();

  constructor(logger?: Logger) {
    super(logger);
  }

  /**
   * Get all available applications (VS Code installations) for GitHub Copilot
   */
  async getApplications(): Promise<ApplicationInfo[]> {
    const vscodePaths = this.getDataPaths();
    const applications: ApplicationInfo[] = [];

    for (const basePath of vscodePaths) {
      try {
        await stat(basePath);
        
        // Determine application type from path
        const isInsiders = basePath.includes('Insiders');
        const appId = isInsiders ? 'vscode-insiders' : 'vscode';
        const appName = isInsiders ? 'VS Code Insiders' : 'VS Code';

        // Count workspaces in this application
        const workspaceMapping = await this.buildWorkspaceMapping(basePath);
        const workspaceCount = Object.keys(workspaceMapping).length;

        if (workspaceCount > 0) {
          applications.push({
            id: appId,
            name: appName,
            path: basePath,
            agent: 'GitHub Copilot', // Keep static for ApplicationInfo - this identifies the parser type
            workspaceCount,
            metadata: {
              platform: platform(),
              discovery_timestamp: new Date().toISOString(),
            },
          });
        }
      } catch (error) {
        this.logger.debug?.(`VS Code path not found: ${basePath}`);
      }
    }

    return applications;
  }

  /**
   * Get VS Code storage paths based on platform
   */
  private getDataPaths(): string[] {
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
   * Get all workspaces from a specific application
   */
  async getWorkspaces(applicationId: string): Promise<WorkspaceInfo[]> {
    const vscodePaths = this.getDataPaths();
    const workspaces: WorkspaceInfo[] = [];

    // Find the application path based on applicationId
    let targetBasePath: string | undefined;
    for (const basePath of vscodePaths) {
      const isInsiders = basePath.includes('Insiders');
      const appId = isInsiders ? 'vscode-insiders' : 'vscode';
      
      if (appId === applicationId) {
        try {
          await stat(basePath);
          targetBasePath = basePath;
          break;
        } catch (error) {
          this.logger.debug?.(`VS Code path not found: ${basePath}`);
        }
      }
    }

    if (!targetBasePath) {
      this.logger.error?.(`Application not found: ${applicationId}`);
      return [];
    }

    try {
      // Build workspace mapping to discover workspaces
      const workspaceMapping = await this.buildWorkspaceMapping(targetBasePath);
      
      // Populate the workspaceId to path mapping for later use
      for (const [workspaceId, workspacePath] of Object.entries(workspaceMapping)) {
        this.workspaceIdToPathMap.set(workspaceId, workspacePath);
      }

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
            applicationId: applicationId,
            sessionCount,
            metadata: {
              vscode_installation: targetBasePath,
              workspace_storage_id: workspaceId,
            },
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
    const vscodePaths = this.getDataPaths();
    
    // Find the application path based on applicationId
    let targetBasePath: string | undefined;
    for (const basePath of vscodePaths) {
      const isInsiders = basePath.includes('Insiders');
      const appId = isInsiders ? 'vscode-insiders' : 'vscode';
      
      if (appId === applicationId) {
        try {
          await stat(basePath);
          targetBasePath = basePath;
          break;
        } catch (error) {
          this.logger.debug?.(`VS Code path not found: ${basePath}`);
        }
      }
    }

    if (!targetBasePath) {
      this.logger.error?.(`Application not found: ${applicationId}`);
      return [];
    }

    try {
      // Ensure workspace mappings are built
      const workspaceMapping = await this.buildWorkspaceMapping(targetBasePath);
      for (const [id, path] of Object.entries(workspaceMapping)) {
        this.workspaceIdToPathMap.set(id, path);
      }

      // Look for chat session files in the specific workspace
      const chatSessionPattern = `workspaceStorage/${workspaceId}/chatSessions/*.json`;
      const sessionFiles = await fg(chatSessionPattern, { cwd: targetBasePath, absolute: true });
      
      const sessions: ChatSession[] = [];
      for (const sessionFile of sessionFiles) {
        const session = await this.parseChatSessionFromFile(sessionFile);
        if (session) {
          // Build the session ID to file path mapping
          if (session.session_id) {
            this.sessionIdToFilePathMap.set(session.session_id, sessionFile);
          }

          // Set the workspace path from the mapping
          const workspacePath = workspaceMapping[workspaceId];
          if (workspacePath) {
            session.workspace = workspacePath;
          }
          
          sessions.push(session);
        }
      }
      
      return sessions;
    } catch (error) {
      this.logger.error?.(`Failed to get chat sessions for workspace ${workspaceId} in application ${applicationId}:`, error);
      return [];
    }
  }

  /**
   * Build mapping from workspace storage directory to actual workspace path
   */
  private async buildWorkspaceMapping(basePath: string): Promise<Record<string, string>> {
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
   * Parse actual chat session from JSON file by session ID
   */
  async parseChatSession(applicationId: string, workspaceId: string, sessionId: string): Promise<ChatSession | null> {
    const filePath = this.sessionIdToFilePathMap.get(sessionId);
    if (!filePath) {
      this.logger.error?.(`No file path found for session ID: ${sessionId}`);
      return null;
    }

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
          const userMessage = new ChatMessageData({
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
          });
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

      // Get the actual workspace path from the workspaceId
      const workspacePath = this.workspaceIdToPathMap.get(workspaceId);

      // Get the agent name from the session data (responderUsername) 
      const agentName = data.responderUsername || 'GitHub Copilot'; // fallback if missing

      const session = new ChatSessionData({
        agent: agentName, // Use dynamic agent name from session data
        timestamp,
        messages,
        workspace: workspacePath, // Use the mapped workspace path
        session_id: actualSessionId,
        metadata: sessionMetadata,
      });

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
        return new ChatMessageData({
          role: 'assistant',
          content: `Preparing to use tool: ${responseItem.toolName || 'unknown'}`,
          timestamp,
          id: messageId,
          metadata: {
            type: 'tool_preparation',
            toolName: responseItem.toolName,
            kind: responseItem.kind,
          },
        });

      case 'toolInvocationSerialized':
        const toolMessage =
          responseItem.invocationMessage?.value ||
          responseItem.pastTenseMessage?.value ||
          'Tool invocation';
        return new ChatMessageData({
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
        });

      case 'textEditGroup':
        return new ChatMessageData({
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
        });

      case 'codeblockUri':
        return new ChatMessageData({
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
        });

      case 'undoStop':
        return new ChatMessageData({
          role: 'assistant',
          content: 'Undo stop marker',
          timestamp,
          id: messageId,
          metadata: {
            type: 'undo_stop',
            undoId: responseItem.id,
            kind: responseItem.kind,
          },
        });

      case 'inlineReference':
        const refPath = responseItem.inlineReference?.path || 'unknown file';
        return new ChatMessageData({
          role: 'assistant',
          content: `Referenced: ${refPath}`,
          timestamp,
          id: messageId,
          metadata: {
            type: 'inline_reference',
            inlineReference: responseItem.inlineReference,
            kind: responseItem.kind,
          },
        });

      default:
        // Handle plain text responses (no kind property)
        if (responseItem.value) {
          return new ChatMessageData({
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
          });
        }

        // Handle other unknown response types
        if (responseItem.kind) {
          return new ChatMessageData({
            role: 'assistant',
            content: `Unknown response type: ${responseItem.kind}`,
            timestamp,
            id: messageId,
            metadata: {
              type: 'unknown_response',
              kind: responseItem.kind,
              rawData: responseItem,
            },
          });
        }

        return null;
    }
  }

  /**
   * Parse actual chat session from JSON file (helper method)
   */
  private async parseChatSessionFromFile(filePath: string): Promise<ChatSession | null> {
    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      const sessionId = data.sessionId || resolve(filePath).split('/').pop()?.replace('.json', '') || '';

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
          const userMessage = new ChatMessageData({
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
          });
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

      // Get the agent name from the session data (responderUsername)
      const agentName = data.responderUsername || 'GitHub Copilot'; // fallback if missing

      const session = new ChatSessionData({
        agent: agentName, // Use dynamic agent name from session data
        timestamp,
        messages,
        workspace: undefined, // Will be set by caller
        session_id: sessionId,
        metadata: sessionMetadata,
      });

      this.logger.info?.(`Parsed chat session ${sessionId} with ${messages.length} messages`);
      return session;
    } catch (error) {
      this.logger.error?.(
        `Error parsing chat session ${filePath}:`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * Discover and parse all Copilot data in a directory
   */
  private async discoverCopilotData(basePath: string): Promise<Workspace> {
    const workspaceData = new WorkspaceDataContainer({
      agent: 'GitHub Copilot',
      workspace_path: basePath,
      metadata: { discovery_source: basePath },
    });

    // Build workspace mapping from workspace.json files
    const workspaceMapping = await this.buildWorkspaceMapping(basePath);
    this.logger.info?.(
      `Built workspace mapping with ${Object.keys(workspaceMapping).length} workspaces`,
    );

    // Populate the workspaceId to path mapping
    for (const [workspaceId, workspacePath] of Object.entries(workspaceMapping)) {
      this.workspaceIdToPathMap.set(workspaceId, workspacePath);
    }

    // Look for actual chat session JSON files (new format)
    const chatSessionPattern = 'workspaceStorage/*/chatSessions/*.json';
    const sessionFiles = await fg(chatSessionPattern, { cwd: basePath, absolute: true });

    for (const sessionFile of sessionFiles) {
      const session = await this.parseChatSessionFromFile(sessionFile);
      if (session) {
        // Build the session ID to file path mapping
        if (session.session_id) {
          this.sessionIdToFilePathMap.set(session.session_id, sessionFile);
        }

        // Extract workspace from file path using mapping
        const pathParts = sessionFile.split('/');
        const workspaceId = pathParts[pathParts.indexOf('workspaceStorage') + 1];

        if (workspaceId && workspaceMapping[workspaceId]) {
          session.workspace = workspaceMapping[workspaceId];
        }
        workspaceData.chat_sessions.push(session);
      }
    }

    this.logger.info?.(
      `Discovered ${workspaceData.chat_sessions.length} chat sessions from ${basePath}`,
    );
    return workspaceData;
  }
}
