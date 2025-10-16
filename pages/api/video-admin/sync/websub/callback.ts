// pages/api/video-admin/sync/websub/callback.ts
// FIXED VERSION - Proper ISR revalidation + cache clearing
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { enrichVideos } from "@/lib/sync-helpers";
import { parseString } from "xml2js";
import { promisify } from "util";
import {
  galleryCache,
  videoDataCache,
  playlistCache,
} from "@/lib/cache/video-cache-registry";

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

  // ========================================================================
  // VERIFICATION HANDSHAKE (Subscribe/Unsubscribe)
  // ========================================================================
  if (req.method === "GET") {
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

  // ========================================================================
  // NOTIFICATION PAYLOAD (New/Updated Videos)
  // ========================================================================
  if (req.method === "POST") {
    const traceId = `WEBSUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${traceId}] ========================================`);
    console.log(`[${traceId}] WebSub notification received`);

    // Parse Atom XML
    const raw = await readRawBody(req);
    let parsed: any;
    try {
      parsed = await parseXML(raw.toString("utf8"));
    } catch (error) {
      console.error(`[${traceId}] Failed to parse XML:`, error);
      await bumpStats(1, 0);
      return res.status(202).end();
    }

    // Extract video IDs
    const entries: any[] = (parsed?.feed?.entry as any[]) || [];
    const ids = new Set<string>();
    for (const entry of entries) {
      const vid = entry?.["yt:videoId"]?.[0];
      if (vid) ids.add(vid);
    }

    if (ids.size === 0) {
      console.log(`[${traceId}] No video IDs found in notification`);
      await bumpStats(1, 0);
      return res.status(204).end();
    }

    console.log(
      `[${traceId}] Processing ${ids.size} video(s): ${Array.from(ids).join(", ")}`
    );

    try {
      // ====================================================================
      // STEP 1: Sync videos to MongoDB
      // ====================================================================
      await enrichVideos(Array.from(ids));
      console.log(`[${traceId}] ✅ Videos synced to MongoDB`);

      // ====================================================================
      // STEP 2: Clear ALL video-related LRU caches
      // ====================================================================
      try {
        galleryCache.clear();
        videoDataCache.clear();
        playlistCache.clear();
        console.log(
          `[${traceId}] ✅ Cleared all LRU caches (gallery, videoData, playlist)`
        );
      } catch (cacheError) {
        console.error(
          `[${traceId}] ⚠️ Failed to clear LRU caches:`,
          cacheError
        );
      }

      // ====================================================================
      // STEP 3: Trigger ISR revalidation for affected pages
      // ====================================================================
      const revalidateSecret = process.env.REVALIDATE_SECRET;
      const siteUrl = process.env.NEXT_PUBLIC_APP_URL;

      if (!revalidateSecret) {
        console.error(
          `[${traceId}] ❌ REVALIDATE_SECRET not configured - skipping ISR`
        );
      } else if (!siteUrl) {
        console.error(
          `[${traceId}] ❌ NEXT_PUBLIC_APP_URL not configured - skipping ISR`
        );
      } else {
        const paths = [
          "/videos", // Video gallery homepage
          ...Array.from(ids).map((id) => `/videos/${id}`), // Individual video pages
        ];

        console.log(
          `[${traceId}] Triggering ISR revalidation for ${paths.length} paths`
        );

        try {
          const revalidateResponse = await fetch(
            `${siteUrl}/api/internal/revalidate`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-revalidate-secret": revalidateSecret,
              },
              body: JSON.stringify({ paths }),
              signal: AbortSignal.timeout(10000), // 10s timeout
            }
          );

          if (revalidateResponse.ok) {
            const result = await revalidateResponse.json();
            console.log(
              `[${traceId}] ✅ ISR revalidation successful:`,
              result.revalidated?.length || 0,
              "paths"
            );
          } else {
            const errorText = await revalidateResponse.text();
            console.error(
              `[${traceId}] ❌ ISR revalidation failed (${revalidateResponse.status}):`,
              errorText
            );
          }
        } catch (revalidateError: any) {
          // Don't fail the webhook if revalidation fails
          console.error(
            `[${traceId}] ⚠️ ISR revalidation error (non-fatal):`,
            revalidateError.message
          );
        }
      }

      // Update stats
      await bumpStats(1, ids.size);
      console.log(`[${traceId}] ✅ WebSub processing complete`);
      console.log(`[${traceId}] ========================================`);
    } catch (error: any) {
      console.error(`[${traceId}] ❌ Failed to process videos:`, error);
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
