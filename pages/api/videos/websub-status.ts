// ===========================================
// pages/api/videos/websub-status.ts
// ===========================================
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get subscription info
    const subscription = await prisma.websub_subscriptions.findFirst({
      where: { channelId: process.env.YOUTUBE_CHANNEL_ID },
    });

    // Get stats
    const stats = await prisma.websub_stats.findFirst();

    // Get recent videos
    const recentVideos = await prisma.videos.findMany({
      orderBy: { lastSyncedAt: "desc" },
      take: 3,
      select: {
        title: true,
        lastSyncedAt: true,
        videoId: true,
      },
    });

    // Calculate health status
    const now = Date.now();
    const expiresAt = subscription?.expiresAt?.getTime() || 0;
    const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);

    const health = {
      status:
        hoursUntilExpiry > 24
          ? "healthy"
          : hoursUntilExpiry > 0
            ? "warning"
            : "expired",
      expiresInHours: Math.max(0, hoursUntilExpiry),
      expiresInDays: Math.max(0, hoursUntilExpiry / 24),
      needsRenewal: hoursUntilExpiry < 48,
    };

    return res.status(200).json({
      subscription: {
        isActive: subscription?.status === "active",
        lastRenewal: subscription?.lastRenewal || "Never",
        expiresAt: subscription?.expiresAt || "Unknown",
        renewalCount: subscription?.renewalCount || 0,
        webhookUrl: subscription?.webhookUrl || process.env.YOUTUBE_WEBHOOK_URL,
      },
      health,
      stats: {
        totalWebhooksReceived: stats?.webhooksReceived || 0,
        videosProcessed: stats?.videosProcessed || 0,
      },
      recentVideos,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[WebSub Status] Error:", error);
    return res.status(500).json({
      error: "Failed to fetch status",
      timestamp: new Date().toISOString(),
    });
  }
}
