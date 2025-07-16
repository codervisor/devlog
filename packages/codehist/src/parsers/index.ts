/**
 * GitHub Copilot chat history parser for VS Code
 * 
 * This module handles parsing GitHub Copilot chat sessions from VS Code's
 * JSON storage files to extract actual conversation history.
 */

import { readFile } from 'fs/promises';
import { stat } from 'fs/promises';
import { resolve } from 'path';
import { homedir, platform } from 'os';
import fg from 'fast-glob';
import { 
  ChatSession, 
  Message, 
  WorkspaceData, 
  ChatSessionData, 
  MessageData, 
  WorkspaceDataContainer 
} from '../models/index.js';

// Simple logger interface for the parser
interface Logger {
  error?(message: string, ...args: unknown[]): void;
  warn?(message: string, ...args: unknown[]): void;
  info?(message: string, ...args: unknown[]): void;
  debug?(message: string, ...args: unknown[]): void;
}

// Simple console logger implementation
class SimpleConsoleLogger implements Logger {
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.log(`[INFO] ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    // Only log debug in development or when DEBUG env var is set
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}

export interface SearchResult {
  session_id?: string;
  message_id?: string;
  role: string;
  timestamp: string;
  match_position: number;
  context: string;
  full_content: string;
  metadata: Record<string, unknown>;
}

export interface ChatStatistics {
  total_sessions: number;
  total_messages: number;
  message_types: Record<string, number>;
  session_types: Record<string, number>;
  workspace_activity: Record<string, {
    sessions: number;
    messages: number;
    first_seen: string;
    last_seen: string;
  }>;
  date_range: {
    earliest: string | null;
    latest: string | null;
  };
  agent_activity: Record<string, number>;
}

export class CopilotParser {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new SimpleConsoleLogger();
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
        onlyDirectories: true 
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
          this.logger.debug?.(`Failed to read workspace.json from ${workspaceJsonPath}:`, error instanceof Error ? error.message : String(error));
        }
      }
    } catch (error) {
      this.logger.error?.('Error building workspace mapping:', error instanceof Error ? error.message : String(error));
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
      const messages: Message[] = [];
      for (const request of data.requests || []) {
        // User message
        const userMessageText = request.message?.text || '';
        if (userMessageText) {
          const userMessage = new MessageData({
            role: 'user',
            content: userMessageText,
            timestamp,
            id: request.requestId,
            metadata: {
              type: 'user_request',
              agent: request.agent || {},
              variableData: request.variableData || {},
              modelId: request.modelId
            }
          });
          messages.push(userMessage);
        }

        // Assistant response
        const response = request.response;
        if (response) {
          let responseText = '';
          if (typeof response === 'object' && response !== null) {
            if ('value' in response) {
              responseText = response.value;
            } else if ('text' in response) {
              responseText = response.text;
            } else if ('content' in response) {
              responseText = response.content;
            }
          } else if (typeof response === 'string') {
            responseText = response;
          }

          if (responseText) {
            const assistantMessage = new MessageData({
              role: 'assistant',
              content: responseText,
              timestamp,
              id: request.responseId,
              metadata: {
                type: 'assistant_response',
                result: request.result || {},
                followups: request.followups || [],
                isCanceled: request.isCanceled || false,
                contentReferences: request.contentReferences || [],
                codeCitations: request.codeCitations || [],
                requestTimestamp: request.timestamp
              }
            });
            messages.push(assistantMessage);
          }
        }
      }

      const sessionMetadata = {
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
        total_requests: (data.requests || []).length
      };

      const session = new ChatSessionData({
        agent: 'GitHub Copilot',
        timestamp,
        messages,
        workspace: undefined, // Will be set by caller
        session_id: sessionId,
        metadata: sessionMetadata
      });

      this.logger.info?.(`Parsed chat session ${sessionId} with ${messages.length} messages`);
      return session;

    } catch (error) {
      this.logger.error?.(`Error parsing chat session ${filePath}:`, error instanceof Error ? error.message : String(error));
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
      const messages: Message[] = [];
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

        const message = new MessageData({
          role: 'user', // Changed from 'system' to match interface
          content,
          timestamp,
          id: requestId,
          metadata: {
            workingSet,
            entries,
            type: 'editing_session'
          }
        });
        messages.push(message);
      }

      // Add information about recent snapshot
      const recentSnapshot = data.recentSnapshot || {};
      if (Object.keys(recentSnapshot).length > 0) {
        const snapshotMessage = new MessageData({
          role: 'assistant',
          content: `Recent snapshot with ${(recentSnapshot.workingSet || []).length} files`,
          timestamp,
          id: `snapshot_${sessionId}`,
          metadata: {
            recentSnapshot,
            type: 'snapshot'
          }
        });
        messages.push(snapshotMessage);
      }

      const sessionMetadata = {
        version: data.version,
        linearHistoryIndex: data.linearHistoryIndex,
        initialFileContents: data.initialFileContents || [],
        recentSnapshot,
        type: 'chat_editing_session',
        source_file: filePath
      };

      const session = new ChatSessionData({
        agent: 'GitHub Copilot',
        timestamp,
        messages,
        workspace: undefined, // Will be set by caller
        session_id: sessionId,
        metadata: sessionMetadata
      });

      this.logger.info?.(`Parsed chat editing session ${sessionId} with ${messages.length} entries`);
      return session;

    } catch (error) {
      this.logger.error?.(`Error parsing chat editing session ${filePath}:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  /**
   * Get VS Code storage paths based on platform
   */
  private getVSCodePaths(): string[] {
    const home = homedir();
    const paths: string[] = [];

    switch (platform()) {
      case 'win32': // Windows
        const appDataRoaming = resolve(home, 'AppData', 'Roaming');
        paths.push(
          resolve(appDataRoaming, 'Code', 'User'),
          resolve(appDataRoaming, 'Code - Insiders', 'User')
        );
        break;

      case 'darwin': // macOS
        const applicationSupport = resolve(home, 'Library', 'Application Support');
        paths.push(
          resolve(applicationSupport, 'Code', 'User'),
          resolve(applicationSupport, 'Code - Insiders', 'User')
        );
        break;

      default: // Linux and others
        const config = resolve(home, '.config');
        paths.push(
          resolve(config, 'Code', 'User'),
          resolve(config, 'Code - Insiders', 'User')
        );
        break;
    }

    return paths;
  }

  /**
   * Discover Copilot data from VS Code's application support directory
   */
  async discoverVSCodeCopilotData(): Promise<WorkspaceData> {
    const vscodePaths = this.getVSCodePaths();
    
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
                (allData.metadata[key] as any[]).push(...value);
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
  async discoverCopilotData(basePath: string): Promise<WorkspaceData> {
    const workspaceData = new WorkspaceDataContainer({
      agent: 'GitHub Copilot',
      workspace_path: basePath,
      metadata: { discovery_source: basePath }
    });

    // Build workspace mapping from workspace.json files
    const workspaceMapping = await this.buildWorkspaceMapping(basePath);
    this.logger.info?.(`Built workspace mapping with ${Object.keys(workspaceMapping).length} workspaces`);

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

    this.logger.info?.(`Discovered ${workspaceData.chat_sessions.length} chat sessions from ${basePath}`);
    return workspaceData;
  }

  /**
   * Search for content in chat sessions
   */
  searchChatContent(
    workspaceData: WorkspaceData, 
    query: string, 
    caseSensitive: boolean = false
  ): SearchResult[] {
    const results: SearchResult[] = [];
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    for (const session of workspaceData.chat_sessions) {
      for (const message of session.messages) {
        const content = caseSensitive ? message.content : message.content.toLowerCase();

        if (content.includes(searchQuery)) {
          // Find context around the match
          const matchPos = content.indexOf(searchQuery);
          const contextStart = Math.max(0, matchPos - 100);
          const contextEnd = Math.min(content.length, matchPos + searchQuery.length + 100);
          const context = content.slice(contextStart, contextEnd);

          results.push({
            session_id: session.session_id,
            message_id: message.id,
            role: message.role,
            timestamp: message.timestamp.toISOString(),
            match_position: matchPos,
            context,
            full_content: message.content,
            metadata: message.metadata
          });
        }
      }
    }

    return results;
  }

  /**
   * Get statistics about chat sessions
   */
  getChatStatistics(workspaceData: WorkspaceData): ChatStatistics {
    const stats: ChatStatistics = {
      total_sessions: workspaceData.chat_sessions.length,
      total_messages: 0,
      message_types: {},
      session_types: {},
      workspace_activity: {},
      date_range: {
        earliest: null,
        latest: null
      },
      agent_activity: {}
    };

    const allTimestamps: Date[] = [];

    for (const session of workspaceData.chat_sessions) {
      const sessionType = session.metadata.type || 'unknown';
      stats.session_types[sessionType] = (stats.session_types[sessionType] || 0) + 1;

      allTimestamps.push(session.timestamp);

      const agent = session.agent;
      stats.agent_activity[agent] = (stats.agent_activity[agent] || 0) + 1;

      // Track workspace activity
      const workspace = session.workspace || 'unknown_workspace';
      if (!stats.workspace_activity[workspace]) {
        stats.workspace_activity[workspace] = {
          sessions: 0,
          messages: 0,
          first_seen: session.timestamp.toISOString(),
          last_seen: session.timestamp.toISOString()
        };
      }

      const workspaceStats = stats.workspace_activity[workspace];
      workspaceStats.sessions += 1;

      // Update workspace date range
      if (session.timestamp.toISOString() < workspaceStats.first_seen) {
        workspaceStats.first_seen = session.timestamp.toISOString();
      }
      if (session.timestamp.toISOString() > workspaceStats.last_seen) {
        workspaceStats.last_seen = session.timestamp.toISOString();
      }

      for (const message of session.messages) {
        stats.total_messages += 1;
        workspaceStats.messages += 1;

        const messageType = message.metadata.type || message.role;
        stats.message_types[messageType] = (stats.message_types[messageType] || 0) + 1;

        allTimestamps.push(message.timestamp);
      }
    }

    if (allTimestamps.length > 0) {
      const earliest = new Date(Math.min(...allTimestamps.map(d => d.getTime())));
      const latest = new Date(Math.max(...allTimestamps.map(d => d.getTime())));
      stats.date_range.earliest = earliest.toISOString();
      stats.date_range.latest = latest.toISOString();
    }

    return stats;
  }
}
