// pages/api/youtube-webhook.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { parseString } from "xml2js";
import { promisify } from "util";
import {
  purgeCloudflareByTags,
  purgeCloudflareByUrls,
} from "@/lib/cache/purge";
import { clearVideoCache } from "./videos/gallery";

const parseXML = promisify(parseString);

// Initialize Prisma
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// // Verify WebSub signature
// function verifySignature(req: NextApiRequest): boolean {
//   const signature = req.headers["x-hub-signature"] as string;
//   if (!signature || !process.env.WEBSUB_SECRET) {
//     return false;
//   }

//   const [algorithm, hash] = signature.split("=");
//   const hmac = crypto.createHmac(algorithm, process.env.WEBSUB_SECRET);

//   // Use raw body for HMAC verification
//   const rawBody = (req as any).rawBody || req.body;
//   hmac.update(rawBody);

//   const calculatedHash = hmac.digest("hex");

//   // Constant-time comparison to prevent timing attacks
//   return crypto.timingSafeEqual(
//     Buffer.from(hash, "hex"),
//     Buffer.from(calculatedHash, "hex")
//   );
// }

// // Parse YouTube Atom feed
// async function parseFeed(xmlData: string) {
//   try {
//     const result = (await parseXML(xmlData)) as any;
//     const feed = result.feed;

//     if (!feed || !feed.entry) {
//       return [];
//     }

//     // Handle both single entry and array of entries
//     const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];

//     return entries.map((entry: any) => ({
//       videoId: entry["yt:videoId"]?.[0] || entry.id?.[0]?.split(":").pop(),
//       channelId: entry["yt:channelId"]?.[0],
//       title: entry.title?.[0],
//       published: entry.published?.[0],
//       updated: entry.updated?.[0],
//       link:
//         entry.link?.[0]?.$.href ||
//         `https://www.youtube.com/watch?v=${entry["yt:videoId"]?.[0]}`,
//     }));
//   } catch (error) {
//     console.error("[YouTube WebSub] Feed parsing error:", error);
//     return [];
//   }
// }

// // Fetch video details from YouTube API
// async function fetchVideoDetails(videoId: string) {
//   if (!process.env.YOUTUBE_API_KEY) {
//     console.error("[YouTube WebSub] No YouTube API key configured");
//     return null;
//   }

//   try {
//     const response = await fetch(
//       `https://www.googleapis.com/youtube/v3/videos?` +
//         `part=snippet,statistics,contentDetails,status` +
//         `&id=${videoId}` +
//         `&key=${process.env.YOUTUBE_API_KEY}`
//     );

//     if (!response.ok) {
//       throw new Error(`YouTube API error: ${response.status}`);
//     }

//     const data = await response.json();
//     return data.items?.[0] || null;
//   } catch (error) {
//     console.error("[YouTube WebSub] Failed to fetch video details:", error);
//     return null;
//   }
// }

// // Calculate video tier
// function calculateTier(
//   viewCount: number,
//   publishedAt: string,
//   isShort: boolean
// ) {
//   const publishDate = new Date(publishedAt);
//   const hoursSincePublish =
//     (Date.now() - publishDate.getTime()) / (1000 * 60 * 60);

//   if (hoursSincePublish < 24 && viewCount > 10000) return "hot";
//   if (hoursSincePublish < 168 && viewCount > 5000) return "trending";
//   if (hoursSincePublish < 168) return "recent";
//   if (isShort && viewCount > 50000) return "viral-short";
//   if (isShort && viewCount > 10000) return "popular-short";
//   if (viewCount > 100000) return "evergreen";

//   return "archive";
// }

// Verify WebSub signature
function verifySignature(req: NextApiRequest): boolean {
  const signature = req.headers["x-hub-signature"] as string;
  if (!signature || !process.env.WEBSUB_SECRET) {
    return false;
  }

  const [algorithm, hash] = signature.split("=");
  const hmac = crypto.createHmac(algorithm, process.env.WEBSUB_SECRET);
  const rawBody = (req as any).rawBody || req.body;
  hmac.update(rawBody);
  const calculatedHash = hmac.digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(calculatedHash, "hex")
  );
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

// Calculate video tier
function calculateTier(
  viewCount: number,
  publishedAt: string,
  isShort: boolean
) {
  const publishDate = new Date(publishedAt);
  const hoursSincePublish =
    (Date.now() - publishDate.getTime()) / (1000 * 60 * 60);

  if (hoursSincePublish < 24 && viewCount > 10000) return "hot";
  if (hoursSincePublish < 168 && viewCount > 5000) return "trending";
  if (hoursSincePublish < 168) return "recent";
  if (isShort && viewCount > 50000) return "viral-short";
  if (isShort && viewCount > 10000) return "popular-short";
  if (viewCount > 100000) return "evergreen";

  return "archive";
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

  // Skip signature verification in development
  if (process.env.NODE_ENV === "production" && !verifySignature(req)) {
    console.error("[YouTube WebSub] Invalid signature");
    return res.status(401).json({ error: "Invalid signature" });
  }

  try {
    const rawBody = (req as any).rawBody || req.body;
    const xmlData = typeof rawBody === "string" ? rawBody : rawBody.toString();

    // Parse the feed
    const entries = await parseFeed(xmlData);

    if (entries.length === 0) {
      console.log("[YouTube WebSub] Empty feed received");
      return res.status(200).json({ message: "No entries to process" });
    }

    console.log(`[YouTube WebSub] Processing ${entries.length} video updates`);

    const cacheTags = new Set<string>();
    const urlsToPurge: string[] = [];

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
        const tier = calculateTier(
          viewCount,
          videoDetails.snippet.publishedAt,
          isShort
        );

        // Prepare video data for Prisma - with ALL required fields
        const videoData = {
          videoId: entry.videoId,
          channelId: entry.channelId || "UCm7Mkdl1a8g6ctmQMhhghiA",
          channelTitle: videoDetails.snippet.channelTitle || "", // Added required field
          title: videoDetails.snippet.title,
          description: videoDetails.snippet.description || "",
          publishedAt: new Date(videoDetails.snippet.publishedAt),
          tags: videoDetails.snippet.tags || [],
          categoryId: videoDetails.snippet.categoryId || "",
          thumbnails: videoDetails.snippet.thumbnails || {},
          statistics: {
            viewCount: viewCount,
            likeCount: likeCount,
            commentCount: commentCount,
            favoriteCount: parseInt(
              videoDetails.statistics?.favoriteCount || "0"
            ),
          },
          contentDetails: {
            duration: duration,
            durationSeconds: durationSeconds,
            dimension: videoDetails.contentDetails?.dimension || "",
            definition: videoDetails.contentDetails?.definition || "",
            caption: videoDetails.contentDetails?.caption || "",
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
            license: videoDetails.status?.license || "youtube", // Added required field
            uploadStatus: videoDetails.status?.uploadStatus || "processed", // Added required field
          },
          isShort: isShort,
          videoType: isShort ? "short" : "regular",
          tier: tier,
          playlists: [],
          lastSyncedAt: new Date(),
          migratedAt: new Date(),
          defaultLanguage: videoDetails.snippet?.defaultLanguage || "",
          defaultAudioLanguage:
            videoDetails.snippet?.defaultAudioLanguage || "",
          syncVersion: 1, // Added required field - increment on updates
        };

        // Check if video exists to determine syncVersion
        const existingVideo = await prisma.videos.findMany({
          where: { videoId: entry.videoId },
          select: { syncVersion: true },
        });

        if (existingVideo) {
          // Update existing video - increment syncVersion
          await prisma.videos.updateMany({
            where: { videoId: entry.videoId },
            data: {
              ...videoData,
              syncVersion: existingVideo[0].syncVersion + 1,
            },
          });
        } else {
          // Create new video
          await prisma.videos.create({
            data: videoData,
          });
        }

        console.log(`[YouTube WebSub] Upserted video ${entry.videoId}`);

        // Add cache tags for purging
        cacheTags.add(`video:${entry.videoId}`);
        cacheTags.add("video:all");
        cacheTags.add("video:gallery");

        if (isShort) {
          cacheTags.add("video:shorts");
        }

        cacheTags.add(`video:tier:${tier}`);

        // Add URLs to purge
        urlsToPurge.push(
          `https://www.freemalaysiatoday.com/videos/${entry.videoId}`,
          `https://www.freemalaysiatoday.com/videos`
        );
      } catch (error) {
        console.error(
          `[YouTube WebSub] Error processing video ${entry.videoId}:`,
          error
        );
      }
    }

    // Clear in-memory LRU cache
    clearVideoCache();

    // Purge Cloudflare cache
    if (cacheTags.size > 0) {
      console.log(`[YouTube WebSub] Purging ${cacheTags.size} cache tags`);

      const tagsArray = Array.from(cacheTags);
      const tagBatches = [];

      for (let i = 0; i < tagsArray.length; i += 30) {
        tagBatches.push(tagsArray.slice(i, i + 30));
      }

      await Promise.all(
        tagBatches.map((batch) =>
          purgeCloudflareByTags(batch).catch((err) =>
            console.error("[YouTube WebSub] Tag purge failed:", err)
          )
        )
      );
    }

    // Purge URLs
    if (urlsToPurge.length > 0) {
      console.log(`[YouTube WebSub] Purging ${urlsToPurge.length} URLs`);

      const urlBatches = [];
      for (let i = 0; i < urlsToPurge.length; i += 30) {
        urlBatches.push(urlsToPurge.slice(i, i + 30));
      }

      await Promise.all(
        urlBatches.map((batch) =>
          purgeCloudflareByUrls(batch).catch((err) =>
            console.error("[YouTube WebSub] URL purge failed:", err)
          )
        )
      );
    }

    // Update stats - check your actual schema field names
    try {
      // First check if stats record exists
      const stats = await prisma.websub_stats.findFirst();

      if (stats) {
        // Update existing stats
        await prisma.websub_stats.update({
          where: { id: stats.id },
          data: {
            webhooksReceived: { increment: 1 },
            videosProcessed: { increment: entries.length },
            // Check your actual schema - these field names might be different:
            // lastWebhookReceived or lastWebhook or updatedAt
            updatedAt: new Date(), // Using standard Prisma field
          },
        });
      } else {
        // Create new stats record
        await prisma.websub_stats.create({
          data: {
            webhooksReceived: 1,
            videosProcessed: entries.length,
            // Don't include timestamp fields - Prisma handles createdAt/updatedAt automatically
          },
        });
      }
    } catch (statsError) {
      console.error("[YouTube WebSub] Stats update error:", statsError);
      // Continue processing even if stats update fails
    }

    return res.status(200).json({
      message: "Webhook processed successfully",
      processed: entries.length,
    });
  } catch (error) {
    console.error("[YouTube WebSub] Webhook processing error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Disable body parsing to access raw body for signature verification
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
