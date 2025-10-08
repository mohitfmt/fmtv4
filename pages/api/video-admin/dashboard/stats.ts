// pages/api/video-admin/dashboard/stats.ts
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";

// Import modular queries
import { getTrendingVideos } from "@/lib/dashboard/queries/trending";
import {
  getWeeklyVideoStats,
  getVideosAddedToday,
} from "@/lib/dashboard/queries/weekly-stats";
import { getPerformanceMetrics } from "@/lib/dashboard/queries/performance-metrics";
import { getContentSuggestions } from "@/lib/dashboard/google-trends";
import { getEngagementData } from "@/lib/dashboard/queries/engagement-data";

// REMOVED: Cache imports
// import { getAllCaches } from "@/lib/cache/video-cache-registry";
// import { getDashboardCache } from "@/lib/dashboard/cache";

// KEEP: Rate limiter (still needed for API protection)
import { rateLimiter } from "@/lib/dashboard/cache";
// import { CACHE_CONFIG } from "@/lib/dashboard/constants";

// Types
interface DashboardResponse {
  success: boolean;
  data?: any;
  error?: string;
  traceId: string;
  timestamp: string;
  cached?: boolean;
}

// Generate trace ID
function generateTraceId(req: NextApiRequest): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
    .toString()
    .split(",")[0]
    .trim()
    .replace(/[^a-z0-9]/gi, "")
    .substring(0, 6);

  return `dash-${timestamp}-${randomStr}-${ip}`.toLowerCase();
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardResponse>
): Promise<void> {
  const traceId = generateTraceId(req);

  // Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
      traceId,
      timestamp: new Date().toISOString(),
    });
  }

  // Rate limiting (KEEP THIS - it's still needed for API protection)
  const rateLimitKey = `dashboard:${req.socket.remoteAddress || "unknown"}`;
  const rateLimitResult = rateLimiter.checkLimit(rateLimitKey);

  if (!rateLimitResult.allowed) {
    res.setHeader("X-RateLimit-Exceeded", "true");
    res.setHeader(
      "Retry-After",
      Math.ceil(rateLimitResult.resetIn / 1000).toString()
    );
    return res.status(429).json({
      success: false,
      error: "Rate limit exceeded. Please wait before trying again.",
      traceId,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // REMOVED: In-memory cache checking
    // No more cache.get() - we'll fetch fresh data every time
    // and let CDN handle the caching

    // Execute all queries in parallel
    const [
      totalVideos,
      totalPlaylists,
      activePlaylists,
      lastVideo,
      syncStatus,
      websub,
      // REMOVED: allCaches - no longer fetching cache stats
      trendingVideos,
      weeklyStats,
      performanceMetrics,
      contentSuggestions,
      engagementData,
      recentActivity,
      newToday,
    ] = await Promise.all([
      // Basic counts
      prisma.videos.count(),
      prisma.playlist.count(),
      prisma.playlist.count({ where: { isActive: true } }),
      prisma.videos.findFirst({
        orderBy: { publishedAt: "desc" },
        select: {
          videoId: true,
          title: true,
          publishedAt: true,
        },
      }),

      // System status
      prisma.syncStatus.findFirst({
        orderBy: { updatedAt: "desc" },
      }),
      prisma.websub_subscriptions.findFirst({
        where: {
          channelId:
            process.env.YOUTUBE_CHANNEL_ID || "UCm7Mkdl1a8g6ctmQMhhghiA",
        },
      }),

      // REMOVED: getAllCaches() - no longer needed

      // Advanced queries
      getTrendingVideos(prisma),
      getWeeklyVideoStats(prisma),
      getPerformanceMetrics(prisma),
      getContentSuggestions(),
      getEngagementData(prisma),

      // Recent activity
      prisma.admin_activity_logs
        .findMany({
          take: 20,
          orderBy: { timestamp: "desc" },
          select: {
            id: true,
            action: true,
            entityType: true,
            userId: true,
            timestamp: true,
            metadata: true,
          },
        })
        .then((logs) =>
          logs.map((log) => ({
            id: log.id,
            action: log.action,
            entityType: log.entityType || "",
            entityId: "",
            userId: log.userId,
            timestamp: log.timestamp.toISOString(),
            details: log.metadata ? JSON.stringify(log.metadata) : null,
            relativeTime: formatDistanceToNow(log.timestamp, {
              addSuffix: true,
            }),
          }))
        ),

      // Videos added today
      getVideosAddedToday(prisma),
    ]);

    // SIMPLIFIED: Cache metrics (now just placeholder values since we're not using LRU caches)
    // In production, you could fetch CDN stats from Cloudflare API if needed
    const cacheMetrics = {
      cdnHitRate: 95, // Placeholder - could fetch from Cloudflare API
      lruUsage: 0, // No longer using LRU caches
      lastCleared: null,
      totalCacheSize: 0,
      maxCacheSize: 0,
      cacheCount: 0,
      formattedSize: "CDN Only",
      formattedMaxSize: "N/A",
    };

    // Determine sync status value
    const syncStatusValue = syncStatus?.currentlySyncing
      ? "syncing"
      : websub?.status === "active"
        ? "active"
        : "inactive";

    // Calculate next sync
    const nextSync = websub?.expiresAt
      ? new Date(
          Math.min(
            new Date(websub.expiresAt).getTime(),
            Date.now() + 24 * 60 * 60 * 1000
          )
        ).toISOString()
      : null;

    // Build response
    const stats = {
      // Video statistics
      videos: {
        total: totalVideos,
        newToday,
        thisWeek: weeklyStats.thisWeek,
        lastWeek: weeklyStats.lastWeek,
        weekChange: weeklyStats.weekChange,
        dailyAverage: weeklyStats.dailyAverage,
        peakDay: weeklyStats.peakDay,
        lastAdded: lastVideo?.publishedAt?.toISOString() || null,
        lastAddedTitle: lastVideo?.title || null,
        lastAddedId: lastVideo?.videoId || null,
        trending: trendingVideos.length,
        trendingList: trendingVideos,
        uploadHistory: weeklyStats.uploadHistory,
        weekDates: {
          thisWeek: weeklyStats.thisWeekDates,
          lastWeek: weeklyStats.lastWeekDates,
        },
      },

      // Playlist statistics
      playlists: {
        total: totalPlaylists,
        active: activePlaylists,
        inactive: totalPlaylists - activePlaylists,
        utilizationRate:
          totalPlaylists > 0
            ? Math.round((activePlaylists / totalPlaylists) * 100)
            : 0,
      },

      // Sync status
      sync: {
        status: syncStatusValue,
        lastSync:
          syncStatus?.lastSync?.toISOString() ||
          websub?.lastRenewal?.toISOString() ||
          null,
        nextSync,
        currentlySyncing: syncStatus?.currentlySyncing || false,
        currentPlaylist: syncStatus?.currentPlaylistId || null,
        webhookActive: websub?.status === "active",
        webhookExpiry: websub?.expiresAt
          ? new Date(websub.expiresAt).getTime()
          : null,
        totalSyncs: syncStatus?.totalSyncs || 0,
      },

      // Cache metrics (simplified for CDN-only approach)
      cache: cacheMetrics,

      // Performance metrics
      performance: performanceMetrics,

      // AI suggestions
      suggestions: contentSuggestions,

      // Engagement data
      engagementData,

      // Recent activity
      recentActivity,
    };

    // REMOVED: Store in cache
    // No more cache.set() - let CDN handle caching

    // SET CDN CACHE HEADERS (CRITICAL CHANGE)
    // This replaces in-memory caching with CDN caching
    res.setHeader("X-Trace-Id", traceId);
    res.setHeader("X-Cache", "MISS"); // Always MISS from origin

    // CDN will cache for 30 seconds, with 60 second stale-while-revalidate
    res.setHeader(
      "Cache-Control",
      "public, max-age=30, s-maxage=30, stale-while-revalidate=60"
    );

    // Add cache tag for targeted purging if needed
    res.setHeader("Cache-Tag", "dashboard:stats,video-admin:dashboard");

    // Return response
    return res.status(200).json({
      success: true,
      data: stats,
      traceId,
      timestamp: new Date().toISOString(),
      cached: false, // Always false since we're not using in-memory cache
    });
  } catch (error) {
    console.error(`[${traceId}] Dashboard stats error:`, error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch dashboard stats";

    // Don't cache errors
    res.setHeader(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate"
    );

    return res.status(500).json({
      success: false,
      error: errorMessage,
      traceId,
      timestamp: new Date().toISOString(),
    });
  }
}

export default handler;
