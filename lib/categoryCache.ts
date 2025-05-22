import { LRUCache } from "lru-cache";

export const categoryCache = new LRUCache<string, any>({
  max: 500, // Up to 500 distinct entries
  ttl: 1000 * 30, // Cache expires in 30 seconds
  allowStale: false, // Never serve stale content
  updateAgeOnGet: false, // No lifespan extension on repeated reads
});
