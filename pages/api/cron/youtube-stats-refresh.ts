// pages/api/cron/youtube-stats-refresh.ts
// Refreshes statistics for recent and popular videos every 5 minutes
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { youtube } from "@/lib/youtube-sync";
import {
  isAuthorized,
  validateEnvironment,
  generateTraceId,
  CronResponse,
  Logger,
} from "./_helpers";
import {
  calculateVideoTier,
  getEngagementRate,
} from "@/lib/helpers/video-tier-calculator";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  const traceId = generateTraceId();
  const startTime = Date.now();
  const logger = new Logger("STATS-REFRESH", traceId);

  logger.info("========================================");
  logger.info("Starting video statistics refresh");

  // Validate auth
  if (!isAuthorized(req)) {
    logger.error("Unauthorized request");
    return res.status(401).json({
      success: false,
      traceId,
      duration: Date.now() - startTime,
      errors: ["Unauthorized - use x-cron-key header"],
    });
  }

  // Validate environment
  const missingEnv = validateEnvironment();
  if (missingEnv.length > 0) {
    logger.error("Missing environment variables", { missing: missingEnv });
    return res.status(500).json({
      success: false,
      traceId,
      duration: Date.now() - startTime,
      errors: [`Missing env vars: ${missingEnv.join(", ")}`],
    });
  }

  const results = {
    videosUpdated: 0,
    recentVideos: 0,
    popularVideos: 0,
    errors: [] as string[],
  };

  try {
    // Get videos that need statistics updates
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cutoff1h = new Date(Date.now() - 60 * 60 * 1000);

    // Priority 1: Videos published in last 24 hours
    const recentVideos = await prisma.videos.findMany({
      where: {
        publishedAt: { gte: cutoff24h },
        isActive: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 20,
      select: {
        id: true,
        videoId: true,
        publishedAt: true,
      },
    });

    results.recentVideos = recentVideos.length;

    // Priority 2: Popular videos not updated recently
    const popularVideos = await prisma.videos.findMany({
      where: {
        tier: { in: ["hot", "trending", "A"] },
        isActive: true,
        OR: [
          { lastSyncedAt: { lte: cutoff1h } },
          { lastSyncedAt: null }, // Include never-synced videos
        ],
      },
      orderBy: [
        { popularityScore: "desc" }, // Better ordering
        { publishedAt: "desc" },
      ],
      take: 10,
      select: {
        id: true,
        videoId: true,
        publishedAt: true,
      },
    });

    results.popularVideos = popularVideos.length;

    // Combine and deduplicate video IDs
    const videoMap = new Map<string, any>();
    [...recentVideos, ...popularVideos].forEach((video) => {
      videoMap.set(video.videoId, video);
    });

    const videosToUpdate = Array.from(videoMap.values());

    if (videosToUpdate.length === 0) {
      logger.info("No videos need statistics update");
      return res.status(200).json({
        success: true,
        traceId,
        duration: Date.now() - startTime,
        results,
      });
    }

    logger.info(`Updating statistics for ${videosToUpdate.length} videos`, {
      recentCount: results.recentVideos,
      popularCount: results.popularVideos,
    });

    // Batch fetch statistics from YouTube API (max 50 per request)
    for (let i = 0; i < videosToUpdate.length; i += 50) {
      const batch = videosToUpdate.slice(i, i + 50);
      const videoIds = batch.map((v) => v.videoId);

      try {
        const response = await youtube.videos.list({
          part: ["statistics", "contentDetails"],
          id: videoIds, // FIX: Must be comma-separated string
          maxResults: 50,
        });

        const videoItems = response.data.items || [];
        logger.debug(`Fetched statistics for ${videoItems.length} videos`);

        // Update each video in database
        for (const videoData of videoItems) {
          if (!videoData.id) continue;

          const viewCount = parseInt(videoData.statistics?.viewCount || "0");
          const likeCount = parseInt(videoData.statistics?.likeCount || "0");
          const commentCount = parseInt(
            videoData.statistics?.commentCount || "0"
          );

          // Find the original video to get publishedAt for tier calculation
          const originalVideo = videosToUpdate.find(
            (v) => v.videoId === videoData.id
          );
          if (!originalVideo) continue;

          // Calculate engagement rate and tier
          const engagementRate = getEngagementRate(
            viewCount,
            likeCount,
            commentCount
          );
          const isShort = videoData.contentDetails?.duration
            ? parseDuration(videoData.contentDetails.duration) <= 60
            : false;

          const tier = calculateVideoTier(
            viewCount,
            originalVideo.publishedAt.toISOString(),
            isShort,
            engagementRate
          );

          try {
            await prisma.videos.updateMany({
              where: { videoId: videoData.id },
              data: {
                statistics: {
                  viewCount,
                  likeCount,
                  commentCount,
                },
                tier,
                popularityScore: Math.floor(engagementRate * 1000), // Store as integer
                lastSyncedAt: new Date(),
              },
            });
            results.videosUpdated++;
          } catch (updateError: any) {
            logger.error(`Failed to update video ${videoData.id}`, {
              error: updateError.message,
            });
            results.errors.push(
              `Update ${videoData.id}: ${updateError.message}`
            );
          }
        }

        // Handle videos that weren't returned (might be deleted/private)
        const returnedIds = new Set(videoItems.map((v: any) => v.id));
        const missingVideos = batch.filter((v) => !returnedIds.has(v.videoId));

        if (missingVideos.length > 0) {
          logger.warn(
            `${missingVideos.length} videos not found in API response`
          );
          // Mark these videos as inactive
          for (const video of missingVideos) {
            await prisma.videos.updateMany({
              where: { videoId: video.videoId },
              data: {
                isActive: false,
                tier: "D",
                lastSyncedAt: new Date(),
              },
            });
          }
        }
      } catch (apiError: any) {
        logger.error(`YouTube API error for batch`, {
          error: apiError.message,
          batch: batch.map((v) => v.videoId),
        });
        results.errors.push(`API batch: ${apiError.message}`);
      }

      // Add small delay between batches to avoid rate limiting
      if (i + 50 < videosToUpdate.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Clear cache if we updated videos
    if (results.videosUpdated > 0) {
      const { clearVideoCache } = await import("../videos/gallery");
      clearVideoCache();
      logger.info("Cleared video gallery cache");
    }

    // Log activity
    await prisma.admin_activity_logs.create({
      data: {
        userId: "cron",
        action: "STATS_REFRESH",
        entityType: "system",
        metadata: {
          traceId,
          results,
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress ||
          "",
        userAgent: req.headers["user-agent"] || "cron",
      },
    });

    const duration = Date.now() - startTime;
    logger.success("Statistics refresh complete", {
      duration,
      videosUpdated: results.videosUpdated,
      errors: results.errors.length,
    });

    return res.status(200).json({
      success: true,
      traceId,
      duration,
      partial: results.errors.length > 0,
      results,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error("Statistics refresh failed", {
      error: error.message,
      duration,
    });

    return res.status(500).json({
      success: false,
      traceId,
      duration,
      errors: [error.message],
    });
  }
}

// Helper function to parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}
