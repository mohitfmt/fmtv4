// pages/api/video-admin/playlists/[id]/sync.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  fetchPlaylistItems,
  rebuildPlaylist,
  revalidatePaths,
  purgeCloudflareCache,
  acquirePlaylistLease,
  shouldRevalidateHome,
} from "@/lib/sync-helpers";
import crypto from "crypto";

type SuccessBody = {
  success: true;
  playlistId: string;
  videosAdded: number;
  videosUpdated: number;
  videosRemoved: number;
  fingerprint: string;
};

type ErrorBody = {
  success: false;
  error: string;
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessBody | ErrorBody>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const playlistId = String(req.query.id || "");
  if (!playlistId) {
    return res
      .status(400)
      .json({ success: false, error: "Missing playlist id" });
  }

  const requestId = crypto.randomUUID();
  const now = new Date();

  // who triggered this (for logs)
  const userId =
    (req.headers["x-admin-user"] as string) ||
    (req.headers["x-user-id"] as string) ||
    "manual";
  const ipAddress =
    (req.headers["x-forwarded-for"] as string) ||
    req.socket.remoteAddress ||
    "";
  const userAgent = (req.headers["user-agent"] as string) || "";

  try {
    // Acquire a 60s lease for this playlist
    const leased = await acquirePlaylistLease(playlistId, requestId, 60_000);
    if (!leased) {
      return res
        .status(409)
        .json({ success: false, error: "Sync already in progress" });
    }

    // Mark in-progress
    await prisma.playlist.update({
      where: { playlistId },
      data: { syncInProgress: true },
    });

    // Pull current playlist items from YouTube and rebuild
    const items = await fetchPlaylistItems(playlistId);
    const result = await rebuildPlaylist(playlistId, items);

    // Write sync results back on the playlist
    const updated = await prisma.playlist.update({
      where: { playlistId },
      data: {
        fingerprint: result.fingerprint,
        lastFingerprintAt: now,
        itemCount: items.length,
        lastSyncResult: {
          videosAdded: result.videosAdded,
          videosUpdated: result.videosUpdated,
          videosRemoved: result.videosRemoved,
          at: now.toISOString(),
        },
        syncInProgress: false,
        syncLeaseUntil: now, // release lease
        syncLeaseOwner: null,
        updatedAt: now,
      },
      select: { slug: true },
    });

    // figure out which pages to revalidate
    const paths = new Set<string>();
    if (updated.slug) paths.add(`/videos/${updated.slug}`);

    const feConfig = await prisma.videoConfig.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { heroPlaylist: true, shortsPlaylist: true },
    });

    if (
      feConfig &&
      shouldRevalidateHome(
        playlistId,
        feConfig.heroPlaylist,
        feConfig.shortsPlaylist
      )
    ) {
      paths.add("/videos");
    }

    if (paths.size > 0) {
      await revalidatePaths(Array.from(paths));
      const urls = Array.from(paths).map(
        (p) => `${process.env.NEXT_PUBLIC_APP_URL}${p}`
      );
      await purgeCloudflareCache(urls);
    }

    // admin activity log
    await prisma.admin_activity_logs.create({
      data: {
        userId,
        action: "SYNC_PLAYLIST_SUCCESS",
        entityType: "playlist",
        metadata: {
          playlistId,
          result: {
            fingerprint: result.fingerprint,
            videosAdded: result.videosAdded,
            videosUpdated: result.videosUpdated,
            videosRemoved: result.videosRemoved,
          },
          requestId,
        } as Prisma.InputJsonValue,
        ipAddress,
        userAgent,
      },
    });

    // avoid spreading result.success to keep SuccessBody exact
    const { success: _ignore, ...rest } = result;

    return res.status(200).json({
      success: true,
      playlistId,
      ...rest, // fingerprint, videosAdded, videosUpdated, videosRemoved
    });
  } catch (err: any) {
    const message =
      typeof err?.message === "string" ? err.message : "Sync failed";

    // best-effort: release lease and capture error on playlist
    await prisma.playlist.updateMany({
      where: { playlistId },
      data: {
        syncInProgress: false,
        syncLeaseUntil: now,
        syncLeaseOwner: null,
        lastSyncResult: {
          videosAdded: 0,
          videosUpdated: 0,
          videosRemoved: 0,
          error: message,
          at: now.toISOString(),
        },
      },
    });

    // log failure
    await prisma.admin_activity_logs.create({
      data: {
        userId,
        action: "SYNC_PLAYLIST_FAILURE",
        entityType: "playlist",
        metadata: {
          playlistId,
          error: message,
          requestId,
        } as Prisma.InputJsonValue,
        ipAddress,
        userAgent,
      },
    });

    return res.status(500).json({ success: false, error: message });
  }
}

export default withAdminApi(handler);
