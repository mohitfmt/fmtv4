// pages/api/cron/youtube-playlist-assign.ts - OPTIMIZED VERSION
// Uses efficient algorithm to reduce API calls from O(n*m) to O(m)
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

// Retry wrapper for API calls
async function retryYouTubeCall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      // Exponential backoff: 200ms, 400ms, 800ms
      const delay = 200 * Math.pow(2, i);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  const traceId = generateTraceId();
  const startTime = Date.now();
  const logger = new Logger("PLAYLIST-ASSIGN", traceId);

  logger.info("========================================");
  logger.info("Starting orphaned video playlist assignment (OPTIMIZED)");

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
    orphanedVideosFound: 0,
    videosAssigned: 0,
    playlistsChecked: 0,
    totalPlaylistAssignments: 0,
    apiCalls: 0,
    errors: [] as string[],
  };

  try {
    // Find orphaned videos (videos without playlist assignment)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const orphanedVideos = await prisma.videos.findMany({
      where: {
        OR: [{ playlists: { isEmpty: true } }, { playlists: { equals: [] } }],
        publishedAt: { gte: cutoff },
        isActive: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: {
        id: true,
        videoId: true,
        title: true,
        publishedAt: true,
      },
    });

    results.orphanedVideosFound = orphanedVideos.length;

    if (orphanedVideos.length === 0) {
      logger.info("No orphaned videos found");
      return res.status(200).json({
        success: true,
        traceId,
        duration: Date.now() - startTime,
        results,
      });
    }

    logger.info(`Found ${orphanedVideos.length} orphaned videos to process`);

    // Get all active playlists
    const allPlaylists = await prisma.playlist.findMany({
      where: { isActive: true },
      select: {
        playlistId: true,
        title: true,
      },
    });

    results.playlistsChecked = allPlaylists.length;
    logger.info(
      `Building video maps for ${allPlaylists.length} active playlists`
    );

    // OPTIMIZED APPROACH: Build a map of playlistId -> Set of videoIds
    // This reduces API calls from O(videos * playlists) to O(playlists * pages)
    const playlistVideoMap = new Map<string, Set<string>>();

    for (const playlist of allPlaylists) {
      const videoSet = new Set<string>();
      let pageToken: string | undefined = undefined;
      let pageCount = 0;

      logger.debug(`Fetching videos for playlist: ${playlist.title}`);

      try {
        do {
          // Fetch playlist items with retry logic
          const response = await retryYouTubeCall(() =>
            youtube.playlistItems.list({
              part: ["contentDetails"],
              playlistId: playlist.playlistId,
              maxResults: 50,
              pageToken,
            })
          );

          results.apiCalls++;
          pageCount++;

          // Add video IDs to set
          for (const item of response.data.items || []) {
            const videoId = item.contentDetails?.videoId;
            if (videoId) {
              videoSet.add(videoId);
            }
          }

          pageToken = response.data.nextPageToken ?? undefined;

          // Limit pages per playlist to avoid runaway quota usage
          if (pageCount >= 10) {
            logger.warn(
              `Playlist ${playlist.title} has more than 500 videos, stopping pagination`
            );
            break;
          }
        } while (pageToken);

        playlistVideoMap.set(playlist.playlistId, videoSet);
        logger.debug(`Playlist ${playlist.title} has ${videoSet.size} videos`);
      } catch (error: any) {
        logger.error(`Failed to fetch playlist items for ${playlist.title}`, {
          error: error.message,
        });
        results.errors.push(`Playlist ${playlist.title}: ${error.message}`);
        // Continue with other playlists even if one fails
      }

      // Small delay between playlists to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    logger.info(
      `Built video maps. Total API calls so far: ${results.apiCalls}`
    );

    // Now process each orphaned video by checking against the maps
    for (const video of orphanedVideos) {
      const videoPlaylists: string[] = [];

      // Check which playlists contain this video (O(1) lookup per playlist)
      for (const [playlistId, videoSet] of playlistVideoMap) {
        if (videoSet.has(video.videoId)) {
          videoPlaylists.push(playlistId);
        }
      }

      // Update video with found playlists
      if (videoPlaylists.length > 0) {
        try {
          await prisma.videos.update({
            where: { id: video.id },
            data: {
              playlists: videoPlaylists,
              playlistsUpdatedAt: new Date(),
            },
          });

          results.videosAssigned++;
          results.totalPlaylistAssignments += videoPlaylists.length;

          logger.info(
            `Assigned video to ${videoPlaylists.length} playlist(s)`,
            {
              videoId: video.videoId,
              title: video.title,
              playlists: videoPlaylists,
            }
          );
        } catch (updateError: any) {
          logger.error(`Failed to update video ${video.videoId}`, {
            error: updateError.message,
          });
          results.errors.push(
            `Update ${video.videoId}: ${updateError.message}`
          );
        }
      } else {
        logger.debug(`Video not found in any playlist`, {
          videoId: video.videoId,
          title: video.title,
        });

        // Mark video as checked but not in any playlist
        await prisma.videos.update({
          where: { id: video.id },
          data: {
            playlistsUpdatedAt: new Date(),
          },
        });
      }
    }

    // Clear cache if we assigned videos
    if (results.videosAssigned > 0) {
      const { clearVideoCache } = await import("../videos/gallery");
      clearVideoCache();
      logger.info("Cleared video gallery cache");
    }

    // Calculate efficiency improvement
    const oldMethodApiCalls = orphanedVideos.length * allPlaylists.length;
    const savedApiCalls = oldMethodApiCalls - results.apiCalls;
    const efficiencyGain = Math.round(
      (savedApiCalls / oldMethodApiCalls) * 100
    );

    logger.info(`Efficiency gain: ${efficiencyGain}% fewer API calls`, {
      oldMethod: oldMethodApiCalls,
      optimizedMethod: results.apiCalls,
      saved: savedApiCalls,
    });

    // Log activity
    await prisma.admin_activity_logs.create({
      data: {
        userId: "cron",
        action: "PLAYLIST_ASSIGN_OPTIMIZED",
        entityType: "system",
        metadata: {
          traceId,
          results,
          efficiencyGain: `${efficiencyGain}%`,
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress ||
          "",
        userAgent: req.headers["user-agent"] || "cron",
      },
    });

    const duration = Date.now() - startTime;
    logger.success("Playlist assignment complete (OPTIMIZED)", {
      duration,
      orphanedVideosFound: results.orphanedVideosFound,
      videosAssigned: results.videosAssigned,
      totalPlaylistAssignments: results.totalPlaylistAssignments,
      apiCalls: results.apiCalls,
      efficiencyGain: `${efficiencyGain}%`,
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
    logger.error("Playlist assignment failed", {
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
