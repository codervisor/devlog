/**
 * GitHub Copilot chat history parser for VS Code
 *
 * This module handles parsing GitHub Copilot chat sessions from VS Code's
 * JSON storage files to extract actual conversation history.
 */
import { ChatSession, WorkspaceData } from '../models/index.js';
export interface SearchResult {
    session_id?: string;
    message_id?: string;
    role: string;
    timestamp: string;
    match_position: number;
    context: string;
    full_content: string;
    metadata: Record<string, any>;
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
export declare class CopilotParser {
    private logger;
    constructor();
    /**
     * Build mapping from workspace storage directory to actual workspace path
     */
    private buildWorkspaceMapping;
    /**
     * Parse actual chat session from JSON file
     */
    parseChatSession(filePath: string): Promise<ChatSession | null>;
    /**
     * Parse chat editing session from state.json file (legacy format)
     */
    parseChatEditingSession(filePath: string): Promise<ChatSession | null>;
    /**
     * Get VS Code storage paths based on platform
     */
    private getVSCodePaths;
    /**
     * Discover Copilot data from VS Code's application support directory
     */
    discoverVSCodeCopilotData(): Promise<WorkspaceData>;
    /**
     * Discover and parse all Copilot data in a directory
     */
    discoverCopilotData(basePath: string): Promise<WorkspaceData>;
    /**
     * Search for content in chat sessions
     */
    searchChatContent(workspaceData: WorkspaceData, query: string, caseSensitive?: boolean): SearchResult[];
    /**
     * Get statistics about chat sessions
     */
    getChatStatistics(workspaceData: WorkspaceData): ChatStatistics;
}
//# sourceMappingURL=index.d.ts.map