// pages/api/cron/youtube-rapid-assign.ts
// MODIFIED VERSION - Added ISR revalidation logic at the end

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

    // Extract playlist IDs
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
          maxResults: 50,
        });

        results.apiCalls++;
        results.playlistsChecked++;

        const videoIds = (response.data.items || [])
          .map((item) => item.contentDetails?.videoId)
          .filter(Boolean) as string[];

        allPlaylistVideos.set(playlistId, videoIds);

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
        results.errors.push(errorMsg);
      }
    }

    // Assign each video to its playlists
    for (const video of needsAssignment) {
      results.videosProcessed++;
      const foundInPlaylists: string[] = [];

      for (const [playlistId, videoIds] of allPlaylistVideos.entries()) {
        if (videoIds.includes(video.videoId)) {
          foundInPlaylists.push(playlistId);
        }
      }

      if (foundInPlaylists.length > 0) {
        await prisma.videos.update({
          where: { id: video.id },
          data: {
            playlists: foundInPlaylists,
            playlistsUpdatedAt: new Date(),
            syncVersion: 2,
          },
        });

        for (const playlistId of foundInPlaylists) {
          try {
            await prisma.playlist.update({
              where: { playlistId },
              data: {
                itemCount: { increment: 1 },
                updatedAt: new Date(),
              },
            });
          } catch (err: any) {
            logger.error(
              `Failed to increment count for playlist ${playlistId}`,
              { error: err.message }
            );
          }
        }

        results.videosAssigned++;

        logger.success(
          `Assigned "${video.title}" to ${foundInPlaylists.length} playlist(s)`
        );
      } else {
        await prisma.videos.update({
          where: { id: video.id },
          data: {
            playlistsUpdatedAt: new Date(),
            syncVersion: { increment: 1 },
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
            break;
          } catch (e) {
            // Try next method
          }
        }
      } catch (e) {
        logger.warn("Cache clear failed - will clear on next request");
      }

      // 🆕 ISR REVALIDATION: Trigger page rebuilds for affected playlists
      try {
        logger.info("Triggering ISR revalidation for affected pages...");

        // Collect all affected playlist IDs
        const affectedPlaylistIds = new Set<string>();
        for (const video of needsAssignment) {
          const videoData = await prisma.videos.findFirst({
            where: { videoId: video.videoId },
            select: { playlists: true },
          });
          videoData?.playlists.forEach((pid) => affectedPlaylistIds.add(pid));
        }

        logger.debug(`Affected playlists: ${affectedPlaylistIds.size}`);

        // Determine which pages need revalidation
        const pagesToRevalidate = new Set<string>();

        for (const playlistId of affectedPlaylistIds) {
          // Homepage
          if (playlistId === feConfig.homepagePlaylist) {
            pagesToRevalidate.add("/");
            logger.debug(`Homepage affected by playlist ${playlistId}`);
          }

          // Video hub (hero)
          if (playlistId === feConfig.heroPlaylist) {
            pagesToRevalidate.add("/videos");
            logger.debug(`Video hub (hero) affected by playlist ${playlistId}`);
          }

          // Video hub (displayed playlists)
          const isDisplayed = displayed.some(
            (p: any) => p?.playlistId === playlistId
          );
          if (isDisplayed) {
            pagesToRevalidate.add("/videos");
            logger.debug(`Video hub (grid) affected by playlist ${playlistId}`);
          }

          // Shorts page
          if (playlistId === feConfig.shortsPlaylist) {
            pagesToRevalidate.add("/videos/shorts");
            pagesToRevalidate.add("/videos"); // Shorts also shown on hub
            logger.debug(`Shorts page affected by playlist ${playlistId}`);
          }

          // Individual playlist page
          const playlist = await prisma.playlist.findFirst({
            where: { playlistId },
            select: { slug: true },
          });
          if (playlist?.slug) {
            pagesToRevalidate.add(`/videos/playlist/${playlist.slug}`);
            logger.debug(
              `Playlist page /videos/playlist/${playlist.slug} affected`
            );
          }
        }

        if (pagesToRevalidate.size > 0) {
          const pathsArray = Array.from(pagesToRevalidate);
          logger.info(
            `Revalidating ${pathsArray.length} pages: ${pathsArray.join(", ")}`
          );

          // Call internal revalidation API
          const revalidateUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/internal/revalidate`;
          const revalidateSecret =
            process.env.REVALIDATE_SECRET || "ia389oidns98odisd2309qdoi2930";

          if (!revalidateSecret) {
            logger.warn(
              "REVALIDATE_SECRET not set - skipping ISR revalidation"
            );
          } else {
            const revalidateResponse = await fetch(revalidateUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-revalidate-secret": revalidateSecret,
              },
              body: JSON.stringify({
                paths: pathsArray,
              }),
            });

            if (revalidateResponse.ok) {
              const revalidateData = await revalidateResponse.json();
              logger.success("ISR revalidation triggered successfully", {
                revalidated: revalidateData.revalidated || pathsArray,
              });
            } else {
              const errorText = await revalidateResponse.text();
              logger.error("ISR revalidation failed", {
                status: revalidateResponse.status,
                error: errorText,
              });
            }
          }
        } else {
          logger.info("No pages need revalidation");
        }
      } catch (revalidateError: any) {
        // Don't fail the entire job if revalidation fails
        logger.error("ISR revalidation error (non-fatal)", {
          error: revalidateError.message,
        });
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
