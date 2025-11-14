// pages/api/video-admin/fix-video-playlist.ts
// FIX VIDEO PLAYLIST ASSIGNMENT
// Re-sync specific video(s) playlist membership from YouTube source of truth

import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { youtube } from "@/lib/youtube-sync";
import { clearVideoCache, parseVideoIds } from "@/lib/cache-utils";

interface VideoFixResult {
  videoId: string;
  title: string;
  before: {
    playlists: string[];
    playlistNames: string[];
  };
  after: {
    playlists: string[];
    playlistNames: string[];
  };
  changes: {
    added: string[];
    removed: string[];
    unchanged: string[];
  };
  cacheCleared: boolean;
  errors: string[];
}

interface FixResponse {
  success: boolean;
  message: string;
  results: VideoFixResult[];
  cacheStatus: {
    lruCleared: boolean;
    cloudflarePurged: boolean;
    isrRevalidated: boolean;
    totalDuration: number;
  };
  totalProcessed: number;
  totalErrors: number;
  traceId: string;
  duration: number;
}

async function handler(req: NextApiRequest, res: NextApiResponse<FixResponse>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
      results: [],
      cacheStatus: {
        lruCleared: false,
        cloudflarePurged: false,
        isrRevalidated: false,
        totalDuration: 0,
      },
      totalProcessed: 0,
      totalErrors: 0,
      traceId: "",
      duration: 0,
    });
  }

  const startTime = Date.now();
  const traceId = `FIX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const userEmail = req.cookies?.user_email || "admin@freemalaysiatoday.com";

  console.log(`[${traceId}] ========================================`);
  console.log(`[${traceId}] Fix Video Playlist Assignment`);
  console.log(`[${traceId}] User: ${userEmail}`);

  const { videoInput } = req.body;

  if (!videoInput || typeof videoInput !== "string") {
    return res.status(400).json({
      success: false,
      message: "Missing videoInput parameter",
      results: [],
      cacheStatus: {
        lruCleared: false,
        cloudflarePurged: false,
        isrRevalidated: false,
        totalDuration: 0,
      },
      totalProcessed: 0,
      totalErrors: 0,
      traceId,
      duration: Date.now() - startTime,
    });
  }

  // Parse video IDs from input (supports multiple)
  const videoIds = parseVideoIds(videoInput);

  if (videoIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid video input. Provide YouTube URL, FMT URL, or video ID",
      results: [],
      cacheStatus: {
        lruCleared: false,
        cloudflarePurged: false,
        isrRevalidated: false,
        totalDuration: 0,
      },
      totalProcessed: 0,
      totalErrors: 0,
      traceId,
      duration: Date.now() - startTime,
    });
  }

  console.log(
    `[${traceId}] Processing ${videoIds.length} video(s): ${videoIds.join(", ")}`
  );

  const results: VideoFixResult[] = [];
  const allPlaylistSlugs = new Set<string>();

  // ====================================================================
  // STEP 1: Get all FMT playlists from database
  // ====================================================================
  const fmtPlaylists = await prisma.playlist.findMany({
    where: { isActive: true },
    select: { playlistId: true, title: true, slug: true },
  });

  const playlistMap = new Map(
    fmtPlaylists.map((p) => [p.playlistId, { title: p.title, slug: p.slug }])
  );

  console.log(`[${traceId}] Found ${fmtPlaylists.length} active FMT playlists`);

  // ====================================================================
  // STEP 2: Process each video
  // ====================================================================
  for (const videoId of videoIds) {
    console.log(`[${traceId}] Processing video: ${videoId}`);

    const result: VideoFixResult = {
      videoId,
      title: "",
      before: {
        playlists: [],
        playlistNames: [],
      },
      after: {
        playlists: [],
        playlistNames: [],
      },
      changes: {
        added: [],
        removed: [],
        unchanged: [],
      },
      cacheCleared: false,
      errors: [],
    };

    try {
      // Get current state from database
      const existingVideo = await prisma.videos.findFirst({
        where: { videoId },
        select: {
          id: true,
          videoId: true,
          title: true,
          playlists: true,
        },
      });

      if (!existingVideo) {
        result.errors.push("Video not found in database");
        results.push(result);
        continue;
      }

      result.title = existingVideo.title;
      result.before.playlists = existingVideo.playlists || [];
      result.before.playlistNames = result.before.playlists
        .map((pid) => playlistMap.get(pid)?.title || pid)
        .filter(Boolean);

      console.log(
        `[${traceId}] Current playlists: ${result.before.playlists.join(", ")}`
      );

      // ====================================================================
      // STEP 3: Query YouTube API for each FMT playlist
      // ====================================================================
      const foundInPlaylists: string[] = [];

      for (const playlist of fmtPlaylists) {
        try {
          // Check if video exists in this playlist
          const response = await youtube.playlistItems.list({
            part: ["contentDetails"],
            playlistId: playlist.playlistId,
            videoId: videoId,
            maxResults: 1,
            key: process.env.YOUTUBE_API_KEY,
          });

          if (response.data.items && response.data.items.length > 0) {
            foundInPlaylists.push(playlist.playlistId);
            if (playlist.slug) {
              allPlaylistSlugs.add(playlist.slug);
            }
            console.log(
              `[${traceId}] ✅ Found in playlist: ${playlist.title} (${playlist.playlistId})`
            );
          }
        } catch (error: any) {
          console.error(
            `[${traceId}] Error checking playlist ${playlist.playlistId}:`,
            error.message
          );
          result.errors.push(
            `Failed to check playlist ${playlist.title}: ${error.message}`
          );
        }
      }

      result.after.playlists = foundInPlaylists;
      result.after.playlistNames = foundInPlaylists
        .map((pid) => playlistMap.get(pid)?.title || pid)
        .filter(Boolean);

      console.log(
        `[${traceId}] YouTube says playlists: ${foundInPlaylists.join(", ")}`
      );

      // ====================================================================
      // STEP 4: Calculate changes
      // ====================================================================
      const beforeSet = new Set(result.before.playlists);
      const afterSet = new Set(result.after.playlists);

      result.changes.added = foundInPlaylists.filter((p) => !beforeSet.has(p));
      result.changes.removed = result.before.playlists.filter(
        (p) => !afterSet.has(p)
      );
      result.changes.unchanged = foundInPlaylists.filter((p) =>
        beforeSet.has(p)
      );

      console.log(`[${traceId}] Changes detected:`);
      console.log(`[${traceId}]   Added: ${result.changes.added.join(", ")}`);
      console.log(
        `[${traceId}]   Removed: ${result.changes.removed.join(", ")}`
      );
      console.log(
        `[${traceId}]   Unchanged: ${result.changes.unchanged.join(", ")}`
      );

      // ====================================================================
      // STEP 5: Update database
      // ====================================================================
      await prisma.videos.update({
        where: { id: existingVideo.id },
        data: {
          playlists: foundInPlaylists,
          playlistsUpdatedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log(`[${traceId}] ✅ Database updated for ${videoId}`);

      // Log activity
      await prisma.admin_activity_logs.create({
        data: {
          action: "VIDEO_PLAYLIST_FIX",
          entityType: "video",
          id: videoId,
          userId: userEmail,
          metadata: {
            videoId,
            title: result.title,
            before: result.before.playlists,
            after: result.after.playlists,
            changes: result.changes,
          },
          ipAddress:
            (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
            req.socket.remoteAddress ||
            null,
          userAgent: req.headers["user-agent"] || null,
        },
      });

      results.push(result);
    } catch (error: any) {
      console.error(`[${traceId}] Failed to process ${videoId}:`, error);
      result.errors.push(`Processing failed: ${error.message}`);
      results.push(result);
    }
  }

  // ====================================================================
  // STEP 6: BLOCKING cache clear
  // ====================================================================
  console.log(`[${traceId}] Starting BLOCKING cache clear...`);

  const cacheResult = await clearVideoCache(
    videoIds.length === 1 ? videoIds[0] : undefined,
    Array.from(allPlaylistSlugs)
  );

  console.log(`[${traceId}] Cache cleared in ${cacheResult.totalDuration}ms`);
  console.log(`[${traceId}] LRU: ${cacheResult.lruCleared}`);
  console.log(`[${traceId}] Cloudflare: ${cacheResult.cloudflarePurged}`);
  console.log(`[${traceId}] ISR: ${cacheResult.isrRevalidated}`);

  // Mark all results as cache cleared
  results.forEach((r) => {
    r.cacheCleared =
      cacheResult.lruCleared &&
      cacheResult.cloudflarePurged &&
      cacheResult.isrRevalidated;
  });

  // ====================================================================
  // STEP 7: Return results
  // ====================================================================
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const duration = Date.now() - startTime;

  console.log(`[${traceId}] ========================================`);
  console.log(`[${traceId}] Completed in ${duration}ms`);
  console.log(`[${traceId}] Processed: ${results.length} videos`);
  console.log(`[${traceId}] Errors: ${totalErrors}`);

  return res.status(200).json({
    success: totalErrors === 0,
    message:
      totalErrors === 0
        ? `Successfully fixed ${results.length} video(s)`
        : `Completed with ${totalErrors} error(s)`,
    results,
    cacheStatus: {
      lruCleared: cacheResult.lruCleared,
      cloudflarePurged: cacheResult.cloudflarePurged,
      isrRevalidated: cacheResult.isrRevalidated,
      totalDuration: cacheResult.totalDuration,
    },
    totalProcessed: results.length,
    totalErrors,
    traceId,
    duration,
  });
}

export default handler;
