// pages/api/videos/gallery.ts
// Optimized version with efficient per-playlist queries

import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { youTubePlaylists } from "@/constants/youtube-playlists";

const prisma = new PrismaClient();

// LRU Cache
class LRUCache<T> {
  private cache: Map<string, { data: T; timestamp: number }>;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 100, ttl = 300000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    this.cache.delete(key);
    this.cache.set(key, item);
    return item.data;
  }

  set(key: string, data: T): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey || "");
    }

    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const galleryCache = new LRUCache<any>(10, 300000);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const cacheKey = "video:gallery:main";

  // Check cache (bypass with ?fresh=true)
  const cached = galleryCache.get(cacheKey);
  if (cached && req.query.fresh !== "true") {
    console.log("[Video Gallery API] Serving from LRU cache");
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cached);
  }

  try {
    // Get current date for today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Transform video function
    const transformVideo = (video: any) => {
      return {
        ...video,
        // Statistics is already properly structured with nested types
        statistics: {
          viewCount: String(video.statistics.viewCount || 0),
          likeCount: String(video.statistics.likeCount || 0),
          commentCount: String(video.statistics.commentCount || 0),
        },
        // ContentDetails is already properly structured
        duration: video.contentDetails.duration,
        durationSeconds: video.contentDetails.durationSeconds,
      };
    };

    // OPTIMIZED: Fetch only what we need with parallel queries
    const videosPerPlaylist = 6; // Configurable

    // Create all queries in parallel
    const queries = [
      // Total count
      prisma.videos.count(),

      // Hero videos - hot/trending tier
      prisma.videos.findMany({
        where: {
          tier: { in: ["hot", "trending"] },
          isShort: false,
        },
        orderBy: { publishedAt: "desc" },
        take: 5,
      }),

      // Shorts
      prisma.videos.findMany({
        where: { isShort: true },
        orderBy: { publishedAt: "desc" },
        take: 12,
      }),

      // Today's new videos count
      prisma.videos.count({
        where: {
          publishedAt: { gte: today },
        },
      }),

      // OPTIMIZED: Fetch videos for each playlist separately
      ...youTubePlaylists.map((playlist) =>
        prisma.videos.findMany({
          where: {
            playlists: {
              has: playlist.playlistId, // MongoDB array contains query
            },
          },
          orderBy: { publishedAt: "desc" },
          take: videosPerPlaylist,
        })
      ),
    ];

    // Execute all queries in parallel
    const results = await Promise.all(queries);

    // Destructure results
    const [
      totalCount,
      heroVideos,
      shorts,
      todayVideos,
      ...playlistResults // Rest are playlist results
    ] = results;

    // Build playlists object
    const playlists: any = {};

    youTubePlaylists.forEach((playlist, index) => {
      const playlistVideos = playlistResults[index] as any[];

      if (playlistVideos && playlistVideos.length > 0) {
        playlists[playlist.playlistId] = {
          name: playlist.name,
          videos: playlistVideos.map(transformVideo),
        };
      } else {
        // Include empty playlists with empty array
        playlists[playlist.playlistId] = {
          name: playlist.name,
          videos: [],
        };
      }
    });

    // Build response
    const responseData = {
      hero: Array.isArray(heroVideos) ? heroVideos.map(transformVideo) : [],
      shorts: Array.isArray(shorts) ? shorts.map(transformVideo) : [],
      playlists,
      stats: {
        totalVideos: totalCount,
        todayViews: 0, // Calculate if needed
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

export function clearVideoCache() {
  galleryCache.clear();
  console.log("[Video Gallery API] Cache cleared");
}
