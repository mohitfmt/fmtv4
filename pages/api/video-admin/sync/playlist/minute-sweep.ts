import type { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import {
  checkRSSFeed,
  fetchPlaylistItems,
  rebuildPlaylist,
  computeFingerprint,
  enrichVideos,
  getUploadsPlaylistId,
  revalidatePaths,
  purgeCloudflareCache,
  acquirePlaylistLease,
  shouldRevalidateHome,
} from "@/lib/sync-helpers";
import type { SyncState } from "@/types/sync";
import pLimit from "p-limit";
import crypto from "crypto";
import { Prisma } from "@prisma/client";

type ErrorBody = { success: false; error: string; traceId: string };
type OkBody = {
  success: true;
  traceId: string;
  duration: number;
  results: {
    uploadsChecked: boolean;
    newVideos: number;
    playlistsChecked: number;
    playlistsChanged: number;
    idleChecked: number;
    idleChanged: number;
  };
};

const RSS_CONCURRENCY = 8;
const REBUILD_CONCURRENCY = 6;
const IDLE_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OkBody | ErrorBody>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed", traceId: "n/a" });
  }

  const traceId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const results = {
      uploadsChecked: false,
      newVideos: 0,
      playlistsChecked: 0,
      playlistsChanged: 0,
      idleChecked: 0,
      idleChanged: 0,
    };

    // Load FE config (your model is VideoConfig -> client API is videoConfig)
    const feConfig = await prisma.videoConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!feConfig) {
      throw new Error("No VideoConfig found");
    }

    // displayedPlaylists is JSON; ensure array shape safely
    const displayed: Array<{ playlistId?: string }> = Array.isArray(
      feConfig.displayedPlaylists
    )
      ? (feConfig.displayedPlaylists as any)
      : [];

    // FE-critical IDs: hero, shorts, and all displayed
    const feCriticalIds = new Set<string>(
      [
        feConfig.heroPlaylist,
        feConfig.shortsPlaylist,
        ...displayed.map((p) => p?.playlistId).filter(Boolean),
      ].filter(Boolean) as string[]
    );

    const affectedPaths = new Set<string>();
    const syncState = (feConfig.sync as SyncState) || {};

    // 1) Channel uploads RSS (if channel id configured)
    const channelId =
      process.env.YOUTUBE_CHANNEL_ID || "UC2CzLwbhTiI8pTKNVyrOnJQ";
    if (channelId) {
      try {
        const uploadsRssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        const uploadsCheck = await checkRSSFeed(
          uploadsRssUrl,
          syncState.uploadsEtag,
          syncState.uploadsLastModified
        );

        results.uploadsChecked = true;

        if (
          uploadsCheck.changed &&
          uploadsCheck.newVideoIds &&
          uploadsCheck.newVideoIds.length > 0
        ) {
          // Enrich only new videos (avoid wasted quota)
          const existing = await prisma.videos.findMany({
            where: { videoId: { in: uploadsCheck.newVideoIds } },
            select: { videoId: true },
          });
          const existingIds = new Set(existing.map((v) => v.videoId));
          const newIds = uploadsCheck.newVideoIds.filter(
            (id) => !existingIds.has(id)
          );

          if (newIds.length > 0) {
            results.newVideos = newIds.length;
            await enrichVideos(newIds);

            // Opportunistic reconciliation with uploads playlist first page
            const uploadsPlaylistId = await getUploadsPlaylistId(
              channelId,
              syncState
            );
            if (uploadsPlaylistId) {
              const uploadsItems = await fetchPlaylistItems(uploadsPlaylistId);
              const uploadsVideoIds = uploadsItems
                .map((it) => it?.contentDetails?.videoId)
                .filter(Boolean) as string[];

              const missing = uploadsVideoIds.filter(
                (vid) => !existingIds.has(vid) && !newIds.includes(vid)
              );
              if (missing.length > 0) {
                await enrichVideos(missing);
              }
            }

            // Home page needs revalidation when uploads changed
            affectedPaths.add("/videos");
          }
        }

        // Persist new ETag/Last-Modified if present
        const newSync: SyncState = {
          ...syncState,
          uploadsEtag: uploadsCheck.etag,
          uploadsLastModified: uploadsCheck.lastModified,
        };

        await prisma.videoConfig.update({
          where: { id: feConfig.id },
          data: { sync: newSync as Prisma.InputJsonValue },
        });
      } catch (err) {
        console.error(`[${traceId}] Uploads RSS check failed:`, err);
      }
    }

    // 2) FE-critical playlist RSS checks
    const activeCritical = await prisma.playlist.findMany({
      where: {
        isActive: true,
        playlistId: { in: Array.from(feCriticalIds) },
      },
      select: {
        playlistId: true,
        slug: true,
        etag: true,
        lastModified: true,
      },
    });

    const rssLimiter = pLimit(RSS_CONCURRENCY);
    const rebuildLimiter = pLimit(REBUILD_CONCURRENCY);

    await Promise.allSettled(
      activeCritical.map((pl) =>
        rssLimiter(async () => {
          results.playlistsChecked += 1;

          const rssUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${pl.playlistId}`;
          try {
            const check = await checkRSSFeed(
              rssUrl,
              pl.etag || undefined,
              pl.lastModified || undefined
            );
            if (!check.changed) return;

            results.playlistsChanged += 1;

            const requestId = crypto.randomUUID();
            const lease = await acquirePlaylistLease(pl.playlistId, requestId);
            if (!lease) {
              // another worker already doing it
              return;
            }

            await rebuildLimiter(async () => {
              try {
                const items = await fetchPlaylistItems(pl.playlistId);
                const rebuild = await rebuildPlaylist(pl.playlistId, items);

                const now = new Date();
                await prisma.playlist.update({
                  where: { playlistId: pl.playlistId },
                  data: {
                    etag: check.etag || null,
                    lastModified: check.lastModified || null,
                    fingerprint: rebuild.fingerprint,
                    lastFingerprintAt: now,
                    itemCount: items.length,
                    syncLeaseUntil: now,
                    syncLeaseOwner: null,
                    updatedAt: now,
                  },
                });

                if (
                  shouldRevalidateHome(
                    pl.playlistId,
                    feConfig.heroPlaylist,
                    feConfig.shortsPlaylist
                  )
                ) {
                  affectedPaths.add("/videos");
                }
                if (pl.slug) {
                  affectedPaths.add(`/videos/${pl.slug}`);
                }
              } catch (innerErr) {
                console.error(
                  `[${traceId}] Rebuild failed for ${pl.playlistId}:`,
                  innerErr
                );
                const now = new Date();
                await prisma.playlist.updateMany({
                  where: {
                    playlistId: pl.playlistId,
                    syncLeaseOwner: requestId,
                  },
                  data: { syncLeaseUntil: now, syncLeaseOwner: null },
                });
              }
            });
          } catch (err) {
            console.error(
              `[${traceId}] RSS check failed for ${pl.playlistId}:`,
              err
            );
          }
        })
      )
    );

    // 3) Idle fingerprint check (1 playlist / 15 min)
    const now = new Date();
    const threshold = new Date(now.getTime() - IDLE_CHECK_INTERVAL);

    const idle = await prisma.playlist.findFirst({
      where: {
        isActive: true,
        playlistId: { in: Array.from(feCriticalIds) },
        OR: [
          { lastFingerprintAt: { lte: threshold } },
          { lastFingerprintAt: null },
        ],
      },
      orderBy: [{ lastFingerprintAt: "asc" }, { playlistId: "asc" }],
      select: {
        playlistId: true,
        slug: true,
        fingerprint: true,
      },
    });

    if (idle) {
      results.idleChecked = 1;

      try {
        const items = await fetchPlaylistItems(idle.playlistId);
        const currentFingerprint = computeFingerprint(items);

        if (currentFingerprint !== idle.fingerprint) {
          results.idleChanged = 1;

          const requestId = crypto.randomUUID();
          const gotLease = await acquirePlaylistLease(
            idle.playlistId,
            requestId
          );
          if (gotLease) {
            const rebuild = await rebuildPlaylist(idle.playlistId, items);

            await prisma.playlist.update({
              where: { playlistId: idle.playlistId },
              data: {
                fingerprint: rebuild.fingerprint,
                lastFingerprintAt: now,
                itemCount: items.length,
                syncLeaseUntil: now,
                syncLeaseOwner: null,
                updatedAt: now,
              },
            });

            if (
              shouldRevalidateHome(
                idle.playlistId,
                feConfig.heroPlaylist,
                feConfig.shortsPlaylist
              )
            ) {
              affectedPaths.add("/videos");
            }
            if (idle.slug) {
              affectedPaths.add(`/videos/${idle.slug}`);
            }
          }
        } else {
          await prisma.playlist.update({
            where: { playlistId: idle.playlistId },
            data: { lastFingerprintAt: now },
          });
        }
      } catch (err) {
        console.error(
          `[${traceId}] Idle check failed for ${idle.playlistId}:`,
          err
        );
      }
    }

    // 4) Revalidate & purge caches for affected pages
    if (affectedPaths.size > 0) {
      const paths = Array.from(affectedPaths);
      await revalidatePaths(paths);

      const urls = paths.map(
        (p) =>
          `${process.env.NEXT_PUBLIC_APP_URL || "https://dev-v4.freemalaysiatoday.com"}${p}`
      );
      await purgeCloudflareCache(urls);
    }

    const duration = Date.now() - startedAt;

    // Audit log
    const ipAddress =
      (req.headers["x-forwarded-for"] as string) ||
      req.socket.remoteAddress ||
      "";
    const userAgent = (req.headers["user-agent"] as string) || "scheduler";

    await prisma.admin_activity_logs.create({
      data: {
        userId: "scheduler",
        action: "SYNC_MINUTE_SWEEP",
        entityType: "system",
        metadata: {
          traceId,
          duration,
          uploadsChecked: results.uploadsChecked,
          newVideos: results.newVideos,
          playlistsChecked: results.playlistsChecked,
          playlistsChanged: results.playlistsChanged,
          idleChecked: results.idleChecked,
          idleChanged: results.idleChanged,
        } as Prisma.InputJsonValue,
        ipAddress,
        userAgent,
        timestamp: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      traceId,
      duration,
      results,
    });
  } catch (error: any) {
    console.error(`[${traceId}] Minute-sweep failed:`, error?.message || error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      traceId,
    });
  }
}

export default withAdminApi(handler);
