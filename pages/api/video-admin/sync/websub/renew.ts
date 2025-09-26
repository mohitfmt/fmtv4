// pages/api/video-admin/sync/websub/renew.ts
import type { NextApiRequest, NextApiResponse } from "next";

import { prisma } from "@/lib/prisma";

const HUB_URL = "https://pubsubhubbub.appspot.com";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const channelId = process.env.YOUTUBE_CHANNEL_ID!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  if (!channelId || !appUrl) {
    return res
      .status(500)
      .json({ error: "Missing YOUTUBE_CHANNEL_ID or NEXT_PUBLIC_APP_URL" });
  }

  const callbackUrl = `${appUrl}/api/video-admin/sync/websub/callback`;
  const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;

  // If the existing sub is still healthy for >24h, skip
  const sub = await prisma.websub_subscriptions.findUnique({
    where: { channelId },
  });
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const healthy =
    sub &&
    sub.status === "active" &&
    sub.expiresAt &&
    new Date(sub.expiresAt) > soon;

  if (healthy) {
    return res.json({
      success: true,
      renewed: false,
      status: sub.status,
      expiresAt: sub.expiresAt,
    });
  }

  // Ask hub to (re)subscribe; hub will verify via GET
  const form = new URLSearchParams();
  form.set("hub.mode", "subscribe");
  form.set("hub.topic", topicUrl);
  form.set("hub.callback", callbackUrl);
  form.set("hub.lease_seconds", String(432000)); // 5 days

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const resp = await fetch(HUB_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return res
        .status(502)
        .json({ error: "Hub subscribe failed", status: resp.status, text });
    }

    // Mark as pending until callback GET confirms active
    await prisma.websub_subscriptions.upsert({
      where: { channelId },
      create: {
        channelId,
        webhookUrl: callbackUrl,
        status: "pending",
        lastRenewal: now,
        expiresAt: null,
        renewalCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        status: "pending",
        lastRenewal: now,
        webhookUrl: callbackUrl,
        updatedAt: now,
      },
    });

    // Log admin activity
    const userId =
      (req.headers["x-admin-user"] as string) ||
      req.cookies?.user_email ||
      "admin@freemalaysiatoday.com";

    await prisma.admin_activity_logs.create({
      data: {
        action: "WEBHOOK_RENEW_REQUESTED",
        entityType: "websub",
        userId,
        metadata: { channelId, callbackUrl },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          req.socket.remoteAddress ||
          null,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    return res.json({
      success: true,
      renewed: true,
      message: "Renew request sent. Awaiting hub verification.",
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: "Renew request error", details: e?.message || String(e) });
  } finally {
    clearTimeout(timeout);
  }
}
