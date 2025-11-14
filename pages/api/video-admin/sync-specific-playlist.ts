// pages/api/video-admin/sync-specific-playlist.ts
// SYNC SPECIFIC PLAYLIST
// Wrapper around syncPlaylist() with blocking cache clear

import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { syncPlaylist } from "@/lib/youtube-sync";
import { clearVideoCache } from "@/lib/cache-utils";

interface SyncResponse {
  success: boolean;
  message: string;
  data: {
    playlist: {
      playlistId: string;
      title: string;
      slug: string | null;
    };
    syncResult: {
      videosAdded: number;
      videosUpdated: number;
      videosRemoved: number;
      duration: number;
      errors: string[];
    };
    cacheStatus: {
      lruCleared: boolean;
      cloudflarePurged: boolean;
      isrRevalidated: boolean;
      totalDuration: number;
    };
  };
  traceId: string;
  duration: number;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
      data: {
        playlist: { playlistId: "", title: "", slug: null },
        syncResult: {
          videosAdded: 0,
          videosUpdated: 0,
          videosRemoved: 0,
          duration: 0,
          errors: [],
        },
        cacheStatus: {
          lruCleared: false,
          cloudflarePurged: false,
          isrRevalidated: false,
          totalDuration: 0,
        },
      },
      traceId: "",
      duration: 0,
    });
  }

  const startTime = Date.now();
  const traceId = `SYNC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const userEmail = req.cookies?.user_email || "admin@freemalaysiatoday.com";

  console.log(`[${traceId}] ========================================`);
  console.log(`[${traceId}] Sync Specific Playlist`);
  console.log(`[${traceId}] User: ${userEmail}`);

  const { playlistInput } = req.body;

  if (!playlistInput || typeof playlistInput !== "string") {
    return res.status(400).json({
      success: false,
      message: "Missing playlistInput parameter (playlist ID or slug)",
      data: {
        playlist: { playlistId: "", title: "", slug: null },
        syncResult: {
          videosAdded: 0,
          videosUpdated: 0,
          videosRemoved: 0,
          duration: 0,
          errors: [],
        },
        cacheStatus: {
          lruCleared: false,
          cloudflarePurged: false,
          isrRevalidated: false,
          totalDuration: 0,
        },
      },
      traceId,
      duration: Date.now() - startTime,
    });
  }

  try {
    // ====================================================================
    // STEP 1: Find playlist by ID or slug
    // ====================================================================
    const trimmed = playlistInput.trim();
    let playlist = await prisma.playlist.findFirst({
      where: {
        OR: [{ playlistId: trimmed }, { slug: trimmed }],
      },
      select: {
        playlistId: true,
        title: true,
        slug: true,
      },
    });

    if (!playlist) {
      return res.status(404).json({
        success: false,
        message: `Playlist not found: ${trimmed}`,
        data: {
          playlist: { playlistId: "", title: "", slug: null },
          syncResult: {
            videosAdded: 0,
            videosUpdated: 0,
            videosRemoved: 0,
            duration: 0,
            errors: [],
          },
          cacheStatus: {
            lruCleared: false,
            cloudflarePurged: false,
            isrRevalidated: false,
            totalDuration: 0,
          },
        },
        traceId,
        duration: Date.now() - startTime,
      });
    }

    console.log(`[${traceId}] Found playlist: ${playlist.title}`);
    console.log(`[${traceId}] Playlist ID: ${playlist.playlistId}`);
    console.log(`[${traceId}] Slug: ${playlist.slug || "N/A"}`);

    // ====================================================================
    // STEP 2: Check if already syncing
    // ====================================================================
    const syncStatus = await prisma.syncStatus.findUnique({
      where: { id: "main" },
    });

    if (syncStatus?.currentlySyncing) {
      return res.status(409).json({
        success: false,
        message: `Another sync is in progress: ${syncStatus.currentPlaylistId}`,
        data: {
          playlist: {
            playlistId: playlist.playlistId,
            title: playlist.title,
            slug: playlist.slug,
          },
          syncResult: {
            videosAdded: 0,
            videosUpdated: 0,
            videosRemoved: 0,
            duration: 0,
            errors: ["Sync already in progress"],
          },
          cacheStatus: {
            lruCleared: false,
            cloudflarePurged: false,
            isrRevalidated: false,
            totalDuration: 0,
          },
        },
        traceId,
        duration: Date.now() - startTime,
      });
    }

    // ====================================================================
    // STEP 3: Mark as syncing
    // ====================================================================
    await prisma.syncStatus.upsert({
      where: { id: "main" },
      update: {
        currentlySyncing: true,
        currentPlaylistId: playlist.playlistId,
        lastSync: new Date(),
      },
      create: {
        id: "main",
        currentlySyncing: true,
        currentPlaylistId: playlist.playlistId,
        lastSync: new Date(),
      },
    });

    console.log(`[${traceId}] Marked as syncing...`);

    let syncResult;

    try {
      // ====================================================================
      // STEP 4: Run sync
      // ====================================================================
      syncResult = await syncPlaylist(playlist.playlistId);

      console.log(`[${traceId}] Sync completed:`);
      console.log(`[${traceId}]   Added: ${syncResult.videosAdded}`);
      console.log(`[${traceId}]   Updated: ${syncResult.videosUpdated}`);
      console.log(`[${traceId}]   Removed: ${syncResult.videosRemoved}`);
      console.log(`[${traceId}]   Duration: ${syncResult.duration}s`);

      if (syncResult.errors.length > 0) {
        console.error(`[${traceId}] Errors: ${syncResult.errors.join(", ")}`);
      }
    } finally {
      // Always clear sync lock
      await prisma.syncStatus.update({
        where: { id: "main" },
        data: {
          currentlySyncing: false,
          currentPlaylistId: null,
        },
      });
      console.log(`[${traceId}] Sync lock released`);
    }

    // ====================================================================
    // STEP 5: BLOCKING cache clear
    // ====================================================================
    console.log(`[${traceId}] Starting BLOCKING cache clear...`);

    const cacheResult = await clearVideoCache(
      undefined,
      playlist.slug ? [playlist.slug] : undefined
    );

    console.log(`[${traceId}] Cache cleared in ${cacheResult.totalDuration}ms`);
    console.log(`[${traceId}] LRU: ${cacheResult.lruCleared}`);
    console.log(`[${traceId}] Cloudflare: ${cacheResult.cloudflarePurged}`);
    console.log(`[${traceId}] ISR: ${cacheResult.isrRevalidated}`);

    // ====================================================================
    // STEP 6: Log activity
    // ====================================================================
    await prisma.admin_activity_logs.create({
      data: {
        action: "PLAYLIST_SYNC",
        entityType: "playlist",
        id: playlist.playlistId,
        userId: userEmail,
        metadata: {
          playlistId: playlist.playlistId,
          title: playlist.title,
          slug: playlist.slug,
          videosAdded: syncResult.videosAdded,
          videosUpdated: syncResult.videosUpdated,
          videosRemoved: syncResult.videosRemoved,
          duration: syncResult.duration,
          errors: syncResult.errors,
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          req.socket.remoteAddress ||
          null,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    // ====================================================================
    // STEP 7: Return results
    // ====================================================================
    const duration = Date.now() - startTime;

    console.log(`[${traceId}] ========================================`);
    console.log(`[${traceId}] Completed in ${duration}ms`);

    return res.status(200).json({
      success: syncResult.errors.length === 0,
      message:
        syncResult.errors.length === 0
          ? `Successfully synced ${playlist.title}`
          : `Sync completed with ${syncResult.errors.length} error(s)`,
      data: {
        playlist: {
          playlistId: playlist.playlistId,
          title: playlist.title,
          slug: playlist.slug,
        },
        syncResult: {
          videosAdded: syncResult.videosAdded,
          videosUpdated: syncResult.videosUpdated,
          videosRemoved: syncResult.videosRemoved,
          duration: syncResult.duration,
          errors: syncResult.errors,
        },
        cacheStatus: {
          lruCleared: cacheResult.lruCleared,
          cloudflarePurged: cacheResult.cloudflarePurged,
          isrRevalidated: cacheResult.isrRevalidated,
          totalDuration: cacheResult.totalDuration,
        },
      },
      traceId,
      duration,
    });
  } catch (error: any) {
    console.error(`[${traceId}] Fatal error:`, error);

    // Clear sync lock on error
    try {
      await prisma.syncStatus.update({
        where: { id: "main" },
        data: {
          currentlySyncing: false,
          currentPlaylistId: null,
        },
      });
    } catch (e) {
      // Ignore cleanup errors
    }

    return res.status(500).json({
      success: false,
      message: `Sync failed: ${error.message}`,
      data: {
        playlist: { playlistId: "", title: "", slug: null },
        syncResult: {
          videosAdded: 0,
          videosUpdated: 0,
          videosRemoved: 0,
          duration: 0,
          errors: [error.message],
        },
        cacheStatus: {
          lruCleared: false,
          cloudflarePurged: false,
          isrRevalidated: false,
          totalDuration: 0,
        },
      },
      traceId,
      duration: Date.now() - startTime,
    });
  }
}

export default handler;
