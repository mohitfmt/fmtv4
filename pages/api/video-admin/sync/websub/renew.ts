// pages/api/video-admin/sync/websub/renew.ts
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
    const channelId =
      process.env.YOUTUBE_CHANNEL_ID || "UCm7Mkdl1a8g6ctmQMhhghiA";
    const webhookUrl =
      process.env.YOUTUBE_WEBHOOK_URL ||
      `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube-webhook`;

    // Check current subscription status
    const currentSub = await prisma.websub_subscriptions.findFirst({
      where: { channelId },
    });

    // Simulate webhook renewal (in production, this would call YouTube API)
    const renewalResult = await simulateWebhookRenewal(channelId, webhookUrl);

    if (renewalResult.success) {
      // Update or create subscription record
      const subscription = await prisma.websub_subscriptions.upsert({
        where: {
          channelId: channelId,
        },
        update: {
          status: "active",
          lastRenewal: new Date(),
          expiresAt: new Date(Date.now() + 345600000), // 4 days from now (96 hours)
          renewalCount: { increment: 1 },
          webhookUrl: webhookUrl,
          updatedAt: new Date(),
        },
        create: {
          channelId: channelId,
          webhookUrl: webhookUrl,
          status: "active",
          lastRenewal: new Date(),
          expiresAt: new Date(Date.now() + 432000000), // 5 days from now
          renewalCount: 1,
        },
      });

      // Update websub stats
      await prisma.websub_stats.upsert({
        where: { id: "main" },
        create: {
          id: "main",
          webhooksReceived: 0,
          videosProcessed: 0,
          updatedAt: new Date(),
        },
        update: {
          updatedAt: new Date(),
        },
      });

      // Log the renewal
      await prisma.admin_activity_logs.create({
        data: {
          action: "WEBHOOK_RENEWED",
          entityType: "websub",
          userId: session.user?.email || session.user?.id || "system",
          metadata: {
            channelId,
            webhookUrl,
            expiresAt: subscription.expiresAt,
            renewalCount: subscription.renewalCount,
          },
          ipAddress:
            (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
            req.socket.remoteAddress,
          userAgent: req.headers["user-agent"] || null,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Webhook subscription renewed successfully",
        data: {
          channelId,
          webhookUrl,
          expiresAt: subscription.expiresAt?.toISOString(),
          renewalCount: subscription.renewalCount,
          status: subscription.status,
        },
        traceId,
        timestamp: new Date().toISOString(),
      });
    } else {
      throw new Error(
        renewalResult.error || "Failed to renew webhook subscription"
      );
    }
  } catch (error) {
    console.error(`[${traceId}] Failed to renew webhook:`, error);

    // Log the failure
    await prisma.admin_activity_logs
      .create({
        data: {
          action: "WEBHOOK_RENEWAL_FAILED",
          entityType: "websub",
          userId: session.user?.email || session.user?.id || "system",
          metadata: {
            error: error instanceof Error ? error.message : "Unknown error",
          },
        },
      })
      .catch(() => {}); // Ignore logging errors

    return res.status(500).json({
      success: false,
      error: "Failed to renew webhook subscription",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
    });
  }
}

// Simulate webhook renewal (replace with actual YouTube API call)
async function simulateWebhookRenewal(channelId: string, webhookUrl: string) {
  // In production, this would make an actual API call to YouTube PubSubHubbub
  // For now, we'll simulate success after a short delay

  return new Promise<{ success: boolean; error?: string }>((resolve) => {
    setTimeout(() => {
      // Simulate 95% success rate
      if (Math.random() > 0.05) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: "YouTube API temporarily unavailable",
        });
      }
    }, 1000);
  });
}

export default withAdminApi(handler);
