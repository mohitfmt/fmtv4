// pages/api/video-admin/playlists/[id]/sync.ts - SMART COUNT VERSION
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { youtube } from "@/lib/youtube-sync";
import { syncPlaylist } from "@/lib/youtube-sync";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id: playlistId } = req.query;
  const { fullCount = false } = req.body; // Force full count if needed
  const traceId = (req as any).traceId;
  // const session = (req as any).session;
  const userEmail = req.cookies?.user_email || "admin@freemalaysiatoday.com";

  if (!playlistId || typeof playlistId !== "string") {
    return res.status(400).json({
      success: false,
      error: "Invalid playlist ID",
      traceId,
    });
  }

  try {
    // Check if playlist exists
    const playlist = await prisma.playlist.findUnique({
      where: { playlistId },
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        error: "Playlist not found",
        traceId,
      });
    }

    // Check if already syncing
    const syncStatus = await prisma.syncStatus.findUnique({
      where: { id: "main" },
    });

    if (syncStatus?.currentlySyncing) {
      return res.status(409).json({
        success: false,
        error: "Another sync operation is in progress",
        message: `Currently syncing: ${syncStatus.currentPlaylistId}`,
        traceId,
      });
    }

    // Mark as syncing
    await prisma.syncStatus.upsert({
      where: { id: "main" },
      update: {
        currentlySyncing: true,
        currentPlaylistId: playlistId,
        lastSync: new Date(),
      },
      create: {
        id: "main",
        currentlySyncing: true,
        currentPlaylistId: playlistId,
        lastSync: new Date(),
      },
    });

    // Determine sync strategy based on lastSyncResult
    const lastSyncResult = (playlist.lastSyncResult as any) || {};
    const lastFullCount = lastSyncResult.lastFullCount;
    const daysSinceFullCount = lastFullCount
      ? Math.floor(
          (Date.now() - new Date(lastFullCount).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : Infinity;

    let syncStrategy: "full" | "incremental" | "smart";

    if (!playlist.itemCount || playlist.itemCount === 0 || !lastFullCount) {
      // First sync or no count - need full sync
      syncStrategy = "full";
    } else if (fullCount || daysSinceFullCount > 7) {
      // Forced or weekly verification needed
      syncStrategy = "full";
    } else {
      // Smart incremental sync
      syncStrategy = "smart";
    }

    console.log(
      `[${traceId}] Sync strategy for ${playlistId}: ${syncStrategy}`
    );

    // Log the sync start
    await prisma.admin_activity_logs.create({
      data: {
        action: "SYNC_PLAYLIST_START",
        entityType: "playlist",
        userId: userEmail,
        metadata: {
          playlistId,
          playlistTitle: playlist.title,
          strategy: syncStrategy,
          currentItemCount: playlist.itemCount,
          daysSinceFullCount,
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          req.socket.remoteAddress,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    // Perform sync based on strategy
    let result;

    if (syncStrategy === "smart") {
      // Smart incremental sync - only check first page for changes
      result = await performSmartSync(playlistId, playlist, traceId);
    } else {
      // Full sync with complete count
      result = await performFullSync(playlistId, traceId);
    }

    // Update playlist with new count and lastSyncResult
    const updatedSyncResult = {
      ...((playlist.lastSyncResult as any) || {}),
      lastIncrementalUpdate: new Date(),
      ...(syncStrategy === "full"
        ? {
            lastFullCount: new Date(),
            countVerified: true,
            incrementalChanges: 0,
          }
        : {
            incrementalChanges:
              ((playlist.lastSyncResult as any)?.incrementalChanges || 0) +
              (result.videosAdded || 0),
          }),
    };

    await prisma.playlist.update({
      where: { playlistId },
      data: {
        itemCount: result.totalVideos || playlist.itemCount,
        lastSyncedAt: new Date(),
        lastSyncResult: updatedSyncResult,
      },
    });

    // Clear syncing status
    await prisma.syncStatus.update({
      where: { id: "main" },
      data: {
        currentlySyncing: false,
        currentPlaylistId: null,
        lastSync: new Date(),
      },
    });

    // Log completion
    await prisma.admin_activity_logs.create({
      data: {
        action: "SYNC_PLAYLIST_COMPLETE",
        entityType: "playlist",
        userId: userEmail,
        metadata: {
          playlistId,
          strategy: syncStrategy,
          videosAdded: result.videosAdded,
          videosUpdated: result.videosUpdated,
          totalVideos: result.totalVideos,
          duration: result.duration,
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          req.socket.remoteAddress,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Sync completed for "${playlist.title}"`,
      data: {
        playlistId,
        strategy: syncStrategy,
        videosAdded: result.videosAdded,
        videosUpdated: result.videosUpdated,
        totalVideos: result.totalVideos,
        duration: result.duration,
      },
      traceId,
    });
  } catch (error) {
    console.error(`[${traceId}] Sync failed:`, error);

    // Clear syncing status on error
    await prisma.syncStatus
      .update({
        where: { id: "main" },
        data: {
          currentlySyncing: false,
          currentPlaylistId: null,
          lastError: error instanceof Error ? error.message : "Unknown error",
        },
      })
      .catch(() => {}); // Ignore errors clearing status

    return res.status(500).json({
      success: false,
      error: "Sync operation failed",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
    });
  }
}

// Smart sync - minimal API usage
async function performSmartSync(
  playlistId: string,
  playlist: any,
  traceId: string
): Promise<any> {
  const startTime = Date.now();

  try {
    console.log(`[${traceId}] Starting smart sync for ${playlistId}`);

    // Fetch only first page (50 items) to check for changes
    const response = await youtube.playlistItems.list({
      playlistId,
      part: ["snippet", "contentDetails"],
      maxResults: 50,
    });

    const items = response.data.items || [];
    const pageInfo = response.data.pageInfo;

    // Get existing video IDs from first page in our DB
    const existingFirstPage = await prisma.videos.findMany({
      where: {
        playlists: {
          has: playlistId,
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      take: 50,
      select: {
        videoId: true,
      },
    });

    const existingIds = new Set(existingFirstPage.map((v) => v.videoId));
    const newVideoIds = items
      .map((item) => item.snippet?.resourceId?.videoId)
      .filter((id) => id && !existingIds.has(id)) as string[];

    let videosAdded = 0;
    const videosUpdated = 0;

    // Process new videos if any
    if (newVideoIds.length > 0) {
      console.log(`[${traceId}] Found ${newVideoIds.length} new videos`);

      // Fetch details for new videos
      const videoDetails = await youtube.videos.list({
        id: newVideoIds,
        part: ["snippet", "statistics", "contentDetails", "status"],
      });

      // Save new videos (simplified - you'd use your existing save logic)
      for (const video of videoDetails.data.items || []) {
        // Your existing video save logic here
        videosAdded++;
      }
    }

    // Estimate total count based on page info
    // If we have nextPageToken, estimate based on current count + changes
    let estimatedTotal = playlist.itemCount || 0;
    if (newVideoIds.length > 0) {
      estimatedTotal += newVideoIds.length;
    }

    // Use pageInfo.totalResults if available and reasonable
    if (pageInfo?.totalResults && pageInfo.totalResults > 0) {
      estimatedTotal = pageInfo.totalResults;
    }

    return {
      videosAdded,
      videosUpdated,
      totalVideos: estimatedTotal,
      duration: Math.round((Date.now() - startTime) / 1000),
      strategy: "smart",
    };
  } catch (error) {
    console.error(`[${traceId}] Smart sync failed:`, error);
    throw error;
  }
}

// Full sync with complete count
async function performFullSync(
  playlistId: string,
  traceId: string
): Promise<any> {
  const startTime = Date.now();

  try {
    console.log(`[${traceId}] Starting full sync with count for ${playlistId}`);

    // Get full item count by paginating through playlist
    let totalItems = 0;
    let nextPageToken: string | undefined;
    let pageCount = 0;
    const maxPages = 20; // Limit to prevent excessive quota usage

    do {
      const response = await youtube.playlistItems.list({
        playlistId,
        part: ["contentDetails"], // Minimal parts for counting
        maxResults: 50,
        pageToken: nextPageToken,
      });

      const items = response.data.items || [];
      totalItems += items.length;
      nextPageToken = response.data.nextPageToken || undefined;
      pageCount++;

      // Store first page video IDs for actual sync
      if (pageCount === 1) {
        // Process first page videos (you'd call your existing sync logic)
        // This is where you'd actually sync the video details
      }

      console.log(
        `[${traceId}] Page ${pageCount}: ${items.length} items (total: ${totalItems})`
      );

      // Safety limit to prevent runaway pagination
      if (pageCount >= maxPages) {
        console.log(`[${traceId}] Reached max pages limit (${maxPages})`);
        break;
      }
    } while (nextPageToken);

    // Now perform actual sync using existing syncPlaylist function
    const syncResult = await syncPlaylist(playlistId);

    return {
      videosAdded: syncResult.videosAdded || 0,
      videosUpdated: syncResult.videosUpdated || 0,
      totalVideos: totalItems,
      duration: Math.round((Date.now() - startTime) / 1000),
      strategy: "full",
      pagesProcessed: pageCount,
    };
  } catch (error) {
    console.error(`[${traceId}] Full sync failed:`, error);
    throw error;
  }
}

export default handler;
