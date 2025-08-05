/**
 * Realtime service types and interfaces
 */

export interface RealtimeMessage {
  type: string;
  data?: any;
  timestamp: string;
}

export interface RealtimeConnection {
  connected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

export interface RealtimeProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(channel: string, callback: (data: any) => void): void;
  unsubscribe(channel: string): void;
  getConnectionState(): RealtimeConnection;
  onConnectionChange(callback: (connected: boolean) => void): void;
}

export type RealtimeProviderType = 'sse' | 'pusher';

export interface RealtimeConfig {
  provider: RealtimeProviderType;
  pusher?: {
    appId: string;
    key: string;
    secret: string;
    cluster: string;
    useTLS?: boolean;
  };
  sse?: {
    endpoint: string;
    reconnectInterval?: number;
  };
}

// Event types that will be broadcast
export class RealtimeEventType {
  static PROJECT_CREATED = 'project-created';
  static PROJECT_UPDATED = 'project-updated';
  static PROJECT_DELETED = 'project-deleted';
  static DEVLOG_CREATED = 'devlog-created';
  static DEVLOG_UPDATED = 'devlog-updated';
  static DEVLOG_DELETED = 'devlog-deleted';
  static DEVLOG_NOTE_CREATED = 'devlog-note-created';
  static DEVLOG_NOTE_UPDATED = 'devlog-note-updated';
  static DEVLOG_NOTE_DELETED = 'devlog-note-deleted';
  static CONNECTION_STATUS = 'connection-status';
}
