// pages/api/homepage.ts - WITH PINNED HERO VIDEO SUPPORT
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

    const skipCache = req.query.fresh === "true";

    if (!skipCache) {
      const cached = homepageCache.get(cacheKey);

      if (cached) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader(
          "Cache-Control",
          "public, max-age=10, s-maxage=30, stale-while-revalidate=60"
        );
        return res.status(200).json({
          success: true,
          data: cached,
          cached: true,
          traceId,
        });
      }
    }

    // Get video configuration (including pinned hero settings)
    const config = await prisma.videoConfig.findFirst({
      select: {
        homepagePlaylist: true,
        usePinnedHero: true,
        pinnedHeroVideoId: true,
      },
    });

    if (!config?.homepagePlaylist) {
      // No configuration - return latest videos
      const latestVideos = await getLatestVideos(MINIMUM_HOMEPAGE_VIDEOS);

      const responseData = {
        videos: latestVideos.map(formatVideo),
        source: "latest",
        message: "No homepage playlist configured, showing latest videos",
      };

      homepageCache.set(cacheKey, responseData);
      res.setHeader("X-Cache", "MISS");
      res.setHeader(
        "Cache-Control",
        "public, max-age=10, s-maxage=30, stale-while-revalidate=60"
      );
      return res.status(200).json({
        success: true,
        data: responseData,
        traceId,
      });
    }

    // ========================================================================
    // PINNED HERO VIDEO LOGIC
    // ========================================================================
    let finalVideos: any[] = [];
    let supplementCount = 0;
    let source = "playlist";
    let usedPinnedHero = false;

    // Check if pinned hero is enabled and configured
    if (config.usePinnedHero && config.pinnedHeroVideoId) {
      console.log(
        `[${traceId}] Pinned hero enabled, fetching video: ${config.pinnedHeroVideoId}`
      );

      try {
        // Fetch the pinned hero video
        const pinnedVideo = await prisma.videos.findFirst({
          where: {
            videoId: config.pinnedHeroVideoId,
            isActive: true,
          },
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

        if (pinnedVideo) {
          // Get 4 more videos from playlist EXCLUDING the pinned one
          const otherVideos = await prisma.videos.findMany({
            where: {
              playlists: { has: config.homepagePlaylist },
              isActive: true,
              videoId: { not: config.pinnedHeroVideoId }, // 🔥 No duplicates
            },
            orderBy: [{ publishedAt: "desc" }],
            take: 4,
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

          // Combine: pinned video first, then other 4
          finalVideos = [pinnedVideo, ...otherVideos];
          source = "pinned";
          usedPinnedHero = true;

          console.log(
            `[${traceId}] Using pinned hero: "${pinnedVideo.title}" + ${otherVideos.length} other videos`
          );
        } else {
          console.warn(
            `[${traceId}] Pinned video ${config.pinnedHeroVideoId} not found or inactive, falling back to playlist`
          );
        }
      } catch (error) {
        console.error(
          `[${traceId}] Error fetching pinned video, falling back to playlist:`,
          error
        );
      }
    }

    // ========================================================================
    // FALLBACK: Use regular playlist logic if pinned hero not used/failed
    // ========================================================================
    if (finalVideos.length === 0) {
      console.log(`[${traceId}] Using regular playlist logic`);

      const playlistVideos = await prisma.videos.findMany({
        where: {
          playlists: { has: config.homepagePlaylist },
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

      finalVideos = playlistVideos;
    }

    // ========================================================================
    // SUPPLEMENT: Add more videos if less than minimum
    // ========================================================================
    const originalCount = finalVideos.length;

    if (finalVideos.length < MINIMUM_HOMEPAGE_VIDEOS) {
      const needed = MINIMUM_HOMEPAGE_VIDEOS - finalVideos.length;
      console.log(
        `[${traceId}] Only ${finalVideos.length} videos, supplementing with ${needed} latest videos`
      );

      // Get video IDs we already have (including pinned hero if used)
      const existingVideoIds = new Set(finalVideos.map((v) => v.videoId));

      // Get latest videos that aren't already in our list
      const supplementalVideos = await getLatestVideos(
        needed + 10, // Get extra to ensure we have enough after filtering
        existingVideoIds
      );

      // Take only what we need
      const videosToAdd = supplementalVideos.slice(0, needed);
      supplementCount = videosToAdd.length;

      // Combine with supplemental videos
      finalVideos = [...finalVideos, ...videosToAdd];

      // Update source
      if (source === "pinned") {
        source = "pinned+supplement";
      } else {
        source = "mixed";
      }

      // Log the supplementation
      await prisma.admin_activity_logs
        .create({
          data: {
            action: "HOMEPAGE_VIDEO_SUPPLEMENT",
            entityType: "homepage",
            userId: "system",
            metadata: {
              playlistId: config.homepagePlaylist,
              playlistVideoCount: originalCount,
              supplementedCount: supplementCount,
              totalVideos: finalVideos.length,
              usedPinnedHero: usedPinnedHero,
              pinnedVideoId: config.pinnedHeroVideoId || null,
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
      playlistVideoCount: originalCount,
      supplementedVideoCount: supplementCount,
      totalVideos: finalVideos.length,
      usedPinnedHero: usedPinnedHero,
      pinnedVideoId: usedPinnedHero ? config.pinnedHeroVideoId : null,
      ...(supplementCount > 0 && {
        message: `Showing ${originalCount} ${source.includes("pinned") ? "pinned+playlist" : "playlist"} videos + ${supplementCount} latest videos`,
      }),
    };

    // Cache the response
    homepageCache.set(cacheKey, responseData);
    res.setHeader("X-Cache", "MISS");
    res.setHeader(
      "Cache-Control",
      "public, max-age=10, s-maxage=30, stale-while-revalidate=60"
    );
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

export { homepageCache };
