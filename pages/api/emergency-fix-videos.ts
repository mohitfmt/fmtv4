// pages/api/emergency-fix-videos.ts
// ONE-TIME EMERGENCY FIX - DELETE AFTER RUNNING!
// Run locally: curl http://localhost:3000/api/emergency-fix-videos

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("🚨 EMERGENCY FIX STARTING...");

  const results = {
    videosProcessed: 0,
    videosFailed: 0,
    videosAlreadyExist: 0,
    errors: [] as string[],
    createdVideos: [] as any[],
  };

  try {
    // The 8 stuck videos from your logs
    const stuckVideoIds = [
      "Lnm7hIBXrg4", // Court declares man Hindu, not Muslim
      "UQ754P1LJbg", // Ready for Tim Cooks?
      "lKc4qP-LTjU", // Malaysia bukan pusat operasi Hamas
      "Qa8t-bCsPGw", // Switzerland MACC probe
      "DXgvnIvUKjc", // PAS Youth's urban renewal rally
      "wF_YvJVLYec", // Sorotan Berita
      "2qP4kwgd9L8", // Anwar thanks Mahathir
      "gQj158VAonQ", // Another video
    ];

    console.log(`Processing ${stuckVideoIds.length} stuck videos...`);

    for (const videoId of stuckVideoIds) {
      try {
        // Check if exists (now works with @unique!)
        const existing = await prisma.videos.findFirst({
          where: { videoId },
        });

        if (existing) {
          console.log(`✅ Video ${videoId} already exists`);
          results.videosAlreadyExist++;
          continue;
        }

        console.log(`Fetching ${videoId} from YouTube...`);

        // Fetch from YouTube
        const response = await youtube.videos.list({
          part: ["snippet", "contentDetails", "statistics", "status"],
          id: [videoId],
        });

        const video = response.data.items?.[0];
        if (!video) {
          console.error(`❌ Video ${videoId} not found on YouTube`);
          results.errors.push(`${videoId}: Not found on YouTube`);
          results.videosFailed++;
          continue;
        }

        // Parse duration
        const duration = video.contentDetails?.duration || "PT0S";
        const durationMatch = duration.match(
          /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
        );
        const durationSeconds = durationMatch
          ? parseInt(durationMatch[1] || "0") * 3600 +
            parseInt(durationMatch[2] || "0") * 60 +
            parseInt(durationMatch[3] || "0")
          : 0;

        const isShort = durationSeconds > 0 && durationSeconds <= 60;

        // Create video
        const created = await prisma.videos.create({
          data: {
            videoId: video.id!,
            title: video.snippet?.title || "Untitled",
            description: video.snippet?.description || "",
            publishedAt: new Date(video.snippet?.publishedAt || Date.now()),
            channelId: video.snippet?.channelId || "UC2CzLwbhTiI8pTKNVyrOnJQ",
            channelTitle: video.snippet?.channelTitle || "Free Malaysia Today",

            searchableText:
              `${video.snippet?.title} ${video.snippet?.description}`.toLowerCase(),
            tags: video.snippet?.tags || [],
            categoryId: video.snippet?.categoryId || "25",
            defaultLanguage: video.snippet?.defaultLanguage || "en",

            // EMPTY playlists so rapid-assign finds them!
            playlists: [],
            relatedVideos: [],

            thumbnails: {
              default:
                video.snippet?.thumbnails?.default?.url ||
                `https://i.ytimg.com/vi/${video.id}/default.jpg`,
              medium:
                video.snippet?.thumbnails?.medium?.url ||
                `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
              high:
                video.snippet?.thumbnails?.high?.url ||
                `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
              standard:
                video.snippet?.thumbnails?.standard?.url ||
                `https://i.ytimg.com/vi/${video.id}/sddefault.jpg`,
              maxres:
                video.snippet?.thumbnails?.maxres?.url ||
                `https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`,
            },

            contentDetails: {
              caption: video.contentDetails?.caption === "true",
              definition: video.contentDetails?.definition || "hd",
              dimension: video.contentDetails?.dimension || "2d",
              duration: duration,
              durationSeconds,
              licensedContent: video.contentDetails?.licensedContent || false,
              projection: video.contentDetails?.projection || "rectangular",
            },

            statistics: {
              viewCount: parseInt(video.statistics?.viewCount || "0"),
              likeCount: parseInt(video.statistics?.likeCount || "0"),
              commentCount: parseInt(video.statistics?.commentCount || "0"),
            },

            status: {
              embeddable: video.status?.embeddable !== false,
              license: video.status?.license || "youtube",
              madeForKids: video.status?.madeForKids || false,
              privacyStatus: video.status?.privacyStatus || "public",
              publicStatsViewable: video.status?.publicStatsViewable !== false,
              uploadStatus: video.status?.uploadStatus || "processed",
            },

            isShort,
            videoType: isShort ? "short" : "standard",
            popularityScore: 0,
            tier: "hot",
            isActive: true,
            syncVersion: 1,
          },
        });

        results.videosProcessed++;
        results.createdVideos.push({
          videoId: created.videoId,
          title: created.title,
        });

        console.log(`✅ Created: ${created.title}`);
      } catch (error: any) {
        console.error(`❌ Failed ${videoId}:`, error.message);
        results.videosFailed++;
        results.errors.push(`${videoId}: ${error.message}`);
      }
    }

    // Test rapid-assign query
    console.log("\n📊 Testing rapid-assign query...");
    const testQuery = await prisma.videos.findMany({
      where: {
        playlists: { isEmpty: true },
        publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        isActive: true,
        syncVersion: { lt: 20 },
      },
      select: {
        videoId: true,
        title: true,
        playlists: true,
        syncVersion: true,
      },
      take: 10,
    });

    console.log(`Found ${testQuery.length} videos ready for rapid-assign`);

    // Success response
    return res.status(200).json({
      success: true,
      message: `Emergency fix completed!`,
      results: {
        processed: results.videosProcessed,
        failed: results.videosFailed,
        alreadyExisted: results.videosAlreadyExist,
        errors: results.errors,
        created: results.createdVideos,
      },
      rapidAssignReady: {
        count: testQuery.length,
        videos: testQuery.map((v) => ({
          videoId: v.videoId,
          title: v.title,
          syncVersion: v.syncVersion,
        })),
      },
      nextSteps: [
        "1. Run rapid-assign: curl -X POST http://localhost:3000/api/cron/youtube-rapid-assign -H 'x-cron-key: YOUR_KEY'",
        "2. Check if videos get playlists",
        "3. Delete this file: rm pages/api/emergency-fix-videos.ts",
      ],
    });
  } catch (error: any) {
    console.error("💥 Emergency fix failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      results,
    });
  }
}
