// pages/api/video-admin/sync/websub/catch-up.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { youtube } from "@/lib/youtube-sync";
import { enrichVideos, getUploadsPlaylistId } from "@/lib/sync-helpers";

type SuccessBody = {
  success: true;
  processed: number;
  batches: number;
  cutoffIso: string;
  tookMs: number;
};
type ErrorBody = { success: false; error: string };

export default withAdminApi(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessBody | ErrorBody>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const channelId = process.env.YOUTUBE_CHANNEL_ID!;
  if (!channelId)
    return res
      .status(500)
      .json({ success: false, error: "YOUTUBE_CHANNEL_ID not set" });

  // Cutoff strategy:
  // 1) If body.cutoffIso provided, use it (e.g. "2025-09-09T11:30:04.257Z")
  // 2) Else: use max(videos.lastSyncedAt) - 1h as a cushion
  // 3) Else fallback to 30 days ago
  let cutoffIso = (req.body?.cutoffIso as string) || "";
  let cutoff = cutoffIso ? new Date(cutoffIso) : null;

  if (!cutoff || isNaN(+cutoff)) {
    const latest = await prisma.videos.findFirst({
      orderBy: { lastSyncedAt: "desc" },
      select: { lastSyncedAt: true },
    });
    if (latest?.lastSyncedAt) {
      cutoff = new Date(
        new Date(latest.lastSyncedAt).getTime() - 60 * 60 * 1000
      );
    } else {
      cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    cutoffIso = cutoff.toISOString();
  }

  const start = Date.now();

  // Resolve uploads playlist
  const uploadsId = await getUploadsPlaylistId(channelId);
  if (!uploadsId)
    return res
      .status(500)
      .json({ success: false, error: "Could not resolve uploads playlist" });

  // Walk uploads playlist until we hit older than cutoff
  const collected: string[] = [];
  let pageToken: string | undefined = undefined;
  let stop = false;
  let pages = 0;

  while (!stop) {
    pages++;

    const resp: any = await youtube.playlistItems.list({
      playlistId: uploadsId,
      part: ["snippet", "contentDetails", "status"],
      maxResults: 50,
      pageToken,
    });

    const items = resp.data.items || [];
    if (items.length === 0) break;

    for (const it of items) {
      const vid = it.contentDetails?.videoId;
      const publishedAt = it.snippet?.publishedAt
        ? new Date(it.snippet.publishedAt)
        : null;

      // skip private or missing ids
      if (!vid || it.status?.privacyStatus === "private") continue;

      if (publishedAt && publishedAt >= cutoff) {
        collected.push(vid);
      } else {
        // Once we hit older than cutoff, we can stop after this page
        stop = true;
      }
    }

    pageToken = resp.data.nextPageToken || undefined;
    if (!pageToken) break;
  }

  // Dedup and enrich
  const unique = Array.from(new Set(collected));
  if (unique.length > 0) {
    for (let i = 0; i < unique.length; i += 50) {
      await enrichVideos(unique.slice(i, i + 50));
    }
  }

  return res.status(200).json({
    success: true,
    processed: unique.length,
    batches: Math.ceil(unique.length / 50),
    cutoffIso,
    tookMs: Date.now() - start,
  });
});
