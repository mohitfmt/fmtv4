// pages/api/cron/check-uploads.ts - FIXED VERSION
// REMOVED the fields that don't exist in your schema

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
function isShortVideo(duration?: string | number): boolean {
  if (!duration) return false;
  const seconds =
    typeof duration === "string" ? parseDuration(duration) : duration;
  return seconds > 0 && seconds <= 60;
}

// Helper to find video by videoId
async function findVideoByVideoId(prisma: any, videoId: string) {
  return await prisma.videos.findFirst({
    where: { videoId },
    select: { id: true },
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  const traceId = generateTraceId();
  const startTime = Date.now();
  const logger = new Logger("CHECK-UPLOADS", traceId);

  logger.info("========================================");
  logger.info("Starting uploads check via RSS");

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
    uploadsChecked: false,
    newVideos: 0,
    updatedVideos: 0,
    errors: [] as string[],
  };

  try {
    const channelId = process.env.YOUTUBE_CHANNEL_ID!;

    // Get uploads playlist ID (it's UU + channel ID suffix)
    const uploadsPlaylistId = "UU" + channelId.substring(2);
    logger.info(`Checking uploads playlist: ${uploadsPlaylistId}`);

    // Fetch recent videos from the uploads playlist
    const response = await youtube.playlistItems.list({
      part: ["snippet"],
      playlistId: uploadsPlaylistId,
      maxResults: 20, // Check last 20 videos
    });

    const playlistItems = response.data.items || [];
    logger.info(
      `Found ${playlistItems.length} recent videos in uploads playlist`
    );

    if (playlistItems.length === 0) {
      return res.json({
        success: true,
        traceId,
        duration: Date.now() - startTime,
        results,
      });
    }

    // Extract video IDs
    const videoIds = playlistItems
      .map((item) => item.snippet?.resourceId?.videoId)
      .filter(Boolean) as string[];

    // Fetch full video details
    const videosResponse = await youtube.videos.list({
      part: ["snippet", "contentDetails", "statistics", "status"],
      id: videoIds,
    });

    const videos = videosResponse.data.items || [];
    results.uploadsChecked = true;

    // Process each video
    for (const video of videos) {
      try {
        if (!video.id || !video.snippet) continue;

        // Check if video exists
        const existing = await findVideoByVideoId(prisma, video.id);

        // Parse video data
        const duration = video.contentDetails?.duration || "PT0S";
        const durationSeconds = parseDuration(duration);
        const isShort = isShortVideo(durationSeconds);

        const viewCount = parseInt(video.statistics?.viewCount || "0");
        const likeCount = parseInt(video.statistics?.likeCount || "0");
        const commentCount = parseInt(video.statistics?.commentCount || "0");

        if (existing) {
          // Update existing video
          await prisma.videos.update({
            where: { id: existing.id },
            data: {
              title: video.snippet.title || "",
              description: video.snippet.description || "",
              tags: video.snippet.tags || [],

              thumbnails: {
                default: video.snippet.thumbnails?.default?.url || "",
                medium: video.snippet.thumbnails?.medium?.url || "",
                high: video.snippet.thumbnails?.high?.url || "",
                standard: video.snippet.thumbnails?.standard?.url || "",
                maxres: video.snippet.thumbnails?.maxres?.url || null,
              },

              statistics: {
                viewCount,
                likeCount,
                commentCount,
              },

              status: {
                uploadStatus: video.status?.uploadStatus || "processed",
                privacyStatus: video.status?.privacyStatus || "public",
                license: video.status?.license || "youtube",
                embeddable: video.status?.embeddable !== false,
                publicStatsViewable:
                  video.status?.publicStatsViewable !== false,
                madeForKids: video.status?.madeForKids || false,
              },

              popularityScore: viewCount + likeCount * 10 + commentCount * 5,
              tier: calculateVideoTier(
                viewCount,
                video.snippet.publishedAt || new Date(),
                isShort,
                getEngagementRate(viewCount, likeCount, commentCount)
              ),

              lastSyncedAt: new Date(),
              syncVersion: { increment: 1 },
            },
          });

          results.updatedVideos++;
          logger.debug(`Updated video: ${video.snippet.title}`);
        } else {
          // Create new video - WITHOUT the fields that don't exist!
          await prisma.videos.create({
            data: {
              videoId: video.id,
              title: video.snippet.title || "",
              description: video.snippet.description || "",
              publishedAt: video.snippet.publishedAt
                ? new Date(video.snippet.publishedAt)
                : new Date(),
              channelId: video.snippet.channelId || channelId,
              channelTitle: video.snippet.channelTitle || "",

              // Search & categorization
              tags: video.snippet.tags || [],
              categoryId: video.snippet.categoryId || "25",
              defaultLanguage: video.snippet.defaultLanguage || "en",

              // Empty playlists - will be filled by playlist sync
              playlists: [],
              relatedVideos: [],

              // Media details
              thumbnails: {
                default: video.snippet.thumbnails?.default?.url || "",
                medium: video.snippet.thumbnails?.medium?.url || "",
                high: video.snippet.thumbnails?.high?.url || "",
                standard: video.snippet.thumbnails?.standard?.url || "",
                maxres: video.snippet.thumbnails?.maxres?.url || null,
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
                publicStatsViewable:
                  video.status?.publicStatsViewable !== false,
                madeForKids: video.status?.madeForKids || false,
              },

              // Metadata
              isShort: isShort,
              videoType: isShort ? "short" : "standard",
              popularityScore: viewCount + likeCount * 10 + commentCount * 5,
              tier: calculateVideoTier(
                viewCount,
                video.snippet.publishedAt || new Date(),
                isShort,
                getEngagementRate(viewCount, likeCount, commentCount)
              ),
              isActive: true,
              lastSyncedAt: new Date(),
              syncVersion: 1,
            },
          });

          results.newVideos++;
          logger.success(`Added new video: ${video.snippet.title}`, {
            videoId: video.id,
            duration: `${durationSeconds}s`,
            isShort,
          });
        }
      } catch (error: any) {
        logger.error(`Failed to process video ${video.id}`, {
          error: error.message,
        });
        results.errors.push(`Video ${video.id}: ${error.message}`);
      }
    }

    const duration = Date.now() - startTime;
    logger.success("Uploads check complete", {
      duration: `${duration}ms`,
      newVideos: results.newVideos,
      updatedVideos: results.updatedVideos,
      errors: results.errors.length,
    });

    return res.json({
      success: true,
      traceId,
      duration,
      results,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error("Uploads check failed", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      traceId,
      duration,
      errors: [error.message],
      results,
    });
  }
}

export const config = {
  maxDuration: 30,
};
