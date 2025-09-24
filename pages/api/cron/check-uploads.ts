// pages/api/cron/check-uploads.ts - OPTIMIZED VERSION
// Checks for new videos via RSS and enriches them WITHOUT playlist assignment
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { youtube } from "@/lib/youtube-sync";
import {
  isAuthorized,
  validateEnvironment,
  generateTraceId,
  CronResponse,
  Logger,
  checkRSSFeed,
} from "./_helpers";
import {
  calculateVideoTier,
  getEngagementRate,
} from "@/lib/helpers/video-tier-calculator";

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}

// Helper to determine if video is a Short
function isShortVideo(duration?: string): boolean {
  if (!duration) return false;
  const seconds = parseDuration(duration);
  return seconds > 0 && seconds <= 60;
}

// Optimized enrichVideos - NO playlist assignment
async function enrichVideos(videoIds: string[], logger: Logger): Promise<any> {
  const result = {
    added: 0,
    updated: 0,
    errors: [] as string[],
  };

  if (!videoIds || videoIds.length === 0) {
    return result;
  }

  logger.info(`Enriching ${videoIds.length} videos`);

  try {
    // Single API call for all videos
    const response = await youtube.videos.list({
      part: ["snippet", "contentDetails", "statistics", "status"],
      id: videoIds, // Array is correct for Node.js client
      maxResults: 50,
    });

    const videos = response.data.items || [];

    for (const video of videos) {
      if (!video.id) continue;

      try {
        // Parse video details
        const duration = video.contentDetails?.duration || "PT0S";
        const durationSeconds = parseDuration(duration);
        const isShort = isShortVideo(duration);

        // Parse statistics
        const viewCount = parseInt(video.statistics?.viewCount || "0");
        const likeCount = parseInt(video.statistics?.likeCount || "0");
        const commentCount = parseInt(video.statistics?.commentCount || "0");

        // Calculate tier
        const engagementRate = getEngagementRate(
          viewCount,
          likeCount,
          commentCount
        );
        const tier = calculateVideoTier(
          viewCount,
          video.snippet?.publishedAt || new Date().toISOString(),
          isShort,
          engagementRate
        );

        // Check if video already exists
        const existingVideo = await prisma.videos.findFirst({
          where: { videoId: video.id },
        });

        const videoData = {
          videoId: video.id,
          title: video.snippet?.title || "",
          description: video.snippet?.description || "",
          publishedAt: video.snippet?.publishedAt
            ? new Date(video.snippet.publishedAt)
            : new Date(),
          channelId:
            video.snippet?.channelId || process.env.YOUTUBE_CHANNEL_ID!,
          channelTitle: video.snippet?.channelTitle || "",

          // Search & categorization
          tags: video.snippet?.tags || [],
          categoryId: video.snippet?.categoryId || "25",
          defaultLanguage: video.snippet?.defaultLanguage || "en",

          // IMPORTANT: Empty playlists array - will be filled by playlist sync
          playlists: [],
          relatedVideos: [],

          // Mark as needs playlist check for rapid assignment
          needsPlaylistCheck: true,
          playlistCheckAttempts: 0,
          lastPlaylistCheck: new Date(),

          // Media details
          thumbnails: {
            default: video.snippet?.thumbnails?.default?.url || "",
            medium: video.snippet?.thumbnails?.medium?.url || "",
            high: video.snippet?.thumbnails?.high?.url || "",
            standard: video.snippet?.thumbnails?.standard?.url || "",
            maxres: video.snippet?.thumbnails?.maxres?.url || null,
          },

          contentDetails: {
            duration: duration,
            durationSeconds: durationSeconds,
            dimension: video.contentDetails?.dimension || "2d",
            definition: video.contentDetails?.definition || "hd",
            caption: video.contentDetails?.caption === "true",
            licensedContent: video.contentDetails?.licensedContent || false,
            projection: video.contentDetails?.projection || "rectangular",
          },

          statistics: {
            viewCount: viewCount,
            likeCount: likeCount,
            commentCount: commentCount,
          },

          status: {
            uploadStatus: video.status?.uploadStatus || "processed",
            privacyStatus: video.status?.privacyStatus || "public",
            license: video.status?.license || "youtube",
            embeddable: video.status?.embeddable !== false,
            publicStatsViewable: video.status?.publicStatsViewable !== false,
            madeForKids: video.status?.madeForKids || false,
          },

          // Metadata
          isShort: isShort,
          videoType: isShort ? "short" : "standard",
          popularityScore: Math.floor(engagementRate * 1000),
          tier: tier,
          isActive: true,

          // Sync tracking
          lastSyncedAt: new Date(),
          syncVersion: 1,
        };

        if (existingVideo) {
          // Update existing video
          await prisma.videos.updateMany({
            where: { videoId: video.id },
            data: videoData as any,
          });
          result.updated++;
          logger.debug(`Updated video: ${video.snippet?.title}`);
        } else {
          // Create new video
          await prisma.videos.create({
            data: videoData as any,
          });
          result.added++;
          logger.info(
            `Added new video: ${video.snippet?.title} (needs playlist assignment)`
          );
        }
      } catch (error: any) {
        logger.error(`Failed to process video ${video.id}`, {
          error: error.message,
        });
        result.errors.push(`Video ${video.id}: ${error.message}`);
      }
    }

    // Clear cache after adding/updating videos
    if (result.added > 0 || result.updated > 0) {
      const { clearVideoCache } = await import("../videos/gallery");
      clearVideoCache();
      logger.info("Cleared video gallery cache");
    }
  } catch (error: any) {
    logger.error("Failed to enrich videos", { error: error.message });
    result.errors.push(`Enrichment: ${error.message}`);
  }

  return result;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  const traceId = generateTraceId();
  const startTime = Date.now();
  const logger = new Logger("CHECK-UPLOADS", traceId);

  logger.info("========================================");
  logger.info("Starting uploads check (OPTIMIZED)");

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

  const results: any = {
    uploadsChecked: false,
    newVideos: 0,
    updatedVideos: 0,
    errors: [] as string[],
  };

  try {
    const channelId = process.env.YOUTUBE_CHANNEL_ID!;
    logger.info(`Channel ID: ${channelId}`);

    // Get saved ETags from videoConfig
    const config = await prisma.videoConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    const sync = (config?.sync as any) || {};

    // Check RSS feed
    const uploadsRssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const check = await checkRSSFeed(
      uploadsRssUrl,
      sync.uploadsEtag,
      sync.uploadsLastModified,
      logger
    );

    results.uploadsChecked = true;

    if (check.error) {
      results.errors.push(`RSS check: ${check.error}`);
    }

    if (check.changed && check.videoIds && check.videoIds.length > 0) {
      logger.warn(`Feed changed! Processing ${check.videoIds.length} videos`);

      // Check which videos are actually new
      const existingVideos = await prisma.videos.findMany({
        where: {
          videoId: { in: check.videoIds },
        },
        select: {
          id: true,
          videoId: true,
        },
      });

      const existingVideoIds = new Set(existingVideos.map((v) => v.videoId));
      const trulyNew = check.videoIds.filter((id) => !existingVideoIds.has(id));

      logger.info(
        `Found ${trulyNew.length} new videos, ${existingVideoIds.size} already in database`
      );

      if (trulyNew.length > 0) {
        // Limit to 10 videos per run to control quota
        const toEnrich = trulyNew.slice(0, 10);
        if (trulyNew.length > 10) {
          logger.warn(
            `Limiting enrichment to 10 videos (${trulyNew.length - 10} deferred)`
          );
        }

        const enrichResult = await enrichVideos(toEnrich, logger);
        results.newVideos = enrichResult.added;
        results.updatedVideos = enrichResult.updated;
        results.errors.push(...enrichResult.errors);
      }

      // Update ETags for next check
      if (config) {
        const newSync = {
          ...sync,
          uploadsEtag: check.etag,
          uploadsLastModified: check.lastModified,
          lastUploadsCheck: new Date().toISOString(),
        };

        await prisma.videoConfig.update({
          where: { id: config.id },
          data: { sync: newSync as Prisma.InputJsonValue },
        });

        logger.success("Updated ETags for next check");
      }
    } else {
      logger.info("No changes in RSS feed");
    }

    // Log activity
    await prisma.admin_activity_logs.create({
      data: {
        userId: "cron",
        action: "CHECK_UPLOADS_OPTIMIZED",
        entityType: "system",
        metadata: {
          traceId,
          channelId,
          changed: check.changed,
          newVideos: results.newVideos,
          updatedVideos: results.updatedVideos,
          errorCount: results.errors.length,
        } as Prisma.InputJsonValue,
        ipAddress:
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress ||
          "",
        userAgent: req.headers["user-agent"] || "cron",
      },
    });

    const duration = Date.now() - startTime;
    logger.info("========================================");
    logger.success("Uploads check complete (OPTIMIZED)", {
      duration,
      newVideos: results.newVideos,
      updatedVideos: results.updatedVideos,
      errors: results.errors.length,
      note: "Videos marked for playlist assignment via rapid-assign",
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
    logger.error("Uploads check failed", {
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
