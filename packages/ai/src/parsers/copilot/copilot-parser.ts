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
  type ChatSessionMetadata,
} from '../../models/index.js';
import { BaseParser, Logger } from '../base/base-parser';

export class CopilotParser extends BaseParser {
  constructor(logger?: Logger) {
    super(logger);
  }

  getAssistantName(): string {
    return 'GitHub Copilot';
  }

  /**
   * Get VS Code storage paths based on platform
   */
  protected getDataPaths(): string[] {
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
   * Parse actual chat session from JSON file
   */
  async parseChatSession(filePath: string): Promise<ChatSession | null> {
    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      const sessionId =
        data.sessionId || resolve(filePath).split('/').pop()?.replace('.json', '') || '';

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

      const session = new ChatSessionData({
        agent: 'GitHub Copilot',
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
   * Parse chat editing session from state.json file (legacy format)
   */
  async parseChatEditingSession(filePath: string): Promise<ChatSession | null> {
    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      const sessionId = data.sessionId || '';
      const fileStats = await stat(filePath);
      const timestamp = new Date(fileStats.mtime);

      // Extract messages from linear history
      const messages: ChatMessage[] = [];
      for (let i = 0; i < (data.linearHistory || []).length; i++) {
        const historyEntry = data.linearHistory[i];
        const requestId = historyEntry.requestId || `request_${i}`;
        const workingSet = historyEntry.workingSet || [];
        const entries = historyEntry.entries || [];

        // Create a descriptive message for the editing session
        let content = `Chat editing session with ${workingSet.length} files in working set`;
        if (entries.length > 0) {
          content += ` and ${entries.length} entries`;
        }

        const message = new ChatMessageData({
          role: 'user', // Changed from 'system' to match interface
          content,
          timestamp,
          id: requestId,
          metadata: {
            workingSet,
            entries,
            type: 'editing_session',
          },
        });
        messages.push(message);
      }

      // Add information about recent snapshot
      const recentSnapshot = data.recentSnapshot || {};
      if (Object.keys(recentSnapshot).length > 0) {
        const snapshotMessage = new ChatMessageData({
          role: 'assistant',
          content: `Recent snapshot with ${(recentSnapshot.workingSet || []).length} files`,
          timestamp,
          id: `snapshot_${sessionId}`,
          metadata: {
            recentSnapshot,
            type: 'snapshot',
          },
        });
        messages.push(snapshotMessage);
      }

      const sessionMetadata = {
        version: data.version,
        linearHistoryIndex: data.linearHistoryIndex,
        initialFileContents: data.initialFileContents || [],
        recentSnapshot,
        type: 'chat_editing_session',
        source_file: filePath,
      };

      const session = new ChatSessionData({
        agent: 'GitHub Copilot',
        timestamp,
        messages,
        workspace: undefined, // Will be set by caller
        session_id: sessionId,
        metadata: sessionMetadata,
      });

      this.logger.info?.(
        `Parsed chat editing session ${sessionId} with ${messages.length} entries`,
      );
      return session;
    } catch (error) {
      this.logger.error?.(
        `Error parsing chat editing session ${filePath}:`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  /**
   * Discover Copilot data from VS Code's application support directory
   */
  async discoverChatData(): Promise<Workspace> {
    const vscodePaths = this.getDataPaths();

    // Collect all data from all VS Code installations
    const allData = new WorkspaceDataContainer({ agent: 'GitHub Copilot' });

    for (const basePath of vscodePaths) {
      try {
        // Check if path exists
        await stat(basePath);

        this.logger.info?.(`Discovering Copilot data from: ${basePath}`);
        const data = await this.discoverCopilotData(basePath);

        if (data.chat_sessions.length > 0) {
          // Merge the data
          allData.chat_sessions.push(...data.chat_sessions);
          allData.workspace_path = basePath; // Use the last successful path

          // Merge metadata
          for (const [key, value] of Object.entries(data.metadata)) {
            if (key in allData.metadata) {
              if (Array.isArray(allData.metadata[key]) && Array.isArray(value)) {
                (allData.metadata[key] as unknown[]).push(...value);
              } else {
                allData.metadata[`${key}_${basePath.split('/').pop()}`] = value;
              }
            } else {
              allData.metadata[key] = value;
            }
          }
        }
      } catch (error) {
        // Path doesn't exist, continue to next
        this.logger.debug?.(`VS Code path not found: ${basePath}`);
      }
    }

    if (allData.chat_sessions.length === 0) {
      this.logger.warn?.('No chat sessions found in any VS Code installation');
    } else {
      this.logger.info?.(`Total discovered: ${allData.chat_sessions.length} chat sessions`);
    }

    return allData;
  }

  /**
   * Discover and parse all Copilot data in a directory
   */
  async discoverCopilotData(basePath: string): Promise<Workspace> {
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

    // Look for actual chat session JSON files (new format)
    const chatSessionPattern = 'workspaceStorage/*/chatSessions/*.json';
    const sessionFiles = await fg(chatSessionPattern, { cwd: basePath, absolute: true });

    for (const sessionFile of sessionFiles) {
      const session = await this.parseChatSession(sessionFile);
      if (session) {
        // Extract workspace from file path using mapping
        const pathParts = sessionFile.split('/');
        const workspaceId = pathParts[pathParts.indexOf('workspaceStorage') + 1];

        if (workspaceId && workspaceMapping[workspaceId]) {
          session.workspace = workspaceMapping[workspaceId];
        }
        workspaceData.chat_sessions.push(session);
      }
    }

    // Look for chat editing session files (legacy format)
    const editingSessionPattern = 'workspaceStorage/*/chatEditingSessions/*/state.json';
    const editingSessionFiles = await fg(editingSessionPattern, { cwd: basePath, absolute: true });

    for (const sessionFile of editingSessionFiles) {
      const session = await this.parseChatEditingSession(sessionFile);
      if (session) {
        // Extract workspace from file path using mapping
        const pathParts = sessionFile.split('/');
        const workspaceStorageIndex = pathParts.indexOf('workspaceStorage');
        const workspaceId = pathParts[workspaceStorageIndex + 1];

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
