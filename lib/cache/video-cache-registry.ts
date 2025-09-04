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

// Gallery cache for video pages
export const galleryCache = new LRUCache<string, any>({
  max: 20,
  ttl: 1000 * 60 * 5, // 5 minutes
  allowStale: true,
  updateAgeOnGet: false,
});

// Map of cache names to instances
const cacheMap = new Map<string, LRUCache<string, any>>([
  ["playlist", playlistCache],
  ["videoData", videoDataCache],
  ["config", configCache],
  ["syncStatus", syncStatusCache],
  ["gallery", galleryCache],
  ["Playlist Cache", playlistCache],
  ["Video Data Cache", videoDataCache],
  ["Config Cache", configCache],
  ["Sync Status Cache", syncStatusCache],
  ["Gallery Cache", galleryCache],
]);

// Clear a specific cache by name
export const clearCache = (name: string): boolean => {
  const cache = cacheMap.get(name);
  if (cache) {
    cache.clear();
    return true;
  }
  return false;
};

// Clear all caches
export const clearAllCaches = (): number => {
  let cleared = 0;
  cacheMap.forEach((cache) => {
    cache.clear();
    cleared++;
  });
  return cleared;
};

// Get cache statistics
export const getCacheStats = (name: string) => {
  const cache = cacheMap.get(name);
  if (!cache) return null;

  return {
    size: cache.size,
    max: cache.max,
    ttl: cache.ttl,
    allowStale: cache.allowStale,
    updateAgeOnGet: cache.updateAgeOnGet,
  };
};

// Export all caches for monitoring
export const getAllCaches = () => [
  { name: "Playlist Cache", instance: playlistCache },
  { name: "Video Data Cache", instance: videoDataCache },
  { name: "Config Cache", instance: configCache },
  { name: "Sync Status Cache", instance: syncStatusCache },
  { name: "Gallery Cache", instance: galleryCache },
];
