import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { syncAllPlaylists } from "@/lib/youtube-sync";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const triggerSchema = z.object({
  playlistIds: z.array(z.string()).optional(),
  force: z.boolean().optional(),
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = (req as any).traceId;
  const session = (req as any).session;

  try {
    const validation = triggerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: validation.error,
        traceId,
      });
    }

    const { playlistIds, force } = validation.data;

    // Check if already syncing
    const syncStatus = await prisma.syncStatus.findUnique({
      where: { id: "main" },
    });

    if (!force && syncStatus?.currentlySyncing) {
      return res.status(409).json({
        error: "Another sync is already in progress",
        currentPlaylistId: syncStatus.currentPlaylistId,
        traceId,
      });
    }

    // Update sync status
    // await prisma.syncStatus.upsert({
    //   where: { id: "main" },
    //   update: {
    //     currentlySyncing: true,
    //     lastSyncStart: new Date(),
    //   },
    //   create: {
    //     id: "main",
    //     currentlySyncing: true,
    //     lastSyncStart: new Date(),
    //   },
    // });

    // Execute sync asynchronously
    syncAllPlaylists(playlistIds)
      .then(async (result) => {
        await prisma.$transaction([
          prisma.syncHistory.create({
            data: {
              status: "success",
              videosAdded: result.videosAdded,
              videosUpdated: result.videosUpdated,
              videosRemoved: result.videosRemoved,
              duration: result.duration,
              // userId: session.user.id,
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
              // nextSync: new Date(
              //   Date.now() + (syncStatus?.syncInterval || 60) * 60 * 1000
              // ),
            },
          }),
          prisma.admin_activity_logs.create({
            data: {
              action: "SYNC_ALL",
              entityType: "sync",
              userId: session.user.id,
              // userEmail: session.user.email,
              // metadata: {
              //   playlistIds,
              //   force,
              //   result,
              // },
              // traceId,
            },
          }),
        ]);
      })
      .catch(async (error) => {
        console.error(`[${traceId}] Sync failed:`, error);

        await prisma.$transaction([
          prisma.syncHistory.create({
            data: {
              status: "failed",
              error: error.message,
              duration: 0,
              // userId: session.user.id,
              // userEmail: session.user.email,
              // traceId,
            },
          }),
          prisma.syncStatus.update({
            where: { id: "main" },
            data: {
              currentlySyncing: false,
              currentPlaylistId: null,
            },
          }),
        ]);
      });

    return res.status(202).json({
      message: "Sync triggered",
      playlistIds,
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
