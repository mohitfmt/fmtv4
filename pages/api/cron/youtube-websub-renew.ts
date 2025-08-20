// pages/api/cron/youtube-websub-renew.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isAuthorized(req: NextApiRequest): boolean {
  // Check for OIDC token from Cloud Scheduler
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return true; // Cloud Run validates the OIDC token
  }

  // Fallback to secret key for manual testing
  const cronKey = req.query.key || req.headers["x-cron-key"];
  return cronKey === process.env.CRON_SECRET_KEY;
}

async function renewWebSubSubscription() {
  const CHANNEL_ID =
    process.env.YOUTUBE_CHANNEL_ID || "UCm7Mkdl1a8g6ctmQMhhghiA";
  const WEBHOOK_URL =
    process.env.YOUTUBE_WEBHOOK_URL ||
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/youtube-webhook`;
  const WEBSUB_SECRET = process.env.WEBSUB_SECRET;

  const params = new URLSearchParams({
    "hub.callback": WEBHOOK_URL,
    "hub.topic": `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
    "hub.verify": "async",
    "hub.mode": "subscribe",
    "hub.lease_seconds": "432000", // 5 days max
    "hub.secret": WEBSUB_SECRET || "",
  });

  const response = await fetch("https://pubsubhubbub.appspot.com/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  // Update or create subscription record
  const expiresAt = new Date(Date.now() + 432000 * 1000);

  await prisma.websub_subscriptions.upsert({
    where: { channelId: CHANNEL_ID },
    update: {
      status: response.ok ? "active" : "failed",
      lastRenewal: new Date(),
      expiresAt,
      renewalCount: { increment: 1 },
    },
    create: {
      channelId: CHANNEL_ID,
      webhookUrl: WEBHOOK_URL,
      status: response.ok ? "active" : "failed",
      lastRenewal: new Date(),
      expiresAt,
      renewalCount: 1,
    },
  });

  return {
    success: response.ok,
    status: response.status,
    timestamp: new Date().toISOString(),
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  console.log("[WebSub Renewal] Starting renewal process...");

  try {
    const result = await renewWebSubSubscription();

    console.log("[WebSub Renewal] Result:", result);

    if (result.success) {
      return res.status(200).json({
        message: "WebSub subscription renewed successfully",
        ...result,
      });
    } else {
      // Still return 200 to prevent Cloud Scheduler from retrying too much
      return res.status(200).json({
        message: "WebSub renewal request sent but got non-OK response",
        warning: true,
        ...result,
      });
    }
  } catch (error: any) {
    console.error("[WebSub Renewal] Error:", error);

    // Return 200 with error info to prevent excessive retries
    return res.status(200).json({
      message: "WebSub renewal failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
