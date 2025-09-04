// pages/api/video-admin/playlists/[id]/sync.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { syncPlaylist } from "@/lib/youtube-sync";
import { prisma } from "@/lib/prisma";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  const traceId = (req as any).traceId;
  const session = (req as any).session;

  try {
    // Validate playlist ID
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid playlist ID",
        traceId,
      });
    }

    // Check if playlist exists
    const playlist = await prisma.playlist.findUnique({
      where: { playlistId: id },
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: "Playlist not found",
        traceId,
      });
    }

    // Check if already syncing
    const syncStatus = await prisma.syncStatus.findUnique({
      where: { id: "main" },
    });

    if (syncStatus?.currentlySyncing) {
      // Check if it's the same playlist
      if (syncStatus.currentPlaylistId === playlist.playlistId) {
        return res.status(200).json({
          success: true,
          message: `"${playlist.title}" is already syncing`,
          playlistId: playlist.playlistId,
          inProgress: true,
          traceId,
        });
      }

      // Another playlist is syncing
      return res.status(409).json({
        success: false,
        error: "Another playlist sync is in progress",
        message: `Currently syncing: ${syncStatus.currentPlaylistId}`,
        queuePosition: 2, // Could implement a real queue system
        traceId,
      });
    }

    // Start sync - mark as syncing immediately
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

    // Log the sync start
    await prisma.admin_activity_logs.create({
      data: {
        action: "SYNC_PLAYLIST_START",
        entityType: "playlist",
        userId: session.user?.email || session.user?.id || "system",
        metadata: {
          playlistId: playlist.playlistId,
          playlistName: playlist.title,
          itemCount: playlist.itemCount,
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          req.socket.remoteAddress,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    // Execute sync asynchronously
    syncPlaylist(playlist.playlistId)
      .then(async (result) => {
        // Record successful sync
        await prisma.$transaction([
          // Create sync history record
          prisma.syncHistory.create({
            data: {
              playlistId: playlist.playlistId,
              playlistName: playlist.title,
              status: "success",
              videosAdded: result.videosAdded || 0,
              videosUpdated: result.videosUpdated || 0,
              videosRemoved: result.videosRemoved || 0,
              duration: result.duration || 0,
            },
          }),

          // Update sync status
          prisma.syncStatus.update({
            where: { id: "main" },
            data: {
              currentlySyncing: false,
              currentPlaylistId: null,
              lastSync: new Date(),
              totalSyncs: { increment: 1 },
              lastError: null,
            },
          }),

          // Update playlist's last sync time
          prisma.playlist.update({
            where: { playlistId: playlist.playlistId },
            data: {
              updatedAt: new Date(),
              // If your schema has a lastSyncedAt field, uncomment:
              // lastSyncedAt: new Date(),
            },
          }),

          // Log successful sync
          prisma.admin_activity_logs.create({
            data: {
              action: "SYNC_PLAYLIST_SUCCESS",
              entityType: "playlist",
              userId: session.user?.email || session.user?.id || "system",
              metadata: {
                playlistId: playlist.playlistId,
                playlistName: playlist.title,
                result: {
                  videosAdded: result.videosAdded || 0,
                  videosUpdated: result.videosUpdated || 0,
                  videosRemoved: result.videosRemoved || 0,
                  duration: result.duration || 0,
                },
              },
            },
          }),
        ]);

        console.log(
          `[${traceId}] Sync completed successfully for ${playlist.title}`
        );
      })
      .catch(async (error) => {
        console.error(`[${traceId}] Sync failed for ${playlist.title}:`, error);

        // Record failed sync
        await prisma.$transaction([
          // Create sync history record with error
          prisma.syncHistory.create({
            data: {
              playlistId: playlist.playlistId,
              playlistName: playlist.title,
              status: "failed",
              error: error.message || "Unknown error",
              duration: 0,
              videosAdded: 0,
              videosUpdated: 0,
              videosRemoved: 0,
            },
          }),

          // Update sync status with error
          prisma.syncStatus.update({
            where: { id: "main" },
            data: {
              currentlySyncing: false,
              currentPlaylistId: null,
              lastError: error.message || "Unknown error",
            },
          }),

          // Log failed sync
          prisma.admin_activity_logs.create({
            data: {
              action: "SYNC_PLAYLIST_FAILED",
              entityType: "playlist",
              userId: session.user?.email || session.user?.id || "system",
              metadata: {
                playlistId: playlist.playlistId,
                playlistName: playlist.title,
                error: error.message || "Unknown error",
              },
            },
          }),
        ]);
      });

    // Return immediate response
    return res.status(202).json({
      success: true,
      message: `Started syncing "${playlist.title}"`,
      playlistId: playlist.playlistId,
      playlistName: playlist.title,
      estimatedTime: playlist.itemCount
        ? Math.ceil(playlist.itemCount / 50) * 2
        : 5, // Rough estimate in seconds
      traceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to trigger sync:`, error);

    // Reset sync status on error
    await prisma.syncStatus
      .update({
        where: { id: "main" },
        data: {
          currentlySyncing: false,
          currentPlaylistId: null,
          lastError: error instanceof Error ? error.message : "Unknown error",
        },
      })
      .catch(() => {
        // Ignore errors when resetting status
      });

    return res.status(500).json({
      success: false,
      error: "Failed to trigger sync",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
    });
  }
}

export default withAdminApi(handler);
