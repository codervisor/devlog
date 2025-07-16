/**
 * Data models for CodeHist
 *
 * TypeScript interfaces and classes for representing chat histories
 * focused on core chat functionality.
 */
import { z } from 'zod';
// Zod schemas for runtime validation
export const MessageSchema = z.object({
    id: z.string().optional(),
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string().datetime(),
    metadata: z.record(z.any()).default({})
});
export const ChatSessionSchema = z.object({
    agent: z.string(),
    timestamp: z.string().datetime(),
    messages: z.array(MessageSchema).default([]),
    workspace: z.string().optional(),
    session_id: z.string().optional(),
    metadata: z.record(z.any()).default({})
});
export const WorkspaceDataSchema = z.object({
    agent: z.string(),
    version: z.string().optional(),
    workspace_path: z.string().optional(),
    chat_sessions: z.array(ChatSessionSchema).default([]),
    metadata: z.record(z.any()).default({})
});
// Utility classes for data manipulation
export class MessageData {
    id;
    role;
    content;
    timestamp;
    metadata;
    constructor(data) {
        this.id = data.id;
        this.role = data.role;
        this.content = data.content;
        this.timestamp = data.timestamp || new Date();
        this.metadata = data.metadata || {};
    }
    toDict() {
        return {
            id: this.id,
            role: this.role,
            content: this.content,
            timestamp: this.timestamp.toISOString(),
            metadata: this.metadata
        };
    }
    static fromDict(data) {
        const validated = MessageSchema.parse(data);
        return new MessageData({
            id: validated.id,
            role: validated.role,
            content: validated.content,
            timestamp: new Date(validated.timestamp),
            metadata: validated.metadata
        });
    }
}
export class ChatSessionData {
    agent;
    timestamp;
    messages;
    workspace;
    session_id;
    metadata;
    constructor(data) {
        this.agent = data.agent;
        this.timestamp = data.timestamp || new Date();
        this.messages = data.messages || [];
        this.workspace = data.workspace;
        this.session_id = data.session_id;
        this.metadata = data.metadata || {};
    }
    toDict() {
        return {
            agent: this.agent,
            timestamp: this.timestamp.toISOString(),
            messages: this.messages.map(msg => msg instanceof MessageData ? msg.toDict() : new MessageData(msg).toDict()),
            workspace: this.workspace,
            session_id: this.session_id,
            metadata: this.metadata
        };
    }
    static fromDict(data) {
        const validated = ChatSessionSchema.parse(data);
        return new ChatSessionData({
            agent: validated.agent,
            timestamp: new Date(validated.timestamp),
            messages: validated.messages.map((msgData) => MessageData.fromDict(msgData)),
            workspace: validated.workspace,
            session_id: validated.session_id,
            metadata: validated.metadata
        });
    }
}
export class WorkspaceDataContainer {
    agent;
    version;
    workspace_path;
    chat_sessions;
    metadata;
    constructor(data) {
        this.agent = data.agent;
        this.version = data.version;
        this.workspace_path = data.workspace_path;
        this.chat_sessions = data.chat_sessions || [];
        this.metadata = data.metadata || {};
    }
    toDict() {
        return {
            agent: this.agent,
            version: this.version,
            workspace_path: this.workspace_path,
            chat_sessions: this.chat_sessions.map(session => session instanceof ChatSessionData ? session.toDict() : new ChatSessionData(session).toDict()),
            metadata: this.metadata
        };
    }
    static fromDict(data) {
        const validated = WorkspaceDataSchema.parse(data);
        return new WorkspaceDataContainer({
            agent: validated.agent,
            version: validated.version,
            workspace_path: validated.workspace_path,
            chat_sessions: validated.chat_sessions.map((sessionData) => ChatSessionData.fromDict(sessionData)),
            metadata: validated.metadata
        });
    }
}
//# sourceMappingURL=index.js.map