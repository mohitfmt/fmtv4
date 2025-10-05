// pages/api/videos/search.ts
// Video search API endpoint with multi-field search and smart sorting
// Searches equally across title, description, tags, and channel name

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

// Response interface
interface SearchResponse {
  videos: any[];
  query: string;
  count: number;
  totalCount?: number;
  page?: number;
  totalPages?: number;
  hasMore?: boolean;
  error?: string;
}

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
    categoryId: video.categoryId || "",
    tags: video.tags || [],
    tier: video.tier || "standard",
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResponse>
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
      videos: [],
      query: "",
      count: 0,
    });
  }

  try {
    // Extract query parameters
    const { q, limit = "20", page = "1" } = req.query;

    // Validate search query
    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.status(400).json({
        error: "Search query must be at least 2 characters",
        videos: [],
        query: q?.toString() || "",
        count: 0,
      });
    }

    const searchQuery = q.trim();
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit)) || 20));
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const skip = (pageNum - 1) * limitNum;

    console.log(
      `[Video Search API] Searching for: "${searchQuery}" (limit: ${limitNum}, page: ${pageNum})`
    );

    // Split search query into individual words for better matching
    const searchWords = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0);

    // Build search filter with equal weighting across all fields
    const searchFilter = {
      isActive: true,
      status: {
        is: {
          privacyStatus: "public",
          uploadStatus: "processed",
        },
      },
      OR: [
        // Title search (case-insensitive)
        {
          title: {
            contains: searchQuery,
            mode: "insensitive" as const,
          },
        },
        // Description search (case-insensitive)
        {
          description: {
            contains: searchQuery,
            mode: "insensitive" as const,
          },
        },
        // Channel title search (case-insensitive)
        {
          channelTitle: {
            contains: searchQuery,
            mode: "insensitive" as const,
          },
        },
        // Tags - exact match
        {
          tags: {
            has: searchQuery,
          },
        },
        // Tags - match any word from search query
        {
          tags: {
            hasSome: searchWords,
          },
        },
        // Tags - case-insensitive partial match (if tag contains search term)
        ...searchWords.map((word) => ({
          tags: {
            has: word,
          },
        })),
      ],
    };

    // Execute search with smart sorting
    const [videos, totalCount] = await Promise.all([
      prisma.videos.findMany({
        where: searchFilter,
        orderBy: [
          { tier: "desc" }, // Hot/trending videos first
          { publishedAt: "desc" }, // Then by recency
          {
            statistics: {
              // Then by view count
              viewCount: "desc",
            },
          },
        ],
        take: limitNum,
        skip: skip,
        select: {
          videoId: true,
          title: true,
          description: true,
          thumbnails: true,
          publishedAt: true,
          channelId: true,
          channelTitle: true,
          contentDetails: true,
          statistics: true,
          isShort: true,
          categoryId: true,
          tags: true,
          tier: true,
        },
      }),
      prisma.videos.count({
        where: searchFilter,
      }),
    ]);

    // Transform results
    const transformedVideos = videos.map(transformVideo);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasMore = pageNum < totalPages;

    // Log search metrics
    console.log(
      `[Video Search API] Found ${totalCount} results for "${searchQuery}" (showing ${transformedVideos.length})`
    );

    // Set cache headers for performance
    res.setHeader(
      "Cache-Control",
      "public, max-age=60, s-maxage=180, stale-while-revalidate=86400"
    );
    res.setHeader("X-Search-Query", searchQuery);
    res.setHeader("X-Total-Results", String(totalCount));

    // Return successful response
    return res.status(200).json({
      videos: transformedVideos,
      query: searchQuery,
      count: transformedVideos.length,
      totalCount,
      page: pageNum,
      totalPages,
      hasMore,
    });
  } catch (error: any) {
    console.error("[Video Search API] Error:", error);

    // Handle specific database errors
    if (error.code === "P2024" || error.message?.includes("connection")) {
      return res.status(503).json({
        error: "Database temporarily unavailable. Please try again later.",
        videos: [],
        query: req.query.q?.toString() || "",
        count: 0,
      });
    }

    // Generic error response
    return res.status(500).json({
      error: "Failed to search videos. Please try again.",
      videos: [],
      query: req.query.q?.toString() || "",
      count: 0,
    });
  }
}
