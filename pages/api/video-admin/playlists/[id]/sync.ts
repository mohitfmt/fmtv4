// pages/api/video-admin/playlists/[id]/sync.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { syncPlaylist } from "@/lib/youtube-sync";
import { prisma } from "@/lib/prisma";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  const traceId = (req as any).traceId;
  const session = (req as any).session;

  try {
    // Check if playlist exists
    const playlist = await prisma.playlist.findUnique({
      where: { playlistId: id as string },
    });

    if (!playlist) {
      return res.status(404).json({
        error: "Playlist not found",
        traceId,
      });
    }

    // Check if already syncing
    const syncStatus = await prisma.syncStatus.findUnique({
      where: { id: "main" },
    });

    if (syncStatus?.currentlySyncing) {
      return res.status(409).json({
        error: "Another sync is already in progress",
        traceId,
      });
    }

    // Start sync
    await prisma.syncStatus.upsert({
      where: { id: "main" },
      update: {
        currentlySyncing: true,
        currentPlaylistId: playlist.playlistId,
      },
      create: {
        id: "main",
        currentlySyncing: true,
        currentPlaylistId: playlist.playlistId,
      },
    });

    // Execute sync asynchronously
    syncPlaylist(playlist.playlistId)
      .then(async (result) => {
        await prisma.$transaction([
          prisma.syncHistory.create({
            data: {
              playlistId: playlist.playlistId,
              playlistName: playlist.title,
              status: "success",
              videosAdded: result.videosAdded,
              videosUpdated: result.videosUpdated,
              videosRemoved: result.videosRemoved,
              duration: result.duration,
              // userId: session.user.id || session.user.email,
              // userEmail: session.user.email,
              // traceId,
            },
          }),
          prisma.syncStatus.update({
            where: { id: "main" },
            data: {
              currentlySyncing: false,
              currentPlaylistId: null,
              lastSync: new Date(),
              totalSyncs: { increment: 1 },
            },
          }),
          // Use the correct model name: admin_activity_logs
          prisma.admin_activity_logs.create({
            data: {
              action: "SYNC_PLAYLIST",
              entityType: "playlist",
              userId: session.user.id || session.user.email,
              // metadata: {
              //   playlistId: playlist.playlistId,
              //   playlistName: playlist.title,
              //   result,
              // },
              ipAddress:
                (req.headers["x-forwarded-for"] as string) ||
                req.socket.remoteAddress,
              userAgent: req.headers["user-agent"] || null,
            },
          }),
        ]);
      })
      .catch(async (error) => {
        console.error(`[${traceId}] Sync failed:`, error);

        await prisma.$transaction([
          prisma.syncHistory.create({
            data: {
              playlistId: playlist.playlistId,
              playlistName: playlist.title,
              status: "failed",
              error: error.message,
              duration: 0,
              // userId: session.user.id || session.user.email,
              // userEmail: session.user.email,
              // traceId,
            },
          }),
          prisma.syncStatus.update({
            where: { id: "main" },
            data: {
              currentlySyncing: false,
              currentPlaylistId: null,
              lastError: error.message,
            },
          }),
        ]);
      });

    return res.status(202).json({
      message: "Sync started",
      playlistId: playlist.playlistId,
      playlistName: playlist.title,
      traceId,
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
      .catch(() => {});

    return res.status(500).json({
      error: "Failed to trigger sync",
      traceId,
    });
  }
};

export default withAdminApi(handler);
