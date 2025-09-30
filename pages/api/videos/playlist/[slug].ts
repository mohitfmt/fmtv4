// pages/api/videos/playlist/[slug].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { slug } = req.query;
    const {
      page = "1",
      sort = "newest",
      limit = "12",
      skip: customSkip,
    } = req.query;

    // Validate slug
    if (!slug || typeof slug !== "string") {
      return res.status(400).json({
        error: "Invalid playlist slug",
        videos: [],
        totalCount: 0,
      });
    }

    const currentPage = Math.max(1, parseInt(page as string) || 1);
    const perPage = Math.min(50, Math.max(1, parseInt(limit as string) || 12));

    // Calculate skip - for load more functionality
    let skip: number;
    if (customSkip) {
      skip = parseInt(customSkip as string) || 0;
    } else {
      // For page 1: skip 0
      // For page 2: skip 24 (initial batch was 24)
      // For page 3: skip 36 (24 + 12)
      if (currentPage === 1) {
        skip = 0;
      } else {
        skip = 24 + (currentPage - 2) * perPage;
      }
    }

    // Find playlist by slug
    const playlist = await prisma.playlist.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
      select: {
        playlistId: true,
        title: true,
        description: true,
        itemCount: true,
        thumbnailUrl: true,
      },
    });

    if (!playlist) {
      return res.status(404).json({
        error: "Playlist not found",
        videos: [],
        totalCount: 0,
      });
    }

    // Build sort order
    let orderBy: any = { publishedAt: "desc" }; // default: newest

    if (sort === "popular") {
      // Sort by viewCount in memory (Prisma can't sort JSON fields)
      orderBy = { publishedAt: "desc" }; // fallback, we'll sort after
    } else if (sort === "trending") {
      orderBy = { publishedAt: "asc" }; // oldest first
    }

    // Get videos from the playlist
    let videos;
    let totalCount;
    let hasMore;

    if (sort === "popular") {
      // For popular sort, fetch all videos and sort in memory
      const allVideos = await prisma.videos.findMany({
        where: {
          playlists: {
            has: playlist.playlistId,
          },
          isActive: true,
          status: {
            is: {
              privacyStatus: "public",
              uploadStatus: "processed",
            },
          },
        },
      });

      // Sort by viewCount in memory
      const sortedVideos = allVideos.sort((a: any, b: any) => {
        const aViews = Number(a.statistics?.viewCount || 0);
        const bViews = Number(b.statistics?.viewCount || 0);
        return bViews - aViews; // Descending order
      });

      // Paginate the sorted results
      videos = sortedVideos.slice(skip, skip + perPage);
      totalCount = sortedVideos.length;
      hasMore = skip + perPage < totalCount;
    } else {
      // Normal database sorting for other options
      [videos, totalCount] = await Promise.all([
        prisma.videos.findMany({
          where: {
            playlists: {
              has: playlist.playlistId,
            },
            isActive: true,
            status: {
              is: {
                privacyStatus: "public",
                uploadStatus: "processed",
              },
            },
          },
          orderBy,
          skip,
          take: perPage,
        }),
        prisma.videos.count({
          where: {
            playlists: {
              has: playlist.playlistId,
            },
            isActive: true,
            status: {
              is: {
                privacyStatus: "public",
                uploadStatus: "processed",
              },
            },
          },
        }),
      ]);

      hasMore = skip + perPage < totalCount;
    }

    // Transform videos to frontend format and serialize dates
    const transformedVideos = videos.map((video: any) => ({
      videoId: video.videoId,
      title: video.title,
      description: video.description || "",
      publishedAt:
        video.publishedAt instanceof Date
          ? video.publishedAt.toISOString()
          : video.publishedAt,
      channelId: video.channelId || "",
      channelTitle: video.channelTitle || "FMT",
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
    }));

    // Set cache headers for performance
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=180");

    return res.status(200).json({
      videos: transformedVideos,
      totalCount,
      currentPage,
      hasMore,
      nextSkip: skip + perPage,
      playlist: {
        title: playlist.title,
        description: playlist.description,
        thumbnailUrl: playlist.thumbnailUrl,
      },
    });
  } catch (error) {
    console.error("[Playlist API] Error:", error);
    return res.status(500).json({
      error: "Failed to fetch playlist videos",
      videos: [],
      totalCount: 0,
    });
  }
}
