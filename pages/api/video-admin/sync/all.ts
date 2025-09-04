// pages/api/video-admin/sync/all.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { syncPlaylist } from "@/lib/youtube-sync";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = (req as any).traceId;
  const session = (req as any).session;

  try {
    // Check if already syncing
    const syncStatus = await prisma.syncStatus.findUnique({
      where: { id: "main" },
    });

    if (syncStatus?.currentlySyncing) {
      return res.status(409).json({
        success: false,
        error: "A sync operation is already in progress",
        message: `Currently syncing: ${syncStatus.currentPlaylistId}`,
        traceId,
      });
    }

    // Get all active playlists
    const activePlaylists = await prisma.playlist.findMany({
      where: { isActive: true },
      orderBy: { itemCount: "desc" }, // Start with largest playlists
    });

    if (activePlaylists.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No active playlists found",
        message: "Enable at least one playlist before syncing all",
        traceId,
      });
    }

    // Log the sync all start
    await prisma.admin_activity_logs.create({
      data: {
        action: "SYNC_ALL_START",
        entityType: "sync",
        userId: session.user?.email || session.user?.id || "system",
        metadata: {
          playlistCount: activePlaylists.length,
          playlists: activePlaylists.map((p) => ({
            id: p.playlistId,
            name: p.title,
            itemCount: p.itemCount,
          })),
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          req.socket.remoteAddress,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    // Start syncing playlists sequentially in the background
    syncAllPlaylistsSequentially(activePlaylists, session, traceId);

    // Estimate total time based on playlist sizes
    const totalVideos = activePlaylists.reduce(
      (sum, p) => sum + (p.itemCount || 0),
      0
    );
    const estimatedMinutes = Math.ceil(totalVideos / 100); // Rough estimate

    return res.status(202).json({
      success: true,
      message: `Started syncing ${activePlaylists.length} playlists`,
      data: {
        playlistCount: activePlaylists.length,
        totalVideos,
        estimatedMinutes,
        playlists: activePlaylists.map((p) => ({
          id: p.playlistId,
          name: p.title,
          videos: p.itemCount,
        })),
      },
      traceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to start sync all:`, error);

    return res.status(500).json({
      success: false,
      error: "Failed to start sync all operation",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
    });
  }
}

// Sync all playlists sequentially
async function syncAllPlaylistsSequentially(
  playlists: any[],
  session: any,
  traceId: string
) {
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  for (const playlist of playlists) {
    try {
      // Check if we should stop (user might have cancelled)
      const syncStatus = await prisma.syncStatus.findUnique({
        where: { id: "main" },
      });

      // If sync was manually stopped, break
      if (syncStatus?.lastError === "SYNC_CANCELLED") {
        console.log(`[${traceId}] Sync all cancelled by user`);
        break;
      }

      // Mark as currently syncing
      await prisma.syncStatus.upsert({
        where: { id: "main" },
        update: {
          currentlySyncing: true,
          currentPlaylistId: playlist.playlistId,
          lastError: null,
        },
        create: {
          id: "main",
          currentlySyncing: true,
          currentPlaylistId: playlist.playlistId,
        },
      });

      // Sync the playlist
      console.log(`[${traceId}] Syncing playlist: ${playlist.title}`);
      const result = await syncPlaylist(playlist.playlistId);

      // Record success
      await prisma.syncHistory.create({
        data: {
          playlistId: playlist.playlistId,
          playlistName: playlist.title,
          status: "success",
          videosAdded: result.videosAdded || 0,
          videosUpdated: result.videosUpdated || 0,
          videosRemoved: result.videosRemoved || 0,
          duration: result.duration || 0,
        },
      });

      successCount++;
    } catch (error) {
      console.error(`[${traceId}] Failed to sync ${playlist.title}:`, error);

      // Record failure
      await prisma.syncHistory.create({
        data: {
          playlistId: playlist.playlistId,
          playlistName: playlist.title,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          duration: 0,
          videosAdded: 0,
          videosUpdated: 0,
          videosRemoved: 0,
        },
      });

      failCount++;
    }

    // Small delay between playlists to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Clear sync status
  await prisma.syncStatus.update({
    where: { id: "main" },
    data: {
      currentlySyncing: false,
      currentPlaylistId: null,
      lastSync: new Date(),
      totalSyncs: { increment: successCount },
    },
  });

  // Log completion
  const duration = Date.now() - startTime;
  await prisma.admin_activity_logs.create({
    data: {
      action: "SYNC_ALL_COMPLETE",
      entityType: "sync",
      userId: session.user?.email || session.user?.id || "system",
      metadata: {
        successCount,
        failCount,
        totalPlaylists: playlists.length,
        duration: Math.round(duration / 1000), // seconds
        averageTimePerPlaylist: Math.round(duration / playlists.length / 1000),
      },
    },
  });

  console.log(
    `[${traceId}] Sync all completed: ${successCount} success, ${failCount} failed`
  );
}

export default withAdminApi(handler);
