// pages/api/videos/gallery.ts
// CONVERTED TO SSR + CDN CACHING VERSION
// ✅ Removed all galleryCache usage
// ✅ Removed fetchWithCacheFallback function
// ✅ Added CDN cache headers
// ✅ Simplified error handling without cache fallbacks
// ✅ Retry mechanism for Prisma queries retained
// ✅ Timeout protection retained
// ✅ Comprehensive error logging retained

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
// REMOVED: import { galleryCache } from "@/lib/cache/video-cache-registry";

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
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeout}ms`));
        }, timeout);
      });

      // Race between the actual query and timeout
      const result = await Promise.race([fn(), timeoutPromise]);

      return result as T;
    } catch (error: any) {
      lastError = error;

      console.warn(
        `[Gallery API] ${label} - Attempt ${attempt + 1}/${maxRetries + 1} failed:`,
        error.message
      );

      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retriable
      const errorMsg = error.message?.toLowerCase() || "";
      const isRetriable =
        errorMsg.includes("timeout") ||
        errorMsg.includes("econnrefused") ||
        errorMsg.includes("socket hang up") ||
        errorMsg.includes("enotfound") ||
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
// REMOVED: fetchWithCacheFallback function - no longer needed
// ============================================================================

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
      fresh = "false", // This param is now irrelevant since we always fetch fresh
      search = "",
      page = "1",
      limit = "12",
    } = req.query;

    const searchTerm = String(search).trim();
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit)) || 12));
    const skip = (pageNum - 1) * limitNum;

    console.log(`[Gallery API] [${requestId}] Query params:`, {
      search: searchTerm,
      page: pageNum,
      limit: limitNum,
    });

    // REMOVED: Cache checking - always fetch fresh data for SSR

    // ========================================================================
    // STEP 1: Fetch Video Config (CRITICAL)
    // ========================================================================

    let videoConfig: any = null;

    try {
      videoConfig = await withRetryAndTimeout(
        async () => {
          return await prisma.videoConfig.findFirst({
            orderBy: { updatedAt: "desc" },
          });
        },
        { label: "VideoConfig Fetch", maxRetries: 2, timeout: 5000 }
      );
    } catch (error: any) {
      console.error(
        `[Gallery API] [${requestId}] CRITICAL: VideoConfig fetch failed:`,
        error.message
      );

      // No cache fallback - return error immediately
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

    console.log(`[Gallery API] [${requestId}] VideoConfig loaded successfully`);

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
          return []; // Return empty array on failure
        }
      })()
    );
    queryLabels.push("shorts");

    // Query 3: Shorts count
    queries.push(
      (async () => {
        try {
          return await withRetryAndTimeout(
            async () => {
              return await prisma.videos.count({
                where: {
                  ...baseFilter,
                  playlists: { has: shortsPlaylistId },
                },
              });
            },
            { label: "Shorts Count", maxRetries: 1, timeout: 3000 }
          );
        } catch (error: any) {
          console.warn(
            `[Gallery API] [${requestId}] Shorts count failed:`,
            error.message
          );
          return 0; // Return 0 on failure
        }
      })()
    );
    queryLabels.push("shortsCount");

    // Query 4: Total count
    queries.push(
      (async () => {
        try {
          return await withRetryAndTimeout(
            async () => {
              return await prisma.videos.count({
                where: baseFilter,
              });
            },
            { label: "Total Count", maxRetries: 1, timeout: 3000 }
          );
        } catch (error: any) {
          console.warn(
            `[Gallery API] [${requestId}] Total count failed:`,
            error.message
          );
          return 0; // Return 0 on failure
        }
      })()
    );
    queryLabels.push("totalCount");

    // Query 5: Today's videos count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    queries.push(
      (async () => {
        try {
          return await withRetryAndTimeout(
            async () => {
              return await prisma.videos.count({
                where: {
                  ...baseFilter,
                  publishedAt: { gte: todayStart },
                },
              });
            },
            { label: "Today Count", maxRetries: 1, timeout: 3000 }
          );
        } catch (error: any) {
          console.warn(
            `[Gallery API] [${requestId}] Today count failed:`,
            error.message
          );
          return 0; // Return 0 on failure
        }
      })()
    );
    queryLabels.push("todayCount");

    // Execute all queries in parallel
    const results = await Promise.all(queries);

    // Map results to variables
    const [heroVideos, shorts, shortsTotalCount, totalCount, todayVideos] =
      results;

    console.log(`[Gallery API] [${requestId}] Base queries completed:`, {
      heroVideos: heroVideos?.length || 0,
      shorts: shorts?.length || 0,
      shortsTotalCount,
      totalCount,
      todayVideos,
    });

    // ========================================================================
    // STEP 3: Fetch Playlist Data (with error isolation)
    // ========================================================================

    const playlists: Record<string, any> = {};
    const failedPlaylists: string[] = [];

    // Sort playlists by position
    const sortedConfigs = [...playlistConfigs].sort(
      (a, b) => (a.position || 999) - (b.position || 999)
    );

    // Fetch playlist data (parallel with individual error handling)
    for (const config of sortedConfigs) {
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
        failedPlaylists:
          failedPlaylists.length > 0 ? failedPlaylists : undefined,
        partialSuccess: failedPlaylists.length > 0,
      },
    };

    // REMOVED: Cache setting - no longer caching responses in memory

    // ========================================================================
    // STEP 5: Set CDN Cache Headers (CRITICAL CHANGE)
    // ========================================================================

    const duration = Date.now() - startTime;
    console.log(
      `[Gallery API] [${requestId}] Request completed in ${duration}ms`
    );

    res.setHeader("X-Request-ID", requestId);
    res.setHeader("X-Duration-MS", duration.toString());

    // Search results should not be cached
    if (searchTerm) {
      res.setHeader("X-Cache", "BYPASS");
      res.setHeader(
        "Cache-Control",
        "private, no-cache, no-store, must-revalidate"
      );
    } else {
      // Non-search results get CDN cached
      res.setHeader("X-Cache", "MISS"); // Always MISS from origin
      res.setHeader(
        "Cache-Control",
        "public, max-age=60, s-maxage=180, stale-while-revalidate=86400"
      );
      // Add cache tags for targeted purging
      res.setHeader("Cache-Tag", "video:gallery,video:latest,video:all");
    }

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

    // REMOVED: Cache fallback on error - return error immediately

    // Don't cache error responses
    res.setHeader(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate"
    );
    res.setHeader("X-Error", error.message);

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
