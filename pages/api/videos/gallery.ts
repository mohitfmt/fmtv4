// pages/api/videos/gallery.ts
// Reads playlist configuration from VideoConfig in MongoDB
// Shorts = ANY videos in the designated shorts playlist (duration doesn't matter)

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { galleryCache } from "@/lib/cache/video-cache-registry";

// Transform video data to match frontend expectations
function transformVideo(video: any): any {
  return {
    videoId: video.videoId,
    title: video.title,
    description:
      video.description?.substring(0, 200) +
      (video.description?.length > 200 ? "..." : ""),
    publishedAt: video.publishedAt,
    channelId: video.channelId || "",
    channelTitle: video.channelTitle || "",
    thumbnails: video.thumbnails || {},
    duration: video.contentDetails?.duration || "PT0S",
    durationSeconds: video.contentDetails?.durationSeconds || 0,
    statistics: {
      viewCount: String(video.statistics?.viewCount || 0),
      likeCount: String(video.statistics?.likeCount || 0),
      commentCount: String(video.statistics?.commentCount || 0),
    },
    isShort: video.isShort || false,
    playlists: video.playlists || [],
    categoryId: video.categoryId || "",
    tags: video.tags || [],
    tier: video.tier || "standard",
  };
}

// Base filter for all video queries - ensures only public, active videos
function getBaseVideoFilter(search?: string) {
  const baseFilter: any = {
    isActive: true,
    status: {
      is: {
        privacyStatus: "public",
        uploadStatus: "processed",
      },
    },
  };

  // Add search if provided
  if (search && search.trim()) {
    baseFilter.OR = [
      { title: { contains: search.trim(), mode: "insensitive" } },
      { description: { contains: search.trim(), mode: "insensitive" } },
      { tags: { has: search.trim() } },
    ];
  }

  return baseFilter;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse query parameters
    const {
      fresh = "false",
      search = "",
      page = "1",
      limit = "12",
    } = req.query;

    const shouldRefresh = fresh === "true";
    const searchTerm = String(search).trim();
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit)) || 12));
    const skip = (pageNum - 1) * limitNum;

    // Cache key includes search and pagination
    const cacheKey = `gallery:${searchTerm}:${pageNum}:${limitNum}`;

    // Check cache first (unless fresh data requested)
    if (!shouldRefresh && !searchTerm) {
      const cached = galleryCache.get(cacheKey);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=180");
        return res.status(200).json(cached);
      }
    }

    // FIXED: Get playlist configurations from database instead of hardcoded values
    const videoConfig = await prisma.videoConfig.findFirst();

    if (!videoConfig) {
      console.error("[Gallery API] No video configuration found in database");
      return res.status(500).json({
        error: "Video configuration not found",
        message: "Please configure video settings in admin panel",
        timestamp: new Date().toISOString(),
      });
    }

    const heroPlaylistId = videoConfig.heroPlaylist;
    const shortsPlaylistId = videoConfig.shortsPlaylist;

    const shortsPlaylistInfo = await prisma.playlist.findFirst({
      where: { playlistId: shortsPlaylistId },
    });
    const shortsTotalCount = shortsPlaylistInfo?.itemCount || 0;

    // Type cast the Json field to expected structure
    interface PlaylistConfig {
      playlistId: string;
      position: number;
      maxVideos: number;
    }

    const playlistConfigs: PlaylistConfig[] = Array.isArray(
      videoConfig.displayedPlaylists
    )
      ? ((videoConfig.displayedPlaylists as any[]).filter(
          (item) => item && typeof item === "object" && "playlistId" in item
        ) as PlaylistConfig[])
      : [];

    // Build base filter
    const baseFilter = getBaseVideoFilter(searchTerm);

    // Fetch data in parallel for performance
    const queries: Promise<any>[] = [];

    // 1. Total count for stats (with filter)
    queries.push(
      prisma.videos.count({
        where: baseFilter,
      })
    );

    // 2. Hero section - Latest videos from hero playlist
    queries.push(
      prisma.videos.findMany({
        where: {
          ...baseFilter,
          playlists: searchTerm ? undefined : { has: heroPlaylistId },
        },
        orderBy: { publishedAt: "desc" }, // LATEST VIDEOS FIRST, no tier
        take: 6,
      })
    );

    // 3. Shorts - Simply get videos from shorts playlist (no duration filtering)
    if (!searchTerm && shortsPlaylistId) {
      queries.push(
        prisma.videos.findMany({
          where: {
            ...baseFilter,
            playlists: { has: shortsPlaylistId },
          },
          orderBy: { publishedAt: "desc" },
          take: 12,
        })
      );
    } else {
      queries.push(Promise.resolve([])); // Empty shorts when searching
    }

    // 4. Today's new videos count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    queries.push(
      prisma.videos.count({
        where: {
          ...baseFilter,
          publishedAt: { gte: today },
        },
      })
    );

    // 5. Fetch videos for each playlist (with pagination)
    const playlistQueries: Promise<any>[] = [];
    const playlistMetaMap = new Map<
      string,
      { title: string; position: number; maxVideos: number }
    >();

    if (!searchTerm) {
      // Normal playlist loading when not searching
      for (const config of playlistConfigs) {
        const playlistMeta = await prisma.playlist.findFirst({
          where: {
            playlistId: config.playlistId,
            isActive: true,
          },
          select: { title: true, playlistId: true },
        });

        if (playlistMeta) {
          playlistMetaMap.set(config.playlistId, {
            title: playlistMeta.title,
            position: config.position,
            maxVideos: config.maxVideos || 12,
          });

          // Paginated query for each playlist
          playlistQueries.push(
            prisma.videos.findMany({
              where: {
                ...baseFilter,
                playlists: { has: config.playlistId },
              },
              orderBy: { publishedAt: "desc" },
              take: config.maxVideos || limitNum,
              skip: 0, // Always start from beginning for each playlist
            })
          );

          // Count total for this playlist
          playlistQueries.push(
            prisma.videos.count({
              where: {
                ...baseFilter,
                playlists: { has: config.playlistId },
              },
            })
          );
        }
      }
    } else {
      // When searching, just get paginated search results
      playlistQueries.push(
        prisma.videos.findMany({
          where: baseFilter,
          orderBy: { publishedAt: "desc" },
          take: limitNum * 3,
          skip: skip,
        })
      );
    }

    // Execute all queries in parallel
    const [totalCount, heroVideos, shorts, todayVideos, ...playlistResults] =
      await Promise.all([...queries, ...playlistQueries]);

    // Build playlists object
    const playlists: any = {};

    if (!searchTerm) {
      // Normal playlist structure
      let resultIndex = 0;
      for (const config of playlistConfigs) {
        const meta = playlistMetaMap.get(config.playlistId);
        if (meta && playlistResults[resultIndex]) {
          const videos = playlistResults[resultIndex] as any[];
          const total = playlistResults[resultIndex + 1] as number;

          playlists[config.playlistId] = {
            name: meta.title,
            videos: videos.map(transformVideo),
            pagination: {
              page: 1, // Each playlist starts from page 1
              limit: meta.maxVideos,
              total: total,
              hasMore: meta.maxVideos < total,
            },
          };
          resultIndex += 2;
        }
      }
    } else {
      // Search results as single "playlist"
      const searchResults = playlistResults[0] as any[];
      playlists.searchResults = {
        name: `Search Results for "${searchTerm}"`,
        videos: searchResults.map(transformVideo),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          hasMore: skip + limitNum < totalCount,
        },
      };
    }

    // Build response
    const responseData = {
      hero: Array.isArray(heroVideos) ? heroVideos.map(transformVideo) : [],
      shorts: Array.isArray(shorts) ? shorts.map(transformVideo) : [],
      shortsTotalCount,
      playlists,
      stats: {
        totalVideos: totalCount,
        todayViews: 0, // Would need analytics integration
        newToday: todayVideos,
      },
      search: {
        term: searchTerm || null,
        results: searchTerm ? totalCount : null,
      },
      pagination: {
        current: pageNum,
        limit: limitNum,
        total: Math.ceil(totalCount / limitNum),
      },
      timestamp: new Date().toISOString(),
    };

    // Cache the response (only for non-search results)
    if (!searchTerm) {
      galleryCache.set(cacheKey, responseData);
    }

    // Set cache headers
    res.setHeader("X-Cache", searchTerm ? "BYPASS" : "MISS");
    res.setHeader(
      "Cache-Control",
      searchTerm
        ? "private, no-cache"
        : "public, max-age=60, s-maxage=180, stale-while-revalidate=86400"
    );
    res.setHeader("Cache-Tag", "video:gallery,video:latest");

    return res.status(200).json(responseData);
  } catch (error: any) {
    console.error("[Video Gallery API] Error:", error);

    // Clear cache on error
    if (error.message?.includes("cache")) {
      galleryCache.clear();
    }

    return res.status(500).json({
      error: "Failed to fetch video data",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}

// Export cache utilities
export function invalidateGalleryCache() {
  galleryCache.clear();
  console.log("[Gallery API] Cache invalidated");
}
