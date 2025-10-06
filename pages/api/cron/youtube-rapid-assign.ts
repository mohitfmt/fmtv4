// pages/api/cron/youtube-rapid-assign.ts
// UPDATED VERSION - Using SmartRevalidator for all cache invalidation

import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { smartRevalidator } from "@/lib/cache/smart-revalidator";
import {
  isAuthorized,
  Logger,
  generateTraceId,
  CronResponse,
  validateEnvironment,
} from "./_helpers";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CronResponse>
) {
  // Auth check first
  if (!isAuthorized(req)) {
    return res.status(401).json({
      success: false,
      traceId: "unauthorized",
      duration: 0,
      errors: ["Unauthorized - use x-cron-key header"],
    });
  }

  // Validate environment
  const missingEnv = validateEnvironment();
  if (missingEnv.length > 0) {
    return res.status(500).json({
      success: false,
      traceId: "env-error",
      duration: 0,
      errors: [`Missing env vars: ${missingEnv.join(", ")}`],
    });
  }

  const startTime = Date.now();
  const traceId = generateTraceId();
  const logger = new Logger("RAPID-ASSIGN", traceId);

  logger.info("========================================");
  logger.info("Starting rapid playlist assignment");

  const results: {
    videosProcessed: number;
    videosAssigned: number;
    playlistsChecked: number;
    apiCalls: number;
    errors: string[];
  } = {
    videosProcessed: 0,
    videosAssigned: 0,
    playlistsChecked: 0,
    apiCalls: 0,
    errors: [],
  };

  try {
    // Find videos from last 24 hours with empty playlists
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const needsAssignment = await prisma.videos.findMany({
      where: {
        isActive: true,
        publishedAt: {
          gte: oneDayAgo,
        },
        playlists: {
          isEmpty: true,
        },
      },
      select: {
        id: true,
        videoId: true,
        title: true,
        publishedAt: true,
        playlists: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 20,
    });

    logger.info(`Found ${needsAssignment.length} videos with empty playlists`);

    if (needsAssignment.length === 0) {
      const totalEmpty = await prisma.videos.count({
        where: {
          isActive: true,
          playlists: { isEmpty: true },
        },
      });

      logger.info(
        `No recent videos need assignment. Total unassigned: ${totalEmpty}`
      );

      return res.json({
        success: true,
        traceId,
        duration: Date.now() - startTime,
        results,
      });
    }

    // Get all active playlists
    const playlists = await prisma.playlist.findMany({
      where: { isActive: true },
      select: {
        id: true,
        playlistId: true,
        title: true,
      },
    });

    logger.info(`Checking ${playlists.length} playlists`);
    results.playlistsChecked = playlists.length;

    // Track which videos were assigned and to which playlists
    const assignedVideos: string[] = [];
    const affectedPlaylists = new Set<string>();

    // Check each video against each playlist
    for (const video of needsAssignment) {
      const videoPlaylists: string[] = [];

      for (const playlist of playlists) {
        try {
          // Check if video is in this playlist
          const response = await youtube.playlistItems.list({
            part: ["id"],
            playlistId: playlist.playlistId,
            videoId: video.videoId,
            maxResults: 1,
          });

          results.apiCalls++;

          if (response.data.items && response.data.items.length > 0) {
            videoPlaylists.push(playlist.playlistId);
            affectedPlaylists.add(playlist.playlistId);
            logger.debug(
              `Video ${video.videoId} found in playlist ${playlist.title}`
            );
          }
        } catch (error: any) {
          // 404 errors are expected when video is not in playlist
          if (error?.response?.status !== 404) {
            logger.warn(
              `Error checking playlist ${playlist.playlistId}: ${error.message}`
            );
          }
        }
      }

      results.videosProcessed++;

      // Update video with found playlists
      if (videoPlaylists.length > 0) {
        await prisma.videos.update({
          where: { id: video.id },
          data: {
            playlists: videoPlaylists,
            playlistsUpdatedAt: new Date(),
          },
        });

        results.videosAssigned++;
        assignedVideos.push(video.videoId);

        logger.success(
          `Assigned video "${video.title}" to ${videoPlaylists.length} playlist(s)`
        );
      } else {
        logger.debug(`No playlists found for video "${video.title}"`);
      }
    }

    // =================================================================
    // SMARTREVALIDATOR INTEGRATION - Replace all old cache/ISR logic
    // =================================================================

    if (assignedVideos.length > 0 || affectedPlaylists.size > 0) {
      logger.info("Triggering SmartRevalidator for affected content...");

      try {
        const revalidationResult = await smartRevalidator.revalidate({
          videoIds: assignedVideos,
          playlistIds: Array.from(affectedPlaylists),
          reason: "rapid-assign",
        });

        logger.success("SmartRevalidator completed", {
          pagesRevalidated: revalidationResult.pagesRevalidated.length,
          cachesCleared: revalidationResult.cachesCleared,
          duration: revalidationResult.duration,
        });
      } catch (error: any) {
        // Don't fail the entire job if revalidation fails
        logger.error("SmartRevalidator error (non-fatal)", {
          error: error.message,
        });
        results.errors.push(`Revalidation error: ${error.message}`);
      }
    }

    const duration = Date.now() - startTime;

    logger.success("Rapid assignment complete", {
      duration: `${duration}ms`,
      videosProcessed: results.videosProcessed,
      videosAssigned: results.videosAssigned,
      playlistsChecked: results.playlistsChecked,
      apiCalls: results.apiCalls,
      hasErrors: results.errors.length > 0,
    });

    return res.json({
      success: true,
      traceId,
      duration,
      results,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error("Rapid assignment failed", {
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
