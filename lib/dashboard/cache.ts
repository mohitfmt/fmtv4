// lib/dashboard/cache.ts
// CONVERTED TO SSR: Only rate limiter remains, dashboard cache removed

import { CACHE_CONFIG } from "./constants";

// Rate limiter entry interface
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Simple in-memory rate limiter
 * NOTE: This is still needed for API protection even with SSR
 * In production, consider using Redis for distributed rate limiting
 */
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

// REMOVED: DashboardCache class and getDashboardCache function
// These are no longer needed with SSR + CDN caching approach
