// pages/api/video-admin/sync/stop.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = (req as any).traceId;
  const session = (req as any).session;

  try {
    // Get current sync status
    const syncStatus = await prisma.syncStatus.findUnique({
      where: { id: "main" },
    });

    if (!syncStatus?.currentlySyncing) {
      return res.status(400).json({
        success: false,
        error: "No sync operation in progress",
        message: "There is no active sync to stop",
        traceId,
      });
    }

    const stoppedPlaylistId = syncStatus.currentPlaylistId;

    // Mark sync as cancelled
    await prisma.syncStatus.update({
      where: { id: "main" },
      data: {
        currentlySyncing: false,
        currentPlaylistId: null,
        lastError: "SYNC_CANCELLED",
        updatedAt: new Date(),
      },
    });

    // Create a sync history entry for the cancellation
    if (stoppedPlaylistId) {
      // Get playlist details
      const playlist = await prisma.playlist.findUnique({
        where: { playlistId: stoppedPlaylistId },
        select: { title: true },
      });

      await prisma.syncHistory.create({
        data: {
          playlistId: stoppedPlaylistId,
          playlistName: playlist?.title || "Unknown Playlist",
          status: "failed",
          error: "Sync cancelled by user",
          duration: 0,
          videosAdded: 0,
          videosUpdated: 0,
          videosRemoved: 0,
        },
      });
    }

    // Log the stop action
    await prisma.admin_activity_logs.create({
      data: {
        action: "SYNC_STOPPED",
        entityType: "sync",
        userId: session.user?.email || session.user?.id || "system",
        metadata: {
          stoppedPlaylistId,
          reason: "User initiated stop",
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          req.socket.remoteAddress,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Sync operation stopped successfully",
      data: {
        stoppedPlaylistId,
        timestamp: new Date().toISOString(),
      },
      traceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to stop sync:`, error);

    return res.status(500).json({
      success: false,
      error: "Failed to stop sync operation",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
    });
  }
}

export default withAdminApi(handler);
