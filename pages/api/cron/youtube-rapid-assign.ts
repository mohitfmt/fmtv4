// pages/api/cron/youtube-rapid-assign.ts
// CORRECT VERSION - Using your actual imports and project structure

import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
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

  // Properly typed results object
  const results: {
    videosProcessed: number;
    videosAssigned: number;
    playlistsChecked: number;
    apiCalls: number;
    errors: string[]; // Explicitly typed as string array
  } = {
    videosProcessed: 0,
    videosAssigned: 0,
    playlistsChecked: 0,
    apiCalls: 0,
    errors: [],
  };

  try {
    // SIMPLE QUERY: Find videos from last 24 hours with empty playlists
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const needsAssignment = await prisma.videos.findMany({
      where: {
        isActive: true,
        publishedAt: {
          gte: oneDayAgo, // Last 24 hours
        },
        playlists: {
          isEmpty: true, // Only videos with NO playlists
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
      take: 20, // Process up to 20 videos per run
    });

    logger.info(`Found ${needsAssignment.length} videos with empty playlists`, {
      count: needsAssignment.length,
      videos: needsAssignment.slice(0, 5).map((v) => ({
        // Show first 5 only
        videoId: v.videoId,
        title: v.title.substring(0, 40),
        hoursAgo: Math.round((Date.now() - v.publishedAt.getTime()) / 3600000),
      })),
    });

    if (needsAssignment.length === 0) {
      // Debug: Check if there are ANY videos with empty playlists
      const totalEmpty = await prisma.videos.count({
        where: {
          isActive: true,
          playlists: { isEmpty: true },
        },
      });

      logger.info(
        `No recent videos need assignment. Total with empty playlists: ${totalEmpty}`
      );

      return res.json({
        success: true,
        traceId,
        duration: Date.now() - startTime,
        results,
      });
    }

    // Get FE config for critical playlists
    const feConfig = await prisma.videoConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!feConfig) {
      throw new Error(
        "No VideoConfig found - please configure playlists first"
      );
    }

    // Extract playlist IDs - handle various formats
    const displayed = Array.isArray(feConfig.displayedPlaylists)
      ? (feConfig.displayedPlaylists as any[])
      : [];

    const playlistIds = [
      feConfig.homepagePlaylist,
      feConfig.fallbackPlaylist,
      feConfig.heroPlaylist,
      feConfig.shortsPlaylist,
      ...displayed.map((p: any) => p?.playlistId).filter(Boolean),
    ].filter(Boolean) as string[];

    // Remove duplicates
    const uniquePlaylistIds = [...new Set(playlistIds)];

    logger.info(
      `Checking ${uniquePlaylistIds.length} unique playlists for our videos`
    );

    // Fetch videos from each playlist
    const allPlaylistVideos = new Map<string, string[]>();

    for (const playlistId of uniquePlaylistIds) {
      try {
        logger.debug(`Fetching playlist ${playlistId}...`);

        const response = await youtube.playlistItems.list({
          part: ["contentDetails"],
          playlistId,
          maxResults: 50, // Get latest 50 videos
        });

        results.apiCalls++;
        results.playlistsChecked++;

        const videoIds = (response.data.items || [])
          .map((item) => item.contentDetails?.videoId)
          .filter(Boolean) as string[];

        allPlaylistVideos.set(playlistId, videoIds);

        // Check if any of our videos are in this playlist
        const foundCount = needsAssignment.filter((v) =>
          videoIds.includes(v.videoId)
        ).length;

        if (foundCount > 0) {
          logger.success(
            `Playlist ${playlistId} contains ${foundCount} of our videos`
          );
        }
      } catch (error: any) {
        const errorMsg = `Playlist ${playlistId} fetch failed: ${error.message}`;
        logger.error(errorMsg);
        results.errors.push(errorMsg); // Now properly typed as string[]
      }
    }

    // Assign each video to its playlists
    for (const video of needsAssignment) {
      results.videosProcessed++;
      const foundInPlaylists: string[] = [];

      // Check which playlists contain this video
      for (const [playlistId, videoIds] of allPlaylistVideos.entries()) {
        if (videoIds.includes(video.videoId)) {
          foundInPlaylists.push(playlistId);
        }
      }

      // Update the video
      if (foundInPlaylists.length > 0) {
        await prisma.videos.update({
          where: { id: video.id },
          data: {
            playlists: foundInPlaylists,
            playlistsUpdatedAt: new Date(),
            syncVersion: 2, // Mark as successfully synced
          },
        });

        // Increment itemCount for each playlist the video was added to
        for (const playlistId of foundInPlaylists) {
          try {
            await prisma.playlist.update({
              where: { playlistId },
              data: {
                itemCount: { increment: 1 },
                updatedAt: new Date(),
              },
            });
            logger.debug(`Incremented count for playlist ${playlistId}`);
          } catch (err: any) {
            // Don't fail the whole operation if count update fails
            logger.error(
              `Failed to increment count for playlist ${playlistId}`,
              {
                error: err.message,
              }
            );
          }
        }

        results.videosAssigned++;

        logger.success(
          `Assigned "${video.title}" to ${foundInPlaylists.length} playlist(s)`,
          {
            videoId: video.videoId,
            playlists: foundInPlaylists,
            ageInHours: Math.round(
              (Date.now() - video.publishedAt.getTime()) / 3600000
            ),
          }
        );
      } else {
        // Mark as checked but no playlists found yet
        await prisma.videos.update({
          where: { id: video.id },
          data: {
            playlistsUpdatedAt: new Date(),
            syncVersion: { increment: 1 }, // Increment attempt counter
          },
        });

        const ageInMinutes = Math.round(
          (Date.now() - video.publishedAt.getTime()) / 60000
        );
        logger.info(
          `No playlists yet for "${video.title}" (${ageInMinutes} mins old)`
        );
      }
    }

    // Clear cache if we assigned videos
    if (results.videosAssigned > 0) {
      try {
        // Try to clear cache - use whatever method works in your setup
        const endpoints = [
          {
            url: "/api/cache/purge-cdn",
            token: process.env.CACHE_PURGE_TOKEN,
          },
          {
            url: "/api/videos/gallery",
            token: process.env.CRON_SECRET_KEY,
            params: "?action=clear-cache",
          },
        ];

        for (const endpoint of endpoints) {
          if (!endpoint.token) continue;

          try {
            const url = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}${endpoint.url}${endpoint.params || ""}`;
            await fetch(url, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${endpoint.token}`,
                "x-cron-key": endpoint.token,
              },
            });
            logger.info(`Cache cleared via ${endpoint.url}`);
            break; // Stop after first successful clear
          } catch (e) {
            // Try next method
          }
        }
      } catch (e) {
        logger.warn("Cache clear failed - will clear on next request");
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
