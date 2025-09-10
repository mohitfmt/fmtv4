// pages/api/video-admin/dashboard/stats.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getAllCaches } from "@/lib/cache/video-cache-registry";
import { startOfWeek, endOfWeek, subWeeks, subDays, format } from "date-fns";

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(email: string, limit = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(email);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(email, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (userLimit.count >= limit) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

async function getWeeklyVideoStats(prisma: any) {
  const now = new Date();
  const twoWeeksAgo = subWeeks(now, 2);

  // Get all videos from the last 2 weeks in one query
  const videos = await prisma.videos.findMany({
    where: {
      publishedAt: {
        gte: twoWeeksAgo,
      },
    },
    select: {
      publishedAt: true,
    },
  });

  // Process the videos to calculate daily counts
  const dailyCounts = new Map<string, number>();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  let thisWeekTotal = 0;
  let lastWeekTotal = 0;

  videos.forEach((video: any) => {
    if (video.publishedAt) {
      const dateKey = format(video.publishedAt, "yyyy-MM-dd");

      // Count for daily breakdown
      dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);

      // Count for weekly totals
      if (video.publishedAt >= thisWeekStart) {
        thisWeekTotal++;
      } else if (
        video.publishedAt >= lastWeekStart &&
        video.publishedAt <= lastWeekEnd
      ) {
        lastWeekTotal++;
      }
    }
  });

  // Build the upload history array
  const uploadHistory = [];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const currentDate = subDays(now, 6 - i);
    const lastWeekDate = subDays(currentDate, 7);

    const currentKey = format(currentDate, "yyyy-MM-dd");
    const lastWeekKey = format(lastWeekDate, "yyyy-MM-dd");

    const dayIndex = currentDate.getDay();
    const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1];

    uploadHistory.push({
      date: currentKey,
      day: dayName,
      videos: dailyCounts.get(currentKey) || 0,
      lastWeek: dailyCounts.get(lastWeekKey) || 0,
    });
  }

  return {
    thisWeek: thisWeekTotal,
    lastWeek: lastWeekTotal,
    uploadHistory,
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = (req as any).traceId;
  const session = (req as any).session;

  // Basic rate limiting (30 requests per minute per user)
  if (session?.user?.email) {
    if (!checkRateLimit(session.user.email)) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({
        success: false,
        error: "Too many requests. Please wait a moment before refreshing.",
        traceId,
      });
    }
  }

  try {
    // Check if we have a cached response (for high-frequency requests)
    const cacheKey = `dashboard-stats-${session?.user?.email || "anonymous"}`;
    const cachedStats = global.dashboardCache?.get(cacheKey);

    if (cachedStats && Date.now() - cachedStats.timestamp < 30000) {
      // Return cached data if less than 30 seconds old
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Trace-Id", traceId);
      res.setHeader(
        "Cache-Control",
        "private, max-age=30, stale-while-revalidate=60"
      );

      return res.status(200).json({
        success: true,
        data: cachedStats.data,
        traceId,
        timestamp: new Date(cachedStats.timestamp).toISOString(),
        cached: true,
      });
    }

    // Fetch video statistics with correct field names
    const [totalVideos, recentVideos, trendingVideos, lastVideo, weeklyStats] =
      await Promise.all([
        // Total video count
        prisma.videos.count(),

        // Videos added in last 24 hours (using lastSyncedAt)
        prisma.videos.count({
          where: {
            publishedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Trending videos (hot or trending tier)
        prisma.videos.count({
          where: {
            tier: { in: ["hot", "trending"] },
          },
        }),

        // Last added video (using lastSyncedAt)
        prisma.videos.findFirst({
          orderBy: { publishedAt: "desc" },
          select: {
            lastSyncedAt: true,
            publishedAt: true,
          },
        }),

        getWeeklyVideoStats(prisma),
      ]);

    // Fetch playlist statistics
    const [totalPlaylists, activePlaylists] = await Promise.all([
      prisma.playlist.count(),
      prisma.playlist.count({
        where: { isActive: true },
      }),
    ]);

    const inactivePlaylists = totalPlaylists - activePlaylists;

    // Fetch sync status from websub with timeout
    const syncPromise = Promise.all([
      prisma.websub_subscriptions.findFirst({
        where: { channelId: process.env.YOUTUBE_CHANNEL_ID },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.websub_stats.findFirst(),
      prisma.syncStatus.findUnique({
        where: { id: "main" },
      }),
      prisma.syncHistory.findFirst({
        orderBy: { timestamp: "desc" },
        select: { timestamp: true },
      }),
    ]);

    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database timeout")), 5000)
    );

    let websub, websubStats, syncStatus, lastSyncHistory;
    try {
      [websub, websubStats, syncStatus, lastSyncHistory] = (await Promise.race([
        syncPromise,
        timeoutPromise,
      ])) as any;
    } catch (error) {
      console.error(`[${traceId}] Sync status fetch timeout:`, error);
      // Continue with null values if timeout
    }

    // Determine sync status
    let syncStatusValue: "active" | "inactive" | "syncing" = "inactive";
    if (syncStatus?.currentlySyncing) {
      syncStatusValue = "syncing";
    } else if (websub?.status === "active") {
      syncStatusValue = "active";
    }

    // Get the most recent sync time from multiple sources
    const syncTimes = [
      websubStats?.updatedAt,
      websub?.lastRenewal,
      syncStatus?.lastSync,
      lastSyncHistory?.timestamp,
    ].filter(Boolean);

    const lastSyncTime =
      syncTimes.length > 0
        ? syncTimes.sort((a, b) => b!.getTime() - a!.getTime())[0]
        : null;

    // Calculate cache metrics with error handling
    let cdnHitRate = 94; // Default value
    let lruUsage = 0;
    let totalCacheSize = 0;
    let maxCacheSize = 0;
    let cachesList: Array<{ instance: any }> = [];
    let cacheCount = 0;

    try {
      cachesList = getAllCaches() ?? [];
      cacheCount = cachesList.length;

      let totalHits = 0;
      let totalRequests = 0;

      for (const { instance } of cachesList) {
        const hits = Number(instance?.hits ?? 0);
        const misses = Number(instance?.misses ?? 0);
        const size = Number(instance?.size ?? 0);
        const max = Number(instance?.max ?? 0);

        totalHits += hits;
        totalRequests += hits + misses;
        totalCacheSize += size;
        maxCacheSize += max;
      }

      if (totalRequests > 0)
        cdnHitRate = Math.round((totalHits / totalRequests) * 100);
      if (maxCacheSize > 0)
        lruUsage = Math.round((totalCacheSize / maxCacheSize) * 100);
    } catch (error) {
      console.error(`[${traceId}] Cache metrics calculation error:`, error);
    }

    // Get last cache clear
    const lastCacheClear = await prisma.cacheHistory
      .findFirst({
        orderBy: { timestamp: "desc" },
        select: { timestamp: true },
      })
      .catch(() => null);

    // Get recent activity with error handling and timeout
    let recentActivity = [];
    try {
      const activityPromise = prisma.admin_activity_logs.findMany({
        orderBy: { timestamp: "desc" },
        take: 5,
        select: {
          id: true,
          action: true,
          entityType: true,
          userId: true,
          timestamp: true,
          metadata: true,
        },
      });

      const activityTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Activity fetch timeout")), 2000)
      );

      recentActivity = (await Promise.race([
        activityPromise,
        activityTimeout,
      ])) as any[];
    } catch (error) {
      console.error(`[${traceId}] Recent activity fetch error:`, error);
      recentActivity = [];
    }

    // Compile dashboard stats
    const stats = {
      videos: {
        total: totalVideos,
        lastAdded:
          lastVideo?.publishedAt?.toISOString() ||
          lastVideo?.lastSyncedAt?.toISOString() ||
          null,
        trending: trendingVideos,
        newToday: recentVideos,
        thisWeek: weeklyStats.thisWeek,
        lastWeek: weeklyStats.lastWeek,
        uploadHistory: weeklyStats.uploadHistory,
      },
      playlists: {
        total: totalPlaylists,
        active: activePlaylists,
        inactive: inactivePlaylists,
      },
      sync: {
        status: syncStatusValue,
        lastSync: lastSyncTime?.toISOString() || null,
        nextSync: websub?.expiresAt?.toISOString() || null,
        currentlySyncing: syncStatus?.currentlySyncing || false,
        currentPlaylist: syncStatus?.currentPlaylistId || null,
        webhookActive: websub?.status === "active",
      },
      cache: {
        cdnHitRate,
        lruUsage,
        lastCleared: lastCacheClear?.timestamp?.toISOString() || null,
        totalCacheSize,
        maxCacheSize,
        cacheCount,
      },
      recentActivity: recentActivity.map((activity) => ({
        id: activity.id,
        action: formatAction(activity.action),
        entityType: activity.entityType || "unknown",
        userId: activity.userId,
        timestamp: activity.timestamp.toISOString(),
        details: extractActivityDetails(
          activity.action,
          activity.metadata as any
        ),
      })),
    };

    // Store in cache
    if (!global.dashboardCache) {
      global.dashboardCache = new Map();
    }

    global.dashboardCache.set(cacheKey, {
      data: stats,
      timestamp: Date.now(),
    });

    // Clean old cache entries
    if (global.dashboardCache.size > 100) {
      const firstKey = global.dashboardCache.keys().next().value;
      if (firstKey) {
        global.dashboardCache.delete(firstKey);
      }
    }

    res.setHeader("X-Trace-Id", traceId);
    res.setHeader("X-Cache", "MISS");
    res.setHeader(
      "Cache-Control",
      "private, max-age=30, stale-while-revalidate=60"
    );

    return res.status(200).json({
      success: true,
      data: stats,
      traceId,
      timestamp: new Date().toISOString(),
      cached: false,
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to fetch dashboard stats:`, error);

    // Return a more user-friendly error message
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    const isTimeout = errorMessage.includes("timeout");
    const statusCode = isTimeout ? 504 : 500;

    return res.status(statusCode).json({
      success: false,
      error: isTimeout
        ? "Database response timeout. Please try again."
        : "Failed to fetch dashboard statistics. Please refresh the page.",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
      traceId,
    });
  }
}

// Helper function to format action names for display
function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    SYNC_PLAYLIST: "Playlist synced",
    UPDATE_CONFIG: "Configuration updated",
    CLEAR_CACHE: "Cache cleared",
    PURGE_CDN: "CDN cache purged",
    TOGGLE_PLAYLIST: "Playlist status changed",
    UPDATE_PLAYLIST: "Playlist updated",
    LOGIN: "Admin logged in",
    LOGOUT: "Admin logged out",
    OPTIMIZE_DATABASE: "Database optimized",
    WEBHOOK_RENEWED: "Webhook subscription renewed",
    MANUAL_REFRESH: "Dashboard refreshed",
    AUTO_SYNC: "Auto-sync triggered",
    ERROR_LOGGED: "Error logged",
  };

  return actionMap[action] || action.replace(/_/g, " ").toLowerCase();
}

// Helper function to extract relevant details from activity metadata
function extractActivityDetails(action: string, metadata: any): string | null {
  if (!metadata) return null;

  try {
    switch (action) {
      case "SYNC_PLAYLIST":
        return metadata.playlistName || metadata.playlistId || null;
      case "UPDATE_CONFIG":
        return metadata.section || "Video page configuration";
      case "CLEAR_CACHE":
        return metadata.type ? `${metadata.type} cache` : "All caches";
      case "UPDATE_PLAYLIST":
        return metadata.playlistName || metadata.playlistId || null;
      case "PURGE_CDN":
        return metadata.path || "All paths";
      case "ERROR_LOGGED":
        return metadata.error?.substring(0, 50) || "Unknown error";
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// Add TypeScript declaration for global cache
declare global {
  var dashboardCache: Map<string, { data: any; timestamp: number }> | undefined;
}

// Export with authentication wrapper
export default withAdminApi(handler);
