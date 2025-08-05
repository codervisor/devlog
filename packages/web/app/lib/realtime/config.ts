/**
 * Realtime configuration utilities
 */

import type { RealtimeConfig, RealtimeProviderType } from './types';

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

/**
 * Detects the deployment environment and returns the appropriate realtime provider type
 */
export function detectRealtimeProvider(): RealtimeProviderType {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return 'sse'; // Default for server-side
  }

  // Check for explicit environment variables (client-side)
  const forceProvider = process.env.NEXT_PUBLIC_REALTIME_PROVIDER as RealtimeProviderType;
  if (forceProvider && (forceProvider === 'sse' || forceProvider === 'pusher')) {
    return forceProvider;
  }

  // Auto-detect based on deployment platform
  const isVercel = process.env.NEXT_PUBLIC_VERCEL === '1' || 
                   process.env.VERCEL === '1' ||
                   typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
  
  const isNetlify = process.env.NEXT_PUBLIC_NETLIFY === 'true' ||
                    typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
                    
  const isServerless = isVercel || isNetlify;

  // Check if Pusher is configured
  const hasPusherConfig = !!(
    process.env.NEXT_PUBLIC_PUSHER_KEY && 
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );

  // Use Pusher for serverless deployments if configured, otherwise fall back to SSE
  if (isServerless && hasPusherConfig) {
    return 'pusher';
  }

  // Default to SSE for all other cases
  return 'sse';
}

/**
 * Creates a realtime configuration object from environment variables
 */
export function createRealtimeConfig(overrides: RealtimeEnvironmentConfig = {}): RealtimeConfig {
  const provider = overrides.forceProvider || (overrides.autoDetect !== false ? detectRealtimeProvider() : 'sse');

  const config: RealtimeConfig = {
    provider,
  };

  if (provider === 'pusher') {
    config.pusher = {
      appId: overrides.pusherAppId || process.env.NEXT_PUBLIC_PUSHER_APP_ID || '',
      key: overrides.pusherKey || process.env.NEXT_PUBLIC_PUSHER_KEY || '',
      secret: overrides.pusherSecret || process.env.PUSHER_SECRET || '',
      cluster: overrides.pusherCluster || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
      useTLS: overrides.pusherUseTLS ?? (process.env.NEXT_PUBLIC_PUSHER_USE_TLS !== 'false'),
    };

    // Validate required Pusher configuration
    if (!config.pusher.key || !config.pusher.cluster) {
      console.warn('[Realtime] Pusher configuration incomplete, falling back to SSE');
      config.provider = 'sse';
    }
  }

  if (config.provider === 'sse') {
    config.sse = {
      endpoint: overrides.sseEndpoint || process.env.NEXT_PUBLIC_SSE_ENDPOINT || '/api/events',
      reconnectInterval: overrides.sseReconnectInterval || 
                        parseInt(process.env.NEXT_PUBLIC_SSE_RECONNECT_INTERVAL || '3000', 10),
    };
  }

  return config;
}

/**
 * Gets the current realtime configuration
 */
export function getRealtimeConfig(): RealtimeConfig {
  return createRealtimeConfig();
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
  return !!(
    process.env.NEXT_PUBLIC_PUSHER_KEY && 
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );
}

/**
 * Logs the current realtime configuration (for debugging)
 */
export function logRealtimeConfig(): void {
  const config = getRealtimeConfig();
  console.log('[Realtime] Current configuration:', {
    provider: config.provider,
    isVercel: process.env.NEXT_PUBLIC_VERCEL === '1',
    isPusherConfigured: isPusherConfigured(),
    isSSESupported: isSSESupported(),
  });
}
