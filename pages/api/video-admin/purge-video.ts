// pages/api/video-admin/purge-video.ts
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import {
  playlistCache,
  videoDataCache,
  galleryCache,
} from "@/lib/cache/video-cache-registry";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = (req as any).traceId;
  const userEmail = req.cookies?.user_email || "admin@freemalaysiatoday.com";
  const { videoInput } = req.body;

  if (!videoInput) {
    return res.status(400).json({
      success: false,
      error: "Please provide a video URL or video ID",
      traceId,
    });
  }

  try {
    // Extract video ID from input (could be URL or ID)
    const videoId = extractVideoId(videoInput);

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: "Invalid video URL or ID format",
        traceId,
      });
    }

    console.log(`[${traceId}] Starting purge for video: ${videoId}`);

    const results = {
      videoId,
      removedFromPlaylists: 0,
      clearedFromCache: false,
      purgedFromCDN: false,
      deletedFromDB: false,
    };

    // Store playlist info before deletion for ISR revalidation
    let playlistSlugs: string[] = [];

    // 1. Find and remove video from database
    const video = await prisma.videos.findFirst({
      where: { videoId },
      select: {
        id: true,
        videoId: true,
        title: true,
        playlists: true,
      },
    });

    if (video) {
      // Get playlist slugs BEFORE deletion
      if (video.playlists && video.playlists.length > 0) {
        const playlists = await prisma.playlist.findMany({
          where: { playlistId: { in: video.playlists } },
          select: { slug: true },
        });
        playlistSlugs = playlists
          .map((p) => p.slug)
          .filter(Boolean) as string[];

        // Remove from PlaylistItems collection
        await prisma.playlistItems.deleteMany({
          where: { videoId },
        });

        // Update playlist counts
        for (const playlistId of video.playlists) {
          const count = await prisma.videos.count({
            where: {
              playlists: { has: playlistId },
              videoId: { not: videoId }, // Exclude the video being deleted
            },
          });

          await prisma.playlist.update({
            where: { playlistId },
            data: {
              itemCount: count,
              updatedAt: new Date(),
            },
          });

          results.removedFromPlaylists++;
        }
      }

      // Delete the video
      await prisma.videos.delete({
        where: { id: video.id },
      });

      results.deletedFromDB = true;
      console.log(`[${traceId}] Video removed from database`);
    } else {
      console.log(
        `[${traceId}] Video not found in database, continuing with cache clear`
      );
    }

    // 2. Clear LRU caches
    try {
      playlistCache.clear();
      videoDataCache.clear();
      galleryCache.clear();
      results.clearedFromCache = true;
      console.log(`[${traceId}] LRU caches cleared`);
    } catch (error) {
      console.error(`[${traceId}] Failed to clear LRU cache:`, error);
    }

    // 3. Purge from CDN (Cloudflare)
    try {
      await purgeVideoFromCDN(videoId);
      results.purgedFromCDN = true;
      console.log(`[${traceId}] Video purged from CDN`);
    } catch (error) {
      console.error(`[${traceId}] Failed to purge from CDN:`, error);
    }

    // 3.5 🆕 ISR REVALIDATION: Rebuild pages that showed this video
    try {
      console.log(`[${traceId}] Triggering ISR revalidation...`);

      const pagesToRevalidate = new Set<string>();

      // Main video hub page (always rebuild)
      pagesToRevalidate.add("/videos");

      // Individual video page
      pagesToRevalidate.add(`/videos/${videoId}`);

      // All playlist pages this video was in
      for (const slug of playlistSlugs) {
        pagesToRevalidate.add(`/videos/playlist/${slug}`);
      }

      if (pagesToRevalidate.size > 0) {
        const pathsArray = Array.from(pagesToRevalidate);
        console.log(
          `[${traceId}] Revalidating ${pathsArray.length} pages: ${pathsArray.join(", ")}`
        );

        // Call internal revalidation API
        const revalidateUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/internal/revalidate`;
        const revalidateSecret =
          process.env.REVALIDATE_SECRET || "ia389oidns98odisd2309qdoi2930";

        if (!revalidateSecret) {
          console.warn(
            `[${traceId}] REVALIDATE_SECRET not set - skipping ISR revalidation`
          );
        } else {
          const revalidateResponse = await fetch(revalidateUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-revalidate-secret": revalidateSecret,
            },
            body: JSON.stringify({
              paths: pathsArray,
              source: "purge-video",
              traceId,
            }),
          });

          if (!revalidateResponse.ok) {
            const errorText = await revalidateResponse.text();
            console.error(`[${traceId}] ISR revalidation failed: ${errorText}`);
          } else {
            const revalidateResult = await revalidateResponse.json();
            console.log(
              `[${traceId}] ✅ ISR revalidation completed:`,
              revalidateResult
            );
          }
        }
      }
    } catch (error) {
      console.error(`[${traceId}] ISR revalidation error:`, error);
      // Don't fail the whole operation if revalidation fails
    }

    // 4. Log the activity
    await prisma.admin_activity_logs.create({
      data: {
        action: "PURGE_VIDEO",
        entityType: "video",
        userId: userEmail,
        metadata: {
          videoId,
          videoTitle: video?.title,
          results,
          revalidatedPages: Array.from(
            new Set([
              "/videos",
              `/videos/${videoId}`,
              ...playlistSlugs.map((slug) => `/videos/playlist/${slug}`),
            ])
          ),
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          req.socket.remoteAddress,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Video ${videoId} has been purged successfully`,
      results,
      traceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to purge video:`, error);
    return res.status(500).json({
      success: false,
      error: "Failed to purge video",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
    });
  }
}

// Extract video ID from various input formats
function extractVideoId(input: string): string | null {
  input = input.trim();

  // Direct video ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  // YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Purge video from Cloudflare CDN
async function purgeVideoFromCDN(videoId: string): Promise<void> {
  const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
  const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!CF_ZONE_ID || !CF_API_TOKEN) {
    console.warn("Cloudflare credentials not configured, skipping CDN purge");
    return;
  }

  // URLs that might cache video data
  const urlsToPurge = [
    `${SITE_URL}/api/videos/gallery`,
    `${SITE_URL}/api/videos/playlists`,
    `${SITE_URL}/api/videos/${videoId}`,
    `${SITE_URL}/videos`,
    `${SITE_URL}/videos/*`,
  ];

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: urlsToPurge,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API error: ${error}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error("Cloudflare purge failed");
    }
  } catch (error) {
    console.error("CDN purge failed:", error);
    await purgeByTags(videoId);
  }
}

// Fallback: Purge by cache tags
async function purgeByTags(videoId: string): Promise<void> {
  const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
  const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

  if (!CF_ZONE_ID || !CF_API_TOKEN) {
    return;
  }

  try {
    await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tags: ["videos", "video-gallery", videoId],
        }),
      }
    );
  } catch (error) {
    console.error("Tag-based purge failed:", error);
  }
}

export default handler;
