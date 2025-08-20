import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

interface ChannelInfo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  customUrl?: string;
  lastFetched: Date;
}

async function fetchChannelInfoFromYouTube(): Promise<ChannelInfo | null> {
  const CHANNEL_ID =
    process.env.YOUTUBE_CHANNEL_ID || "UC2CzLwbhTiI8pTKNVyrOnJQ";
  const API_KEY = process.env.YOUTUBE_API_KEY;

  if (!API_KEY) {
    console.error("[Channel Info] No YouTube API key configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?` +
        `part=snippet,statistics,brandingSettings` +
        `&id=${CHANNEL_ID}` +
        `&key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    const channel = data.items?.[0];

    if (!channel) {
      throw new Error("Channel not found");
    }

    return {
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnailUrl:
        channel.snippet.thumbnails?.high?.url ||
        channel.snippet.thumbnails?.medium?.url ||
        channel.snippet.thumbnails?.default?.url ||
        "",
      subscriberCount: parseInt(channel.statistics.subscriberCount || "0"),
      videoCount: parseInt(channel.statistics.videoCount || "0"),
      viewCount: parseInt(channel.statistics.viewCount || "0"),
      customUrl: channel.snippet.customUrl,
      lastFetched: new Date(),
    };
  } catch (error) {
    console.error("[Channel Info] Failed to fetch from YouTube:", error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Check if we have cached channel info
    const cachedInfo = await prisma.channel_info.findFirst({
      orderBy: { lastFetched: "desc" },
    });

    // Check if cache is still valid
    if (cachedInfo) {
      const cacheAge = Date.now() - new Date(cachedInfo.lastFetched).getTime();

      if (cacheAge < CACHE_DURATION && req.query.fresh !== "true") {
        console.log("[Channel Info] Serving from cache");
        return res.status(200).json({
          ...cachedInfo,
          fromCache: true,
          cacheAge: Math.floor(cacheAge / 1000 / 60), // in minutes
        });
      }
    }

    // Fetch fresh data from YouTube
    console.log("[Channel Info] Fetching fresh data from YouTube");
    const freshInfo = await fetchChannelInfoFromYouTube();

    if (!freshInfo) {
      // If fetch fails, return cached data if available
      if (cachedInfo) {
        console.log(
          "[Channel Info] YouTube fetch failed, returning stale cache"
        );
        return res.status(200).json({
          ...cachedInfo,
          fromCache: true,
          stale: true,
        });
      }

      // No cache and fetch failed - return default
      return res.status(200).json({
        id: "UC2CzLwbhTiI8pTKNVyrOnJQ",
        title: "Free Malaysia Today",
        description:
          "FMT brings you the latest news, from the halls of power to the city streets!",
        thumbnailUrl: "",
        subscriberCount: 639000,
        videoCount: 30000,
        viewCount: 0,
        customUrl: "@FreeMalaysiaToday",
        lastFetched: new Date(),
        fallback: true,
      });
    }

    // Store in database
    await prisma.channel_info.upsert({
      where: { channelId: freshInfo.id },
      update: {
        title: freshInfo.title,
        description: freshInfo.description,
        thumbnailUrl: freshInfo.thumbnailUrl,
        subscriberCount: freshInfo.subscriberCount,
        videoCount: freshInfo.videoCount,
        viewCount: freshInfo.viewCount,
        customUrl: freshInfo.customUrl,
        lastFetched: freshInfo.lastFetched,
      },
      create: {
        channelId: freshInfo.id,
        title: freshInfo.title,
        description: freshInfo.description,
        thumbnailUrl: freshInfo.thumbnailUrl,
        subscriberCount: freshInfo.subscriberCount,
        videoCount: freshInfo.videoCount,
        viewCount: freshInfo.viewCount,
        customUrl: freshInfo.customUrl,
        lastFetched: freshInfo.lastFetched,
      },
    });

    // Set cache headers
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");

    return res.status(200).json({
      ...freshInfo,
      fromCache: false,
    });
  } catch (error) {
    console.error("[Channel Info] Error:", error);

    return res.status(500).json({
      error: "Failed to fetch channel info",
      message:
        process.env.NODE_ENV === "development"
          ? (error as Error).message
          : undefined,
    });
  }
}

// Cron job endpoint to refresh cache
export async function refreshChannelInfo() {
  const freshInfo = await fetchChannelInfoFromYouTube();

  if (freshInfo) {
    await prisma.channel_info.upsert({
      where: { channelId: freshInfo.id },
      update: {
        title: freshInfo.title,
        description: freshInfo.description,
        thumbnailUrl: freshInfo.thumbnailUrl,
        subscriberCount: freshInfo.subscriberCount,
        videoCount: freshInfo.videoCount,
        viewCount: freshInfo.viewCount,
        customUrl: freshInfo.customUrl,
        lastFetched: freshInfo.lastFetched,
      },
      create: {
        channelId: freshInfo.id,
        title: freshInfo.title,
        description: freshInfo.description,
        thumbnailUrl: freshInfo.thumbnailUrl,
        subscriberCount: freshInfo.subscriberCount,
        videoCount: freshInfo.videoCount,
        viewCount: freshInfo.viewCount,
        customUrl: freshInfo.customUrl,
        lastFetched: freshInfo.lastFetched,
      },
    });

    console.log("[Channel Info] Cache refreshed successfully");
    return true;
  }

  return false;
}
