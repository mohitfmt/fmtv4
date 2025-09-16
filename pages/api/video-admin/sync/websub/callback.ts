// pages/api/video-admin/sync/websub/callback.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { enrichVideos } from "@/lib/sync-helpers";
import { parseString } from "xml2js";
import { promisify } from "util";

const parseXML = promisify(parseString);

// We need raw XML body
export const config = {
  api: { bodyParser: false },
};

const HUB_URL = "https://pubsubhubbub.appspot.com";
const channelId = process.env.YOUTUBE_CHANNEL_ID!;
const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/video-admin/sync/websub/callback`;
const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;

function readRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!channelId || !process.env.NEXT_PUBLIC_APP_URL) {
    return res
      .status(500)
      .send("Missing YOUTUBE_CHANNEL_ID or NEXT_PUBLIC_APP_URL");
  }

  if (req.method === "GET") {
    // Verification handshake (subscribe/unsubscribe)
    const mode = (req.query["hub.mode"] as string) || "";
    const topic = (req.query["hub.topic"] as string) || "";
    const challenge = (req.query["hub.challenge"] as string) || "";
    const lease = parseInt(
      (req.query["hub.lease_seconds"] as string) || "0",
      10
    );

    if (!challenge || topic !== topicUrl) {
      return res.status(400).send("Invalid verification request");
    }

    const now = new Date();
    const expiresAt = lease > 0 ? new Date(now.getTime() + lease * 1000) : null;

    await prisma.websub_subscriptions.upsert({
      where: { channelId },
      create: {
        channelId,
        webhookUrl: callbackUrl,
        status: mode === "unsubscribe" ? "expired" : "active",
        lastRenewal: now,
        expiresAt,
        renewalCount: 1,
        createdAt: now,
        updatedAt: now,
      },
      update: {
        status: mode === "unsubscribe" ? "expired" : "active",
        lastRenewal: now,
        expiresAt,
        renewalCount: { increment: 1 },
        updatedAt: now,
        webhookUrl: callbackUrl,
      },
    });

    return res.status(200).send(challenge); // must echo exactly
  }

  if (req.method === "POST") {
    // Notification payload (Atom XML)
    const raw = await readRawBody(req);
    let parsed: any;
    try {
      parsed = await parseXML(raw.toString("utf8"));
    } catch {
      await bumpStats(1, 0);
      return res.status(202).end();
    }

    const entries: any[] = (parsed?.feed?.entry as any[]) || [];
    const ids = new Set<string>();
    for (const entry of entries) {
      const vid = entry?.["yt:videoId"]?.[0];
      if (vid) ids.add(vid);
    }

    if (ids.size === 0) {
      await bumpStats(1, 0);
      return res.status(204).end();
    }

    try {
      await enrichVideos(Array.from(ids));
      await bumpStats(1, ids.size);
    } catch {
      await bumpStats(1, 0);
    }
    return res.status(204).end();
  }

  return res.status(405).send("Method not allowed");
}

async function bumpStats(webhooksInc: number, videosInc: number) {
  const now = new Date();
  const latest = await prisma.websub_stats.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!latest) {
    await prisma.websub_stats.create({
      data: {
        webhooksReceived: webhooksInc,
        videosProcessed: videosInc,
        createdAt: now,
        updatedAt: now,
      },
    });
  } else {
    await prisma.websub_stats.update({
      where: { id: latest.id },
      data: {
        webhooksReceived: (latest.webhooksReceived || 0) + webhooksInc,
        videosProcessed: (latest.videosProcessed || 0) + videosInc,
        updatedAt: now,
      },
    });
  }
}
