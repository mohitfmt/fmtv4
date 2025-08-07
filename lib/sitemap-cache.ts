// lib/sitemap-cache.ts
import { LRUCache } from "lru-cache";

// Cache for category last modified dates
export const categoryLastModCache = new LRUCache<string, string>({
  max: 200,
  ttl: 1000 * 60 * 5, // 5 minutes
});

// Cache for sitemap generation timestamps
export const sitemapTimestampCache = new LRUCache<string, string>({
  max: 10,
  ttl: 1000 * 60 * 10, // 10 minutes
});

// Helper to get current timestamp
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Helper to format date for sitemap
export function formatSitemapDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toISOString();
}
