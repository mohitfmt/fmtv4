// lib/youtube-utils.ts
// Shared utilities for YouTube sync operations

import { youtube } from "@/lib/youtube-sync";

/**
 * Parse ISO 8601 duration to seconds
 * @param duration - ISO 8601 duration string (e.g., "PT1H2M3S")
 * @returns Duration in seconds
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Retry a YouTube API call with exponential backoff
 * @param fn - Function that returns a Promise
 * @param maxRetries - Maximum number of retry attempts
 * @returns Result of the function call
 */
export async function retryYouTubeCall<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit or server error
      const status = error?.response?.status || error?.code;
      const isRetryable = status === 429 || status === 503 || status >= 500;

      // Don't retry if it's not a retryable error
      if (!isRetryable && attempt === 0) {
        throw error;
      }

      // If this is the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff with jitter
      const baseDelay = 200 * Math.pow(2, attempt); // 200ms, 400ms, 800ms
      const jitter = Math.random() * baseDelay * 0.3; // 30% jitter
      const delay = Math.min(baseDelay + jitter, 5000); // Cap at 5 seconds

      console.log(
        `[YouTube API] Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Efficiently assign a video to all playlists it belongs to
 * Uses a pre-built map for O(1) lookups instead of O(n) API calls
 * @param videoId - YouTube video ID
 * @param playlistVideoMap - Map of playlistId to Set of videoIds
 * @returns Array of playlist IDs the video belongs to
 */
export function findVideoPlaylists(
  videoId: string,
  playlistVideoMap: Map<string, Set<string>>
): string[] {
  const playlists: string[] = [];

  for (const [playlistId, videoSet] of playlistVideoMap) {
    if (videoSet.has(videoId)) {
      playlists.push(playlistId);
    }
  }

  return playlists;
}

/**
 * Build a map of all videos in all playlists
 * This is more efficient than checking each video against each playlist
 * @param playlistIds - Array of playlist IDs to fetch
 * @returns Map of playlistId to Set of videoIds
 */
export async function buildPlaylistVideoMap(
  playlistIds: string[]
): Promise<Map<string, Set<string>>> {
  const playlistVideoMap = new Map<string, Set<string>>();

  for (const playlistId of playlistIds) {
    const videoSet = new Set<string>();
    let pageToken: string | undefined = undefined;
    let pageCount = 0;
    const maxPages = 10; // Limit to 500 videos per playlist

    try {
      do {
        const response = await retryYouTubeCall(() =>
          youtube.playlistItems.list({
            part: ["contentDetails"],
            playlistId: playlistId,
            maxResults: 50,
            pageToken,
          })
        );

        pageCount++;

        // Add video IDs to set
        for (const item of response.data.items || []) {
          const videoId = item.contentDetails?.videoId;
          if (videoId) {
            videoSet.add(videoId);
          }
        }

        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken && pageCount < maxPages);

      playlistVideoMap.set(playlistId, videoSet);
      console.log(`[Playlist Map] ${playlistId}: ${videoSet.size} videos`);
    } catch (error: any) {
      console.error(
        `[Playlist Map] Failed to fetch playlist ${playlistId}:`,
        error.message
      );
      // Set empty set for failed playlist to continue with others
      playlistVideoMap.set(playlistId, new Set());
    }

    // Small delay between playlists
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return playlistVideoMap;
}

/**
 * Check if a video exists in a specific playlist
 * This uses a single API call to check membership
 * @param videoId - YouTube video ID
 * @param playlistId - YouTube playlist ID
 * @returns true if video is in playlist
 */
export async function isVideoInPlaylist(
  videoId: string,
  playlistId: string
): Promise<boolean> {
  try {
    const response = await retryYouTubeCall(() =>
      youtube.playlistItems.list({
        part: ["id"],
        playlistId: playlistId,
        videoId: videoId,
        maxResults: 1,
      })
    );

    return (response.data.items?.length || 0) > 0;
  } catch (error: any) {
    // 404 means video not in playlist, which is a valid response
    if (error?.response?.status === 404) {
      return false;
    }
    // Log other errors but don't throw
    console.error(
      `[Playlist Check] Error checking ${videoId} in ${playlistId}:`,
      error.message
    );
    return false;
  }
}

/**
 * Format duration for display (e.g., "1:02:30" or "2:30")
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
}

/**
 * Calculate video age in hours
 * @param publishedAt - Publication date
 * @returns Age in hours
 */
export function getVideoAgeInHours(publishedAt: Date | string): number {
  const published =
    typeof publishedAt === "string" ? new Date(publishedAt) : publishedAt;
  return (Date.now() - published.getTime()) / (1000 * 60 * 60);
}

/**
 * Batch videos for API calls (max 50 per batch)
 * @param items - Array of items to batch
 * @param batchSize - Size of each batch (default 50)
 * @returns Array of batches
 */
export function batchArray<T>(items: T[], batchSize: number = 50): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}
