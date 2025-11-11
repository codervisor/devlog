/**
 * Realtime module exports
 */

export { RealtimeService } from './realtime-service';
export { SSEProvider } from './sse-provider';
export { PusherProvider } from './pusher-provider';
export {
  createRealtimeConfig,
  getRealtimeConfig,
  getRealtimeConfigSync,
  isSSESupported,
  isPusherConfigured,
  logRealtimeConfig,
  type RealtimeEnvironmentConfig,
} from './config';
export {
  RealtimeEventType,
  type RealtimeProvider,
  type RealtimeConnection,
  type RealtimeMessage,
  type RealtimeProviderType,
  type RealtimeConfig,
} from './types';

// Re-export the singleton instance for convenience
import { RealtimeService } from './realtime-service';
export const realtimeService = RealtimeService.getInstance();
