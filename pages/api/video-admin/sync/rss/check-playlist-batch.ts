// pages/api/video-admin/sync/rss/check-playlist-batch.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import pLimit from "p-limit";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import {
  checkRSSFeed,
  rebuildPlaylist,
  fetchPlaylistItems,
  acquirePlaylistLease,
  revalidatePaths,
  purgeCloudflareCache,
} from "@/lib/sync-helpers";

type Ok = {
  success: true;
  traceId: string;
  summary: {
    checked: number;
    changed: number;
    rebuilt: number;
    pagesRevalidated: number;
  };
};

type Err = { success: false; traceId: string; error: string };

const RSS_CONCURRENCY = 8;
const REBUILD_CONCURRENCY = 6;

async function handler(req: NextApiRequest, res: NextApiResponse<Ok | Err>) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res
      .status(405)
      .json({ success: false, traceId: "-", error: "Method not allowed" });
  }

  const traceId = crypto.randomUUID();
  const rssLimiter = pLimit(RSS_CONCURRENCY);
  const rebuildLimiter = pLimit(REBUILD_CONCURRENCY);

  try {
    // 1) Load FE config to determine FE-critical playlist IDs to EXCLUDE
    const feConfig = await prisma.videoConfig.findFirst({
      orderBy: { updatedAt: "desc" },
      select: {
        heroPlaylist: true,
        shortsPlaylist: true,
        displayedPlaylists: true,
      },
    });

    const displayed = Array.isArray(feConfig?.displayedPlaylists)
      ? (feConfig!.displayedPlaylists as any[])
      : [];

    const feCriticalIds = new Set<string>(
      [
        feConfig?.heroPlaylist,
        feConfig?.shortsPlaylist,
        ...displayed.map((x) => x?.playlistId).filter(Boolean),
      ].filter(Boolean) as string[]
    );

    // 2) Fetch *non-critical*, active playlists
    const nonCritical = await prisma.playlist.findMany({
      where: {
        isActive: true,
        playlistId: { notIn: Array.from(feCriticalIds) },
      },
      select: {
        playlistId: true,
        slug: true,
        etag: true,
        lastModified: true,
      },
    });

    const results = {
      checked: 0,
      changed: 0,
      rebuilt: 0,
      pagesRevalidated: 0,
    };

    const affectedPaths = new Set<string>();

    // 3) Check RSS for each non-critical playlist; rebuild if changed
    await Promise.allSettled(
      nonCritical.map((pl) =>
        rssLimiter(async () => {
          results.checked += 1;

          const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${pl.playlistId}`;
          let changed = false;
          let newEtag: string | undefined;
          let newLastModified: string | undefined;

          try {
            const check = await checkRSSFeed(
              rssUrl,
              pl.etag || undefined,
              pl.lastModified || undefined
            );
            if (check.changed) {
              changed = true;
              results.changed += 1;
              newEtag = check.etag;
              newLastModified = check.lastModified;
            }
          } catch (err) {
            // RSS failed — skip this playlist; it's non-critical
            console.error(
              `[${traceId}] RSS check failed for ${pl.playlistId}`,
              err
            );
            return;
          }

          if (!changed) return;

          // If changed, acquire a short lease and rebuild
          const requestId = crypto.randomUUID();
          const acquired = await acquirePlaylistLease(
            pl.playlistId,
            requestId,
            30_000
          );
          if (!acquired) {
            // Another worker is rebuilding it — that's fine
            return;
          }

          await rebuildLimiter(async () => {
            try {
              const items = await fetchPlaylistItems(pl.playlistId);
              const result = await rebuildPlaylist(pl.playlistId, items);

              await prisma.playlist.update({
                where: { playlistId: pl.playlistId },
                data: {
                  etag: newEtag ?? null,
                  lastModified: newLastModified ?? null,
                  fingerprint: result.fingerprint,
                  lastFingerprintAt: new Date(),
                  itemCount: items.length,
                  syncLeaseUntil: new Date(),
                  syncLeaseOwner: null,
                  updatedAt: new Date(),
                },
              });

              results.rebuilt += 1;

              // For non-critical, we only revalidate the playlist page itself (not /videos)
              if (pl.slug) {
                affectedPaths.add(`/videos/${pl.slug}`);
              }

              // Log success (keep metadata JSON-only)
              await prisma.admin_activity_logs.create({
                data: {
                  userId: "scheduler",
                  action: "SYNC_PLAYLIST_REBUILT",
                  entityType: "playlist",
                  metadata: {
                    playlistId: pl.playlistId,
                    videosAdded: result.videosAdded,
                    videosUpdated: result.videosUpdated,
                    videosRemoved: result.videosRemoved,
                    changedBy: "rss",
                    traceId,
                  },
                  timestamp: new Date(),
                },
              });
            } catch (err) {
              console.error(
                `[${traceId}] Rebuild failed for ${pl.playlistId}`,
                err
              );
              // Release lease on failure
              await prisma.playlist.updateMany({
                where: { playlistId: pl.playlistId },
                data: { syncLeaseUntil: new Date(), syncLeaseOwner: null },
              });

              await prisma.admin_activity_logs.create({
                data: {
                  userId: "scheduler",
                  action: "SYNC_PLAYLIST_REBUILD_FAILED",
                  entityType: "playlist",
                  metadata: {
                    playlistId: pl.playlistId,
                    error: err instanceof Error ? err.message : "unknown",
                    traceId,
                  },
                  timestamp: new Date(),
                },
              });
            }
          });
        })
      )
    );

    // 4) Revalidate affected pages & purge CDN for them
    if (affectedPaths.size > 0) {
      const paths = Array.from(affectedPaths);
      await revalidatePaths(paths);
      results.pagesRevalidated = paths.length;

      const urls = paths.map((p) => `${process.env.NEXT_PUBLIC_APP_URL}${p}`);
      await purgeCloudflareCache(urls);
    }

    // 5) Batch summary log
    await prisma.admin_activity_logs.create({
      data: {
        userId: "scheduler",
        action: "SYNC_NONCRITICAL_BATCH",
        entityType: "system",
        metadata: {
          traceId,
          ...results,
        },
        timestamp: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      traceId,
      summary: {
        checked: results.checked,
        changed: results.changed,
        rebuilt: results.rebuilt,
        pagesRevalidated: results.pagesRevalidated,
      },
    });
  } catch (error) {
    console.error(`[${traceId}] Non-critical batch failed`, error);
    return res.status(500).json({
      success: false,
      traceId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default withAdminApi(handler);
