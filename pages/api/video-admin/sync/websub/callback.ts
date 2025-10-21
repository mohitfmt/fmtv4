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
      // STEP 3: Determine affected pages & Trigger ISR + CDN purge
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
        try {
          // Fetch video config to determine affected pages
          const videoConfig = await prisma.videoConfig.findFirst({
            select: {
              homepagePlaylist: true,
              heroPlaylist: true,
              shortsPlaylist: true,
              displayedPlaylists: true,
            },
          });

          const paths = new Set<string>();
          const urlsToPurge: string[] = [];

          // Always revalidate video hub
          paths.add("/videos");
          urlsToPurge.push(
            `${siteUrl}/videos`,
            `${siteUrl}/api/videos/gallery`
          );

          // Add individual video pages
          Array.from(ids).forEach((id) => {
            paths.add(`/videos/${id}`);
            urlsToPurge.push(`${siteUrl}/videos/${id}`);
          });

          // For each video, determine which playlists/pages it affects
          for (const videoId of ids) {
            const video = await prisma.videos.findFirst({
              where: { videoId },
              select: { playlists: true, isShort: true },
            });

            if (!video) {
              console.warn(
                `[${traceId}] Video ${videoId} not found in database`
              );
              continue;
            }

            // Check if video is in homepage playlist
            if (
              videoConfig?.homepagePlaylist &&
              video.playlists?.includes(videoConfig.homepagePlaylist)
            ) {
              paths.add("/");
              urlsToPurge.push(`${siteUrl}/`, `${siteUrl}/api/homepage`);
              console.log(
                `[${traceId}] Video ${videoId} in homepage playlist - will revalidate /`
              );
            }

            // Check if video is in hero playlist
            if (
              videoConfig?.heroPlaylist &&
              video.playlists?.includes(videoConfig.heroPlaylist)
            ) {
              paths.add("/videos");
              console.log(
                `[${traceId}] Video ${videoId} in hero playlist - already revalidating /videos`
              );
            }

            // Check if video is a short or in shorts playlist
            if (
              video.isShort ||
              (videoConfig?.shortsPlaylist &&
                video.playlists?.includes(videoConfig.shortsPlaylist))
            ) {
              paths.add("/videos/shorts");
              urlsToPurge.push(`${siteUrl}/videos/shorts`);
              console.log(
                `[${traceId}] Video ${videoId} is a short - will revalidate /videos/shorts`
              );
            }

            // Check if video is in any displayed playlists
            const displayedPlaylists =
              (videoConfig?.displayedPlaylists as any[]) || [];
            for (const playlistConfig of displayedPlaylists) {
              if (video.playlists?.includes(playlistConfig.playlistId)) {
                paths.add("/videos"); // VideoHub shows these
                console.log(
                  `[${traceId}] Video ${videoId} in displayed playlist ${playlistConfig.playlistId}`
                );
              }
            }

            // 🆕 Add specific playlist pages where this video appears
            for (const playlistId of video.playlists || []) {
              const playlist = await prisma.playlist.findFirst({
                where: { playlistId },
                select: { slug: true },
              });

              if (playlist?.slug) {
                const playlistPath = `/videos/playlist/${playlist.slug}`;
                paths.add(playlistPath);
                urlsToPurge.push(`${siteUrl}${playlistPath}`);
                console.log(
                  `[${traceId}] Video ${videoId} in playlist ${playlist.slug} - will revalidate playlist page`
                );
              }
            }
          }

          const pathsArray = Array.from(paths);
          console.log(
            `[${traceId}] Triggering ISR revalidation for ${pathsArray.length} paths:`,
            pathsArray.slice(0, 10),
            pathsArray.length > 10
              ? `... and ${pathsArray.length - 10} more`
              : ""
          );

          // STEP 3A: Trigger ISR revalidation
          const revalidateResponse = await fetch(
            `${siteUrl}/api/internal/revalidate`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-revalidate-secret": revalidateSecret,
              },
              body: JSON.stringify({ paths: pathsArray }),
              signal: AbortSignal.timeout(15000), // 15s timeout for multiple paths
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

          // STEP 3B: Immediate Cloudflare CDN purge
          const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
          const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

          if (CF_ZONE_ID && CF_API_TOKEN && urlsToPurge.length > 0) {
            console.log(
              `[${traceId}] Purging ${urlsToPurge.length} URLs from Cloudflare`
            );

            // Cloudflare has a limit of 30 URLs per request, so batch them
            const BATCH_SIZE = 30;
            // Process batches sequentially (wait for each to complete)
            for (let i = 0; i < urlsToPurge.length; i += BATCH_SIZE) {
              const batch = urlsToPurge.slice(i, i + BATCH_SIZE);

              // BLOCKING: Wait for each batch to complete
              try {
                const cfResponse = await fetch(
                  `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${CF_API_TOKEN}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ files: batch }),
                  }
                );

                const cfData = await cfResponse.json();

                if (cfData.success) {
                  console.log(
                    `[${traceId}] ✅ Cloudflare batch ${Math.floor(i / BATCH_SIZE) + 1} purged (${batch.length} URLs)`
                  );
                } else {
                  console.error(
                    `[${traceId}] ❌ Cloudflare batch purge failed:`,
                    cfData.errors
                  );
                }
              } catch (cfError: any) {
                console.error(
                  `[${traceId}] ⚠️ Cloudflare purge error (non-fatal):`,
                  cfError.message
                );
              }

              // Small delay between batches to avoid rate limiting
              if (i + BATCH_SIZE < urlsToPurge.length) {
                await new Promise((resolve) => setTimeout(resolve, 100));
              }
            }
          } else if (urlsToPurge.length > 0) {
            console.warn(
              `[${traceId}] ⚠️ Cloudflare credentials not configured - CDN purge skipped`
            );
          }
        } catch (revalidateError: any) {
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
