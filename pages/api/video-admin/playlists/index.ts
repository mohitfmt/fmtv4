// pages/api/video-admin/playlists/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const traceId = (req as any).traceId;

  if (method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      active,
      search,
      sort = "videos",
      page = "1",
      limit = "12",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    // Filter by active status if specified
    if (active !== undefined && active !== "") {
      where.isActive = active === "true";
    }

    // Search functionality for finding playlists by name or description
    if (search && typeof search === "string" && search.trim() !== "") {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // Determine sort order
    let orderBy: any = [];
    switch (sort) {
      case "name":
        orderBy = [{ title: "asc" }];
        break;
      case "updated":
        orderBy = [{ updatedAt: "desc" }];
        break;
      case "videos":
      default:
        orderBy = [{ itemCount: "desc" }, { updatedAt: "desc" }];
        break;
    }

    // Execute queries in parallel for better performance
    const [playlists, totalCount, syncStatuses, recentSyncs] =
      await Promise.all([
        // Get playlists with pagination
        prisma.playlist.findMany({
          where,
          orderBy,
          take: limitNum,
          skip,
        }),

        // Get total count for pagination
        prisma.playlist.count({ where }),

        // Check if any playlists are currently syncing
        prisma.syncStatus.findUnique({
          where: { id: "main" },
          select: {
            currentlySyncing: true,
            currentPlaylistId: true,
          },
        }),

        // Get recent sync results for each playlist
        prisma.syncHistory.groupBy({
          by: ["playlistId"],
          _max: {
            timestamp: true,
          },
          _sum: {
            videosAdded: true,
            videosUpdated: true,
            videosRemoved: true,
          },
          where: {
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ]);

    // Map sync results to playlists
    const syncResultsMap = new Map(
      recentSyncs.map((sync) => [
        sync.playlistId,
        {
          videosAdded: sync._sum.videosAdded || 0,
          videosUpdated: sync._sum.videosUpdated || 0,
          videosRemoved: sync._sum.videosRemoved || 0,
          lastSync: sync._max.timestamp,
        },
      ])
    );

    // Format playlists with all the information the frontend needs
    const formattedPlaylists = playlists.map((playlist) => {
      const syncResult = syncResultsMap.get(playlist.playlistId);
      const isSyncing =
        syncStatuses?.currentlySyncing &&
        syncStatuses.currentPlaylistId === playlist.playlistId;

      return {
        id: playlist.id,
        playlistId: playlist.playlistId,
        title: playlist.title,
        description: playlist.description || "",
        itemCount: playlist.itemCount || 0,
        thumbnailUrl: playlist.thumbnailUrl || null,
        isActive: playlist.isActive !== false,
        lastSynced: syncResult?.lastSync || playlist.updatedAt,
        updatedAt: playlist.updatedAt,
        createdAt: playlist.createdAt,
        channelTitle: playlist.channelTitle || null,
        syncInProgress: isSyncing,
        lastSyncResult: syncResult
          ? {
              videosAdded: syncResult.videosAdded,
              videosUpdated: syncResult.videosUpdated,
              videosRemoved: syncResult.videosRemoved,
            }
          : undefined,
      };
    });

    // Set helpful headers for debugging
    res.setHeader("X-Total-Count", totalCount.toString());
    res.setHeader("X-Page", pageNum.toString());
    res.setHeader("X-Limit", limitNum.toString());
    res.setHeader("X-Trace-Id", traceId);
    res.setHeader("Cache-Control", "s-maxage=5, stale-while-revalidate");

    // Return paginated response
    return res.status(200).json({
      success: true,
      data: formattedPlaylists,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalCount / limitNum),
      hasMore: skip + limitNum < totalCount,
      traceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to fetch playlists:`, error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch playlists",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
    });
  }
}

export default withAdminApi(handler);
