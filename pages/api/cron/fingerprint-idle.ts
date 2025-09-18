// pages/api/cron/fingerprint-idle.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, Prisma } from "@prisma/client";
import { google } from "googleapis";
import {
  isAuthorized,
  Logger,
  withBackoff,
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

const IDLE_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes

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
    // Add small jitter
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
    logger.debug(`Fetched ${items.length} items`);
    return items;
  } catch (error: any) {
    logger.error(`Failed to fetch playlist items`, {
      playlistId,
      error: error.message,
    });
    throw error;
  }
}

async function rebuildPlaylistIfChanged(
  playlist: any,
  items: any[],
  newFingerprint: string,
  logger: Logger
): Promise<{ success: boolean; errors: string[] }> {
  const result = { success: false, errors: [] as string[] };

  logger.warn(`Rebuilding playlist ${playlist.playlistId} (${playlist.title})`); // Use title, not name!

  try {
    // Clear existing items
    await prisma.playlistItems.deleteMany({
      where: { playlistId: playlist.playlistId },
    });

    // Insert new items with required title field
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const videoId = item.contentDetails?.videoId;

      if (!videoId) continue;

      try {
        await prisma.playlistItems.create({
          data: {
            playlistId: playlist.playlistId,
            videoId,
            position: i,
            title: item.snippet?.title || `Video ${i + 1}`, // Required field!
            addedAt: item.snippet?.publishedAt
              ? new Date(item.snippet.publishedAt)
              : new Date(),
          },
        });
      } catch (error: any) {
        if (error.code === "P2002") {
          // Unique constraint violation - try updating
          try {
            await prisma.playlistItems.update({
              where: {
                playlistId_videoId: {
                  playlistId: playlist.playlistId,
                  videoId,
                },
              },
              data: {
                position: i,
                title: item.snippet?.title || `Video ${i + 1}`,
              },
            });
          } catch (updateError: any) {
            logger.error(`Failed to update playlist item`, {
              videoId,
              error: updateError.message,
            });
            result.errors.push(`Item ${videoId}: ${updateError.message}`);
          }
        } else {
          logger.error(`Failed to insert playlist item`, {
            videoId,
            position: i,
            error: error.message,
          });
          result.errors.push(`Item ${videoId}: ${error.message}`);
        }
      }
    }

    logger.debug(`Inserted ${items.length} playlist items`);

    // Enrich any missing videos
    const videoIds = items
      .map((i) => i.contentDetails?.videoId)
      .filter(Boolean) as string[];

    const existingVideos = await prisma.videos.findMany({
      where: { videoId: { in: videoIds } },
      select: { id: true, videoId: true },
    });

    const existingVideoIds = new Set(existingVideos.map((v) => v.videoId));
    const missingIds = videoIds.filter((id) => !existingVideoIds.has(id));

    if (missingIds.length > 0) {
      logger.info(
        `Found ${missingIds.length} missing videos, fetching from YouTube`
      );

      try {
        const videoResponse = await withBackoff(
          () =>
            youtube.videos.list({
              part: ["snippet", "statistics", "contentDetails", "status"],
              id: missingIds,
              key: process.env.YOUTUBE_API_KEY,
            }),
          { maxRetries: 3, initialDelayMs: 500 },
          logger
        );

        const videos = videoResponse.data.items || [];
        const fetchedIds = new Set(videos.map((v) => v.id!));

        // Handle videos not returned
        const notReturned = missingIds.filter((id) => !fetchedIds.has(id));
        for (const missingId of notReturned) {
          logger.warn(`Video not returned by API`, { videoId: missingId });

          try {
            const existing = await findVideoByVideoId(prisma, missingId);

            if (existing) {
              // Update existing to mark as private
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
            }
          } catch (error: any) {
            logger.error(`Failed to create placeholder`, {
              videoId: missingId,
              error: error.message,
            });
            result.errors.push(`Placeholder ${missingId}: ${error.message}`);
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
                licensedContent: video.contentDetails?.licensedContent || false,
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

            // Check if exists
            const existing = await findVideoByVideoId(prisma, video.id!);

            if (existing) {
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
            } else {
              await prisma.videos.create({
                data: videoData,
              });
            }

            logger.debug(
              `Added/updated video: ${video.snippet?.title?.substring(0, 30)}...`
            );
          } catch (error: any) {
            logger.error(`Failed to upsert video`, {
              videoId: video.id,
              error: error.message,
            });
            result.errors.push(`Video ${video.id}: ${error.message}`);
          }
        }
      } catch (error: any) {
        logger.error(`Failed to enrich videos`, { error: error.message });
        result.errors.push(`Enrich batch: ${error.message}`);
      }
    }

    // Update playlist metadata
    await prisma.playlist.update({
      where: { playlistId: playlist.playlistId },
      data: {
        fingerprint: newFingerprint,
        lastFingerprintAt: new Date(),
        itemCount: items.length,
        updatedAt: new Date(),
      },
    });

    result.success = true;
    return result;
  } catch (error: any) {
    logger.error(`Failed to rebuild playlist`, { error: error.message });
    result.errors.push(`Rebuild: ${error.message}`);
    return result;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  const traceId = generateTraceId();
  const startTime = Date.now();
  const logger = new Logger("FINGERPRINT-IDLE", traceId);

  logger.info("========================================");
  logger.info("Starting idle fingerprint check");

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
    checked: null,
    changed: false,
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

    const criticalIds = [
      feConfig.heroPlaylist,
      feConfig.shortsPlaylist,
      ...displayed.map((p) => p?.playlistId).filter(Boolean),
    ].filter(Boolean) as string[];

    logger.debug(`Critical playlist IDs`, {
      count: criticalIds.length,
      ids: criticalIds,
    });

    // Find the most idle playlist
    const threshold = new Date(Date.now() - IDLE_CHECK_INTERVAL);

    const idlePlaylist = await prisma.playlist.findFirst({
      where: {
        isActive: true,
        playlistId: { in: criticalIds },
        OR: [
          { lastFingerprintAt: { lte: threshold } },
          { lastFingerprintAt: null },
        ],
      },
      orderBy: [{ lastFingerprintAt: "asc" }, { playlistId: "asc" }],
      select: {
        playlistId: true,
        title: true, // NOT 'name'!
        slug: true,
        fingerprint: true,
        lastFingerprintAt: true,
        itemCount: true,
      },
    });

    if (!idlePlaylist) {
      logger.info("No idle playlists found (all checked recently)");

      // Find next playlist to check
      const nextCheck = await prisma.playlist.findFirst({
        where: {
          isActive: true,
          playlistId: { in: criticalIds },
        },
        orderBy: { lastFingerprintAt: "asc" },
        select: {
          title: true, // NOT 'name'!
          lastFingerprintAt: true,
        },
      });

      if (nextCheck?.lastFingerprintAt) {
        const minutesUntilNext = Math.ceil(
          (nextCheck.lastFingerprintAt.getTime() +
            IDLE_CHECK_INTERVAL -
            Date.now()) /
            60000
        );
        logger.info(`Next check in ${minutesUntilNext} minutes`, {
          playlist: nextCheck.title, // NOT 'name'!
        });
      }

      return res.status(200).json({
        success: true,
        traceId,
        duration: Date.now() - startTime,
        results: {
          checked: null,
          changed: false,
          message: "No idle playlists to check",
        },
      });
    }

    // Log idle playlist info
    const lastCheckMinutes = idlePlaylist.lastFingerprintAt
      ? Math.floor(
          (Date.now() - idlePlaylist.lastFingerprintAt.getTime()) / 60000
        )
      : null;

    logger.info(
      `Found idle playlist: ${idlePlaylist.title || idlePlaylist.playlistId}`,
      {
        // Use title!
        lastCheckedMinutesAgo: lastCheckMinutes,
        currentFingerprint: idlePlaylist.fingerprint?.substring(0, 8),
        itemCount: idlePlaylist.itemCount,
      }
    );

    results.checked = idlePlaylist.playlistId;

    // Fetch current items
    const currentItems = await fetchPlaylistItems(
      idlePlaylist.playlistId,
      logger
    );
    const currentFingerprint = computeFingerprint(currentItems, 32);

    logger.debug(`Fingerprint comparison`, {
      current: currentFingerprint.substring(0, 8),
      previous: idlePlaylist.fingerprint?.substring(0, 8) || "none",
    });

    if (currentFingerprint !== idlePlaylist.fingerprint) {
      logger.warn("Playlist has changed!");
      results.changed = true;

      // Rebuild the playlist
      const rebuildResult = await rebuildPlaylistIfChanged(
        idlePlaylist,
        currentItems,
        currentFingerprint,
        logger
      );

      results.errors.push(...rebuildResult.errors);

      if (rebuildResult.success) {
        logger.success(`Playlist ${idlePlaylist.title} rebuilt successfully`); // Use title!
      }
    } else {
      logger.success("Playlist unchanged");

      // Just update the last check time
      await prisma.playlist.update({
        where: { playlistId: idlePlaylist.playlistId },
        data: { lastFingerprintAt: new Date() },
      });
    }

    // Log activity
    await prisma.admin_activity_logs.create({
      data: {
        userId: "cron",
        action: "FINGERPRINT_IDLE",
        entityType: "playlist",
        metadata: {
          entityId: idlePlaylist.playlistId,
          traceId,
          playlistName: idlePlaylist.title, // NOT 'name'!
          changed: results.changed,
          oldFingerprint: idlePlaylist.fingerprint?.substring(0, 8),
          newFingerprint: currentFingerprint.substring(0, 8),
          itemCount: currentItems.length,
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
    logger.success("Idle check complete", {
      duration,
      checked: idlePlaylist.title, // NOT 'name'!
      changed: results.changed,
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
    logger.error("Idle fingerprint check failed", {
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
