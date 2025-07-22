/**
 * Simple LRU Cache implementation for GitHub storage caching
 */

export interface CacheOptions {
  max: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheItem<T> {
  value: T;
  timestamp: number;
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheItem<V>>();
  private maxSize: number;
  private ttl: number;

  constructor(options: CacheOptions) {
    this.maxSize = options.max;
    this.ttl = options.ttl;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.value;
  }

  set(key: K, value: V): void {
    // Remove existing item if it exists
    this.cache.delete(key);

    // Remove oldest item if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // Add new item
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  has(key: K): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}
