// pages/api/cron/youtube-catch-up.ts
// EMERGENCY MANUAL SYNC TOOL - Pull all videos from YouTube playlists
// Used via Admin Tools page when videos are missing or out of sync

import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, Prisma } from "@prisma/client";
import { google } from "googleapis";
import pLimit from "p-limit";
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

const MAX_ITEMS_PER_PLAYLIST = 200; // Limit to control quota
const MAX_PLAYLISTS_PER_RUN = 100; // Cap playlists per run

// Concurrency protection - prevent overlapping runs
let syncInProgress = false;
const LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes max
let lockTimestamp: number | null = null;

// ============ DEDUPLICATION CACHE ============
const requestCache = new Map<string, number>();
const DEDUP_WINDOW = 60000; // 1 minute

function getRequestFingerprint(req: NextApiRequest): string {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userEmail = req.cookies?.user_email || "anonymous";
  return `${ip}:${userEmail}`;
}

function isDuplicateRequest(req: NextApiRequest): boolean {
  const fingerprint = getRequestFingerprint(req);
  const lastRequest = requestCache.get(fingerprint);
  const now = Date.now();

  if (lastRequest && now - lastRequest < DEDUP_WINDOW) {
    return true; // Duplicate within 1 minute
  }

  requestCache.set(fingerprint, now);

  // Cleanup old entries
  for (const [key, timestamp] of requestCache.entries()) {
    if (now - timestamp > DEDUP_WINDOW) {
      requestCache.delete(key);
    }
  }

  return false;
}
// ============ END DEDUPLICATION ============

// Helper function to parse YouTube duration
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}

// Fetch all items from a playlist (paginated)
async function fetchAllPlaylistItems(
  playlistId: string,
  logger: Logger
): Promise<any[]> {
  const allItems: any[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;
  const maxPages = Math.ceil(MAX_ITEMS_PER_PLAYLIST / 50); // 50 items per page

  logger.debug(`Fetching playlist items (max ${MAX_ITEMS_PER_PLAYLIST})`);

  try {
    do {
      pageCount++;

      if (pageCount > maxPages) {
        logger.warn(`Reached max pages (${maxPages}), stopping pagination`);
        break;
      }

      // Add jitter between pages to avoid rate limits
      if (pageCount > 1) {
        await sleep(200 + Math.floor(Math.random() * 300));
      }

      const response = await withBackoff(
        () =>
          youtube.playlistItems.list({
            part: ["snippet", "contentDetails"],
            playlistId,
            maxResults: 50,
            pageToken,
            key: process.env.YOUTUBE_API_KEY,
          }),
        { maxRetries: 3, initialDelayMs: 500 },
        logger
      );

      const items = response.data.items || [];
      allItems.push(...items);

      pageToken = response.data.nextPageToken || undefined;

      logger.debug(`Fetched page ${pageCount} - ${items.length} items`);
    } while (pageToken && allItems.length < MAX_ITEMS_PER_PLAYLIST);

    logger.info(`Total items fetched: ${allItems.length}`);
    return allItems.slice(0, MAX_ITEMS_PER_PLAYLIST);
  } catch (error: any) {
    logger.error(`Failed to fetch playlist items`, { error: error.message });
    return allItems; // Return what we have so far
  }
}

// Sync a single playlist
async function syncPlaylist(
  playlist: { playlistId: string; title: string; slug: string | null },
  logger: Logger
): Promise<{
  success: boolean;
  playlistsSynced: number;
  videosAdded: number;
  videosUpdated: number;
  playlistItemsAdded: number;
  errors: string[];
}> {
  const stats = {
    success: true,
    playlistsSynced: 0,
    videosAdded: 0,
    videosUpdated: 0,
    playlistItemsAdded: 0,
    errors: [] as string[],
  };

  try {
    // Fetch all items
    const items = await fetchAllPlaylistItems(playlist.playlistId, logger);

    if (items.length === 0) {
      logger.warn(`No items found in playlist`);
      return stats;
    }

    // Clear existing playlist items (atomic)
    const deleted = await prisma.playlistItems.deleteMany({
      where: { playlistId: playlist.playlistId },
    });
    logger.debug(`Cleared ${deleted.count} existing playlist items`);

    // Get all video IDs
    const videoIds = items
      .map((item) => item.contentDetails?.videoId)
      .filter(Boolean) as string[];

    // Check which videos already exist
    const existingVideos = await prisma.videos.findMany({
      where: { videoId: { in: videoIds } },
      select: { id: true, videoId: true },
    });

    const existingVideoIds = new Set(existingVideos.map((v) => v.videoId));
    const newVideoIds = videoIds.filter((id) => !existingVideoIds.has(id));

    logger.info(
      `Found ${newVideoIds.length} new videos, ${existingVideoIds.size} existing`
    );

    // Fetch details for new videos in batches
    if (newVideoIds.length > 0) {
      for (let i = 0; i < newVideoIds.length; i += 50) {
        const batch = newVideoIds.slice(i, i + 50);

        // Add jitter between batches
        if (i > 0) {
          await sleep(200 + Math.floor(Math.random() * 300));
        }

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
            logger.debug(`Video not returned by API`, { videoId: missingId });

            try {
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

                isShort: false,
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
                    // Update stats and mutable fields
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
                logger.debug(
                  `Added: ${video.snippet?.title?.substring(0, 30)}...`
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

    // Insert playlist items with required title field
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
        stats.playlistItemsAdded++;
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
            stats.playlistItemsAdded++;
          } catch (updateError: any) {
            logger.error(`Failed to update playlist item`, {
              error: updateError.message,
            });
            stats.errors.push(
              `PlaylistItem ${videoId}: ${updateError.message}`
            );
          }
        } else {
          logger.error(`Failed to add playlist item`, { error: error.message });
          stats.errors.push(`PlaylistItem ${videoId}: ${error.message}`);
        }
      }
    }

    // Update playlist metadata
    const fingerprint = computeFingerprint(items, 32);

    await prisma.playlist.update({
      where: { playlistId: playlist.playlistId },
      data: {
        fingerprint,
        lastFingerprintAt: new Date(),
        // itemCount: items.length,  ✅ REMOVED itemCount - let verify-playlist-counts handle it
        updatedAt: new Date(),
      },
    });

    stats.playlistsSynced = 1;
    logger.success(`Playlist synced`, {
      videosAdded: stats.videosAdded,
      videosUpdated: stats.videosUpdated,
      playlistItems: stats.playlistItemsAdded,
      errors: stats.errors.length,
    });
  } catch (error: any) {
    logger.error(`Failed to sync playlist`, { error: error.message });
    stats.errors.push(`Sync: ${error.message}`);
    stats.success = false;
  }

  return stats;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  const traceId = generateTraceId();
  const startTime = Date.now();
  const logger = new Logger("CATCH-UP", traceId);

  // ============ CHECK FOR DUPLICATE ============
  if (isDuplicateRequest(req)) {
    logger.warn("⚠️ DUPLICATE REQUEST BLOCKED", {
      fingerprint: getRequestFingerprint(req),
      message: "Same user made request within 1 minute",
    });

    return res.status(429).json({
      success: false,
      traceId,
      duration: 0,
      errors: ["Duplicate request detected. Please wait before retrying."],
    });
  }

  logger.info("========================================");
  logger.info("🚀 STARTING MANUAL CATCH-UP SYNC");
  logger.info(`TraceId: ${traceId}`);
  logger.info("========================================");

  // Validate auth (CRON KEY ONLY)
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

  // Check if sync is already running
  if (syncInProgress) {
    const lockAge = lockTimestamp ? Date.now() - lockTimestamp : 0;

    if (lockAge < LOCK_TIMEOUT_MS) {
      logger.warn("Sync already in progress, aborting", {
        lockAge: Math.round(lockAge / 1000) + "s",
      });
      return res.status(409).json({
        success: false,
        traceId,
        duration: Date.now() - startTime,
        errors: [
          `Sync already in progress (started ${Math.round(lockAge / 1000)}s ago)`,
        ],
      });
    } else {
      // Lock expired, force release
      logger.warn("Forcing lock release (timeout)", { lockAge });
      syncInProgress = false;
    }
  }

  // Acquire lock
  syncInProgress = true;
  lockTimestamp = Date.now();
  logger.info("Acquired sync lock");

  // Ensure lock is released on exit
  const releaseLock = () => {
    syncInProgress = false;
    lockTimestamp = null;
    logger.info("Released sync lock");
  };

  // Validate environment
  const missingEnv = validateEnvironment();
  if (missingEnv.length > 0) {
    logger.error("Missing environment variables", { missing: missingEnv });
    releaseLock();
    return res.status(500).json({
      success: false,
      traceId,
      duration: Date.now() - startTime,
      errors: [`Missing env vars: ${missingEnv.join(", ")}`],
    });
  }

  const totalStats = {
    playlistsSynced: 0,
    videosAdded: 0,
    videosUpdated: 0,
    playlistItemsAdded: 0,
    errors: [] as string[],
  };

  try {
    // Get all active playlists
    let playlists = await prisma.playlist.findMany({
      where: { isActive: true },
      select: {
        playlistId: true,
        title: true,
        slug: true, // For ISR revalidation
        itemCount: true,
        lastFingerprintAt: true,
      },
      orderBy: { playlistId: "asc" },
    });

    // Cap at maximum playlists per run
    if (playlists.length > MAX_PLAYLISTS_PER_RUN) {
      logger.warn(
        `Capping at ${MAX_PLAYLISTS_PER_RUN} playlists (found ${playlists.length})`
      );
      playlists = playlists.slice(0, MAX_PLAYLISTS_PER_RUN);
    }

    logger.info(`Found ${playlists.length} active playlists to sync`);

    // Get FE config to prioritize critical playlists
    const feConfig = await prisma.videoConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    const displayed = Array.isArray(feConfig?.displayedPlaylists)
      ? (feConfig!.displayedPlaylists as any[])
      : [];

    const criticalIds = new Set(
      [
        feConfig?.heroPlaylist,
        feConfig?.shortsPlaylist,
        ...displayed.map((p) => p?.playlistId).filter(Boolean),
      ].filter(Boolean) as string[]
    );

    // Sort playlists: critical first, then others
    const sortedPlaylists = [
      ...playlists.filter((p) => criticalIds.has(p.playlistId)),
      ...playlists.filter((p) => !criticalIds.has(p.playlistId)),
    ];

    logger.info(`Processing ${criticalIds.size} critical playlists first`);

    // Use concurrency limit
    const limiter = pLimit(2); // Process 2 playlists at a time

    const results = await Promise.allSettled(
      sortedPlaylists.map((playlist, index) =>
        limiter(async () => {
          const isCritical = criticalIds.has(playlist.playlistId);
          const playlistLogger = new Logger(
            `PLAYLIST[${index + 1}/${sortedPlaylists.length}]`,
            traceId
          );

          playlistLogger.info(
            `${isCritical ? "⭐ CRITICAL" : "📁 Regular"}: ${playlist.title}`
          );

          try {
            const stats = await syncPlaylist(playlist, playlistLogger);
            return {
              playlist: playlist.title,
              ...stats, // Already has success, playlistsSynced, videosAdded, etc.
            };
          } catch (error: any) {
            playlistLogger.error(`Failed to sync`, { error: error.message });
            totalStats.errors.push(`${playlist.title}: ${error.message}`);
            return {
              success: false,
              playlist: playlist.title,
              playlistsSynced: 0,
              videosAdded: 0,
              videosUpdated: 0,
              playlistItemsAdded: 0,
              errors: [error.message],
            };
          }
        })
      )
    );

    // Aggregate stats
    for (const result of results) {
      if (result.status === "fulfilled" && result.value.success) {
        totalStats.playlistsSynced += result.value.playlistsSynced || 0;
        totalStats.videosAdded += result.value.videosAdded || 0;
        totalStats.videosUpdated += result.value.videosUpdated || 0;
        totalStats.playlistItemsAdded += result.value.playlistItemsAdded || 0;
      }
    }

    // Check for failures
    const failures = results.filter((r) => r.status === "rejected");
    const partialFailures = results.filter(
      (r) => r.status === "fulfilled" && !r.value.success
    );

    if (failures.length > 0 || partialFailures.length > 0) {
      logger.warn(`Some playlists failed`, {
        rejected: failures.length,
        failed: partialFailures.length,
      });
    }

    // ========================================================================
    // 🆕 CACHE CLEARING & ISR REVALIDATION
    // ========================================================================
    logger.info("Clearing caches and triggering ISR revalidation...");

    try {
      // Step 1: Clear all video caches
      const { clearAllCaches, videoDataCache } = await import(
        "@/lib/cache/video-cache-registry"
      );
      const clearedCount = clearAllCaches();
      videoDataCache.clear(); // Also clear the videoDataCache
      logger.info(`Cleared ${clearedCount} video caches + videoDataCache`);
    } catch (error: any) {
      logger.warn("Cache clearing failed (non-fatal)", {
        error: error.message,
      });
    }

    try {
      // Step 2: Determine which pages need ISR revalidation
      const pagesToRevalidate = new Set<string>(["/videos"]); // Always revalidate video hub

      if (feConfig) {
        // Add playlist pages that were synced
        for (const playlist of sortedPlaylists) {
          // Check if this playlist is displayed on video hub
          const isDisplayed = displayed.some(
            (p: any) => p?.playlistId === playlist.playlistId
          );

          if (isDisplayed || playlist.playlistId === feConfig.heroPlaylist) {
            pagesToRevalidate.add("/videos");
          }

          // Add individual playlist page
          if (playlist.slug) {
            pagesToRevalidate.add(`/videos/playlist/${playlist.slug}`);
          }
        }
      }

      // Step 3: Trigger ISR revalidation
      const revalidateSecret =
        process.env.REVALIDATE_SECRET || process.env.REVALIDATE_SECRET_KEY;
      const siteUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "https://dev-v4.freemalaysiatoday.com";

      if (revalidateSecret && pagesToRevalidate.size > 0) {
        const pathsArray = Array.from(pagesToRevalidate);
        logger.info(`Revalidating ${pathsArray.length} pages:`, pathsArray);

        const revalidateResponse = await fetch(
          `${siteUrl}/api/internal/revalidate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-revalidate-secret": revalidateSecret,
            },
            body: JSON.stringify({ paths: pathsArray }),
          }
        );

        if (revalidateResponse.ok) {
          const result = await revalidateResponse.json();
          logger.success(
            `✅ ISR revalidation successful for ${result.revalidated?.length || 0} paths`
          );
        } else {
          const errorText = await revalidateResponse.text();
          logger.warn(`ISR revalidation failed (non-fatal): ${errorText}`);
        }
      } else {
        logger.warn("Skipping ISR revalidation - missing secret or no pages");
      }
    } catch (error: any) {
      // Don't fail the entire job if ISR fails
      logger.warn("ISR revalidation failed (non-fatal)", {
        error: error.message,
      });
    }

    logger.info("Cache clearing and ISR revalidation complete");
    // ========================================================================

    // Estimate quota usage
    const quotaUsed =
      sortedPlaylists.length * 3 + // playlistItems.list calls
      Math.ceil(totalStats.videosAdded / 50) * 1; // videos.list calls

    // Log activity
    await prisma.admin_activity_logs.create({
      data: {
        userId: "manual-sync",
        action: "YOUTUBE_CATCH_UP",
        entityType: "system",
        metadata: {
          traceId,
          totalPlaylists: sortedPlaylists.length,
          ...totalStats,
          quotaUsed,
          duration: Date.now() - startTime,
        } as Prisma.InputJsonValue,
        ipAddress:
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress ||
          "",
        userAgent: req.headers["user-agent"] || "manual-sync",
      },
    });

    const duration = Date.now() - startTime;
    const durationMinutes = Math.floor(duration / 60000);
    const durationSeconds = Math.floor((duration % 60000) / 1000);

    logger.info("========================================");
    logger.success("✅ MANUAL SYNC COMPLETE");
    logger.info(`Duration: ${durationMinutes}m ${durationSeconds}s`);
    logger.info("📊 SUMMARY:");
    logger.info(
      `  Playlists synced: ${totalStats.playlistsSynced}/${sortedPlaylists.length}`
    );
    logger.info(`  Videos added: ${totalStats.videosAdded}`);
    logger.info(`  Videos updated: ${totalStats.videosUpdated}`);
    logger.info(`  Playlist items: ${totalStats.playlistItemsAdded}`);
    logger.info(`  Errors: ${totalStats.errors.length}`);
    logger.info(`  Estimated quota: ${quotaUsed} units`);
    logger.info("========================================");

    return res.status(200).json({
      success: true,
      traceId,
      duration,
      partial: totalStats.errors.length > 0,
      results: {
        ...totalStats,
        quotaUsed,
        details: results.map((r) =>
          r.status === "fulfilled"
            ? {
                playlist: r.value.playlist,
                success: r.value.success,
                videosAdded: r.value.videosAdded || 0,
                videosUpdated: r.value.videosUpdated || 0,
                playlistItemsAdded: r.value.playlistItemsAdded || 0,
                errors: r.value.errors?.length || 0,
              }
            : {
                playlist: "Unknown",
                success: false,
                videosAdded: 0,
                videosUpdated: 0,
                playlistItemsAdded: 0,
                errors: 1,
              }
        ),
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error("MANUAL SYNC FAILED", {
      error: error.message,
      duration,
    });

    return res.status(500).json({
      success: false,
      traceId,
      duration,
      errors: [error.message],
    });
  } finally {
    releaseLock(); // Always release lock
  }
}
