/**
 * Data models for CodeHist
 *
 * TypeScript interfaces and classes for representing chat histories
 * focused on core chat functionality.
 */
import { z } from 'zod';
export declare const MessageSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<["user", "assistant"]>;
    content: z.ZodString;
    timestamp: z.ZodString;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    metadata: Record<string, any>;
    id?: string | undefined;
}, {
    role: "user" | "assistant";
    content: string;
    timestamp: string;
    id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const ChatSessionSchema: z.ZodObject<{
    agent: z.ZodString;
    timestamp: z.ZodString;
    messages: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        role: z.ZodEnum<["user", "assistant"]>;
        content: z.ZodString;
        timestamp: z.ZodString;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        role: "user" | "assistant";
        content: string;
        timestamp: string;
        metadata: Record<string, any>;
        id?: string | undefined;
    }, {
        role: "user" | "assistant";
        content: string;
        timestamp: string;
        id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>, "many">>;
    workspace: z.ZodOptional<z.ZodString>;
    session_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    metadata: Record<string, any>;
    agent: string;
    messages: {
        role: "user" | "assistant";
        content: string;
        timestamp: string;
        metadata: Record<string, any>;
        id?: string | undefined;
    }[];
    workspace?: string | undefined;
    session_id?: string | undefined;
}, {
    timestamp: string;
    agent: string;
    metadata?: Record<string, any> | undefined;
    messages?: {
        role: "user" | "assistant";
        content: string;
        timestamp: string;
        id?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }[] | undefined;
    workspace?: string | undefined;
    session_id?: string | undefined;
}>;
export declare const WorkspaceDataSchema: z.ZodObject<{
    agent: z.ZodString;
    version: z.ZodOptional<z.ZodString>;
    workspace_path: z.ZodOptional<z.ZodString>;
    chat_sessions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        agent: z.ZodString;
        timestamp: z.ZodString;
        messages: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodOptional<z.ZodString>;
            role: z.ZodEnum<["user", "assistant"]>;
            content: z.ZodString;
            timestamp: z.ZodString;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            role: "user" | "assistant";
            content: string;
            timestamp: string;
            metadata: Record<string, any>;
            id?: string | undefined;
        }, {
            role: "user" | "assistant";
            content: string;
            timestamp: string;
            id?: string | undefined;
            metadata?: Record<string, any> | undefined;
        }>, "many">>;
        workspace: z.ZodOptional<z.ZodString>;
        session_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        metadata: Record<string, any>;
        agent: string;
        messages: {
            role: "user" | "assistant";
            content: string;
            timestamp: string;
            metadata: Record<string, any>;
            id?: string | undefined;
        }[];
        workspace?: string | undefined;
        session_id?: string | undefined;
    }, {
        timestamp: string;
        agent: string;
        metadata?: Record<string, any> | undefined;
        messages?: {
            role: "user" | "assistant";
            content: string;
            timestamp: string;
            id?: string | undefined;
            metadata?: Record<string, any> | undefined;
        }[] | undefined;
        workspace?: string | undefined;
        session_id?: string | undefined;
    }>, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, any>;
    agent: string;
    chat_sessions: {
        timestamp: string;
        metadata: Record<string, any>;
        agent: string;
        messages: {
            role: "user" | "assistant";
            content: string;
            timestamp: string;
            metadata: Record<string, any>;
            id?: string | undefined;
        }[];
        workspace?: string | undefined;
        session_id?: string | undefined;
    }[];
    version?: string | undefined;
    workspace_path?: string | undefined;
}, {
    agent: string;
    metadata?: Record<string, any> | undefined;
    version?: string | undefined;
    workspace_path?: string | undefined;
    chat_sessions?: {
        timestamp: string;
        agent: string;
        metadata?: Record<string, any> | undefined;
        messages?: {
            role: "user" | "assistant";
            content: string;
            timestamp: string;
            id?: string | undefined;
            metadata?: Record<string, any> | undefined;
        }[] | undefined;
        workspace?: string | undefined;
        session_id?: string | undefined;
    }[] | undefined;
}>;
export interface Message {
    /** Unique identifier for the message */
    id?: string;
    /** Role of the message sender */
    role: 'user' | 'assistant';
    /** Content of the message */
    content: string;
    /** Timestamp when the message was created */
    timestamp: Date;
    /** Additional metadata */
    metadata: Record<string, any>;
}
export interface ChatSession {
    /** Name of the AI agent (e.g., "copilot", "cursor", "windsurf") */
    agent: string;
    /** Timestamp when the session was created */
    timestamp: Date;
    /** List of messages in the session */
    messages: Message[];
    /** Workspace identifier or path */
    workspace?: string;
    /** Unique session identifier */
    session_id?: string;
    /** Additional metadata */
    metadata: Record<string, any>;
}
export interface WorkspaceData {
    /** Name of the AI agent */
    agent: string;
    /** Version of the agent or data format */
    version?: string;
    /** Path to the workspace */
    workspace_path?: string;
    /** List of chat sessions */
    chat_sessions: ChatSession[];
    /** Additional metadata */
    metadata: Record<string, any>;
}
export declare class MessageData implements Message {
    id?: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata: Record<string, any>;
    constructor(data: Partial<Message> & Pick<Message, 'role' | 'content'>);
    toDict(): Record<string, any>;
    static fromDict(data: Record<string, any>): MessageData;
}
export declare class ChatSessionData implements ChatSession {
    agent: string;
    timestamp: Date;
    messages: Message[];
    workspace?: string;
    session_id?: string;
    metadata: Record<string, any>;
    constructor(data: Partial<ChatSession> & Pick<ChatSession, 'agent'>);
    toDict(): Record<string, any>;
    static fromDict(data: Record<string, any>): ChatSessionData;
}
export declare class WorkspaceDataContainer implements WorkspaceData {
    agent: string;
    version?: string;
    workspace_path?: string;
    chat_sessions: ChatSession[];
    metadata: Record<string, any>;
    constructor(data: Partial<WorkspaceData> & Pick<WorkspaceData, 'agent'>);
    toDict(): Record<string, any>;
    static fromDict(data: Record<string, any>): WorkspaceDataContainer;
}
//# sourceMappingURL=index.d.ts.map