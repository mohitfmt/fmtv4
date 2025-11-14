// lib/cache-utils.ts
// SHARED UTILITY: Blocking cache clear operations
// Ensures cache operations complete before returning success

import {
  playlistCache,
  videoDataCache,
  galleryCache,
  configCache,
} from "@/lib/cache/video-cache-registry";

interface CacheClearResult {
  lruCleared: boolean;
  cloudflareUrls: string[];
  cloudflarePurged: boolean;
  isrPaths: string[];
  isrRevalidated: boolean;
  totalDuration: number;
  errors: string[];
}

/**
 * Blocking cache clear - waits for all operations to complete
 * Returns only when caches are actually cleared
 */
export async function clearVideoCache(
  videoId?: string,
  playlistSlugs?: string[]
): Promise<CacheClearResult> {
  const startTime = Date.now();
  const result: CacheClearResult = {
    lruCleared: false,
    cloudflareUrls: [],
    cloudflarePurged: false,
    isrPaths: [],
    isrRevalidated: false,
    totalDuration: 0,
    errors: [],
  };

  // ====================================================================
  // STEP 1: Clear LRU caches (instant)
  // ====================================================================
  try {
    playlistCache.clear();
    videoDataCache.clear();
    galleryCache.clear();
    configCache.clear();

    // Also clear homepage cache
    try {
      const { homepageCache } = await import("@/pages/api/homepage");
      homepageCache.clear();
    } catch (e) {
      // Homepage cache might not be initialized yet
    }

    result.lruCleared = true;
  } catch (error: any) {
    result.errors.push(`LRU clear failed: ${error.message}`);
  }

  // ====================================================================
  // STEP 2: Purge Cloudflare CDN (BLOCKING)
  // ====================================================================
  const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
  const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (CF_ZONE_ID && CF_API_TOKEN && SITE_URL) {
    try {
      // Build URLs to purge
      const urls: string[] = [
        `${SITE_URL}/`,
        `${SITE_URL}/api/homepage`,
        `${SITE_URL}/videos`,
        `${SITE_URL}/videos/shorts`,
        `${SITE_URL}/api/videos/gallery`,
        `${SITE_URL}/api/videos/playlists`,
      ];

      // Add specific video page if provided
      if (videoId) {
        urls.push(`${SITE_URL}/videos/${videoId}`);
      }

      // Add specific playlist pages if provided
      if (playlistSlugs && playlistSlugs.length > 0) {
        for (const slug of playlistSlugs) {
          urls.push(`${SITE_URL}/videos/playlist/${slug}`);
        }
      }

      result.cloudflareUrls = urls;

      // Purge URLs (BLOCKING - wait for response)
      const purgeResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${CF_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ files: urls }),
        }
      );

      if (!purgeResponse.ok) {
        const errorText = await purgeResponse.text();
        throw new Error(`Cloudflare purge failed: ${errorText}`);
      }

      result.cloudflarePurged = true;

      // Wait for purge to propagate globally
      await sleep(2000);
    } catch (error: any) {
      result.errors.push(`Cloudflare purge failed: ${error.message}`);
    }
  } else {
    result.errors.push("Cloudflare credentials not configured");
  }

  // ====================================================================
  // STEP 3: ISR Revalidation (BLOCKING)
  // ====================================================================
  const revalidateSecret = process.env.REVALIDATE_SECRET;

  if (revalidateSecret && SITE_URL) {
    try {
      // Build paths to revalidate
      const paths: string[] = ["/videos", "/"];

      // Add specific video page if provided
      if (videoId) {
        paths.push(`/videos/${videoId}`);
      }

      // Add specific playlist pages if provided
      if (playlistSlugs && playlistSlugs.length > 0) {
        for (const slug of playlistSlugs) {
          paths.push(`/videos/playlist/${slug}`);
        }
      }

      result.isrPaths = paths;

      // Trigger ISR revalidation (BLOCKING - wait for rebuild)
      const revalidateResponse = await fetch(
        `${SITE_URL}/api/internal/revalidate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-revalidate-secret": revalidateSecret,
          },
          body: JSON.stringify({ paths }),
          signal: AbortSignal.timeout(30000), // 30s timeout
        }
      );

      if (!revalidateResponse.ok) {
        const errorText = await revalidateResponse.text();
        throw new Error(`ISR revalidation failed: ${errorText}`);
      }

      result.isrRevalidated = true;

      // Wait for ISR to settle
      await sleep(1000);
    } catch (error: any) {
      result.errors.push(`ISR revalidation failed: ${error.message}`);
    }
  } else {
    result.errors.push("Revalidation secret not configured");
  }

  result.totalDuration = Date.now() - startTime;
  return result;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse video ID from various input formats
 */
export function parseVideoId(input: string): string | null {
  const trimmed = input.trim();

  // Already a video ID (11 characters, alphanumeric + _ -)
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // YouTube URL patterns
  const youtubePatterns = [
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/v\/([A-Za-z0-9_-]{11})/,
  ];

  for (const pattern of youtubePatterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  // FMT URL pattern
  const fmtPattern = /freemalaysiatoday\.com\/videos\/([A-Za-z0-9_-]{11})/;
  const fmtMatch = trimmed.match(fmtPattern);
  if (fmtMatch) return fmtMatch[1];

  return null;
}

/**
 * Parse multiple video IDs from comma-separated input
 */
export function parseVideoIds(input: string): string[] {
  const parts = input.split(",").map((s) => s.trim());
  const videoIds: string[] = [];

  for (const part of parts) {
    const videoId = parseVideoId(part);
    if (videoId) {
      videoIds.push(videoId);
    }
  }

  return videoIds;
}
