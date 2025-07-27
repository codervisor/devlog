/**
 * Data mapper for converting between AI package and Core package types
 *
 * Handles the conversion between different ChatSession and ChatMessage
 * structures used by the AI parsing logic and the core storage system.
 */

import {
  ChatSession as CoreChatSession,
  ChatMessage as CoreChatMessage,
} from '@codervisor/devlog-core';
import {
  WorkspaceData,
  WorkspaceDataContainer,
  ChatSession as AiChatSession,
  Message as AiMessage,
} from '@codervisor/devlog-ai';
import { v4 as uuidv4 } from 'uuid';

export interface ConvertedChatData {
  sessions: CoreChatSession[];
  messages: CoreChatMessage[];
}

/**
 * Convert AI package WorkspaceData to Core package format
 */
export function convertWorkspaceDataToCoreFormat(
  workspaceData: WorkspaceData | WorkspaceDataContainer,
): ConvertedChatData {
  const sessions: CoreChatSession[] = [];
  const messages: CoreChatMessage[] = [];

  for (const aiSession of workspaceData.chat_sessions) {
    // Generate a proper session ID if not present
    const sessionId = aiSession.session_id || uuidv4();

    // Convert AI ChatSession to Core ChatSession
    const currentTime = new Date().toISOString();
    const coreSession: CoreChatSession = {
      id: sessionId,
      agent: (aiSession.agent || workspaceData.agent) as any, // Type assertion for agent compatibility
      timestamp:
        typeof aiSession.timestamp === 'string'
          ? aiSession.timestamp
          : aiSession.timestamp.toISOString(),
      workspace: aiSession.workspace || 'unknown',
      title: aiSession.metadata?.customTitle || `Chat ${sessionId.slice(0, 8)}`,
      status: 'imported',
      messageCount: aiSession.messages?.length || 0,
      tags: [],
      importedAt: currentTime,
      updatedAt: (() => {
        const lastDate = aiSession.metadata?.lastMessageDate || aiSession.timestamp;
        return typeof lastDate === 'string' ? lastDate : lastDate.toISOString();
      })(),
      linkedDevlogs: [],
      archived: false,
      metadata: {
        ...aiSession.metadata,
        source: 'ai-package-import',
        originalSessionId: aiSession.session_id,
        type: aiSession.metadata?.type || 'chat_session',
      },
    };

    sessions.push(coreSession);

    // Convert messages
    if (aiSession.messages && Array.isArray(aiSession.messages)) {
      for (let i = 0; i < aiSession.messages.length; i++) {
        const aiMessage = aiSession.messages[i];

        const coreMessage: CoreChatMessage = {
          id: aiMessage.id || uuidv4(),
          sessionId: sessionId,
          role: aiMessage.role === 'user' ? 'user' : 'assistant',
          content: aiMessage.content,
          timestamp:
            typeof aiMessage.timestamp === 'string'
              ? aiMessage.timestamp
              : aiMessage.timestamp.toISOString(),
          sequence: i,
          metadata: {
            ...aiMessage.metadata,
            originalMessageId: aiMessage.id,
          },
        };

        messages.push(coreMessage);
      }
    }
  }

  return { sessions, messages };
}

/**
 * Extract workspace information from AI WorkspaceData
 */
export function extractWorkspaceInfo(workspaceData: WorkspaceData | WorkspaceDataContainer) {
  return {
    name:
      (workspaceData.metadata as any)?.workspace_name ||
      workspaceData.workspace_path?.split('/').pop() ||
      'Unknown Workspace',
    path: workspaceData.workspace_path,
    agent: workspaceData.agent,
    version: workspaceData.version,
    sessionCount: workspaceData.chat_sessions.length,
    totalMessages: workspaceData.chat_sessions.reduce(
      (total, session) => total + (session.messages?.length || 0),
      0,
    ),
  };
}

/**
 * Validate that the converted data is properly structured
 */
export function validateConvertedData(data: ConvertedChatData): boolean {
  // Check sessions
  for (const session of data.sessions) {
    if (!session.id || !session.agent || !session.timestamp) {
      console.error('Invalid session data:', session);
      return false;
    }
  }

  // Check messages
  for (const message of data.messages) {
    if (
      !message.id ||
      !message.sessionId ||
      !message.role ||
      !message.content ||
      !message.timestamp
    ) {
      console.error('Invalid message data:', message);
      return false;
    }
  }

  // Check that all messages reference valid sessions
  const sessionIds = new Set(data.sessions.map((s) => s.id));
  for (const message of data.messages) {
    if (!sessionIds.has(message.sessionId)) {
      console.error(`Message ${message.id} references non-existent session ${message.sessionId}`);
      return false;
    }
  }

  return true;
}
