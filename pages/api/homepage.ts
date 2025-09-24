// pages/api/homepage.ts - OPTIMIZED VERSION WITH AUTO-FALLBACK
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { LRUCache } from "lru-cache";

// Cache homepage data for 5 minutes
const homepageCache = new LRUCache<string, any>({
  max: 10,
  ttl: 1000 * 60 * 5, // 5 minutes
});

const MINIMUM_HOMEPAGE_VIDEOS = 5;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = `HP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Check cache first
    const cacheKey = "homepage-videos";
    const cached = homepageCache.get(cacheKey);

    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json({
        success: true,
        data: cached,
        cached: true,
        traceId,
      });
    }

    // Get video configuration
    const config = await prisma.videoConfig.findFirst({
      select: {
        homepagePlaylist: true,
      },
    });

    if (!config?.homepagePlaylist) {
      // No configuration - return latest videos
      const latestVideos = await getLatestVideos(MINIMUM_HOMEPAGE_VIDEOS);

      const responseData = {
        videos: latestVideos,
        source: "latest",
        message: "No homepage playlist configured, showing latest videos",
      };

      homepageCache.set(cacheKey, responseData);
      res.setHeader("X-Cache", "MISS");

      return res.status(200).json({
        success: true,
        data: responseData,
        traceId,
      });
    }

    // Get videos from the configured playlist
    const playlistVideos = await prisma.videos.findMany({
      where: {
        playlists: {
          has: config.homepagePlaylist,
        },
        isActive: true,
      },
      orderBy: [{ publishedAt: "desc" }],
      take: MINIMUM_HOMEPAGE_VIDEOS,
      select: {
        id: true,
        videoId: true,
        title: true,
        description: true,
        thumbnails: true,
        channelTitle: true,
        publishedAt: true,
        statistics: true,
        contentDetails: true,
        isShort: true,
        videoType: true,
      },
    });

    let finalVideos = playlistVideos;
    let supplementCount = 0;
    let source = "playlist";

    // Check if we need to supplement with latest videos
    if (playlistVideos.length < MINIMUM_HOMEPAGE_VIDEOS) {
      const needed = MINIMUM_HOMEPAGE_VIDEOS - playlistVideos.length;
      console.log(
        `[${traceId}] Homepage playlist has only ${playlistVideos.length} videos, supplementing with ${needed} latest videos`
      );

      // Get video IDs we already have
      const existingVideoIds = new Set(playlistVideos.map((v) => v.videoId));

      // Get latest videos that aren't already in our list
      const supplementalVideos = await getLatestVideos(
        needed + 10, // Get extra to ensure we have enough after filtering
        existingVideoIds
      );

      // Take only what we need
      const videosToAdd = supplementalVideos.slice(0, needed);
      supplementCount = videosToAdd.length;

      // Combine playlist videos with supplemental videos
      finalVideos = [...playlistVideos, ...videosToAdd];
      source = "mixed";

      // Log the supplementation
      await prisma.admin_activity_logs
        .create({
          data: {
            action: "HOMEPAGE_VIDEO_SUPPLEMENT",
            entityType: "homepage",
            userId: "system",
            metadata: {
              playlistId: config.homepagePlaylist,
              playlistVideoCount: playlistVideos.length,
              supplementedCount: supplementCount,
              totalVideos: finalVideos.length,
            },
          },
        })
        .catch(console.error); // Don't fail the request if logging fails
    }

    // Prepare response data
    const responseData = {
      videos: finalVideos.map(formatVideo),
      source,
      playlistId: config.homepagePlaylist,
      playlistVideoCount: playlistVideos.length,
      supplementedVideoCount: supplementCount,
      totalVideos: finalVideos.length,
      ...(supplementCount > 0 && {
        message: `Showing ${playlistVideos.length} playlist videos + ${supplementCount} latest videos`,
      }),
    };

    // Cache the response
    homepageCache.set(cacheKey, responseData);
    res.setHeader("X-Cache", "MISS");

    return res.status(200).json({
      success: true,
      data: responseData,
      traceId,
    });
  } catch (error) {
    console.error(`[${traceId}] Homepage API error:`, error);

    return res.status(500).json({
      success: false,
      error: "Failed to fetch homepage videos",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
    });
  }
}

// Helper to get latest videos
async function getLatestVideos(
  limit: number,
  excludeVideoIds?: Set<string>
): Promise<any[]> {
  const whereClause: any = {
    isActive: true,
  };

  // Exclude specific video IDs if provided
  if (excludeVideoIds && excludeVideoIds.size > 0) {
    whereClause.videoId = {
      notIn: Array.from(excludeVideoIds),
    };
  }

  return await prisma.videos.findMany({
    where: whereClause,
    orderBy: [{ publishedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      videoId: true,
      title: true,
      description: true,
      thumbnails: true,
      channelTitle: true,
      publishedAt: true,
      statistics: true,
      contentDetails: true,
      isShort: true,
      videoType: true,
    },
  });
}

// Format video for response
function formatVideo(video: any) {
  const stats = video.statistics || {};
  const contentDetails = video.contentDetails || {};

  return {
    id: video.videoId,
    title: video.title,
    description:
      video.description?.substring(0, 200) +
      (video.description?.length > 200 ? "..." : ""),
    thumbnail:
      video.thumbnails?.high?.url ||
      video.thumbnails?.medium?.url ||
      video.thumbnails?.default?.url,
    thumbnails: video.thumbnails,
    channelTitle: video.channelTitle,
    publishedAt: video.publishedAt,
    viewCount: stats.viewCount || 0,
    likeCount: stats.likeCount || 0,
    duration: contentDetails.duration,
    durationSeconds: contentDetails.durationSeconds || 0,
    isShort: video.isShort,
    type: video.videoType,
    url: `https://www.youtube.com/watch?v=${video.videoId}`,
  };
}

// Export config for API
export const config = {
  api: {
    responseLimit: false,
  },
};
