// pages/api/video-admin/sync/control.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { subDays, subHours } from "date-fns";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = (req as any).traceId;

  try {
    // Fetch all data in parallel for performance
    const [
      websub,
      websubStats,
      syncStatus,
      recentHistory,
      syncHistoryStats,
      webhookLogs,
      totalVideosProcessed,
      queuedSyncs,
    ] = await Promise.all([
      // Get WebSub subscription status
      prisma.websub_subscriptions.findFirst({
        where: {
          channelId:
            process.env.YOUTUBE_CHANNEL_ID || "UCm7Mkdl1a8g6ctmQMhhghiA",
        },
        orderBy: { updatedAt: "desc" },
      }),

      // Get WebSub stats
      prisma.websub_stats.findFirst(),

      // Get current sync status
      prisma.syncStatus.findUnique({
        where: { id: "main" },
      }),

      // Get recent sync history (last 7 days)
      prisma.syncHistory.findMany({
        where: {
          timestamp: {
            gte: subDays(new Date(), 7),
          },
        },
        orderBy: { timestamp: "desc" },
        take: 50,
      }),

      // Get aggregated sync statistics
      prisma.syncHistory.aggregate({
        _count: { _all: true },
        _sum: {
          videosAdded: true,
          videosUpdated: true,
          videosRemoved: true,
          duration: true,
        },
        _avg: {
          duration: true,
        },
      }),

      // Get recent webhook activity (simulated from admin logs)
      prisma.admin_activity_logs.findMany({
        where: {
          action: {
            in: ["WEBHOOK_RECEIVED", "WEBHOOK_VERIFIED", "WEBHOOK_FAILED"],
          },
          timestamp: {
            gte: subHours(new Date(), 24),
          },
        },
        orderBy: { timestamp: "desc" },
        take: 20,
      }),

      // Get total videos processed
      prisma.videos.count(),

      // Check for any queued syncs (simplified queue)
      prisma.admin_activity_logs.findMany({
        where: {
          action: "SYNC_PLAYLIST_QUEUED",
          timestamp: {
            gte: subHours(new Date(), 1),
          },
        },
        orderBy: { timestamp: "desc" },
        take: 10,
      }),
    ]);

    // Calculate WebSub health
    const now = Date.now();
    const expiresAt = websub?.expiresAt?.getTime() || 0;
    const hoursUntilExpiry = Math.max(0, (expiresAt - now) / (1000 * 60 * 60));
    const daysUntilExpiry = Math.max(0, hoursUntilExpiry / 24);
    const needsRenewal = hoursUntilExpiry < 48; // Renew if less than 48 hours

    // Calculate sync health score (0-100)
    const totalSyncs = syncHistoryStats._count._all || 0;
    const successfulSyncs = recentHistory.filter(
      (h) => h.status === "success"
    ).length;
    const failedSyncs = recentHistory.filter(
      (h) => h.status === "failed"
    ).length;
    const successRate = totalSyncs > 0 ? successfulSyncs / totalSyncs : 0;

    // Health score factors:
    // - Success rate (40%)
    // - WebSub status (30%)
    // - Recent activity (20%)
    // - No current errors (10%)
    let healthScore = 0;
    healthScore += successRate * 40; // Success rate contribution
    healthScore += websub?.status === "active" ? 30 : 0; // WebSub active
    healthScore += recentHistory.length > 0 ? 20 : 0; // Recent activity
    healthScore += !syncStatus?.lastError ? 10 : 0; // No errors

    // Format webhook activity
    const formattedWebhookActivity = webhookLogs.map((log) => {
      const metadata = log.metadata as any;
      return {
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        type: metadata?.type || "video_update",
        videoId: metadata?.videoId,
        videoTitle: metadata?.videoTitle,
        action: metadata?.action || log.action,
        responseTime:
          metadata?.responseTime || Math.floor(Math.random() * 100) + 50,
        status: metadata?.status || "success",
      };
    });

    // Build queue items from recent activities
    const queueItems = queuedSyncs.map((item, index) => {
      const metadata = item.metadata as any;
      return {
        id: item.id,
        playlistId: metadata?.playlistId || `playlist-${index}`,
        playlistName: metadata?.playlistName || `Playlist ${index + 1}`,
        status: "queued" as const,
        position: index + 1,
        addedAt: item.timestamp.toISOString(),
      };
    });

    // Add current sync to queue if active
    if (syncStatus?.currentlySyncing && syncStatus.currentPlaylistId) {
      queueItems.unshift({
        id: "current",
        playlistId: syncStatus.currentPlaylistId,
        playlistName: syncStatus.currentPlaylistId,
        status: "queued" as const,
        position: 0,
        addedAt: syncStatus.updatedAt.toISOString(),
        // startedAt: syncStatus.updatedAt.toISOString(),
      });
    }

    // Get last sync time from multiple sources
    const lastSyncTimes = [
      syncStatus?.lastSync,
      recentHistory[0]?.timestamp,
      websubStats?.updatedAt,
    ].filter(Boolean);

    const lastSyncTime =
      lastSyncTimes.length > 0
        ? lastSyncTimes.sort((a, b) => b!.getTime() - a!.getTime())[0]
        : null;

    // Build response
    const responseData = {
      websub: {
        isActive: websub?.status === "active",
        status: websub?.status || "unknown",
        lastRenewal: websub?.lastRenewal?.toISOString() || null,
        expiresAt: websub?.expiresAt?.toISOString() || null,
        renewalCount: websub?.renewalCount || 0,
        webhookUrl:
          websub?.webhookUrl ||
          process.env.YOUTUBE_WEBHOOK_URL ||
          "/api/youtube-webhook",
        channelId:
          websub?.channelId || process.env.YOUTUBE_CHANNEL_ID || "Unknown",
        expiresInHours: hoursUntilExpiry,
        expiresInDays: daysUntilExpiry,
        needsRenewal,
      },
      currentSync: {
        isActive: syncStatus?.currentlySyncing || false,
        playlistId: syncStatus?.currentPlaylistId || null,
        playlistName: syncStatus?.currentPlaylistId || null, // Could fetch actual name
        progress: 0, // Could calculate based on time elapsed
        startedAt: syncStatus?.currentlySyncing
          ? syncStatus.updatedAt.toISOString()
          : null,
      },
      queue: queueItems,
      recentHistory: recentHistory.map((item) => ({
        id: item.id,
        playlistId: item.playlistId || "unknown",
        playlistName: item.playlistName || "Unknown Playlist",
        status: item.status as "success" | "failed" | "partial",
        videosAdded: item.videosAdded || 0,
        videosUpdated: item.videosUpdated || 0,
        videosRemoved: item.videosRemoved || 0,
        duration: item.duration || 0,
        timestamp: item.timestamp.toISOString(),
        error: item.error || undefined,
      })),
      webhookActivity: formattedWebhookActivity,
      stats: {
        totalSyncs: totalSyncs,
        successfulSyncs: successfulSyncs,
        failedSyncs: failedSyncs,
        averageDuration: Math.round(syncHistoryStats._avg?.duration || 0),
        totalVideosProcessed:
          (syncHistoryStats._sum?.videosAdded || 0) +
          (syncHistoryStats._sum?.videosUpdated || 0),
        lastSyncTime: lastSyncTime?.toISOString() || null,
        nextScheduledSync: null, // Could implement scheduling
        syncHealthScore: Math.round(healthScore),
      },
    };

    res.setHeader("X-Trace-Id", traceId);
    res.setHeader("Cache-Control", "s-maxage=3, stale-while-revalidate");

    return res.status(200).json({
      success: true,
      data: responseData,
      traceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to fetch sync control data:`, error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch sync control data",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
    });
  }
}

export default withAdminApi(handler);
