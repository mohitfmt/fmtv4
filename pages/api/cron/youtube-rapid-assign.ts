// ALTERNATIVE SOLUTION: Using ONLY Existing Fields (No Schema Changes, No New Tables)
// pages/api/cron/youtube-rapid-assign-zero-changes.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { youtube } from "@/lib/youtube-sync";
import {
  isAuthorized,
  generateTraceId,
  CronResponse,
  Logger,
  checkRSSFeed,
} from "./_helpers";

// Use syncVersion as attempt counter (it's already there!)
const MAX_SYNC_VERSION = 20; // After 20 attempts, stop trying

// Use playlistsUpdatedAt to track last check time
const MIN_CHECK_INTERVAL = 30 * 1000; // 30 seconds between checks

// Only try for videos less than 24 hours old
const MAX_VIDEO_AGE = 24 * 60 * 60 * 1000;

// Check RSS for all critical playlists
async function checkAllPlaylistRSS(
  logger: Logger
): Promise<Map<string, boolean>> {
  const changes = new Map<string, boolean>();

  try {
    const feConfig = await prisma.videoConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!feConfig) return changes;

    const displayed = Array.isArray(feConfig.displayedPlaylists)
      ? (feConfig.displayedPlaylists as any[])
      : [];

    const criticalIds = [
      feConfig.heroPlaylist,
      feConfig.shortsPlaylist,
      ...displayed.map((p) => p?.playlistId).filter(Boolean),
    ].filter(Boolean) as string[];

    for (const playlistId of criticalIds) {
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
      const playlist = await prisma.playlist.findFirst({
        where: { playlistId },
        select: { etag: true, lastModified: true },
      });

      const check = await checkRSSFeed(
        rssUrl,
        playlist?.etag,
        playlist?.lastModified,
        logger
      );

      if (check.changed) {
        changes.set(playlistId, true);

        if (playlist) {
          await prisma.playlist.update({
            where: { playlistId },
            data: {
              etag: check.etag || null,
              lastModified: check.lastModified || null,
            },
          });
        }
      }
    }
  } catch (error: any) {
    logger.error(`RSS check failed: ${error.message}`);
  }

  return changes;
}

// Assign video to playlists
async function assignVideoToChangedPlaylists(
  videoId: string,
  changedPlaylists: Set<string>,
  logger: Logger
): Promise<string[]> {
  const assignedPlaylists: string[] = [];

  for (const playlistId of changedPlaylists) {
    try {
      const response = await youtube.playlistItems.list({
        part: ["contentDetails"],
        playlistId,
        maxResults: 50,
      });

      const videoIds = (response.data.items || [])
        .map((item) => item.contentDetails?.videoId)
        .filter(Boolean) as string[];

      if (videoIds.includes(videoId)) {
        assignedPlaylists.push(playlistId);
        logger.info(`Video ${videoId} found in playlist ${playlistId}`);
      }
    } catch (error: any) {
      logger.error(`Failed to check playlist ${playlistId}: ${error.message}`);
    }
  }

  return assignedPlaylists;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  const traceId = generateTraceId();
  const startTime = Date.now();
  const logger = new Logger("RAPID-ASSIGN", traceId);

  logger.info("========================================");
  logger.info("Starting rapid playlist assignment (zero changes)");

  // Validate auth
  if (!isAuthorized(req)) {
    logger.error("Unauthorized request");
    return res.status(401).json({
      success: false,
      traceId,
      duration: Date.now() - startTime,
      errors: ["Unauthorized"],
    });
  }

  const results = {
    videosProcessed: 0,
    videosAssigned: 0,
    videosSkipped: 0,
    playlistsChecked: 0,
    apiCalls: 0,
    errors: [] as string[],
  };

  try {
    const now = new Date();
    const ageLimit = new Date(now.getTime() - MAX_VIDEO_AGE);
    const checkInterval = new Date(now.getTime() - MIN_CHECK_INTERVAL);

    // Find videos that need playlist assignment using ONLY existing fields
    const needsAssignment = await prisma.videos.findMany({
      where: {
        AND: [
          { playlists: { isEmpty: true } }, // No playlists assigned
          { publishedAt: { gte: ageLimit } }, // Recent videos only
          { isActive: true },
          { syncVersion: { lt: MAX_SYNC_VERSION } }, // Haven't tried too many times
          {
            OR: [
              { playlistsUpdatedAt: null }, // Never checked
              { playlistsUpdatedAt: { lt: checkInterval } }, // Not checked recently
            ],
          },
        ],
      },
      orderBy: [
        { syncVersion: "asc" }, // Prioritize videos with fewer attempts
        { publishedAt: "desc" }, // Then by recency
      ],
      take: 5, // Process up to 5 videos per run
      select: {
        id: true,
        videoId: true,
        title: true,
        publishedAt: true,
        playlists: true,
        syncVersion: true,
        playlistsUpdatedAt: true,
      },
    });

    if (needsAssignment.length === 0) {
      logger.info("No videos need playlist assignment");
      return res.status(200).json({
        success: true,
        traceId,
        duration: Date.now() - startTime,
        results,
      });
    }

    logger.info(
      `Found ${needsAssignment.length} videos needing playlist assignment`
    );

    // Check RSS for all critical playlists
    const playlistChanges = await checkAllPlaylistRSS(logger);
    results.playlistsChecked = playlistChanges.size;

    const changedPlaylists = new Set(
      Array.from(playlistChanges.entries())
        .filter(([_, changed]) => changed)
        .map(([id, _]) => id)
    );

    if (changedPlaylists.size === 0) {
      logger.info("No playlist changes detected, incrementing sync versions");

      // Use syncVersion as our attempt counter
      for (const video of needsAssignment) {
        await prisma.videos.update({
          where: { id: video.id },
          data: {
            syncVersion: video.syncVersion + 1,
            playlistsUpdatedAt: new Date(), // Mark as checked
          },
        });

        if (video.syncVersion + 1 >= MAX_SYNC_VERSION) {
          logger.warn(
            `Video "${video.title}" reached max attempts (${MAX_SYNC_VERSION}), giving up`
          );
        }
      }

      return res.status(200).json({
        success: true,
        traceId,
        duration: Date.now() - startTime,
        results,
      });
    }

    logger.info(
      `${changedPlaylists.size} playlists have changes, checking for our videos`
    );

    // Process each video
    for (const video of needsAssignment) {
      results.videosProcessed++;

      // Skip if checked too recently (shouldn't happen with our query, but safety check)
      if (
        video.playlistsUpdatedAt &&
        video.playlistsUpdatedAt.getTime() > checkInterval.getTime()
      ) {
        results.videosSkipped++;
        logger.info(`Skipping "${video.title}" - checked too recently`);
        continue;
      }

      // Check if this video is in any of the changed playlists
      const assignedPlaylists = await assignVideoToChangedPlaylists(
        video.videoId,
        changedPlaylists,
        logger
      );

      results.apiCalls += changedPlaylists.size;

      if (assignedPlaylists.length > 0) {
        // Found playlists! Update the video
        await prisma.videos.update({
          where: { id: video.id },
          data: {
            playlists: assignedPlaylists,
            playlistsUpdatedAt: new Date(),
            syncVersion: 1, // Reset to 1 since we found it
          },
        });

        results.videosAssigned++;

        const timeToAssign = Math.round(
          (Date.now() - video.publishedAt.getTime()) / 1000
        );

        logger.success(
          `Assigned video "${video.title}" to ${assignedPlaylists.length} playlists`,
          {
            videoId: video.videoId,
            playlists: assignedPlaylists,
            timeToAssign: `${timeToAssign} seconds`,
            attempts: video.syncVersion + 1,
          }
        );
      } else {
        // No playlists found yet, increment syncVersion (our attempt counter)
        await prisma.videos.update({
          where: { id: video.id },
          data: {
            syncVersion: video.syncVersion + 1,
            playlistsUpdatedAt: new Date(), // Mark as checked
          },
        });

        logger.info(
          `No playlists found for "${video.title}" yet (attempt ${video.syncVersion + 1}/${MAX_SYNC_VERSION})`
        );
      }
    }

    // Clear cache if we assigned videos
    if (results.videosAssigned > 0) {
      const { clearVideoCache } = await import("../videos/gallery");
      clearVideoCache();
      logger.info("Cleared video gallery cache");
    }

    // Log activity
    await prisma.admin_activity_logs.create({
      data: {
        userId: "cron",
        action: "RAPID_ASSIGN_ZERO_CHANGES",
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
    logger.success("Rapid assignment complete (zero changes version)", {
      duration,
      videosProcessed: results.videosProcessed,
      videosAssigned: results.videosAssigned,
      videosSkipped: results.videosSkipped,
      apiCalls: results.apiCalls,
      efficiency:
        results.apiCalls > 0
          ? `${((results.videosAssigned / results.apiCalls) * 100).toFixed(1)}% hit rate`
          : "N/A",
    });

    return res.status(200).json({
      success: true,
      traceId,
      duration,
      results,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error("Rapid assignment failed", {
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
