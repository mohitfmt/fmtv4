import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = (req as any).traceId;

  try {
    // Get websub subscription status for webhook info
    const websub = await prisma.websub_subscriptions.findFirst({
      where: { channelId: process.env.YOUTUBE_CHANNEL_ID },
    });

    // Get sync history from SyncHistory collection
    const syncHistory = await prisma.syncHistory.findMany({
      orderBy: { timestamp: "desc" },
      take: 20,
    });

    // Get websub stats for sync timing
    const websubStats = await prisma.websub_stats.findFirst();

    const status = {
      isActive: websub?.status === "active",
      lastSync: websubStats?.updatedAt || null,
      nextSync: websub?.expiresAt || null,
      syncInterval: 60, // Default to 60 minutes
      webhookStatus: websub?.status || "inactive",
      webhookUrl: websub?.webhookUrl || null,
      currentlySyncing: false, // Would need to track this separately
      syncHistory: syncHistory.map((item) => ({
        id: item.id,
        timestamp: item.timestamp,
        status: item.status,
        videosAdded: item.videosAdded,
        videosUpdated: item.videosUpdated,
        videosRemoved: item.videosRemoved,
        duration: item.duration,
        error: item.error,
        playlistId: item.playlistId,
        playlistName: item.playlistName,
      })),
    };

    res.setHeader("X-Trace-Id", traceId);
    return res.status(200).json({
      data: status,
      traceId,
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to get sync status:`, error);
    return res.status(500).json({
      error: "Failed to get sync status",
      traceId,
    });
  }
};

export default withAdminApi(handler);
