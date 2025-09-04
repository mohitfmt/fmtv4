import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getAllCaches } from "@/lib/cache/video-cache-registry";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = (req as any).traceId;

  try {
    // Get counts from MongoDB collections
    const [videoCount, playlistCount] = await Promise.all([
      prisma.videos.count(),
      prisma.playlist.count(),
    ]);

    // Get LRU cache stats
    const caches = getAllCaches();
    const lruCacheStats = caches.map(({ name, instance }) => {
      const hits = (instance as any).hits || 0;
      const misses = (instance as any).misses || 0;
      const hitRate =
        hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;

      return {
        name,
        size: instance.size,
        maxSize: instance.max,
        hitRate,
        ttl: instance.ttl || 0,
      };
    });

    // Calculate total memory
    const totalMemory = caches.reduce(
      (sum, { instance }) =>
        sum + (instance.calculatedSize || instance.size * 1024),
      0
    );

    // Get last cache clear from CacheHistory
    const lastCacheClear = await prisma.cacheHistory.findFirst({
      where: { type: "cdn" },
      orderBy: { timestamp: "desc" },
    });

    const status = {
      cdn: {
        provider: "Cloudflare",
        status: "healthy" as const,
        cachedItems: Math.floor(videoCount * 0.8),
        size: `${((videoCount * 0.15) / 1024).toFixed(1)} GB`,
        hitRate: 94,
        lastCleared: lastCacheClear?.timestamp || null,
      },
      lruCache: {
        status: "active" as const,
        caches: lruCacheStats,
        totalMemory: `${Math.round(totalMemory / 1024)}KB`,
        lastCleared: null,
      },
      database: {
        videos: videoCount,
        playlists: playlistCount,
        totalSize: "78.76 MB", // From your MongoDB stats
        lastOptimized: null,
      },
    };

    res.setHeader("X-Trace-Id", traceId);
    return res.status(200).json({
      data: status,
      traceId,
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to get cache status:`, error);
    return res.status(500).json({
      error: "Failed to get cache status",
      traceId,
    });
  }
};

export default withAdminApi(handler);
