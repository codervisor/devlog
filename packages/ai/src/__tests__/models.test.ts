/**
 * Tests for AI Models
 */

import { describe, it, expect } from 'vitest';
import { MessageData, ChatSessionData, WorkspaceDataContainer } from '../models/index.js';

describe('MessageData', () => {
  it('should create a message with required fields', () => {
    const message = new MessageData({
      role: 'user',
      content: 'Hello, world!',
    });

    expect(message.role).toBe('user');
    expect(message.content).toBe('Hello, world!');
    expect(message.timestamp).toBeInstanceOf(Date);
    expect(message.metadata).toEqual({});
  });

  it('should serialize to dict correctly', () => {
    const message = new MessageData({
      id: 'msg-1',
      role: 'assistant',
      content: 'Hello back!',
      timestamp: new Date('2023-01-01T00:00:00.000Z'),
      metadata: { type: 'assistant_response' },
    });

    const dict = message.toDict();

    expect(dict).toEqual({
      id: 'msg-1',
      role: 'assistant',
      content: 'Hello back!',
      timestamp: '2023-01-01T00:00:00.000Z',
      metadata: { type: 'assistant_response' },
    });
  });

  it('should deserialize from dict correctly', () => {
    const dict = {
      id: 'msg-1',
      role: 'user',
      content: 'Test message',
      timestamp: '2023-01-01T00:00:00.000Z',
      metadata: { type: 'user_request' },
    };

    const message = MessageData.fromDict(dict);

    expect(message.id).toBe('msg-1');
    expect(message.role).toBe('user');
    expect(message.content).toBe('Test message');
    expect(message.timestamp).toEqual(new Date('2023-01-01T00:00:00.000Z'));
    expect(message.metadata).toEqual({ type: 'user_request' });
  });
});

describe('ChatSessionData', () => {
  it('should create a session with required fields', () => {
    const session = new ChatSessionData({
      agent: 'GitHub Copilot',
    });

    expect(session.agent).toBe('GitHub Copilot');
    expect(session.timestamp).toBeInstanceOf(Date);
    expect(session.messages).toEqual([]);
    expect(session.metadata).toEqual({});
  });

  it('should handle messages correctly', () => {
    const messages = [
      new MessageData({ role: 'user', content: 'Hello' }),
      new MessageData({ role: 'assistant', content: 'Hi there!' }),
    ];

    const session = new ChatSessionData({
      agent: 'GitHub Copilot',
      messages,
      session_id: 'session-1',
    });

    expect(session.messages).toHaveLength(2);
    expect(session.session_id).toBe('session-1');
  });
});

describe('WorkspaceDataContainer', () => {
  it('should create workspace data with required fields', () => {
    const workspace = new WorkspaceDataContainer({
      agent: 'GitHub Copilot',
    });

    expect(workspace.agent).toBe('GitHub Copilot');
    expect(workspace.chat_sessions).toEqual([]);
    expect(workspace.metadata).toEqual({});
  });

  it('should handle chat sessions correctly', () => {
    const sessions = [
      new ChatSessionData({ agent: 'GitHub Copilot', session_id: 'session-1' }),
      new ChatSessionData({ agent: 'GitHub Copilot', session_id: 'session-2' }),
    ];

    const workspace = new WorkspaceDataContainer({
      agent: 'GitHub Copilot',
      chat_sessions: sessions,
      workspace_path: '/test/workspace',
    });

    expect(workspace.chat_sessions).toHaveLength(2);
    expect(workspace.workspace_path).toBe('/test/workspace');
  });
});
