// lib/youtube-client.ts
import { google } from "googleapis";

// Initialize YouTube API client
export const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

// Helper to check API quota usage
export async function checkQuotaUsage(): Promise<{
  available: boolean;
  message?: string;
}> {
  try {
    // Simple check - try to get channel info (costs 1 unit)
    const response = await youtube.channels.list({
      part: ["id"],
      mine: false,
      maxResults: 1,
    });

    return { available: true };
  } catch (error: any) {
    if (error?.code === 403 && error?.errors?.[0]?.reason === "quotaExceeded") {
      return {
        available: false,
        message: "YouTube API quota exceeded. Will retry tomorrow.",
      };
    }
    return {
      available: false,
      message: "YouTube API error: " + (error?.message || "Unknown error"),
    };
  }
}

// Batch fetch videos with minimal quota usage
export async function fetchVideosByIds(videoIds: string[]) {
  if (!videoIds.length) return [];

  try {
    const response = await youtube.videos.list({
      part: ["snippet", "statistics", "contentDetails"],
      id: videoIds,
      maxResults: 50, // Max allowed per request
    });

    return response.data.items || [];
  } catch (error) {
    console.error("Failed to fetch videos by IDs:", error);
    return [];
  }
}

// Search for videos by query
export async function searchVideos(
  query: string,
  options?: {
    maxResults?: number;
    regionCode?: string;
    order?:
      | "date"
      | "rating"
      | "relevance"
      | "title"
      | "videoCount"
      | "viewCount";
  }
) {
  try {
    const response = await youtube.search.list({
      part: ["snippet"],
      q: query,
      type: ["video"],
      maxResults: options?.maxResults || 10,
      regionCode: options?.regionCode || "MY",
      order: options?.order || "relevance",
    });

    return response.data.items || [];
  } catch (error) {
    console.error("Failed to search videos:", error);
    return [];
  }
}
