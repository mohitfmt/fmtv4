// lib/dashboard/cache.ts
import { CACHE_CONFIG } from "./constants";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

/**
 * Enhanced in-memory cache with TTL, size limits, and hit tracking
 */
export class DashboardCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    maxSize = CACHE_CONFIG.CACHE_MAX_SIZE,
    defaultTTL = CACHE_CONFIG.DASHBOARD_TTL
  ) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.startCleanup();
  }

  /**
   * Set a value in the cache
   */
  set(key: string, data: T, ttl?: number): void {
    // Evict oldest entry if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
    });
  }

  /**
   * Get a value from the cache
   */
  get<U = T>(key: string): U | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;

    return entry.data as unknown as U;
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.entries());
    const now = Date.now();

    const stats = {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: (this.cache.size / this.maxSize) * 100,
      entries: entries.map(([key, entry]) => ({
        key,
        age: now - entry.timestamp,
        hits: entry.hits,
        ttl: entry.ttl,
        expired: now - entry.timestamp > entry.ttl,
      })),
      totalHits: entries.reduce((sum, [, entry]) => sum + entry.hits, 0),
    };

    return stats;
  }

  /**
   * Find the oldest entry for eviction
   */
  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      }
    }, CACHE_CONFIG.CACHE_CLEANUP_INTERVAL);
  }

  /**
   * Stop the cleanup interval (for cleanup)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Global dashboard cache instance
let globalDashboardCache: DashboardCache | null = null;

export function getDashboardCache(): DashboardCache {
  if (!globalDashboardCache) {
    globalDashboardCache = new DashboardCache();
  }
  return globalDashboardCache;
}

// In-memory rate limiter (no Redis)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry>;
  private windowMs: number;
  private maxRequests: number;

  constructor(
    windowMs = CACHE_CONFIG.RATE_LIMIT_WINDOW,
    maxRequests = CACHE_CONFIG.RATE_LIMIT_MAX_REQUESTS
  ) {
    this.limits = new Map();
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Cleanup old entries periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.limits.entries()) {
        if (now > entry.resetTime) {
          this.limits.delete(key);
        }
      }
    }, windowMs);
  }

  /**
   * Check if request is allowed
   */
  checkLimit(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetIn: number;
  } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetTime) {
      // Create new entry
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetIn: this.windowMs,
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.resetTime - now,
      };
    }

    // Increment count
    entry.count++;

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetIn: entry.resetTime - now,
    };
  }

  /**
   * Reset limits for a specific identifier
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      activeIdentifiers: this.limits.size,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
    };
  }
}

// Export singleton rate limiter
export const rateLimiter = new RateLimiter();

export const cache = getDashboardCache();
