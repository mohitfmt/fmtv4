// pages/api/cron/youtube-stats-refresh.ts - OPTIMIZED VERSION
// Refreshes statistics for last 50 videos in ONE API call
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
import { getEngagementRate } from "@/lib/helpers/video-tier-calculator";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  const traceId = generateTraceId();
  const startTime = Date.now();
  const logger = new Logger("STATS-REFRESH", traceId);

  logger.info("========================================");
  logger.info("Starting video statistics refresh (OPTIMIZED)");

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
    apiCalls: 0,
    errors: [] as string[],
  };

  try {
    // Get last 50 videos sorted by publishedAt
    // This covers ~3 days of content (12-15 videos/day)
    const recentVideos = await prisma.videos.findMany({
      where: {
        isActive: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: {
        id: true,
        videoId: true,
        publishedAt: true,
      },
    });

    if (recentVideos.length === 0) {
      logger.info("No videos to update");
      return res.status(200).json({
        success: true,
        traceId,
        duration: Date.now() - startTime,
        results,
      });
    }

    logger.info(`Updating statistics for ${recentVideos.length} recent videos`);

    // OPTIMIZED: Single API call for all 50 videos
    const videoIds = recentVideos.map((v) => v.videoId);

    try {
      const response = await youtube.videos.list({
        part: ["statistics"],
        id: videoIds, // Array for Node.js client
        maxResults: 50,
      });

      results.apiCalls = 1; // Just ONE API call!

      const videoItems = response.data.items || [];
      logger.debug(
        `Fetched statistics for ${videoItems.length} videos with 1 API call`
      );

      // Update each video in database
      for (const videoData of videoItems) {
        if (!videoData.id) continue;

        const viewCount = parseInt(videoData.statistics?.viewCount || "0");
        const likeCount = parseInt(videoData.statistics?.likeCount || "0");
        const commentCount = parseInt(
          videoData.statistics?.commentCount || "0"
        );

        // Find the original video to get publishedAt for tier calculation
        const originalVideo = recentVideos.find(
          (v) => v.videoId === videoData.id
        );
        if (!originalVideo) continue;

        // Calculate engagement rate and tier
        const engagementRate = getEngagementRate(
          viewCount,
          likeCount,
          commentCount
        );

        // Simple tier calculation based on age and views
        const ageInHours =
          (Date.now() - originalVideo.publishedAt.getTime()) / (1000 * 60 * 60);
        let tier = "standard";

        if (ageInHours < 24) {
          // For videos < 24 hours old
          if (viewCount > 10000) tier = "hot";
          else if (viewCount > 5000) tier = "trending";
          else if (viewCount > 1000) tier = "A";
        } else if (ageInHours < 72) {
          // For videos 1-3 days old
          if (viewCount > 50000) tier = "hot";
          else if (viewCount > 20000) tier = "trending";
          else if (viewCount > 5000) tier = "A";
        } else {
          // Older videos
          if (viewCount > 100000) tier = "hot";
          else if (viewCount > 50000) tier = "trending";
          else if (viewCount > 10000) tier = "A";
        }

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
              popularityScore: Math.floor(engagementRate * 1000),
              lastSyncedAt: new Date(),
            },
          });
          results.videosUpdated++;
        } catch (updateError: any) {
          logger.error(`Failed to update video ${videoData.id}`, {
            error: updateError.message,
          });
          results.errors.push(`Update ${videoData.id}: ${updateError.message}`);
        }
      }

      // Handle videos that weren't returned (might be deleted/private)
      const returnedIds = new Set(videoItems.map((v) => v.id));
      const missingVideos = recentVideos.filter(
        (v) => !returnedIds.has(v.videoId)
      );

      if (missingVideos.length > 0) {
        logger.warn(
          `${missingVideos.length} videos not found in API response, marking as inactive`
        );
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
      logger.error(`YouTube API error`, {
        error: apiError.message,
      });
      results.errors.push(`API: ${apiError.message}`);
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
        action: "STATS_REFRESH_OPTIMIZED",
        entityType: "system",
        metadata: {
          traceId,
          results,
          videosChecked: recentVideos.length,
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress ||
          "",
        userAgent: req.headers["user-agent"] || "cron",
      },
    });

    const duration = Date.now() - startTime;
    logger.success("Statistics refresh complete (OPTIMIZED)", {
      duration,
      videosUpdated: results.videosUpdated,
      apiCalls: results.apiCalls,
      quotaSaved: "Used only 1 API call for 50 videos!",
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
