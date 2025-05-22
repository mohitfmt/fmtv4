// lib/cache/withLRU.ts
import { LRUCache } from "lru-cache";

export const defaultCache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 30, // Default TTL: 30 seconds
  allowStale: false,
  updateAgeOnGet: false,
});

export function withLRUCache<T extends (...args: any[]) => Promise<any>>(
  keyFn: (...args: Parameters<T>) => string,
  fetchFn: T,
  cache: LRUCache<string, any> = defaultCache
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyFn(...args);
    if (cache.has(key)) return cache.get(key)!;
    const result = await fetchFn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}
