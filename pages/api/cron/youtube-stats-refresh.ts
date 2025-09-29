// pages/api/cron/youtube-stats-refresh-enhanced.ts
// Enhanced version with health monitoring - REPLACE existing youtube-stats-refresh.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma"; // Use singleton
import { google } from "googleapis";
import { invalidateGalleryCache } from "@/pages/api/videos/gallery";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

// Helper to safely convert BigInt to number
function safeNumber(value: any): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return parseInt(value) || 0;
  return value || 0;
}

// Calculate engagement rate
function getEngagementRate(
  views: number,
  likes: number,
  comments: number
): number {
  if (views === 0) return 0;
  return ((likes + comments) / views) * 100;
}

// Calculate tier based on performance (keeping existing logic)
function calculateTier(
  viewCount: number,
  ageInHours: number,
  isShort: boolean
): string {
  const velocity = viewCount / Math.max(1, ageInHours);

  if (isShort) {
    if (velocity >= 100 || viewCount > 10000) return "viral-short";
    if (velocity >= 50 || viewCount > 5000) return "popular-short";
  }

  if (ageInHours < 24) {
    if (viewCount > 10000) return "hot";
    if (viewCount > 5000) return "trending";
    if (viewCount > 1000) return "A";
  } else if (ageInHours < 72) {
    if (viewCount > 50000) return "hot";
    if (viewCount > 20000) return "trending";
    if (viewCount > 5000) return "A";
  } else {
    if (viewCount > 100000) return "hot";
    if (viewCount > 50000) return "trending";
    if (viewCount > 10000) return "A";
  }

  return "standard";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Authorization check
  const authHeader = req.headers.authorization;
  const cronKey = req.query.key || req.headers["x-cron-key"];
  const isAuthorized =
    authHeader?.startsWith("Bearer ") ||
    cronKey === process.env.CRON_SECRET_KEY;

  if (!isAuthorized) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const startTime = Date.now();
  const results = {
    videosUpdated: 0,
    videosDeactivated: 0,
    videosReactivated: 0,
    errors: [] as string[],
    healthChecks: {
      totalVideos: 0,
      activeVideos: 0,
      privateVideos: 0,
      brokenPercentage: 0,
    },
  };

  try {
    console.log("[Stats Refresh] Starting video stats and health check...");

    // 1. Get recent videos and videos that need checking
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days

    const [recentVideos, suspectVideos] = await Promise.all([
      // Recent active videos for stats update
      prisma.videos.findMany({
        where: {
          isActive: true,
          publishedAt: { gte: cutoffDate },
          status: {
            is: {
              privacyStatus: "public",
              uploadStatus: "processed",
            },
          },
        },
        orderBy: { publishedAt: "desc" },
        take: 50,
        select: {
          videoId: true,
          publishedAt: true,
          isShort: true,
          tier: true,
        },
      }),

      // Videos that might be private/deleted (not updated recently)
      prisma.videos.findMany({
        where: {
          isActive: true,
          lastSyncedAt: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Not synced in 7 days
          },
        },
        take: 50,
        select: { videoId: true },
      }),
    ]);

    const allVideoIds = [
      ...recentVideos.map((v) => v.videoId),
      ...suspectVideos.map((v) => v.videoId),
    ];

    if (allVideoIds.length === 0) {
      console.log("[Stats Refresh] No videos to update");
      return res.status(200).json({
        success: true,
        message: "No videos to update",
        results,
      });
    }

    // 2. Batch fetch from YouTube API (max 50 per request)
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < allVideoIds.length; i += batchSize) {
      batches.push(allVideoIds.slice(i, i + batchSize));
    }

    const youtubeResponses = await Promise.all(
      batches.map((batch) =>
        youtube.videos.list({
          id: batch,
          part: ["statistics", "status", "snippet", "contentDetails"],
        })
      )
    );

    // 3. Process responses and update database
    const foundVideoIds = new Set<string>();

    for (const response of youtubeResponses) {
      const videoItems = response.data.items || [];

      for (const videoData of videoItems) {
        if (!videoData.id) continue;

        foundVideoIds.add(videoData.id);

        // Check video status
        const privacyStatus = videoData.status?.privacyStatus;
        const isPublic = privacyStatus === "public";
        const uploadStatus = videoData.status?.uploadStatus;
        const isProcessed =
          uploadStatus === "processed" || uploadStatus === "uploaded";

        if (!isPublic || !isProcessed) {
          // Video is private/deleted - deactivate it
          await prisma.videos.updateMany({
            where: { videoId: videoData.id },
            data: {
              isActive: false,
              status: {
                privacyStatus: privacyStatus || "unknown",
                uploadStatus: uploadStatus || "unknown",
                embeddable: videoData.status?.embeddable || false,
                license: videoData.status?.license || "youtube",
                publicStatsViewable:
                  videoData.status?.publicStatsViewable || false,
                madeForKids: videoData.status?.madeForKids || false,
              },
              lastSyncedAt: new Date(),
            },
          });
          results.videosDeactivated++;
          console.log(
            `[Stats Refresh] Deactivated private/deleted video: ${videoData.id}`
          );
          continue;
        }

        // Update statistics and tier for public videos
        const viewCount = safeNumber(videoData.statistics?.viewCount);
        const likeCount = safeNumber(videoData.statistics?.likeCount);
        const commentCount = safeNumber(videoData.statistics?.commentCount);

        // Find original video data for tier calculation
        const originalVideo = recentVideos.find(
          (v) => v.videoId === videoData.id
        );
        if (originalVideo) {
          const ageInHours =
            (Date.now() - originalVideo.publishedAt.getTime()) /
            (1000 * 60 * 60);
          const tier = calculateTier(
            viewCount,
            ageInHours,
            originalVideo.isShort
          );
          const engagementRate = getEngagementRate(
            viewCount,
            likeCount,
            commentCount
          );

          await prisma.videos.updateMany({
            where: { videoId: videoData.id },
            data: {
              statistics: {
                viewCount,
                likeCount,
                commentCount,
              },
              tier,
              popularityScore: Math.floor(engagementRate * 1000),
              isActive: true,
              status: {
                privacyStatus: "public",
                uploadStatus: uploadStatus || "processed",
                embeddable: videoData.status?.embeddable || true,
                license: videoData.status?.license || "youtube",
                publicStatsViewable:
                  videoData.status?.publicStatsViewable || true,
                madeForKids: videoData.status?.madeForKids || false,
              },
              lastSyncedAt: new Date(),
            },
          });
          results.videosUpdated++;
        }
      }
    }

    // 4. Handle videos not found in YouTube (likely deleted)
    const missingVideos = allVideoIds.filter((id) => !foundVideoIds.has(id));

    if (missingVideos.length > 0) {
      console.log(
        `[Stats Refresh] ${missingVideos.length} videos not found, marking as inactive`
      );

      await prisma.videos.updateMany({
        where: {
          videoId: { in: missingVideos },
        },
        data: {
          isActive: false,
          status: {
            privacyStatus: "private",
            uploadStatus: "deleted",
            embeddable: false,
            license: "youtube",
            publicStatsViewable: false,
            madeForKids: false,
          },
          lastSyncedAt: new Date(),
        },
      });

      results.videosDeactivated += missingVideos.length;
    }

    // 5. Check for previously inactive videos that are now public
    const inactiveCheck = await prisma.videos.findMany({
      where: {
        isActive: false,
        lastSyncedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Check daily
        },
      },
      take: 20,
      select: { videoId: true },
    });

    if (inactiveCheck.length > 0) {
      const checkResponse = await youtube.videos.list({
        id: inactiveCheck.map((v) => v.videoId),
        part: ["status"],
      });

      for (const video of checkResponse.data.items || []) {
        if (video.status?.privacyStatus === "public") {
          await prisma.videos.updateMany({
            where: { videoId: video.id! },
            data: {
              isActive: true,
              status: {
                privacyStatus: "public",
                uploadStatus: video.status.uploadStatus || "processed",
                embeddable: video.status.embeddable || true,
                license: video.status.license || "youtube",
                publicStatsViewable: video.status.publicStatsViewable || true,
                madeForKids: video.status.madeForKids || false,
              },
              lastSyncedAt: new Date(),
            },
          });
          results.videosReactivated++;
          console.log(`[Stats Refresh] Reactivated video: ${video.id}`);
        }
      }
    }

    // 6. Calculate health metrics
    const [totalVideos, activeVideos, privateVideos] = await Promise.all([
      prisma.videos.count(),
      prisma.videos.count({
        where: {
          isActive: true,
          status: {
            is: {
              privacyStatus: "public",
            },
          },
        },
      }),
      prisma.videos.count({
        where: {
          OR: [
            { isActive: false },
            {
              status: {
                isNot: {
                  privacyStatus: "public",
                },
              },
            },
          ],
        },
      }),
    ]);

    results.healthChecks = {
      totalVideos,
      activeVideos,
      privateVideos,
      brokenPercentage:
        totalVideos > 0 ? Math.round((privateVideos / totalVideos) * 100) : 0,
    };

    // 7. Clear cache if changes were made
    if (results.videosDeactivated > 0 || results.videosReactivated > 0) {
      invalidateGalleryCache();
      console.log(
        "[Stats Refresh] Cache invalidated due to video status changes"
      );
    }

    // 8. Log the activity
    await prisma.admin_activity_logs.create({
      data: {
        action: "VIDEO_STATS_REFRESH",
        entityType: "system",
        userId: "cron",
        metadata: {
          ...results,
          duration: Date.now() - startTime,
        },
      },
    });

    console.log("[Stats Refresh] Completed:", results);

    return res.status(200).json({
      success: true,
      message: "Stats refresh and health check completed",
      results,
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Stats Refresh] Error:", error);

    return res.status(500).json({
      success: false,
      error: "Stats refresh failed",
      message: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  }
}
