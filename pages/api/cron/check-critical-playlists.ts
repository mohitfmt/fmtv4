// pages/api/cron/check-critical-playlists.ts - OPTIMIZED VERSION
// Only fetches first 50 video IDs when playlists change, not entire playlists
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

// Fetch only video IDs from playlist (not full details)
async function fetchPlaylistVideoIds(
  playlistId: string,
  maxVideos: number = 50,
  logger: Logger
): Promise<string[]> {
  try {
    const response = await youtube.playlistItems.list({
      part: ["contentDetails"], // Only IDs, no snippet!
      playlistId,
      maxResults: Math.min(maxVideos, 50),
      key: process.env.YOUTUBE_API_KEY,
    });

    const videoIds = (response.data.items || [])
      .map((item) => item.contentDetails?.videoId)
      .filter(Boolean) as string[];

    logger.debug(`Fetched ${videoIds.length} video IDs from playlist`);
    return videoIds;
  } catch (error: any) {
    logger.error(`Failed to fetch playlist items`, { error: error.message });
    return [];
  }
}

// Update playlist order in database
async function updatePlaylistOrder(
  playlistId: string,
  videoIds: string[],
  logger: Logger
): Promise<void> {
  try {
    // Update playlist metadata
    await prisma.playlist.update({
      where: { playlistId },
      data: {
        itemCount: videoIds.length,
        lastFingerprintAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Update videos to include this playlist
    // Only for videos that exist in our database
    const existingVideos = await prisma.videos.findMany({
      where: { videoId: { in: videoIds } },
      select: { id: true, videoId: true, playlists: true },
    });

    for (const video of existingVideos) {
      if (!video.playlists.includes(playlistId)) {
        await prisma.videos.updateMany({
          where: { videoId: video.videoId },
          data: {
            playlists: [...video.playlists, playlistId],
            playlistsUpdatedAt: new Date(),
          },
        });
      }
    }

    logger.info(
      `Updated playlist order for ${playlistId} with ${videoIds.length} videos`
    );
  } catch (error: any) {
    logger.error(`Failed to update playlist order`, { error: error.message });
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
  logger.info("Starting critical playlists check (OPTIMIZED)");

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
    checked: 0,
    changed: 0,
    apiCalls: 0,
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

    // Identify critical playlist IDs (9-12 playlists)
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

    logger.info(`Found ${criticalIds.size} critical playlists to check`);

    // Get playlist data from database
    const playlists = await prisma.playlist.findMany({
      where: {
        isActive: true,
        playlistId: { in: Array.from(criticalIds) },
      },
      select: {
        playlistId: true,
        title: true,
        etag: true,
        lastModified: true,
      },
    });

    // Check RSS for each critical playlist (0 quota)
    for (const playlist of playlists) {
      results.checked++;

      // Check RSS feed
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlist.playlistId}`;
      const check = await checkRSSFeed(
        rssUrl,
        playlist.etag,
        playlist.lastModified,
        logger
      );

      if (check.error) {
        results.errors.push(`RSS ${playlist.title}: ${check.error}`);
        continue;
      }

      if (check.changed) {
        results.changed++;
        logger.info(
          `Playlist ${playlist.title} changed, fetching first 50 videos`
        );

        // OPTIMIZED: Only fetch first 50 video IDs (1 API call)
        const videoIds = await fetchPlaylistVideoIds(
          playlist.playlistId,
          50,
          logger
        );
        results.apiCalls++;

        if (videoIds.length > 0) {
          await updatePlaylistOrder(playlist.playlistId, videoIds, logger);
        }

        // Update ETags for next check
        await prisma.playlist.update({
          where: { playlistId: playlist.playlistId },
          data: {
            etag: check.etag || null,
            lastModified: check.lastModified || null,
          },
        });
      } else {
        logger.debug(`Playlist ${playlist.title} unchanged`);
      }
    }

    // Clear cache if playlists changed
    if (results.changed > 0) {
      const { clearVideoCache } = await import("../videos/gallery");
      clearVideoCache();
      logger.info("Cleared video gallery cache");
    }

    // Log activity
    await prisma.admin_activity_logs.create({
      data: {
        userId: "cron",
        action: "CHECK_CRITICAL_PLAYLISTS_OPTIMIZED",
        entityType: "system",
        metadata: {
          traceId,
          results,
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
    logger.success("Critical playlists check complete (OPTIMIZED)", {
      duration,
      checked: results.checked,
      changed: results.changed,
      apiCalls: results.apiCalls,
      quotaSaved: `${results.changed * 9} API calls saved by not fetching full playlists`,
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
