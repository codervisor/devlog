'use client';

// Request cache to deduplicate identical requests
const requestCache = new Map<string, CacheEntry>();

// Cache duration (5 seconds)
const CACHE_DURATION = 5000;

interface CacheEntry {
  promise: Promise<Response>;
  timestamp: number;
}

/**
 * Deduplicated fetch function that prevents duplicate requests
 * If the same URL is requested multiple times within the cache duration,
 * returns the same promise to avoid duplicate network calls
 */
export async function deduplicatedFetch(url: string, options?: RequestInit): Promise<Response> {
  const cacheKey = `${url}:${JSON.stringify(options || {})}`;
  const now = Date.now();
  
  // Check if we have a cached request
  const cached = requestCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.promise;
  }

  // Create new request
  const promise = fetch(url, options);
  
  // Cache the promise
  requestCache.set(cacheKey, {
    promise,
    timestamp: now
  });

  // Clean up cache after the request completes or fails
  promise.finally(() => {
    setTimeout(() => {
      const entry = requestCache.get(cacheKey);
      if (entry && entry.timestamp === now) {
        requestCache.delete(cacheKey);
      }
    }, CACHE_DURATION);
  });

  return promise;
}

/**
 * Clear the request cache (useful for testing or force refresh)
 */
export function clearRequestCache() {
  requestCache.clear();
}
