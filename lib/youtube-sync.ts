import { google, youtube_v3 } from "googleapis";
import { prisma } from "@/lib/prisma";

export const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

interface SyncResult {
  videosAdded: number;
  videosUpdated: number;
  videosRemoved: number;
  duration: number;
  errors: string[];
}

async function getVideoConfig() {
  return await prisma.videoConfig.findFirst({
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Sync all playlists or specific playlist IDs
 */
export async function syncAllPlaylists(
  playlistIds?: string[]
): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    videosAdded: 0,
    videosUpdated: 0,
    videosRemoved: 0,
    duration: 0,
    errors: [],
  };

  try {
    // Get playlists to sync - using correct model name 'playlist'
    const where: any = playlistIds
      ? { playlistId: { in: playlistIds }, isActive: true }
      : { isActive: true };

    const playlists = await prisma.playlist.findMany({ where });

    if (playlists.length === 0) {
      throw new Error("No active playlists found to sync");
    }

    console.log(`Starting sync for ${playlists.length} playlists`);

    // Sync each playlist
    for (const playlist of playlists) {
      try {
        console.log(
          `Syncing playlist: ${playlist.title} (${playlist.playlistId})`
        );

        const playlistResult = await syncPlaylist(playlist.playlistId);
        result.videosAdded += playlistResult.videosAdded;
        result.videosUpdated += playlistResult.videosUpdated;
        result.videosRemoved += playlistResult.videosRemoved;
        result.errors.push(...playlistResult.errors);

        // Log sync history for monitoring
        await prisma.syncHistory.create({
          data: {
            status: playlistResult.errors.length > 0 ? "partial" : "success",
            videosAdded: playlistResult.videosAdded,
            videosUpdated: playlistResult.videosUpdated,
            videosRemoved: playlistResult.videosRemoved,
            duration: playlistResult.duration,
            playlistId: playlist.playlistId,
            playlistName: playlist.title,
            error:
              playlistResult.errors.length > 0
                ? playlistResult.errors.join("; ")
                : null,
          },
        });
      } catch (error) {
        const errorMessage = `Failed to sync playlist ${playlist.playlistId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        console.error(errorMessage);
        result.errors.push(errorMessage);

        // Log failed sync
        await prisma.syncHistory.create({
          data: {
            status: "failed",
            videosAdded: 0,
            videosUpdated: 0,
            videosRemoved: 0,
            duration: Math.round((Date.now() - startTime) / 1000),
            playlistId: playlist.playlistId,
            playlistName: playlist.title,
            error: errorMessage,
          },
        });
      }
    }

    // Update channel info
    await updateChannelInfo().catch((error) => {
      const errorMessage = `Failed to update channel info: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      console.error(errorMessage);
      result.errors.push(errorMessage);
    });

    result.duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`Sync completed in ${result.duration}s:`, result);

    return result;
  } catch (error) {
    console.error("Sync all playlists failed:", error);
    throw error;
  }
}

/**
 * Sync a single playlist - optimized version
 */
export async function syncPlaylist(playlistId: string): Promise<SyncResult> {
  const startTime = Date.now();
  const result: SyncResult = {
    videosAdded: 0,
    videosUpdated: 0,
    videosRemoved: 0,
    duration: 0,
    errors: [],
  };

  try {
    const videoConfig = await getVideoConfig();
    const shortsPlaylistId = videoConfig?.shortsPlaylist;
    // Start a transaction for better consistency
    await prisma.$transaction(async (tx) => {
      // Fetch all videos from the YouTube playlist
      const playlistVideos = await fetchAllPlaylistItems(playlistId);
      console.log(
        `Found ${playlistVideos.length} videos in playlist ${playlistId}`
      );

      if (playlistVideos.length === 0) {
        // Update playlist with 0 items
        await tx.playlist.update({
          where: { playlistId },
          data: {
            itemCount: 0,
            updatedAt: new Date(),
          },
        });
        return;
      }

      // Get video IDs for detailed info
      const videoIds = playlistVideos
        .map((item) => item.contentDetails?.videoId)
        .filter((id): id is string => Boolean(id));

      // Fetch detailed video information in batches
      const videoDetails = await fetchVideoDetails(videoIds);

      // Get existing videos in database for this playlist
      const existingVideos = await tx.videos.findMany({
        where: {
          playlists: {
            has: playlistId,
          },
        },
        select: {
          id: true,
          videoId: true,
          playlists: true,
        },
      });

      const existingVideoMap = new Map(
        existingVideos.map((v) => [v.videoId, v])
      );

      // Batch operations for better performance
      const toCreate: any[] = [];
      const toUpdate: any[] = [];
      const processedVideoIds = new Set<string>();

      for (const video of videoDetails) {
        if (!video.id) continue;

        processedVideoIds.add(video.id);

        // Check if it's a YouTube Short
        const duration = video.contentDetails?.duration || "";
        const durationSeconds = parseDuration(duration);
        const existingVideo = existingVideoMap.get(video.id);
        const currentPlaylists = existingVideo?.playlists || [playlistId];
        const isShort = shortsPlaylistId
          ? currentPlaylists.includes(shortsPlaylistId)
          : false;

        const videoData = {
          title: video.snippet?.title || "",
          description: video.snippet?.description || "",
          publishedAt: video.snippet?.publishedAt
            ? new Date(video.snippet.publishedAt)
            : new Date(),
          thumbnails: {
            default: video.snippet?.thumbnails?.default?.url || "",
            medium: video.snippet?.thumbnails?.medium?.url || "",
            high: video.snippet?.thumbnails?.high?.url || "",
            standard: video.snippet?.thumbnails?.standard?.url || "",
            maxres: video.snippet?.thumbnails?.maxres?.url || null,
          },
          statistics: {
            viewCount: parseInt(video.statistics?.viewCount || "0"),
            likeCount: parseInt(video.statistics?.likeCount || "0"),
            commentCount: parseInt(video.statistics?.commentCount || "0"),
          },
          contentDetails: {
            duration: duration,
            durationSeconds: durationSeconds,
            dimension: video.contentDetails?.dimension || "2d",
            definition: video.contentDetails?.definition || "hd",
            caption: video.contentDetails?.caption === "true",
            licensedContent: video.contentDetails?.licensedContent || false,
            projection: video.contentDetails?.projection || "rectangular",
          },
          status: {
            uploadStatus: video.status?.uploadStatus || "processed",
            privacyStatus: video.status?.privacyStatus || "public",
            license: video.status?.license || "youtube",
            embeddable: video.status?.embeddable !== false,
            publicStatsViewable: video.status?.publicStatsViewable !== false,
            madeForKids: video.status?.madeForKids || false,
          },
          categoryId: video.snippet?.categoryId || "25",
          tags: video.snippet?.tags || [],
          defaultLanguage: video.snippet?.defaultLanguage || "en",
          isShort: isShort,
          videoType: isShort ? "short" : "video",
          tier: "standard",
          lastSyncedAt: new Date(),
          syncVersion: 2,
        };

        // const existingVideo = existingVideoMap.get(video.id);

        if (existingVideo) {
          // Update existing video
          const updatedPlaylists = existingVideo.playlists.includes(playlistId)
            ? existingVideo.playlists
            : [...existingVideo.playlists, playlistId];

          toUpdate.push({
            where: { videoId: video.id },
            data: {
              ...videoData,
              playlists: updatedPlaylists,
            },
          });
          result.videosUpdated++;
        } else {
          // Create new video
          toCreate.push({
            videoId: video.id,
            ...videoData,
            playlists: [playlistId],
            migratedAt: new Date(),
            channelId: video.snippet?.channelId,
          });
          result.videosAdded++;
        }
      }

      // Execute batch operations
      if (toCreate.length > 0) {
        // Create in batches of 100 to avoid MongoDB limits
        for (let i = 0; i < toCreate.length; i += 100) {
          const batch = toCreate.slice(i, i + 100);
          await tx.videos.createMany({
            data: batch,
            // skipDuplicates: true,
          });
        }
      }

      // Update existing videos one by one (can't use updateMany with different data)
      for (const updateOp of toUpdate) {
        await tx.videos.update(updateOp);
      }

      // Remove videos no longer in playlist
      const videosToRemove = existingVideos.filter(
        (v) => !processedVideoIds.has(v.videoId)
      );

      if (videosToRemove.length > 0) {
        for (const video of videosToRemove) {
          const updatedPlaylists = video.playlists.filter(
            (p) => p !== playlistId
          );

          if (updatedPlaylists.length === 0) {
            // Delete video if no longer in any playlist
            await tx.videos.deleteMany({
              where: { videoId: video.videoId },
            });
          } else {
            // Just remove from this playlist
            await tx.videos.updateMany({
              where: { videoId: video.videoId },
              data: { playlists: updatedPlaylists },
            });
          }
          result.videosRemoved++;
        }
      }

      // Update playlist metadata
      await updatePlaylistMetadata(playlistId, processedVideoIds.size, tx);
    });

    result.duration = Math.round((Date.now() - startTime) / 1000);
    return result;
  } catch (error) {
    console.error(`Sync playlist ${playlistId} failed:`, error);
    result.errors.push(
      error instanceof Error ? error.message : "Unknown error"
    );
    result.duration = Math.round((Date.now() - startTime) / 1000);
    return result;
  }
}

/**
 * Fetch all items from a playlist with retry logic
 */
async function fetchAllPlaylistItems(
  playlistId: string,
  maxRetries: number = 3
): Promise<youtube_v3.Schema$PlaylistItem[]> {
  const items: youtube_v3.Schema$PlaylistItem[] = [];
  let nextPageToken: string | undefined;
  let retryCount = 0;

  do {
    try {
      const response = await youtube.playlistItems.list({
        playlistId,
        part: ["snippet", "contentDetails", "status"],
        maxResults: 50,
        pageToken: nextPageToken,
      });

      if (response.data.items) {
        items.push(...response.data.items);
      }

      nextPageToken = response.data.nextPageToken || undefined;
      retryCount = 0; // Reset retry count on success
    } catch (error: any) {
      if (error?.code === 403 && retryCount < maxRetries) {
        // API quota exceeded, wait and retry
        console.log(
          `API quota hit, waiting 60 seconds... (retry ${retryCount + 1}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, 60000));
        retryCount++;
      } else {
        throw error;
      }
    }
  } while (nextPageToken);

  return items;
}

/**
 * Fetch detailed video information with retry logic
 */
async function fetchVideoDetails(
  videoIds: string[],
  maxRetries: number = 3
): Promise<youtube_v3.Schema$Video[]> {
  const videos: youtube_v3.Schema$Video[] = [];

  // Process in batches of 50 (YouTube API limit)
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    let retryCount = 0;
    let success = false;

    while (!success && retryCount <= maxRetries) {
      try {
        const response = await youtube.videos.list({
          id: batch,
          part: ["snippet", "statistics", "contentDetails", "status"],
        });

        if (response.data.items) {
          videos.push(...response.data.items);
        }
        success = true;
      } catch (error: any) {
        if (error?.code === 403 && retryCount < maxRetries) {
          console.log(
            `API quota hit, waiting 60 seconds... (retry ${retryCount + 1}/${maxRetries})`
          );
          await new Promise((resolve) => setTimeout(resolve, 60000));
          retryCount++;
        } else {
          throw error;
        }
      }
    }
  }

  return videos;
}

/**
 * Parse ISO 8601 duration to seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Update playlist metadata with transaction support
 */
async function updatePlaylistMetadata(
  playlistId: string,
  itemCount: number,
  tx?: any
): Promise<void> {
  try {
    const playlistInfo = await youtube.playlists.list({
      id: [playlistId],
      part: ["snippet", "contentDetails"],
    });

    if (playlistInfo.data.items?.[0]) {
      const playlist = playlistInfo.data.items[0];
      const db = tx || prisma;

      await db.playlist.update({
        where: { playlistId },
        data: {
          title: playlist.snippet?.title || "",
          description: playlist.snippet?.description,
          thumbnailUrl: playlist.snippet?.thumbnails?.high?.url,
          itemCount: itemCount || playlist.contentDetails?.itemCount || 0,
          channelTitle: playlist.snippet?.channelTitle,
          updatedAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error(
      `Failed to update playlist metadata for ${playlistId}:`,
      error
    );
    // Don't throw - this is not critical
  }
}

/**
 * Update channel information
 */
export async function updateChannelInfo(): Promise<void> {
  try {
    const channelId =
      process.env.YOUTUBE_CHANNEL_ID || "UC2CzLwbhTiI8pTKNVyrOnJQ";

    const channelInfo = await youtube.channels.list({
      id: [channelId],
      part: ["snippet", "statistics", "contentDetails"],
    });

    if (channelInfo.data.items?.[0]) {
      const channel = channelInfo.data.items[0];

      // Check if channel exists
      const existing = await prisma.channel_info.findUnique({
        where: { channelId },
      });

      const channelData = {
        title: channel.snippet?.title || "",
        description: channel.snippet?.description || "",
        thumbnailUrl: channel.snippet?.thumbnails?.high?.url,
        subscriberCount: parseInt(channel.statistics?.subscriberCount || "0"),
        videoCount: parseInt(channel.statistics?.videoCount || "0"),
        viewCount: BigInt(channel.statistics?.viewCount || "0"),
        customUrl: channel.snippet?.customUrl,
        lastFetched: new Date(),
      };

      if (existing) {
        await prisma.channel_info.update({
          where: { channelId },
          data: {
            ...channelData,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.channel_info.create({
          data: {
            channelId,
            ...channelData,
          },
        });
      }
    }
  } catch (error) {
    console.error("Update channel info failed:", error);
    // Don't throw - this is not critical
  }
}

/**
 * Clean up orphaned videos (not in any playlist)
 */
export async function cleanupOrphanedVideos(): Promise<number> {
  try {
    const orphanedVideos = await prisma.videos.deleteMany({
      where: {
        playlists: {
          isEmpty: true,
        },
      },
    });

    console.log(`Cleaned up ${orphanedVideos.count} orphaned videos`);
    return orphanedVideos.count;
  } catch (error) {
    console.error("Failed to cleanup orphaned videos:", error);
    return 0;
  }
}

/**
 * Get sync statistics for monitoring
 */
export async function getSyncStatistics() {
  const [totalVideos, totalPlaylists, recentSyncs, lastSync] =
    await Promise.all([
      prisma.videos.count(),
      prisma.playlist.count({ where: { isActive: true } }),
      prisma.syncHistory.findMany({
        take: 10,
        orderBy: { timestamp: "desc" },
      }),
      prisma.syncHistory.findFirst({
        orderBy: { timestamp: "desc" },
      }),
    ]);

  return {
    totalVideos,
    totalPlaylists,
    recentSyncs,
    lastSync,
    health:
      lastSync &&
      Date.now() - lastSync.timestamp.getTime() < 24 * 60 * 60 * 1000
        ? "healthy"
        : "needs-sync",
  };
}
