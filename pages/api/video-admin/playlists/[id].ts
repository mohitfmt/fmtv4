// pages/api/video-admin/playlists/[id].ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updatePlaylistSchema = z.object({
  isActive: z.boolean().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const traceId = (req as any).traceId;

  switch (method) {
    case "GET":
      return handleGetPlaylist(req, res, traceId);
    case "PATCH":
      return handleUpdatePlaylist(req, res, traceId);
    default:
      res.setHeader("Allow", ["GET", "PATCH"]);
      return res.status(405).json({
        success: false,
        error: "Method not allowed",
      });
  }
}

async function handleGetPlaylist(
  req: NextApiRequest,
  res: NextApiResponse,
  traceId: string
) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid playlist ID",
        traceId,
      });
    }

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

    // Get recent sync history
    const recentSync = await prisma.syncHistory.findFirst({
      where: { playlistId: id },
      orderBy: { timestamp: "desc" },
      select: {
        status: true,
        videosAdded: true,
        videosUpdated: true,
        videosRemoved: true,
        timestamp: true,
        error: true,
      },
    });

    // Check if currently syncing
    const syncStatus = await prisma.syncStatus.findUnique({
      where: { id: "main" },
      select: {
        currentlySyncing: true,
        currentPlaylistId: true,
      },
    });

    const isSyncing =
      syncStatus?.currentlySyncing && syncStatus.currentPlaylistId === id;

    return res.status(200).json({
      success: true,
      data: {
        ...playlist,
        itemCount: playlist.itemCount || 0,
        syncInProgress: isSyncing,
        lastSyncResult: recentSync || null,
      },
      traceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to fetch playlist:`, error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch playlist",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
    });
  }
}

async function handleUpdatePlaylist(
  req: NextApiRequest,
  res: NextApiResponse,
  traceId: string
) {
  try {
    const { id } = req.query;
    const session = (req as any).session;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        error: "Invalid playlist ID",
        traceId,
      });
    }

    // Validate request body
    const validation = updatePlaylistSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: "Invalid request body",
        details: validation.error.flatten(),
        traceId,
      });
    }

    // Check if playlist exists
    const existingPlaylist = await prisma.playlist.findUnique({
      where: { playlistId: id },
    });

    if (!existingPlaylist) {
      return res.status(404).json({
        success: false,
        error: "Playlist not found",
        traceId,
      });
    }

    // Update playlist
    const updatedPlaylist = await prisma.playlist.update({
      where: { playlistId: id },
      data: {
        ...validation.data,
        updatedAt: new Date(),
      },
    });

    // Log admin action
    const actionType =
      validation.data.isActive !== undefined
        ? validation.data.isActive
          ? "ACTIVATE_PLAYLIST"
          : "DEACTIVATE_PLAYLIST"
        : "UPDATE_PLAYLIST";

    await prisma.admin_activity_logs.create({
      data: {
        action: actionType,
        entityType: "playlist",
        userId: session.user?.email || session.user?.id || "system",
        metadata: {
          playlistId: updatedPlaylist.playlistId,
          playlistName: updatedPlaylist.title,
          changes: validation.data,
          previousState: {
            isActive: existingPlaylist.isActive,
            title: existingPlaylist.title,
            description: existingPlaylist.description,
          },
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          req.socket.remoteAddress,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedPlaylist,
      message: `Playlist "${updatedPlaylist.title}" updated successfully`,
      traceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to update playlist:`, error);
    return res.status(500).json({
      success: false,
      error: "Failed to update playlist",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
    });
  }
}

export default withAdminApi(handler);
