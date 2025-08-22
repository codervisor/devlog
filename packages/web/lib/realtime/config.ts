/**
 * Realtime configuration utilities
 */

import type { RealtimeConfig, RealtimeProviderType } from './types';
import { apiClient } from '@/lib/api/api-client';

export interface RealtimeEnvironmentConfig {
  // Auto-detection settings
  autoDetect?: boolean;
  forceProvider?: RealtimeProviderType;

  // SSE settings
  sseEndpoint?: string;
  sseReconnectInterval?: number;

  // Pusher settings
  pusherAppId?: string;
  pusherKey?: string;
  pusherSecret?: string;
  pusherCluster?: string;
  pusherUseTLS?: boolean;
  pusherChannelName?: string;
}

// Cache for server configuration to avoid repeated API calls
let serverConfigCache: RealtimeConfig | null = null;
let serverConfigPromise: Promise<RealtimeConfig> | null = null;

/**
 * Fetches realtime configuration from the server
 */
async function fetchServerRealtimeConfig(): Promise<RealtimeConfig> {
  if (serverConfigCache) {
    return serverConfigCache;
  }

  if (serverConfigPromise) {
    return serverConfigPromise;
  }

  serverConfigPromise = (async () => {
    try {
      const data = await apiClient.get<RealtimeConfig>('/api/realtime/config');

      if (data) {
        serverConfigCache = data;

        console.log('[Realtime Config] Fetched from server:', serverConfigCache);
        return serverConfigCache;
      } else {
        throw new Error('Invalid server response: no data');
      }
    } catch (error) {
      console.error(
        '[Realtime Config] Failed to fetch from server, falling back to client detection:',
        error,
      );
      // Fall back to client-side detection if server is unreachable
      return detectRealtimeProvider();
    } finally {
      serverConfigPromise = null;
    }
  })();

  return serverConfigPromise;
}

/**
 * Legacy client-side detection (fallback only)
 * @deprecated Use fetchServerRealtimeConfig instead
 */
function detectRealtimeProvider(): RealtimeConfig {
  // Check for explicit environment variables (client-side)
  const forceProvider = process.env.NEXT_PUBLIC_REALTIME_PROVIDER as RealtimeProviderType;
  if (forceProvider && (forceProvider === 'sse' || forceProvider === 'pusher')) {
    return createRealtimeConfigFromProvider(forceProvider);
  }

  // Auto-detect based on deployment platform
  const isVercel =
    process.env.NEXT_PUBLIC_VERCEL === '1' ||
    process.env.VERCEL === '1' ||
    (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'));

  const isNetlify =
    process.env.NEXT_PUBLIC_NETLIFY === 'true' ||
    (typeof window !== 'undefined' && window.location.hostname.includes('netlify.app'));

  const isServerless = isVercel || isNetlify;

  // Check if Pusher is configured
  const hasPusherConfig = !!(
    process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );

  // Use Pusher for serverless deployments if configured, otherwise fall back to SSE
  const provider: RealtimeProviderType = isServerless && hasPusherConfig ? 'pusher' : 'sse';

  return createRealtimeConfigFromProvider(provider);
}

/**
 * Creates configuration object for a specific provider
 */
function createRealtimeConfigFromProvider(provider: RealtimeProviderType): RealtimeConfig {
  const config: RealtimeConfig = { provider };

  if (provider === 'pusher') {
    config.pusher = {
      appId: process.env.NEXT_PUBLIC_PUSHER_APP_ID || '',
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
      secret: process.env.PUSHER_SECRET || '',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
      useTLS: process.env.NEXT_PUBLIC_PUSHER_USE_TLS !== 'false',
    };

    // Validate required Pusher configuration
    if (!config.pusher.key || !config.pusher.cluster) {
      console.warn('[Realtime] Pusher configuration incomplete, falling back to SSE');
      return createRealtimeConfigFromProvider('sse');
    }
  }

  if (provider === 'sse') {
    config.sse = {
      endpoint: process.env.NEXT_PUBLIC_SSE_ENDPOINT || '/api/events',
      reconnectInterval: parseInt(process.env.NEXT_PUBLIC_SSE_RECONNECT_INTERVAL || '3000', 10),
    };
  }

  return config;
}

/**
 * Creates a realtime configuration object from environment variables
 * @deprecated Use getRealtimeConfig() which fetches from server
 */
export function createRealtimeConfig(overrides: RealtimeEnvironmentConfig = {}): RealtimeConfig {
  const provider = overrides.forceProvider;

  if (provider) {
    return createRealtimeConfigFromProvider(provider);
  }

  // Fall back to client detection
  return detectRealtimeProvider();
}

/**
 * Gets the current realtime configuration from the server
 */
export async function getRealtimeConfig(): Promise<RealtimeConfig> {
  // On server side, fall back to client detection
  if (typeof window === 'undefined') {
    return detectRealtimeProvider();
  }

  // On client side, fetch from server
  return await fetchServerRealtimeConfig();
}

/**
 * Synchronous version that uses cached config or falls back to client detection
 * @deprecated Use getRealtimeConfig() for better server synchronization
 */
export function getRealtimeConfigSync(): RealtimeConfig {
  if (serverConfigCache) {
    return serverConfigCache;
  }

  // Fall back to client detection if no cached config
  return detectRealtimeProvider();
}

/**
 * Checks if the current environment supports SSE
 */
export function isSSESupported(): boolean {
  if (typeof window === 'undefined') return true; // Server-side always supports SSE
  return typeof EventSource !== 'undefined';
}

/**
 * Checks if Pusher is properly configured
 */
export function isPusherConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.NEXT_PUBLIC_PUSHER_CLUSTER);
}

/**
 * Logs the current realtime configuration (for debugging)
 */
export function logRealtimeConfig(): void {
  const config = getRealtimeConfigSync();
  console.log('[Realtime] Current configuration:', {
    provider: config.provider,
    isVercel: process.env.NEXT_PUBLIC_VERCEL === '1',
    isPusherConfigured: isPusherConfigured(),
    isSSESupported: isSSESupported(),
  });
}
