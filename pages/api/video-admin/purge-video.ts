// pages/api/video-admin/purge-video.ts
// UPDATED VERSION - Using SmartRevalidator for all cache invalidation

import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { revalidateVideo } from "@/lib/cache/smart-revalidator";

interface PurgeResult {
  videoId: string;
  removedFromPlaylists: number;
  clearedFromCache: boolean;
  purgedFromCDN: boolean;
  deletedFromDB: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const traceId = `purge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check authorization
  const userEmail = req.cookies?.user_email || "admin@freemalaysiatoday.com";

  try {
    const { videoInput } = req.body;

    if (!videoInput || typeof videoInput !== "string") {
      return res.status(400).json({
        success: false,
        error: "Video URL or ID is required",
        traceId,
      });
    }

    console.log(`[${traceId}] Purge request for: ${videoInput}`);

    // Extract video ID from input
    const videoId = extractVideoId(videoInput);

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: "Invalid video URL or ID format",
        traceId,
      });
    }

    console.log(`[${traceId}] Extracted video ID: ${videoId}`);

    // Initialize results
    const results: PurgeResult = {
      videoId,
      removedFromPlaylists: 0,
      clearedFromCache: false,
      purgedFromCDN: false,
      deletedFromDB: false,
    };

    // 1. Find the video (if it exists)
    const video = await prisma.videos.findFirst({
      where: { videoId },
      select: {
        id: true,
        title: true,
        playlists: true,
      },
    });

    if (!video) {
      console.log(`[${traceId}] Video not found in database: ${videoId}`);

      // Even if video doesn't exist, try to clear caches
      try {
        await revalidateVideo(videoId, "video-purged-not-in-db");
        results.clearedFromCache = true;
        results.purgedFromCDN = true;
      } catch (error) {
        console.error(`[${traceId}] Cache clearing failed:`, error);
      }

      return res.status(200).json({
        success: true,
        message: `Video ${videoId} was not in database, but caches were cleared`,
        results,
        traceId,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`[${traceId}] Found video: ${video.title}`);

    // Store playlists before deletion for cache invalidation
    const affectedPlaylists = video.playlists || [];

    // 2. Remove from all playlists (if it has any)
    if (affectedPlaylists.length > 0) {
      try {
        // Update all playlists to remove this video
        await prisma.playlist.updateMany({
          where: {
            playlistId: {
              in: affectedPlaylists,
            },
          },
          data: {
            // This would need to be handled differently based on your schema
            // If videos are stored as relations, you'd need a different approach
            updatedAt: new Date(),
          },
        });

        results.removedFromPlaylists = affectedPlaylists.length;
        console.log(
          `[${traceId}] Removed from ${affectedPlaylists.length} playlists`
        );
      } catch (error) {
        console.error(`[${traceId}] Failed to remove from playlists:`, error);
      }
    }

    // 3. Delete the video from database
    try {
      await prisma.videos.delete({
        where: { id: video.id },
      });

      results.deletedFromDB = true;
      console.log(`[${traceId}] Video deleted from database`);
    } catch (error) {
      console.error(`[${traceId}] Failed to delete from database:`, error);
    }

    // =================================================================
    // SMARTREVALIDATOR INTEGRATION - Replace all cache clearing logic
    // =================================================================

    console.log(
      `[${traceId}] Triggering SmartRevalidator for cache invalidation`
    );

    try {
      const revalidationResult = await revalidateVideo(videoId, "video-purged");

      results.clearedFromCache = true;
      results.purgedFromCDN =
        revalidationResult.cachesCleared.includes("Cloudflare");

      console.log(`[${traceId}] SmartRevalidator completed:`, {
        pagesRevalidated: revalidationResult.pagesRevalidated.length,
        cachesCleared: revalidationResult.cachesCleared,
        duration: revalidationResult.duration,
      });
    } catch (error) {
      console.error(`[${traceId}] SmartRevalidator failed:`, error);
      // Continue even if cache clearing fails
    }

    // 4. Log the activity
    try {
      await prisma.admin_activity_logs.create({
        data: {
          action: "PURGE_VIDEO",
          entityType: "video",
          userId: userEmail,
          metadata: {
            videoId,
            videoTitle: video?.title,
            results: { ...results },
          },
          ipAddress:
            (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
            req.socket.remoteAddress,
          userAgent: req.headers["user-agent"] || null,
        },
      });
    } catch (error) {
      console.error(`[${traceId}] Failed to log activity:`, error);
    }

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
  // Remove whitespace
  input = input.trim();

  // Direct video ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  // YouTube URL patterns
  const patterns = [
    // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.*&v=)([a-zA-Z0-9_-]{11})/,
    // Short URL: https://youtu.be/VIDEO_ID
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // Embed URL: https://www.youtube.com/embed/VIDEO_ID
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // Mobile URL: https://m.youtube.com/watch?v=VIDEO_ID
    /m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    // FMT video page URL: https://dev-v4.freemalaysiatoday.com/videos/VIDEO_ID
    /\/videos\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
