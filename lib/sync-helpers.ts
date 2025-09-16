// lib/sync-helpers.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto";
import { promisify } from "util";
import { parseString } from "xml2js";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { youtube } from "@/lib/youtube-sync";
import type { SyncState } from "@/types/sync";

const parseXML = promisify(parseString);

// ---------- Local helper types ----------
interface RSSCheckResult {
  changed: boolean;
  etag?: string;
  lastModified?: string;
  newVideoIds?: string[];
}

interface RebuildResult {
  success: boolean;
  fingerprint: string;
  videosAdded: number;
  videosUpdated: number;
  videosRemoved: number;
}

// ---------- Fingerprint ----------
export function computeFingerprint(items: any[]): string {
  const hash = crypto.createHash("sha256");
  for (let i = 0; i < items.length; i++) {
    const it = items[i] || {};
    const videoId: string = it?.contentDetails?.videoId || it?.videoId || "";
    const position: number = (it?.snippet?.position ?? i) as number;
    hash.update(`${videoId}:${position}|`);
  }
  return hash.digest("hex");
}

// ---------- RSS ----------
export async function checkRSSFeed(
  url: string,
  etag?: string,
  lastModified?: string
): Promise<RSSCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const headers: Record<string, string> = {};
    if (etag) headers["If-None-Match"] = etag;
    if (lastModified) headers["If-Modified-Since"] = lastModified;

    const resp = await fetch(url, { headers, signal: controller.signal });

    if (resp.status === 304) {
      return { changed: false };
    }

    const newEtag = resp.headers.get("etag") || undefined;
    const newLastMod = resp.headers.get("last-modified") || undefined;

    if (newEtag === etag && newLastMod === lastModified) {
      return { changed: false };
    }

    const xml = await resp.text();
    const parsed: any = await parseXML(xml); // <- cast to any to avoid TS complaining
    const entries: any[] = parsed?.feed?.entry || [];
    const ids = entries
      .map((e: any) => e?.["yt:videoId"]?.[0])
      .filter(Boolean)
      .slice(0, 50);

    return {
      changed: true,
      etag: newEtag,
      lastModified: newLastMod,
      newVideoIds: ids,
    };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.error(`RSS timeout for ${url}`);
      return { changed: false };
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------- YouTube fetchers (retry/backoff) ----------
export async function fetchPlaylistItems(
  playlistId: string,
  maxResults: number = 50
): Promise<any[]> {
  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await youtube.playlistItems.list({
        playlistId,
        part: ["snippet", "contentDetails", "status"],
        maxResults,
      });
      return resp.data.items || [];
    } catch (err: any) {
      lastError = err;
      const code = err?.code || err?.response?.status;
      if (code === 429 || code === 503) {
        const backoff = Math.min(1000 * 2 ** attempt, 5000);
        const jitter = Math.random() * backoff * 0.3;
        await delay(backoff + jitter);
        continue;
      }
      if (attempt === 2) throw err;
    }
  }
  throw lastError;
}

export async function enrichVideos(videoIds: string[]): Promise<void> {
  if (!videoIds || videoIds.length === 0) return;

  for (let offset = 0; offset < videoIds.length; offset += 50) {
    const batch = videoIds.slice(offset, offset + 50);

    let resp: any;
    let lastError: any;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        resp = await youtube.videos.list({
          id: batch,
          part: ["snippet", "contentDetails", "statistics", "status"],
        });
        break;
      } catch (err: any) {
        lastError = err;
        const code = err?.code || err?.response?.status;
        if (code === 429 || code === 503) {
          const backoff = Math.min(1000 * 2 ** attempt, 5000);
          const jitter = Math.random() * backoff * 0.3;
          await delay(backoff + jitter);
          continue;
        }
        throw err;
      }
    }

    if (!resp) throw lastError;

    const items: any[] = resp.data.items || [];

    for (const v of items) {
      const id: string | undefined = v?.id;
      if (!id) continue;

      const sn = v?.snippet || {};
      const cd = v?.contentDetails || {};
      const st = v?.statistics || {};
      const vs = v?.status || {};

      const durationSeconds = parseISODurationToSeconds(cd?.duration || "PT0S");
      const isShort = durationSeconds > 0 && durationSeconds <= 60;

      const thumbs = sn?.thumbnails || {};
      const t_default = thumbs?.default?.url || "";
      const t_medium = thumbs?.medium?.url || t_default;
      const t_high = thumbs?.high?.url || t_medium;
      const t_standard = thumbs?.standard?.url || t_high;
      const t_maxres = thumbs?.maxres?.url || t_high;

      // NOTE: We avoid `upsert where: { videoId }` because your generated types currently
      // only expose `id` as unique in `videosWhereUniqueInput`.
      // This works everywhere: findFirst -> update by `id` or create.
      const existing = await prisma.videos.findFirst({
        where: { videoId: id },
        select: { id: true },
      });

      if (existing) {
        await prisma.videos.update({
          where: { id: existing.id },
          data: {
            title: sn?.title || "",
            description: sn?.description || "",
            channelTitle: sn?.channelTitle || "",
            statistics: {
              viewCount: toInt(st?.viewCount),
              likeCount: toInt(st?.likeCount),
              commentCount: toInt(st?.commentCount),
            },
            lastSyncedAt: new Date(),
            syncVersion: { increment: 1 },
          },
        });
      } else {
        await prisma.videos.create({
          data: {
            videoId: id,
            title: sn?.title || "",
            description: sn?.description || "",
            publishedAt: sn?.publishedAt
              ? new Date(sn.publishedAt)
              : new Date(),
            channelId: sn?.channelId || "",
            channelTitle: sn?.channelTitle || "",

            // Search & categorization
            searchableText: makeSearchable(
              sn?.title,
              sn?.description,
              sn?.tags
            ),
            tags: Array.isArray(sn?.tags) ? sn.tags : [],
            categoryId: sn?.categoryId || "",
            defaultLanguage: sn?.defaultLanguage || "",

            // Associations
            playlists: [],
            relatedVideos: [],

            // Media details
            thumbnails: {
              default: t_default,
              high: t_high,
              maxres: t_maxres,
              medium: t_medium,
              standard: t_standard,
            },
            contentDetails: {
              caption: cd?.caption === true || cd?.caption === "true",
              definition: cd?.definition || "",
              dimension: cd?.dimension || "",
              duration: cd?.duration || "PT0S",
              durationSeconds,
              licensedContent: !!cd?.licensedContent,
              projection: cd?.projection || "",
            },
            statistics: {
              viewCount: toInt(st?.viewCount),
              likeCount: toInt(st?.likeCount),
              commentCount: toInt(st?.commentCount),
            },
            status: {
              embeddable: !!vs?.embeddable,
              license: vs?.license || "",
              madeForKids: !!vs?.madeForKids,
              privacyStatus: vs?.privacyStatus || "public",
              publicStatsViewable: !!vs?.publicStatsViewable,
              uploadStatus: vs?.uploadStatus || "",
            },

            // Metadata
            isShort,
            videoType: isShort ? "short" : "video",
            popularityScore: null,
            tier: "standard",
            isActive: true,

            // Sync tracking
            lastSyncedAt: new Date(),
            syncVersion: 1,
            playlistsUpdatedAt: null,
            relatedVideosUpdatedAt: null,
          },
        });
      }
    }
  }
}

// ---------- Rebuild first page ----------
export async function rebuildPlaylist(
  playlistId: string,
  items?: any[]
): Promise<RebuildResult> {
  const page = items ?? (await fetchPlaylistItems(playlistId));

  const existing = await prisma.playlistItems.findMany({
    where: { playlistId },
    select: { id: true, videoId: true, position: true, removedAt: true },
  });

  const byVideo = new Map(existing.map((e) => [e.videoId, e]));
  const seen = new Set<string>();

  // IMPORTANT: type the transaction array as Prisma promises
  const updates: Prisma.PrismaPromise<any>[] = [];

  let videosAdded = 0;
  let videosUpdated = 0;
  let videosRemoved = 0;

  // Upsert current first-page items
  for (let i = 0; i < page.length; i++) {
    const it = page[i] || {};
    const videoId: string | undefined = it?.contentDetails?.videoId;
    if (!videoId) continue;

    const position = (it?.snippet?.position ?? i) as number;
    seen.add(videoId);

    const prev = byVideo.get(videoId);
    if (!prev) {
      videosAdded++;
      updates.push(
        prisma.playlistItems.create({
          data: {
            playlistId,
            videoId,
            position,
            title: it?.snippet?.title || "",
            addedAt: new Date(),
            removedAt: null,
          },
        })
      );
    } else if (prev.removedAt) {
      videosAdded++;
      updates.push(
        prisma.playlistItems.update({
          where: { id: prev.id },
          data: { position, removedAt: null, addedAt: new Date() },
        })
      );
    } else if (prev.position !== position) {
      videosUpdated++;
      updates.push(
        prisma.playlistItems.update({
          where: { id: prev.id },
          data: { position },
        })
      );
    }
  }

  // Mark removed
  for (const prev of existing) {
    if (!prev.removedAt && !seen.has(prev.videoId)) {
      videosRemoved++;
      updates.push(
        prisma.playlistItems.update({
          where: { id: prev.id },
          data: { removedAt: new Date() },
        })
      );
    }
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  const fingerprint = computeFingerprint(page);

  return {
    success: true,
    fingerprint,
    videosAdded,
    videosUpdated,
    videosRemoved,
  };
}

// ---------- Uploads playlist id ----------
export async function getUploadsPlaylistId(
  channelId: string,
  syncState?: SyncState
): Promise<string | null> {
  if (syncState?.uploadsPlaylistId) return syncState.uploadsPlaylistId;

  try {
    const resp = await youtube.channels.list({
      id: [channelId],
      part: ["contentDetails"],
    });
    const uploads =
      resp.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) return null;

    const cfg = await prisma.videoConfig.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { id: true, sync: true },
    });
    if (cfg) {
      const newSync: SyncState = {
        ...(cfg.sync as SyncState | null | undefined),
        uploadsPlaylistId: uploads,
      };
      await prisma.videoConfig.update({
        where: { id: cfg.id },
        data: { sync: newSync as any },
      });
    }
    return uploads;
  } catch (e) {
    console.error("getUploadsPlaylistId failed:", e);
    return null;
  }
}

// ---------- Revalidation + CDN ----------
export async function revalidatePaths(paths: string[]): Promise<void> {
  if (!paths || paths.length === 0) return;

  const base = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret) {
    console.warn(
      "Revalidation skipped: missing NEXT_PUBLIC_APP_URL or REVALIDATE_SECRET"
    );
    return;
  }

  await Promise.allSettled(
    paths.map((path) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      return fetch(`${base}/api/internal/revalidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-revalidate-secret": secret,
        },
        body: JSON.stringify({ path }),
        signal: controller.signal,
      })
        .catch((e) => console.error(`revalidate ${path} failed:`, e))
        .finally(() => clearTimeout(t));
    })
  );
}

export async function purgeCloudflareCache(urls: string[]): Promise<void> {
  const zone = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!zone || !token || !urls?.length) return;

  for (let i = 0; i < urls.length; i += 30) {
    const batch = urls.slice(i, i + 30);
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    try {
      await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ files: batch }),
          signal: controller.signal,
        }
      );
    } catch (e) {
      console.error("Cloudflare purge failed:", e);
    } finally {
      clearTimeout(t);
    }
  }
}

// ---------- Leasing ----------
export async function acquirePlaylistLease(
  playlistId: string,
  requestId: string,
  durationMs: number = 30000
): Promise<boolean> {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + durationMs);

  const ok = await prisma.$transaction(async (tx) => {
    const pl = await tx.playlist.findUnique({
      where: { playlistId },
      select: { syncLeaseUntil: true, syncLeaseOwner: true },
    });
    if (!pl) return false;

    const free =
      !pl.syncLeaseUntil ||
      pl.syncLeaseUntil <= now ||
      pl.syncLeaseOwner === requestId;

    if (!free) return false;

    await tx.playlist.update({
      where: { playlistId },
      data: {
        syncLeaseUntil: leaseUntil,
        syncLeaseOwner: requestId,
      },
    });

    return true;
  });

  return ok;
}

export function shouldRevalidateHome(
  playlistId: string,
  heroPlaylistId?: string,
  shortsPlaylistId?: string
): boolean {
  return (
    !!playlistId &&
    (playlistId === heroPlaylistId || playlistId === shortsPlaylistId)
  );
}

// ---------- utils ----------
function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function toInt(n: any): number {
  const x = typeof n === "string" ? parseInt(n, 10) : Number(n ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function parseISODurationToSeconds(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(iso || "");
  if (!m) return 0;
  const h = parseInt(m[1] || "0", 10);
  const mi = parseInt(m[2] || "0", 10);
  const s = parseInt(m[3] || "0", 10);
  return h * 3600 + mi * 60 + s;
}

function makeSearchable(
  title?: string,
  desc?: string,
  tags?: string[]
): string {
  const parts = [
    title || "",
    desc || "",
    ...(Array.isArray(tags) ? tags : []),
  ].join(" ");
  return parts.trim();
}
