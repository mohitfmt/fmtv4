// pages/api/videos/shorts.ts
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
    const {
      page = "1",
      sort = "newest",
      limit = "12",
      skip: customSkip,
    } = req.query;
    const currentPage = Math.max(1, parseInt(page as string) || 1);
    const perPage = Math.min(50, Math.max(1, parseInt(limit as string) || 12));

    // Calculate skip - for load more functionality
    let skip: number;
    if (customSkip) {
      skip = parseInt(customSkip as string) || 0;
    } else {
      // For page 1: skip 0 (but this is initial load, handled by getServerSideProps)
      // For page 2: skip 24 (initial batch was 24)
      // For page 3: skip 36 (24 + 12)
      // etc.
      if (currentPage === 1) {
        skip = 0;
      } else {
        skip = 24 + (currentPage - 2) * perPage;
      }
    }

    // Get the shorts playlist ID from configuration
    const videoConfig = await prisma.videoConfig.findFirst();

    if (!videoConfig || !videoConfig.shortsPlaylist) {
      return res.status(404).json({
        error: "Shorts playlist not configured",
        videos: [],
        totalCount: 0,
      });
    }

    // Build sort order
    let orderBy: any = { publishedAt: "desc" }; // default: newest

    if (sort === "popular") {
      // For popular, we need to sort by viewCount but it's nested in statistics JSON
      // Prisma doesn't support sorting by JSON fields directly, so we fetch more and sort in memory
      orderBy = { publishedAt: "desc" }; // fallback to newest, we'll sort after
    } else if (sort === "trending") {
      // Actually "Oldest" in YouTube UI
      orderBy = { publishedAt: "asc" };
    }

    // Get videos from the shorts playlist
    let shorts;
    let totalCount;
    let hasMore;

    if (sort === "popular") {
      // For popular sort, fetch all videos and sort in memory
      const allVideos = await prisma.videos.findMany({
        where: {
          playlists: {
            has: videoConfig.shortsPlaylist,
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
      shorts = sortedVideos.slice(skip, skip + perPage);
      totalCount = sortedVideos.length;
      hasMore = skip + perPage < totalCount;
    } else {
      // Normal database sorting for other options
      [shorts, totalCount] = await Promise.all([
        prisma.videos.findMany({
          where: {
            playlists: {
              has: videoConfig.shortsPlaylist,
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
              has: videoConfig.shortsPlaylist,
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
    const transformedShorts = shorts.map((video: any) => ({
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
      isShort: true,
      playlists: video.playlists || [],
      categoryId: video.categoryId || "",
      tags: video.tags || [],
      tier: video.tier || "standard",
    }));

    // Set cache headers for performance
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=180");

    return res.status(200).json({
      videos: transformedShorts,
      totalCount,
      currentPage,
      hasMore,
      nextSkip: skip + perPage,
    });
  } catch (error) {
    console.error("[Shorts API] Error:", error);
    return res.status(500).json({
      error: "Failed to fetch shorts",
      videos: [],
      totalCount: 0,
    });
  }
}
