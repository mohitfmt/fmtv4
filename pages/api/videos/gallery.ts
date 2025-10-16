// pages/api/videos/gallery.ts
// PRODUCTION-READY VERSION with:
// ✅ Retry mechanism for Prisma queries
// ✅ Fallback to cache on failure
// ✅ Partial success handling
// ✅ Timeout protection
// ✅ Comprehensive error logging
// ✅ Graceful degradation

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { galleryCache } from "@/lib/cache/video-cache-registry";

// ============================================================================
// CONSTANTS
// ============================================================================

const PRISMA_TIMEOUT_MS = 8000; // 8 seconds max for any Prisma query
const MAX_RETRIES = 2; // Total 3 attempts for critical queries
const RETRY_DELAY_MS = 500; // Initial retry delay

// ============================================================================
// HELPER: Transform Video
// ============================================================================

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

// ============================================================================
// HELPER: Base Video Filter
// ============================================================================

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

  if (search && search.trim()) {
    baseFilter.OR = [
      { title: { contains: search.trim(), mode: "insensitive" } },
      { description: { contains: search.trim(), mode: "insensitive" } },
      { tags: { has: search.trim() } },
    ];
  }

  return baseFilter;
}

// ============================================================================
// HELPER: Retry Wrapper with Timeout
// ============================================================================

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  timeout?: number;
  label?: string;
}

async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    initialDelay = RETRY_DELAY_MS,
    timeout = PRISMA_TIMEOUT_MS,
    label = "Query",
  } = options;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[Gallery API] ${label} - Attempt ${attempt + 1}/${maxRetries + 1}`
      );

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${label} timeout after ${timeout}ms`)),
          timeout
        )
      );

      // Race between actual query and timeout
      const result = await Promise.race([fn(), timeoutPromise]);

      if (attempt > 0) {
        console.log(
          `[Gallery API] ${label} - Success after ${attempt} retries`
        );
      }

      return result as T;
    } catch (error: any) {
      lastError = error;

      console.error(
        `[Gallery API] ${label} - Attempt ${attempt + 1} failed:`,
        error.message
      );

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        console.error(`[Gallery API] ${label} - All retries exhausted`);
        break;
      }

      // Check if error is retriable
      const errorMsg = error.message?.toLowerCase() || "";
      const isRetriable =
        errorMsg.includes("timeout") ||
        errorMsg.includes("econnreset") ||
        errorMsg.includes("etimedout") ||
        errorMsg.includes("can't assign") ||
        errorMsg.includes("failed to lookup") ||
        errorMsg.includes("p2010") || // Prisma query engine error
        errorMsg.includes("p2024") || // Timed out
        errorMsg.includes("p2002"); // Unique constraint failed (might be transient)

      if (!isRetriable) {
        console.warn(
          `[Gallery API] ${label} - Non-retriable error, stopping retries`
        );
        break;
      }

      // Exponential backoff with jitter
      const jitter = Math.random() * 200;
      const waitTime = Math.min(delay + jitter, 5000);

      console.log(
        `[Gallery API] ${label} - Retrying in ${Math.round(waitTime)}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      delay *= 2; // Exponential backoff
    }
  }

  throw lastError || new Error(`${label} failed after ${maxRetries} retries`);
}

// ============================================================================
// HELPER: Fetch with Fallback to Cache
// ============================================================================

async function fetchWithCacheFallback<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  label: string
): Promise<{ data: T; fromCache: boolean }> {
  try {
    // Try to fetch fresh data with retry
    const data = await withRetryAndTimeout(fetchFn, {
      maxRetries: 2,
      timeout: PRISMA_TIMEOUT_MS,
      label,
    });

    // Update cache on success
    galleryCache.set(cacheKey, data);

    return { data, fromCache: false };
  } catch (error: any) {
    console.error(
      `[Gallery API] ${label} - Fetch failed, checking cache:`,
      error.message
    );

    // Try to get from cache
    const cachedData = galleryCache.get(cacheKey);

    if (cachedData) {
      console.warn(
        `[Gallery API] ${label} - Serving from cache (fetch failed)`
      );
      return { data: cachedData as T, fromCache: true };
    }

    // No cache available, re-throw error
    console.error(`[Gallery API] ${label} - No cache available, failing`);
    throw error;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log(`[Gallery API] [${requestId}] Starting request`);

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

    console.log(`[Gallery API] [${requestId}] Query params:`, {
      fresh: shouldRefresh,
      search: searchTerm,
      page: pageNum,
      limit: limitNum,
    });

    // Check cache first (unless fresh data requested)
    if (!shouldRefresh && !searchTerm) {
      const cached = galleryCache.get(cacheKey);
      if (cached) {
        const duration = Date.now() - startTime;
        console.log(
          `[Gallery API] [${requestId}] Served from cache in ${duration}ms`
        );

        res.setHeader("X-Cache", "HIT");
        res.setHeader("Cache-Control", "public, max-age=60, s-maxage=180");
        return res.status(200).json(cached);
      }
    }

    // ========================================================================
    // STEP 1: Fetch Video Config (CRITICAL - with fallback)
    // ========================================================================

    let videoConfig: any = null;
    let configFromCache = false;

    try {
      const configResult = await fetchWithCacheFallback(
        "videoConfig",
        async () => {
          return await prisma.videoConfig.findFirst({
            orderBy: { updatedAt: "desc" },
          });
        },
        "VideoConfig Fetch"
      );

      videoConfig = configResult.data;
      configFromCache = configResult.fromCache;
    } catch (error: any) {
      console.error(
        `[Gallery API] [${requestId}] CRITICAL: VideoConfig fetch failed:`,
        error.message
      );

      // Try to return cached response if available
      const cachedResponse = galleryCache.get(cacheKey);
      if (cachedResponse) {
        console.warn(
          `[Gallery API] [${requestId}] Returning stale cached response (VideoConfig failed)`
        );
        res.setHeader("X-Cache", "STALE");
        res.setHeader("X-Error", "VideoConfig fetch failed");
        return res.status(200).json(cachedResponse);
      }

      // No cache available, return error
      return res.status(500).json({
        error: "Video configuration unavailable",
        message: "Unable to fetch video settings. Please try again later.",
        timestamp: new Date().toISOString(),
      });
    }

    if (!videoConfig) {
      console.error(
        `[Gallery API] [${requestId}] VideoConfig not found in database`
      );

      return res.status(500).json({
        error: "Video configuration not found",
        message: "Please configure video settings in admin panel",
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `[Gallery API] [${requestId}] VideoConfig loaded ${configFromCache ? "(from cache)" : "(fresh)"}`
    );

    const heroPlaylistId = videoConfig.heroPlaylist;
    const shortsPlaylistId = videoConfig.shortsPlaylist;

    // Parse displayed playlists
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

    // ========================================================================
    // STEP 2: Fetch Data in Parallel (with individual error handling)
    // ========================================================================

    const queries: Promise<any>[] = [];
    const queryLabels: string[] = [];

    // Query 1: Hero videos
    queries.push(
      (async () => {
        try {
          return await withRetryAndTimeout(
            async () => {
              return await prisma.videos.findMany({
                where: {
                  ...baseFilter,
                  playlists: { has: heroPlaylistId },
                },
                orderBy: { publishedAt: "desc" },
                take: 5,
              });
            },
            { label: "Hero Videos" }
          );
        } catch (error: any) {
          console.warn(
            `[Gallery API] [${requestId}] Hero videos failed:`,
            error.message
          );
          return []; // Return empty array on failure
        }
      })()
    );
    queryLabels.push("hero");

    // Query 2: Shorts (first 20)
    queries.push(
      (async () => {
        try {
          return await withRetryAndTimeout(
            async () => {
              return await prisma.videos.findMany({
                where: {
                  ...baseFilter,
                  playlists: { has: shortsPlaylistId },
                },
                orderBy: { publishedAt: "desc" },
                take: 20,
              });
            },
            { label: "Shorts Videos" }
          );
        } catch (error: any) {
          console.warn(
            `[Gallery API] [${requestId}] Shorts videos failed:`,
            error.message
          );
          return [];
        }
      })()
    );
    queryLabels.push("shorts");

    // Query 3: Shorts total count
    queries.push(
      (async () => {
        try {
          const playlist = await withRetryAndTimeout(
            async () => {
              return await prisma.playlist.findFirst({
                where: { playlistId: shortsPlaylistId },
                select: { itemCount: true },
              });
            },
            { label: "Shorts Count", maxRetries: 1, timeout: 3000 }
          );
          return playlist?.itemCount || 0;
        } catch (error: any) {
          console.warn(
            `[Gallery API] [${requestId}] Shorts count failed:`,
            error.message
          );
          return 0;
        }
      })()
    );
    queryLabels.push("shortsCount");

    // Query 4: Today's videos count
    queries.push(
      (async () => {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          return await withRetryAndTimeout(
            async () => {
              return await prisma.videos.count({
                where: {
                  ...baseFilter,
                  publishedAt: { gte: today },
                },
              });
            },
            { label: "Today Videos Count", maxRetries: 1, timeout: 3000 }
          );
        } catch (error: any) {
          console.warn(
            `[Gallery API] [${requestId}] Today count failed:`,
            error.message
          );
          return 0;
        }
      })()
    );
    queryLabels.push("todayCount");

    // Query 5: Total videos count
    queries.push(
      (async () => {
        try {
          return await withRetryAndTimeout(
            async () => {
              return await prisma.videos.count({ where: baseFilter });
            },
            { label: "Total Videos Count", maxRetries: 1, timeout: 3000 }
          );
        } catch (error: any) {
          console.warn(
            `[Gallery API] [${requestId}] Total count failed:`,
            error.message
          );
          return 0;
        }
      })()
    );
    queryLabels.push("totalCount");

    // Execute all queries in parallel
    console.log(
      `[Gallery API] [${requestId}] Executing ${queries.length} parallel queries`
    );
    const results = await Promise.all(queries);

    const [heroVideos, shorts, shortsTotalCount, todayVideos, totalCount] =
      results;

    console.log(`[Gallery API] [${requestId}] Query results:`, {
      hero: heroVideos?.length || 0,
      shorts: shorts?.length || 0,
      shortsTotalCount,
      todayVideos,
      totalCount,
    });

    // ========================================================================
    // STEP 3: Fetch Playlist Videos (with individual error handling)
    // ========================================================================

    const playlists: Record<
      string,
      { name: string; videos: any[]; maxVideos: number }
    > = {};
    const failedPlaylists: string[] = [];

    for (const config of playlistConfigs) {
      try {
        const [playlist, videos] = await Promise.all([
          withRetryAndTimeout(
            async () => {
              return await prisma.playlist.findFirst({
                where: { playlistId: config.playlistId, isActive: true },
                select: { title: true, slug: true },
              });
            },
            {
              label: `Playlist Info (${config.playlistId})`,
              maxRetries: 1,
              timeout: 3000,
            }
          ),
          withRetryAndTimeout(
            async () => {
              return await prisma.videos.findMany({
                where: {
                  ...baseFilter,
                  playlists: { has: config.playlistId },
                },
                orderBy: { publishedAt: "desc" },
                take: config.maxVideos || 12,
              });
            },
            {
              label: `Playlist Videos (${config.playlistId})`,
              maxRetries: 1,
              timeout: 5000,
            }
          ),
        ]);

        if (playlist && videos && videos.length > 0) {
          playlists[playlist.slug || config.playlistId] = {
            name: playlist.title,
            videos: videos.map(transformVideo),
            maxVideos: config.maxVideos || 6,
          };
        }
      } catch (error: any) {
        console.warn(
          `[Gallery API] [${requestId}] Playlist ${config.playlistId} failed:`,
          error.message
        );
        failedPlaylists.push(config.playlistId);
        // Continue to next playlist instead of failing entire request
      }
    }

    console.log(`[Gallery API] [${requestId}] Playlists loaded:`, {
      successful: Object.keys(playlists).length,
      failed: failedPlaylists.length,
    });

    // ========================================================================
    // STEP 4: Build Response
    // ========================================================================

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
      _meta: {
        configFromCache,
        failedPlaylists:
          failedPlaylists.length > 0 ? failedPlaylists : undefined,
        partialSuccess: failedPlaylists.length > 0,
      },
    };

    // Cache the response (only for non-search results)
    if (!searchTerm) {
      galleryCache.set(cacheKey, responseData);
    }

    // Set cache headers
    const duration = Date.now() - startTime;
    console.log(
      `[Gallery API] [${requestId}] Request completed in ${duration}ms`
    );

    res.setHeader("X-Cache", searchTerm ? "BYPASS" : "MISS");
    res.setHeader("X-Request-ID", requestId);
    res.setHeader("X-Duration-MS", duration.toString());
    res.setHeader(
      "Cache-Control",
      searchTerm
        ? "private, no-cache"
        : "public, max-age=60, s-maxage=180, stale-while-revalidate=86400"
    );
    res.setHeader("Cache-Tag", "video:gallery,video:latest");

    // Add warning header if partial success
    if (failedPlaylists.length > 0) {
      res.setHeader("X-Partial-Success", "true");
      res.setHeader("X-Failed-Playlists", failedPlaylists.join(","));
    }

    return res.status(200).json(responseData);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Gallery API] [${requestId}] Error after ${duration}ms:`, {
      message: error.message,
      name: error.name,
      stack: error.stack?.split("\n").slice(0, 5).join("\n"),
    });

    // Try to return cached response if available
    const cacheKey = `gallery:::1:12`; // Default cache key
    const cachedData = galleryCache.get(cacheKey);

    if (cachedData) {
      console.warn(
        `[Gallery API] [${requestId}] Returning stale cache due to error`
      );
      res.setHeader("X-Cache", "STALE-ON-ERROR");
      res.setHeader("X-Error", error.message);
      return res.status(200).json(cachedData);
    }

    // Clear cache on error
    if (error.message?.includes("cache")) {
      galleryCache.clear();
    }

    return res.status(500).json({
      error: "Failed to fetch video data",
      message:
        process.env.NODE_ENV === "development"
          ? error.message
          : "An error occurred while loading videos. Please try again.",
      timestamp: new Date().toISOString(),
    });
  }
}

// Export cache utilities
export function invalidateGalleryCache() {
  galleryCache.clear();
  console.log("[Gallery API] Cache invalidated");
}
