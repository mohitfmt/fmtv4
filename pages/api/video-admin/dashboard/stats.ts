// pages/api/video-admin/dashboard/stats.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getAllCaches } from "@/lib/cache/video-cache-registry";
import { format } from "date-fns";

// Import modular queries
import { getTrendingVideos } from "@/lib/dashboard/queries/trending";
import {
  getWeeklyVideoStats,
  getVideosAddedToday,
} from "@/lib/dashboard/queries/weekly-stats";
import { getPerformanceMetrics } from "@/lib/dashboard/queries/performance-metrics";
import { getContentInsights } from "@/lib/dashboard/queries/content-insights";

import { getContentSuggestions } from "@/lib/dashboard/google-trends";

// Import cache and constants
import { getDashboardCache, rateLimiter } from "@/lib/dashboard/cache";
import {
  CACHE_CONFIG,
  CHART_CONFIG,
  QUERY_CONFIG,
} from "@/lib/dashboard/constants";
import { getEngagementData } from "@/lib/dashboard/queries/engagement-data";

// Types
interface DashboardResponse {
  success: boolean;
  data?: any;
  error?: string;
  traceId: string;
  timestamp: string;
  cached?: boolean;
}

/**
 * Get recent admin activity with formatting
 */
async function getRecentActivity(limit = 10) {
  try {
    const activities = await prisma.admin_activity_logs.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
      select: {
        id: true,
        action: true,
        entityType: true,
        userId: true,
        timestamp: true,
        metadata: true,
      },
    });

    return activities.map((activity) => ({
      id: activity.id,
      action: formatAction(activity.action),
      entityType: activity.entityType || "system",
      userId: activity.userId,
      timestamp: activity.timestamp.toISOString(),
      details: extractActivityDetails(activity.action, activity.metadata),
      relativeTime: getRelativeTime(activity.timestamp),
    }));
  } catch (error) {
    console.error("Failed to get recent activity:", error);
    return [];
  }
}

/**
 * Format action names for display
 */
function formatAction(action: string): string {
  const actionMap: Record<string, string> = {
    SYNC_PLAYLIST: "Playlist synced",
    SYNC_PLAYLIST_SUCCESS: "Sync completed",
    SYNC_PLAYLIST_FAILURE: "Sync failed",
    SYNC_ALL_START: "Full sync started",
    SYNC_ALL_COMPLETE: "Full sync completed",
    UPDATE_CONFIG: "Configuration updated",
    CLEAR_CACHE: "Cache cleared",
    PURGE_CDN: "CDN purged",
    TOGGLE_PLAYLIST: "Playlist toggled",
    UPDATE_PLAYLIST: "Playlist updated",
    LOGIN: "Admin logged in",
    LOGOUT: "Admin logged out",
    OPTIMIZE_DATABASE: "Database optimized",
    WEBHOOK_RENEWED: "Webhook renewed",
    WEBHOOK_RECEIVED: "Webhook received",
    MANUAL_REFRESH: "Dashboard refreshed",
    AUTO_SYNC: "Auto-sync triggered",
    ERROR_LOGGED: "Error logged",
    VIDEO_ADDED: "Video added",
    VIDEO_UPDATED: "Video updated",
    VIDEO_REMOVED: "Video removed",
  };

  return actionMap[action] || action.replace(/_/g, " ").toLowerCase();
}

/**
 * Extract activity details from metadata
 */
function extractActivityDetails(action: string, metadata: any): string | null {
  if (!metadata) return null;

  try {
    switch (action) {
      case "SYNC_PLAYLIST":
      case "SYNC_PLAYLIST_SUCCESS":
        if (metadata.result) {
          const {
            videosAdded = 0,
            videosUpdated = 0,
            videosRemoved = 0,
          } = metadata.result;
          return `+${videosAdded}, ~${videosUpdated}, -${videosRemoved}`;
        }
        return metadata.playlistName || metadata.playlistId || null;

      case "SYNC_ALL_COMPLETE":
        if (metadata.successCount !== undefined) {
          return `${metadata.successCount}/${metadata.totalPlaylists} completed`;
        }
        return null;

      case "CLEAR_CACHE":
        return metadata.type ? `${metadata.type} cache` : "All caches";

      case "OPTIMIZE_DATABASE":
        if (metadata.itemsProcessed) {
          return `${metadata.itemsProcessed} items`;
        }
        return null;

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Get relative time string
 */
function getRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return format(date, "MMM d");
}

/**
 * Calculate cache metrics
 */
async function getCacheMetrics() {
  try {
    const caches = getAllCaches() || [];

    let totalSize = 0;
    let totalMax = 0;

    caches.forEach(({ instance }) => {
      if (instance) {
        totalSize += instance.size || 0;
        totalMax += instance.max || 0;
      }
    });

    // Get last cache clear from activity logs
    const lastClearActivity = await prisma.admin_activity_logs.findFirst({
      where: { action: "CLEAR_CACHE" },
      orderBy: { timestamp: "desc" },
      select: { timestamp: true },
    });

    // Mock CDN hit rate (in production, get from Cloudflare API)
    const cdnHitRate = 85 + Math.floor(Math.random() * 10); // 85-95%

    //   const cdnHitRate = lruUsage > 0
    // ? Math.min(95, 70 + Math.round(lruUsage / 3))  // 70-95% based on cache usage
    // : 75;

    return {
      cdnHitRate,
      lruUsage: totalMax > 0 ? Math.round((totalSize / totalMax) * 100) : 0,
      lastCleared: lastClearActivity?.timestamp?.toISOString() || null,
      totalCacheSize: totalSize,
      maxCacheSize: totalMax,
      cacheCount: caches.length,
      formattedSize: formatBytes(totalSize * 1024), // Estimate size
      formattedMaxSize: formatBytes(totalMax * 1024),
    };
  } catch (error) {
    console.error("Failed to get cache metrics:", error);
    return {
      cdnHitRate: 0,
      lruUsage: 0,
      lastCleared: null,
      totalCacheSize: 0,
      maxCacheSize: 0,
      cacheCount: 0,
      formattedSize: "0 B",
      formattedMaxSize: "0 B",
    };
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Main handler
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = (req as any).traceId || `trace-${Date.now()}`;
  const session = (req as any).session;
  const userIdentifier =
    session?.user?.email || session?.user?.id || "anonymous";

  // Rate limiting
  const rateLimit = rateLimiter.checkLimit(userIdentifier);
  if (!rateLimit.allowed) {
    res.setHeader(
      "Retry-After",
      Math.ceil(rateLimit.resetIn / 1000).toString()
    );
    return res.status(429).json({
      success: false,
      error: "Too many requests. Please wait before refreshing.",
      traceId,
    });
  }

  try {
    // Check cache
    const cache = getDashboardCache();
    const cacheKey = `dashboard-${userIdentifier}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Trace-Id", traceId);
      res.setHeader(
        "Cache-Control",
        "private, max-age=30, stale-while-revalidate=60"
      );

      return res.status(200).json({
        success: true,
        data: cachedData,
        traceId,
        timestamp: new Date().toISOString(),
        cached: true,
      });
    }

    // Parallel fetch all data with timeout
    const dataPromise = Promise.all([
      // Basic counts
      prisma.videos.count(),
      getVideosAddedToday(prisma),
      prisma.videos.findFirst({
        orderBy: { publishedAt: "desc" },
        select: { publishedAt: true, title: true, videoId: true },
      }),

      // Advanced queries
      getTrendingVideos(prisma),
      getWeeklyVideoStats(prisma),
      getPerformanceMetrics(prisma),
      getContentInsights(prisma),

      // Playlists
      prisma.playlist.count(),
      prisma.playlist.count({ where: { isActive: true } }),

      // Sync status
      prisma.websub_subscriptions.findFirst({
        where: { channelId: process.env.YOUTUBE_CHANNEL_ID },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.syncStatus.findUnique({ where: { id: "main" } }),

      // Activity and cache
      getRecentActivity(QUERY_CONFIG.RECENT_ACTIVITY_LIMIT),
      getCacheMetrics(),

      // AI Suggestions
      prisma.videos.findMany({
        select: { title: true },
        take: 100,
      }),
    ]);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Database timeout")),
        QUERY_CONFIG.TIMEOUT_MS
      )
    );

    const [
      totalVideos,
      newToday,
      lastVideo,
      trendingVideos,
      weeklyStats,
      performanceMetrics,
      contentInsights,
      totalPlaylists,
      activePlaylists,
      websub,
      syncStatus,
      recentActivity,
      cacheMetrics,
      existingVideos,
    ] = (await Promise.race([dataPromise, timeoutPromise])) as any;

    // Get content suggestions based on existing videos
    const videoTitles = existingVideos.map((v: any) => v.title);
    const contentSuggestions = await getContentSuggestions();

    const engagementData = await getEngagementData(
      prisma,
      CHART_CONFIG.ENGAGEMENT_DAYS
    );
    // Determine sync status
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

      // Cache metrics
      cache: cacheMetrics,

      // Performance metrics
      performance: performanceMetrics,

      // Content insights
      insights: contentInsights,

      // AI suggestions
      suggestions: contentSuggestions,

      engagementData,

      // Recent activity
      recentActivity,
    };

    // Store in cache
    cache.set(cacheKey, stats, CACHE_CONFIG.DASHBOARD_TTL);

    // Response headers
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
    console.error(`[${traceId}] Dashboard stats error:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const isTimeout = errorMessage.includes("timeout");

    return res.status(isTimeout ? 504 : 500).json({
      success: false,
      error: isTimeout
        ? "Database timeout. Please try again."
        : "Failed to fetch dashboard statistics.",
      message:
        process.env.NODE_ENV === "development" ? errorMessage : undefined,
      traceId,
    });
  }
}

export default withAdminApi(handler);
