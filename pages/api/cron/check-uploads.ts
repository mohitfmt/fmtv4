// pages/api/cron/check-uploads-updated.ts
// This is the UPDATED version with tier calculation
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, Prisma } from "@prisma/client";
import { google } from "googleapis";
import {
  isAuthorized,
  Logger,
  withBackoff,
  checkRSSFeed,
  createPlaceholderVideo,
  generateTraceId,
  CronResponse,
  validateEnvironment,
  findVideoByVideoId,
} from "./_helpers";
import {
  calculateVideoTier,
  getEngagementRate,
} from "@/lib/helpers/video-tier-calculator";

const prisma = new PrismaClient();
const youtube = google.youtube("v3");

async function enrichVideos(
  videoIds: string[],
  logger: Logger
): Promise<{ added: number; updated: number; errors: string[] }> {
  const stats = { added: 0, updated: 0, errors: [] as string[] };

  if (!process.env.YOUTUBE_API_KEY) {
    logger.error("No YouTube API key configured");
    stats.errors.push("Missing API key");
    return stats;
  }

  logger.info(`Enriching ${videoIds.length} videos with YouTube API data`);

  try {
    // Fetch video details with backoff
    const response = await withBackoff(
      () =>
        youtube.videos.list({
          part: ["snippet", "statistics", "contentDetails", "status"],
          id: videoIds,
          key: process.env.YOUTUBE_API_KEY,
          maxResults: 50,
        }),
      { maxRetries: 3, initialDelayMs: 500 },
      logger
    );

    const videos = response.data.items || [];
    const fetchedIds = new Set(videos.map((v) => v.id!));

    // Handle videos that weren't returned (private/deleted)
    const missingIds = videoIds.filter((id) => !fetchedIds.has(id));
    for (const missingId of missingIds) {
      logger.warn(`Video not returned by API (private/deleted?): ${missingId}`);

      const placeholder = createPlaceholderVideo(missingId);
      const existing = await findVideoByVideoId(prisma, missingId);

      if (!existing) {
        await prisma.videos.create({ data: placeholder });
        stats.added++;
      }
    }

    // Process fetched videos
    for (const video of videos) {
      try {
        // Parse duration to determine if it's a Short
        const duration = video.contentDetails?.duration || "PT0S";
        const durationSeconds = parseDuration(duration);
        const isShort = isShortVideo(duration);

        // Get statistics
        const viewCount = parseInt(video.statistics?.viewCount || "0");
        const likeCount = parseInt(video.statistics?.likeCount || "0");
        const commentCount = parseInt(video.statistics?.commentCount || "0");

        // Calculate engagement rate
        const engagementRate = getEngagementRate(
          viewCount,
          likeCount,
          commentCount
        );

        // Calculate tier - NEW!
        const tier = calculateVideoTier(
          viewCount,
          video.snippet?.publishedAt || new Date(),
          isShort,
          engagementRate
        );

        // Get playlist associations for this video
        const playlists = await getVideoPlaylists(video.id!, logger);

        const videoData = {
          videoId: video.id!,
          title: video.snippet?.title || "Untitled",
          description: video.snippet?.description || "",
          publishedAt: video.snippet?.publishedAt
            ? new Date(video.snippet.publishedAt)
            : new Date(),
          channelId:
            video.snippet?.channelId || process.env.YOUTUBE_CHANNEL_ID!,
          channelTitle: video.snippet?.channelTitle || "",
          tags: video.snippet?.tags || [],
          categoryId: video.snippet?.categoryId || "0",
          defaultLanguage: video.snippet?.defaultLanguage || "en",

          // Properly structured nested objects
          thumbnails: {
            default: video.snippet?.thumbnails?.default?.url || "",
            medium: video.snippet?.thumbnails?.medium?.url || "",
            high: video.snippet?.thumbnails?.high?.url || "",
            standard: video.snippet?.thumbnails?.standard?.url || "",
            maxres: video.snippet?.thumbnails?.maxres?.url || null,
          },

          statistics: {
            viewCount,
            likeCount,
            commentCount,
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

          status: {
            uploadStatus: video.status?.uploadStatus || "processed",
            privacyStatus: video.status?.privacyStatus || "public",
            license: video.status?.license || "youtube",
            embeddable: video.status?.embeddable !== false,
            publicStatsViewable: video.status?.publicStatsViewable !== false,
            madeForKids: video.status?.madeForKids || false,
          },

          // Additional fields
          playlists: playlists,
          relatedVideos: [],
          isShort: isShort,
          videoType: isShort ? "short" : "standard",
          tier: tier, // Dynamic tier calculation
          popularityScore: Math.round(engagementRate * 100), // Store engagement as popularity
          isActive: true,
          syncVersion: 1,
        };

        // Check if video exists
        const existing = await findVideoByVideoId(prisma, video.id!);

        if (existing) {
          // Update existing video - increment syncVersion
          await prisma.videos.update({
            where: { id: existing.id },
            data: {
              ...videoData,
              syncVersion: existing.syncVersion + 1,
              updatedAt: new Date(),
            },
          });
          stats.updated++;
          logger.debug(
            `Updated video (tier: ${tier}): ${video.snippet?.title?.substring(0, 50)}...`
          );
        } else {
          // Create new video
          await prisma.videos.create({
            data: videoData,
          });
          stats.added++;
          logger.success(
            `Added video (tier: ${tier}): ${video.snippet?.title?.substring(0, 50)}...`
          );
        }
      } catch (error: any) {
        logger.error(`Failed to upsert video`, {
          videoId: video.id,
          error: error.message,
        });
        stats.errors.push(`Video ${video.id}: ${error.message}`);
      }
    }

    logger.success(`Enrichment complete`, { ...stats });
    return stats;
  } catch (error: any) {
    logger.error(`Failed to enrich videos`, { error: error.message });
    stats.errors.push(`Batch enrichment: ${error.message}`);
    return stats;
  }
}

// Helper to get playlists this video belongs to
async function getVideoPlaylists(
  videoId: string,
  logger: Logger
): Promise<string[]> {
  try {
    const playlistItems = await prisma.playlistItems.findMany({
      where: {
        videoId: videoId,
        removedAt: null,
      },
      select: { playlistId: true },
    });

    return playlistItems.map((item) => item.playlistId);
  } catch (error) {
    logger.warn(`Could not fetch playlists for video ${videoId}`);
    return [];
  }
}

// Helper function to parse YouTube duration
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  const traceId = generateTraceId();
  const startTime = Date.now();
  const logger = new Logger("CHECK-UPLOADS", traceId);

  logger.info("========================================");
  logger.info("Starting uploads check");

  // Validate auth
  if (!isAuthorized(req)) {
    logger.error("Unauthorized request", {
      hasQueryKey: !!req.query.key,
      hasHeaderKey: !!req.headers["x-cron-key"],
    });
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
    logger.debug(`Current sync state`, {
      hasEtag: !!sync.uploadsEtag,
      hasLastModified: !!sync.uploadsLastModified,
    });

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
        action: "CHECK_UPLOADS",
        entityType: "system",
        metadata: {
          traceId,
          channelId,
          changed: check.changed,
          newVideos: results.newVideos,
          updatedVideos: results.updatedVideos,
          errorCount: results.errors.length,
          duration: Date.now() - startTime,
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
    logger.success(`Uploads check complete`, {
      duration,
      newVideos: results.newVideos,
      updatedVideos: results.updatedVideos,
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
    logger.error("Uploads check failed", { error: error.message, duration });

    return res.status(500).json({
      success: false,
      traceId,
      duration,
      errors: [error.message],
    });
  }
}
