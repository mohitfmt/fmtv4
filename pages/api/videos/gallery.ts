// pages/api/videos/gallery.ts
// Updated version that fetches configuration from MongoDB
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { LRUCache } from "lru-cache";

// Cache configuration - keep existing
const galleryCache = new LRUCache<string, any>({
  max: 10,
  ttl: 1000 * 60 * 5, // 5 minutes
  allowStale: false,
  updateAgeOnGet: false,
});

// IMPORTANT: Keep the exact same transform function to maintain compatibility
function transformVideo(video: any) {
  return {
    videoId: video.videoId,
    title: video.title,
    description: video.description,
    publishedAt: video.publishedAt.toISOString(), // Convert Date to string for serialization
    channelId: video.channelId,
    // Note: channelTitle is NOT part of the Video type, so we don't include it here
    thumbnails: video.thumbnails || {},
    duration: video.contentDetails?.duration || "",
    durationSeconds: video.contentDetails?.durationSeconds || 0,
    statistics: video.statistics || {
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
    },
    isShort: video.isShort || false,
    tier: video.tier || "standard",
    tags: video.tags || [],
    categoryId: video.categoryId || "",
    playlists: video.playlists || [],
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fresh = "false" } = req.query;
  const cacheKey = "gallery-main";

  // Check cache first (unless fresh is requested)
  if (fresh !== "true") {
    const cached = galleryCache.get(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600");
      return res.status(200).json(cached);
    }
  }

  try {
    // Get configuration from MongoDB
    const config = await prisma.videoConfig.findFirst();

    let heroPlaylistId: string;
    let shortsPlaylistId: string;
    let displayedPlaylists: any[];

    if (config) {
      // Use configuration from database
      heroPlaylistId = config.heroPlaylist;
      shortsPlaylistId = config.shortsPlaylist;
      displayedPlaylists = (config.displayedPlaylists as any[]) || [];
    } else {
      // Fallback to default playlists if no config exists
      const defaultPlaylists = await prisma.playlist.findMany({
        where: { isActive: true },
        orderBy: { itemCount: "desc" },
        take: 8,
      });

      if (defaultPlaylists.length === 0) {
        return res.status(500).json({
          error: "No playlists configured",
          message:
            "Please configure playlists in admin panel or sync from YouTube",
        });
      }

      // Use first playlist as hero, look for shorts playlist
      heroPlaylistId = defaultPlaylists[0].playlistId;
      const shortsPlaylist = defaultPlaylists.find(
        (p) =>
          p.title.toLowerCase().includes("short") ||
          p.title.toLowerCase().includes("reel")
      );
      shortsPlaylistId =
        shortsPlaylist?.playlistId ||
        defaultPlaylists[1]?.playlistId ||
        heroPlaylistId;

      // Use first 5-8 playlists as displayed
      displayedPlaylists = defaultPlaylists.slice(0, 6).map((p, index) => ({
        playlistId: p.playlistId,
        position: index + 1,
        enabled: true,
        maxVideos: 10,
      }));
    }

    // Filter and sort displayed playlists
    const activePlaylists = displayedPlaylists
      .filter((p) => p.enabled !== false)
      .sort((a, b) => a.position - b.position);

    // Build queries
    const queries: Promise<any>[] = [];
    const playlistMetaMap = new Map<
      string,
      { title: string; position: number }
    >();

    // 1. Total video count
    queries.push(prisma.videos.count());

    // 2. Hero videos (featured content)
    queries.push(
      prisma.videos.findMany({
        where: {
          playlists: { has: heroPlaylistId },
        },
        orderBy: [
          { tier: "asc" }, // hot/trending first
          { publishedAt: "desc" },
        ],
        take: 10,
      })
    );

    // 3. Shorts
    queries.push(
      prisma.videos.findMany({
        where: {
          playlists: { has: shortsPlaylistId },
          isShort: true,
        },
        orderBy: { publishedAt: "desc" },
        take: 12,
      })
    );

    // 4. Today's new videos
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    queries.push(
      prisma.videos.count({
        where: {
          publishedAt: { gte: today },
        },
      })
    );

    // 5. Fetch videos for each configured playlist
    for (const playlistConfig of activePlaylists) {
      const playlistMeta = await prisma.playlist.findFirst({
        where: { playlistId: playlistConfig.playlistId },
        select: { title: true, playlistId: true },
      });

      if (playlistMeta) {
        playlistMetaMap.set(playlistConfig.playlistId, {
          title: playlistMeta.title,
          position: playlistConfig.position,
        });

        queries.push(
          prisma.videos.findMany({
            where: {
              playlists: { has: playlistConfig.playlistId },
            },
            orderBy: { publishedAt: "desc" },
            take: playlistConfig.maxVideos || 10,
          })
        );
      }
    }

    // Execute all queries in parallel
    const results = await Promise.all(queries);

    // Destructure results
    const [totalCount, heroVideos, shorts, todayVideos, ...playlistResults] =
      results;

    // Build playlists object - maintaining exact structure for compatibility
    const playlists: any = {};
    let resultIndex = 0;

    for (const playlistConfig of activePlaylists) {
      const meta = playlistMetaMap.get(playlistConfig.playlistId);
      if (meta && playlistResults[resultIndex]) {
        const videos = playlistResults[resultIndex] as any[];
        playlists[playlistConfig.playlistId] = {
          name: meta.title,
          videos: videos.map(transformVideo),
        };
        resultIndex++;
      }
    }

    // Build response - exact same structure as original
    const responseData = {
      hero: Array.isArray(heroVideos) ? heroVideos.map(transformVideo) : [],
      shorts: Array.isArray(shorts) ? shorts.map(transformVideo) : [],
      playlists,
      stats: {
        totalVideos: totalCount,
        todayViews: 0, // Calculate from analytics if needed
        newToday: todayVideos,
      },
    };

    // Cache the response
    galleryCache.set(cacheKey, responseData);

    // Set headers
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=86400");

    return res.status(200).json(responseData);
  } catch (error: any) {
    console.error("[Video Gallery API] Error:", error);
    galleryCache.clear();

    return res.status(500).json({
      error: "Failed to fetch video data",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

// Export cache clear function for use in other modules
export function clearVideoCache() {
  galleryCache.clear();
  console.log("[Video Gallery API] Cache cleared");
}
