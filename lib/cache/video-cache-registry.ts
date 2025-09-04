import { LRUCache } from "lru-cache";

// Video playlist cache
export const playlistCache = new LRUCache<string, any>({
  max: 50,
  ttl: 1000 * 60 * 5, // 5 minutes
  allowStale: false,
  updateAgeOnGet: false,
});

// Video data cache
export const videoDataCache = new LRUCache<string, any>({
  max: 100,
  ttl: 1000 * 60 * 10, // 10 minutes
  allowStale: true,
  updateAgeOnGet: false,
});

// Configuration cache
export const configCache = new LRUCache<string, any>({
  max: 10,
  ttl: 1000 * 60 * 30, // 30 minutes
  allowStale: true,
  updateAgeOnGet: false,
});

// Sync status cache
export const syncStatusCache = new LRUCache<string, any>({
  max: 10,
  ttl: 1000 * 10, // 10 seconds for real-time updates
  allowStale: false,
  updateAgeOnGet: false,
});

// Export all caches for monitoring
export const getAllCaches = () => [
  { name: "Playlist Cache", instance: playlistCache },
  { name: "Video Data Cache", instance: videoDataCache },
  { name: "Config Cache", instance: configCache },
  { name: "Sync Status Cache", instance: syncStatusCache },
];
