// pages/api/youtube-webhook.ts - FIXED VERSION
// Properly handles WebSub notifications and assigns videos to playlists
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { youtube } from "@/lib/youtube-sync";
import { parseString } from "xml2js";
import { promisify } from "util";
import {
  purgeCloudflareByTags,
  purgeCloudflareByUrls,
} from "@/lib/cache/purge";
import { clearVideoCache } from "./videos/gallery";
import {
  calculateVideoTier,
  getEngagementRate,
} from "@/lib/helpers/video-tier-calculator";

const parseXML = promisify(parseString);

// CRITICAL: Disable body parsing for raw body access
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read raw body from request
async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  await new Promise((resolve, reject) => {
    req.on("data", (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    req.on("end", resolve);
    req.on("error", reject);
  });
  return Buffer.concat(chunks);
}

// Improved signature verification with better error handling
function verifySignature(req: NextApiRequest, rawBody: Buffer): boolean {
  const signature = req.headers["x-hub-signature"] as string | undefined;
  const secret = process.env.WEBSUB_SECRET;

  if (!signature || !secret) {
    console.warn("[YouTube WebSub] Missing signature or secret");
    return false;
  }

  const parts = signature.split("=");
  if (parts.length !== 2) {
    console.warn("[YouTube WebSub] Invalid signature format");
    return false;
  }

  const [algorithm, hash] = parts;
  if (!algorithm || !hash) {
    console.warn("[YouTube WebSub] Invalid signature components");
    return false;
  }

  try {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(rawBody);
    const calculatedHash = hmac.digest("hex");

    // Ensure both buffers are same length before timingSafeEqual
    const receivedBuffer = Buffer.from(hash, "hex");
    const calculatedBuffer = Buffer.from(calculatedHash, "hex");

    if (receivedBuffer.length !== calculatedBuffer.length) {
      console.warn("[YouTube WebSub] Signature length mismatch");
      return false;
    }

    return crypto.timingSafeEqual(receivedBuffer, calculatedBuffer);
  } catch (error) {
    console.error("[YouTube WebSub] Signature verification error:", error);
    return false;
  }
}

// Parse YouTube Atom feed
async function parseFeed(xmlData: string) {
  try {
    const result = (await parseXML(xmlData)) as any;
    const feed = result.feed;

    if (!feed || !feed.entry) {
      return [];
    }

    const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];

    return entries.map((entry: any) => ({
      videoId: entry["yt:videoId"]?.[0] || entry.id?.[0]?.split(":").pop(),
      channelId: entry["yt:channelId"]?.[0],
      title: entry.title?.[0],
      published: entry.published?.[0],
      updated: entry.updated?.[0],
      link:
        entry.link?.[0]?.$.href ||
        `https://www.youtube.com/watch?v=${entry["yt:videoId"]?.[0]}`,
    }));
  } catch (error) {
    console.error("[YouTube WebSub] Feed parsing error:", error);
    return [];
  }
}

// CRITICAL FIX: Assign video to all playlists it belongs to
async function assignVideoToPlaylists(videoId: string): Promise<string[]> {
  const videoPlaylists: string[] = [];

  try {
    // Get all active playlists
    const playlists = await prisma.playlist.findMany({
      where: { isActive: true },
      select: { playlistId: true, title: true },
    });

    console.log(
      `[YouTube WebSub] Checking ${playlists.length} playlists for video ${videoId}`
    );

    // Check each playlist for this video
    for (const playlist of playlists) {
      try {
        const response = await youtube.playlistItems.list({
          part: ["id"],
          playlistId: playlist.playlistId,
          videoId: videoId,
          maxResults: 1,
        });

        if (response.data.items && response.data.items.length > 0) {
          videoPlaylists.push(playlist.playlistId);
          console.log(
            `[YouTube WebSub] Video found in playlist: ${playlist.title}`
          );
        }
      } catch (error: any) {
        // 404 errors are expected when video is not in playlist
        if (error?.response?.status !== 404) {
          console.debug(
            `[YouTube WebSub] Error checking playlist ${playlist.playlistId}:`,
            error.message
          );
        }
      }
    }

    console.log(
      `[YouTube WebSub] Video ${videoId} found in ${videoPlaylists.length} playlist(s)`
    );
  } catch (error) {
    console.error(
      `[YouTube WebSub] Failed to check playlists for video ${videoId}:`,
      error
    );
  }

  return videoPlaylists;
}

// Fetch video details from YouTube API
async function fetchVideoDetails(videoId: string) {
  if (!process.env.YOUTUBE_API_KEY) {
    console.error("[YouTube WebSub] No YouTube API key configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
        `part=snippet,statistics,contentDetails,status` +
        `&id=${videoId}` +
        `&key=${process.env.YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    return data.items?.[0] || null;
  } catch (error) {
    console.error("[YouTube WebSub] Failed to fetch video details:", error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle subscription verification
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const challenge = req.query["hub.challenge"];
    const topic = req.query["hub.topic"];

    console.log("[YouTube WebSub] Verification request:", { mode, topic });

    if (mode === "subscribe" || mode === "unsubscribe") {
      return res.status(200).send(challenge);
    }

    if (mode === "test" || req.url?.includes("test")) {
      return res
        .status(200)
        .json({ status: "ok", timestamp: new Date().toISOString() });
    }

    return res.status(400).json({ error: "Invalid request" });
  }

  // Handle POST - video updates
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Read raw body for signature verification
  const rawBody = await getRawBody(req);

  // Skip signature verification in development
  if (process.env.NODE_ENV === "production" && !verifySignature(req, rawBody)) {
    console.error("[YouTube WebSub] Invalid signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  try {
    const xmlData = rawBody.toString("utf8");

    // Parse the feed
    const entries = await parseFeed(xmlData);

    if (entries.length === 0) {
      console.log("[YouTube WebSub] Empty feed received");
      return res.status(200).json({ message: "No entries to process" });
    }

    console.log(`[YouTube WebSub] Processing ${entries.length} video updates`);

    const cacheTags = new Set<string>();
    const urlsToPurge: string[] = [];
    let videosProcessed = 0;

    // Process each video
    for (const entry of entries) {
      try {
        // Fetch full video details from YouTube API
        const videoDetails = await fetchVideoDetails(entry.videoId);

        if (!videoDetails) {
          console.error(
            `[YouTube WebSub] Failed to fetch details for ${entry.videoId}`
          );
          continue;
        }

        // Parse duration
        const duration = videoDetails.contentDetails?.duration || "PT0S";
        const durationMatch = duration.match(
          /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
        );
        const hours = parseInt(durationMatch?.[1] || "0");
        const minutes = parseInt(durationMatch?.[2] || "0");
        const seconds = parseInt(durationMatch?.[3] || "0");
        const durationSeconds = hours * 3600 + minutes * 60 + seconds;
        const isShort = durationSeconds <= 60;

        // Parse statistics
        const viewCount = parseInt(videoDetails.statistics?.viewCount || "0");
        const likeCount = parseInt(videoDetails.statistics?.likeCount || "0");
        const commentCount = parseInt(
          videoDetails.statistics?.commentCount || "0"
        );

        // Calculate tier
        const engagementRate = getEngagementRate(
          viewCount,
          likeCount,
          commentCount
        );
        const tier = calculateVideoTier(
          viewCount,
          videoDetails.snippet.publishedAt,
          isShort,
          engagementRate
        );

        // CRITICAL FIX: Assign video to playlists
        const playlists = await assignVideoToPlaylists(entry.videoId);

        // Prepare video data for Prisma
        const videoData = {
          videoId: entry.videoId,
          channelId: entry.channelId || process.env.YOUTUBE_CHANNEL_ID!,
          channelTitle: videoDetails.snippet.channelTitle || "",
          title: videoDetails.snippet.title,
          description: videoDetails.snippet.description || "",
          publishedAt: new Date(videoDetails.snippet.publishedAt),
          tags: videoDetails.snippet.tags || [],
          categoryId: videoDetails.snippet.categoryId || "",
          thumbnails: videoDetails.snippet.thumbnails || {},

          // CRITICAL FIX: Include playlists array
          playlists: playlists,
          relatedVideos: [],
          defaultLanguage: videoDetails.snippet.defaultLanguage || "en",

          statistics: {
            viewCount: viewCount,
            likeCount: likeCount,
            commentCount: commentCount,
          },

          contentDetails: {
            duration: duration,
            durationSeconds: durationSeconds,
            dimension: videoDetails.contentDetails?.dimension || "",
            definition: videoDetails.contentDetails?.definition || "",
            caption: videoDetails.contentDetails?.caption === "true",
            licensedContent:
              videoDetails.contentDetails?.licensedContent || false,
            projection: videoDetails.contentDetails?.projection || "",
          },

          status: {
            privacyStatus: videoDetails.status?.privacyStatus || "public",
            embeddable: videoDetails.status?.embeddable !== false,
            publicStatsViewable:
              videoDetails.status?.publicStatsViewable !== false,
            madeForKids: videoDetails.status?.madeForKids || false,
            license: videoDetails.status?.license || "youtube",
            uploadStatus: videoDetails.status?.uploadStatus || "processed",
          },

          isShort: isShort,
          videoType: isShort ? "short" : "standard",
          tier: tier,
          popularityScore: Math.floor(engagementRate * 1000),
          isActive: true,
          lastSyncedAt: new Date(),
          syncVersion: 1,
          playlistsUpdatedAt: new Date(),
        };

        // // Upsert video to database
        // const upsertedVideo = await prisma.videos.upsert({
        //   where: { videoId: entry.videoId },
        //   update: {
        //     ...videoData,
        //     statistics: videoData.statistics,
        //     lastSyncedAt: new Date(),
        //     playlistsUpdatedAt: new Date(),
        //   },
        //   create: videoData,
        // });
        // Find existing video first to get its id
        const existingVideo = await prisma.videos.findFirst({
          where: { videoId: entry.videoId },
        });

        if (existingVideo) {
          // Update existing
          await prisma.videos.update({
            where: { id: existingVideo.id },
            data: {
              ...videoData,
              lastSyncedAt: new Date(),
            },
          });
        } else {
          // Create new
          await prisma.videos.create({
            data: videoData,
          });
        }

        videosProcessed++;
        console.log(
          `[YouTube WebSub] ${
            existingVideo ? "Upserted" : "Failed to upsert"
          } video: ${videoDetails.snippet.title} with ${playlists.length} playlist(s)`
        );

        // Add cache tags and URLs for purging
        cacheTags.add("video:gallery");
        cacheTags.add("video:all");
        cacheTags.add(`video:${entry.videoId}`);
        urlsToPurge.push(`/videos`);
        urlsToPurge.push(`/videos/${entry.videoId}`);

        // Add playlist-specific cache tags
        for (const playlistId of playlists) {
          cacheTags.add(`playlist:${playlistId}`);
        }
      } catch (error) {
        console.error(
          `[YouTube WebSub] Failed to process video ${entry.videoId}:`,
          error
        );
      }
    }

    // Clear caches
    if (videosProcessed > 0) {
      // Clear LRU cache
      clearVideoCache();

      // Purge Cloudflare cache by tags
      if (cacheTags.size > 0) {
        await purgeCloudflareByTags(Array.from(cacheTags));
      }

      // Purge specific URLs
      if (urlsToPurge.length > 0) {
        await purgeCloudflareByUrls(urlsToPurge);
      }

      console.log(
        `[YouTube WebSub] Processed ${videosProcessed} videos, cleared caches`
      );
    }

    // Update webhook stats
    await prisma.websub_stats.upsert({
      where: { id: "main" },
      update: {
        webhooksReceived: { increment: 1 },
        videosProcessed: { increment: videosProcessed },
        updatedAt: new Date(),
      },
      create: {
        id: "main",
        webhooksReceived: 1,
        videosProcessed: videosProcessed,
      },
    });

    return res.status(200).json({
      success: true,
      videosProcessed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[YouTube WebSub] Handler error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
