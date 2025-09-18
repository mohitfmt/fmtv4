// pages/api/cron/check-critical-playlists-fixed.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, Prisma } from "@prisma/client";
import { google } from "googleapis";
import pLimit from "p-limit";
import {
  isAuthorized,
  Logger,
  withBackoff,
  checkRSSFeed,
  computeFingerprint,
  createPlaceholderVideo,
  generateTraceId,
  CronResponse,
  validateEnvironment,
  sleep,
  findVideoByVideoId,
} from "./_helpers";

const prisma = new PrismaClient();
const youtube = google.youtube("v3");

async function fetchPlaylistItems(
  playlistId: string,
  logger: Logger
): Promise<any[]> {
  if (!process.env.YOUTUBE_API_KEY) {
    logger.error("No YouTube API key configured");
    return [];
  }

  logger.debug(`Fetching items for playlist ${playlistId}`);

  try {
    // Add small jitter to avoid thundering herd
    await sleep(Math.floor(Math.random() * 200));

    const response = await withBackoff(
      () =>
        youtube.playlistItems.list({
          part: ["snippet", "contentDetails"],
          playlistId,
          maxResults: 50,
          key: process.env.YOUTUBE_API_KEY,
        }),
      { maxRetries: 3, initialDelayMs: 500 },
      logger
    );

    const items = response.data.items || [];
    logger.debug(`Fetched ${items.length} items from playlist ${playlistId}`);
    return items;
  } catch (error: any) {
    logger.error(`Failed to fetch playlist items`, {
      playlistId,
      error: error.message,
    });
    throw error;
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

async function rebuildPlaylist(
  playlistId: string,
  items: any[],
  logger: Logger
): Promise<{ videosAdded: number; videosUpdated: number; errors: string[] }> {
  const stats = { videosAdded: 0, videosUpdated: 0, errors: [] as string[] };

  logger.info(`Rebuilding playlist ${playlistId} with ${items.length} items`);

  try {
    // Clear existing items (atomic operation)
    await prisma.playlistItems.deleteMany({
      where: { playlistId },
    });

    // Get video IDs
    const videoIds = items
      .map((item) => item.contentDetails?.videoId)
      .filter(Boolean) as string[];

    // Insert new playlist items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const videoId = item.contentDetails?.videoId;

      if (!videoId) continue;

      try {
        // Create playlist item with required title field
        await prisma.playlistItems.create({
          data: {
            playlistId,
            videoId,
            position: i,
            title: item.snippet?.title || `Video ${i + 1}`, // Required field!
            addedAt: item.snippet?.publishedAt
              ? new Date(item.snippet.publishedAt)
              : new Date(),
          },
        });
      } catch (error: any) {
        // If it's a unique constraint violation, try updating position
        if (error.code === "P2002") {
          try {
            await prisma.playlistItems.update({
              where: {
                playlistId_videoId: { playlistId, videoId },
              },
              data: {
                position: i,
                title: item.snippet?.title || `Video ${i + 1}`,
              },
            });
          } catch (updateError: any) {
            logger.error(`Failed to update playlist item`, {
              playlistId,
              videoId,
              error: updateError.message,
            });
            stats.errors.push(
              `PlaylistItem ${videoId}: ${updateError.message}`
            );
          }
        } else {
          logger.error(`Failed to insert playlist item`, {
            playlistId,
            videoId,
            position: i,
            error: error.message,
          });
          stats.errors.push(`PlaylistItem ${videoId}: ${error.message}`);
        }
      }
    }

    // Check which videos exist in database
    const existingVideos = await prisma.videos.findMany({
      where: { videoId: { in: videoIds } },
      select: { id: true, videoId: true },
    });

    const existingVideoIds = new Set(existingVideos.map((v) => v.videoId));
    const missingIds = videoIds.filter((id) => !existingVideoIds.has(id));

    if (missingIds.length > 0) {
      logger.info(`Fetching ${missingIds.length} missing videos from YouTube`);

      // Batch fetch missing videos
      for (let i = 0; i < missingIds.length; i += 50) {
        const batch = missingIds.slice(i, i + 50);

        try {
          const videoResponse = await withBackoff(
            () =>
              youtube.videos.list({
                part: ["snippet", "statistics", "contentDetails", "status"],
                id: batch,
                key: process.env.YOUTUBE_API_KEY,
              }),
            { maxRetries: 3, initialDelayMs: 500 },
            logger
          );

          const videos = videoResponse.data.items || [];
          const fetchedIds = new Set(videos.map((v) => v.id!));

          // Handle videos not returned (private/deleted)
          const notReturned = batch.filter((id) => !fetchedIds.has(id));
          for (const missingId of notReturned) {
            logger.warn(`Video not returned by API`, { videoId: missingId });

            try {
              // Check if video exists
              const existing = await findVideoByVideoId(prisma, missingId);

              if (existing) {
                // Update to mark as private
                await prisma.videos.update({
                  where: { id: existing.id },
                  data: {
                    status: {
                      embeddable: false,
                      license: "youtube",
                      madeForKids: false,
                      privacyStatus: "private",
                      publicStatsViewable: false,
                      uploadStatus: "processed",
                    },
                    isActive: false,
                    updatedAt: new Date(),
                  },
                });
              } else {
                // Create placeholder
                await prisma.videos.create({
                  data: createPlaceholderVideo(missingId),
                });
                stats.videosAdded++;
              }
            } catch (error: any) {
              logger.error(`Failed to create placeholder`, {
                videoId: missingId,
                error: error.message,
              });
              stats.errors.push(`Placeholder ${missingId}: ${error.message}`);
            }
          }

          // Process returned videos
          for (const video of videos) {
            try {
              const videoData = {
                videoId: video.id!,
                title: video.snippet?.title || "Untitled",
                description: video.snippet?.description || "",
                channelId: video.snippet?.channelId || "",
                channelTitle: video.snippet?.channelTitle || "",
                publishedAt: video.snippet?.publishedAt
                  ? new Date(video.snippet.publishedAt)
                  : new Date(),

                // Required fields
                categoryId: video.snippet?.categoryId || "0",
                defaultLanguage:
                  video.snippet?.defaultLanguage ||
                  video.snippet?.defaultAudioLanguage ||
                  "en",
                tags: video.snippet?.tags || [],
                playlists: [],
                relatedVideos: [],

                thumbnails: {
                  default: video.snippet?.thumbnails?.default?.url || "",
                  high: video.snippet?.thumbnails?.high?.url || "",
                  medium: video.snippet?.thumbnails?.medium?.url || "",
                  standard: video.snippet?.thumbnails?.standard?.url || "",
                  maxres: video.snippet?.thumbnails?.maxres?.url,
                },

                contentDetails: {
                  caption: video.contentDetails?.caption === "true",
                  definition: video.contentDetails?.definition || "hd",
                  dimension: video.contentDetails?.dimension || "2d",
                  duration: video.contentDetails?.duration || "PT0S",
                  durationSeconds: parseDuration(
                    video.contentDetails?.duration || "PT0S"
                  ),
                  licensedContent:
                    video.contentDetails?.licensedContent || false,
                  projection: video.contentDetails?.projection || "rectangular",
                },

                statistics: {
                  viewCount: parseInt(video.statistics?.viewCount || "0"),
                  likeCount: parseInt(video.statistics?.likeCount || "0"),
                  commentCount: parseInt(video.statistics?.commentCount || "0"),
                },

                status: {
                  embeddable: video.status?.embeddable !== false,
                  license: video.status?.license || "youtube",
                  madeForKids: video.status?.madeForKids || false,
                  privacyStatus: video.status?.privacyStatus || "public",
                  publicStatsViewable:
                    video.status?.publicStatsViewable !== false,
                  uploadStatus: video.status?.uploadStatus || "processed",
                },

                isShort: isShortVideo(
                  video.contentDetails?.duration ?? undefined
                ),
                videoType: "standard",
                tier: "A",
                isActive: true,
                syncVersion: 1,
              };

              // Check if video exists
              const existing = await findVideoByVideoId(prisma, video.id!);

              if (existing) {
                // Update existing
                await prisma.videos.update({
                  where: { id: existing.id },
                  data: {
                    title: videoData.title,
                    description: videoData.description,
                    thumbnails: videoData.thumbnails,
                    tags: videoData.tags,
                    statistics: videoData.statistics,
                    contentDetails: videoData.contentDetails,
                    status: videoData.status,
                    updatedAt: new Date(),
                  },
                });
                stats.videosUpdated++;
              } else {
                // Create new
                await prisma.videos.create({
                  data: videoData,
                });
                stats.videosAdded++;
                logger.success(
                  `Added video: ${video.snippet?.title?.substring(0, 30)}...`
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
        } catch (error: any) {
          logger.error(`Failed to fetch video batch`, { error: error.message });
          stats.errors.push(`Video batch: ${error.message}`);
        }
      }
    }

    // Compute fingerprint (32 chars minimum)
    const fingerprint = computeFingerprint(items, 32);

    // Update playlist metadata (using correct field names!)
    await prisma.playlist.update({
      where: { playlistId },
      data: {
        fingerprint,
        lastFingerprintAt: new Date(),
        itemCount: items.length,
        updatedAt: new Date(),
      },
    });

    logger.success(`Playlist rebuilt`, {
      playlistId,
      videosAdded: stats.videosAdded,
      videosUpdated: stats.videosUpdated,
      errors: stats.errors.length,
    });

    return stats;
  } catch (error: any) {
    logger.error(`Failed to rebuild playlist`, {
      playlistId,
      error: error.message,
    });
    stats.errors.push(`Rebuild: ${error.message}`);
    return stats;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  const traceId = generateTraceId();
  const startTime = Date.now();
  const logger = new Logger("CRITICAL-PLAYLISTS", traceId);

  logger.info("========================================");
  logger.info("Starting critical playlists check");

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
    checked: 0,
    changed: 0,
    rebuilt: 0,
    videosAdded: 0,
    videosUpdated: 0,
    errors: [] as string[],
  };

  try {
    // Get FE config to identify critical playlists
    const feConfig = await prisma.videoConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!feConfig) {
      throw new Error("No VideoConfig found");
    }

    // Identify critical playlist IDs
    const displayed = Array.isArray(feConfig.displayedPlaylists)
      ? (feConfig.displayedPlaylists as any[])
      : [];

    const criticalIds = new Set<string>(
      [
        feConfig.heroPlaylist,
        feConfig.shortsPlaylist,
        ...displayed.map((p) => p?.playlistId).filter(Boolean),
      ].filter(Boolean) as string[]
    );

    logger.info(`Found ${criticalIds.size} critical playlists`, {
      playlists: Array.from(criticalIds),
    });

    // Get playlist data from database (using correct field names!)
    const playlists = await prisma.playlist.findMany({
      where: {
        isActive: true,
        playlistId: { in: Array.from(criticalIds) },
      },
      select: {
        playlistId: true,
        title: true, // NOT 'name'!
        slug: true,
        etag: true,
        lastModified: true,
      },
    });

    logger.info(`Checking ${playlists.length} active critical playlists`);

    // Use concurrency limit
    const limiter = pLimit(3);

    const playlistResults = await Promise.allSettled(
      playlists.map((playlist) =>
        limiter(async () => {
          const playlistLogger = new Logger(
            `PLAYLIST:${playlist.title || playlist.playlistId}`, // Use 'title' not 'name'!
            traceId
          );

          results.checked++;
          playlistLogger.info("Checking playlist");

          try {
            // Check RSS feed
            const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlist.playlistId}`;
            const check = await checkRSSFeed(
              rssUrl,
              playlist.etag,
              playlist.lastModified,
              playlistLogger
            );

            if (check.error) {
              results.errors.push(`RSS ${playlist.title}: ${check.error}`);
            }

            if (check.changed) {
              results.changed++;

              // Fetch and rebuild playlist
              const items = await fetchPlaylistItems(
                playlist.playlistId,
                playlistLogger
              );
              const rebuild = await rebuildPlaylist(
                playlist.playlistId,
                items,
                playlistLogger
              );

              results.rebuilt++;
              results.videosAdded += rebuild.videosAdded;
              results.videosUpdated += rebuild.videosUpdated;
              results.errors.push(...rebuild.errors);

              // Update ETags
              await prisma.playlist.update({
                where: { playlistId: playlist.playlistId },
                data: {
                  etag: check.etag || null,
                  lastModified: check.lastModified || null,
                },
              });

              playlistLogger.success("Playlist updated successfully");
              return { success: true, playlist: playlist.title };
            } else {
              playlistLogger.info("Playlist is up to date");
              return {
                success: true,
                playlist: playlist.title,
                unchanged: true,
              };
            }
          } catch (error: any) {
            playlistLogger.error("Failed to process playlist", {
              error: error.message,
            });
            results.errors.push(`${playlist.title}: ${error.message}`);
            return {
              success: false,
              playlist: playlist.title,
              error: error.message,
            };
          }
        })
      )
    );

    // Check for partial failures
    const failures = playlistResults.filter((r) => r.status === "rejected");
    if (failures.length > 0) {
      logger.warn(`${failures.length} playlists failed`, {
        failed: failures,
      });
    }

    // Log activity
    await prisma.admin_activity_logs.create({
      data: {
        userId: "cron",
        action: "CHECK_CRITICAL_PLAYLISTS",
        entityType: "system",
        metadata: {
          traceId,
          results,
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
    logger.success("Critical playlists check complete", {
      duration,
      checked: results.checked,
      changed: results.changed,
      rebuilt: results.rebuilt,
      videosAdded: results.videosAdded,
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
    logger.error("Critical playlists check failed", {
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
