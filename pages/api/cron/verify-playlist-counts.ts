// pages/api/cron/verify-playlist-counts.ts - ENHANCED WITH DISCOVERY
// Discovers new playlists + Verifies counts for all playlists
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { youtube } from "@/lib/youtube-sync";

interface VerificationResult {
  playlistId: string;
  title: string;
  previousCount: number;
  actualCount: number;
  difference: number;
  corrected: boolean;
  error?: string;
}

interface DiscoveredPlaylist {
  playlistId: string;
  title: string;
  itemCount: number;
}

interface EnhancedResponse {
  success: boolean;
  message?: string;
  data?: {
    // Discovery stats
    discovery: {
      totalOnYouTube: number;
      existingInDB: number;
      newDiscovered: number;
      discoveredPlaylists: DiscoveredPlaylist[];
    };
    // Verification stats
    verification: {
      totalVerified: number;
      totalCorrected: number;
      totalErrors: number;
      results: VerificationResult[];
    };
    // Performance
    duration: number;
    apiCallsUsed: number;
  };
  error?: string;
  traceId: string;
  timestamp: string;
}

function isAuthorized(req: NextApiRequest): boolean {
  const cronSecret = process.env.CRON_SECRET_KEY;

  // Check cron key (for scheduled jobs)
  if (cronSecret && req.headers["x-cron-key"] === cronSecret) {
    return true;
  }

  // Check admin session (for manual admin triggers)
  const userEmail = req.cookies?.user_email;
  if (userEmail && userEmail.endsWith("@freemalaysiatoday.com")) {
    return true;
  }

  return false;
}

function generateTraceId(): string {
  return `VERIFY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

// STEP 1: Fetch all playlists from YouTube channel
async function fetchAllChannelPlaylists(
  channelId: string,
  traceId: string
): Promise<
  Array<{
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    channelTitle?: string;
    publishedAt?: Date;
    itemCount?: number;
  }>
> {
  const allPlaylists: Array<any> = [];
  let pageToken: string | undefined;
  let pageCount = 0;
  const maxPages = 10; // Safety limit
  let apiCalls = 0;

  console.log(`[${traceId}] Fetching all playlists from channel ${channelId}`);

  try {
    do {
      pageCount++;
      console.log(`[${traceId}] Fetching playlist page ${pageCount}...`);

      const response = await youtube.playlists.list({
        part: ["snippet", "contentDetails"],
        channelId,
        maxResults: 50,
        pageToken,
      });
      apiCalls++;

      const items = response.data.items || [];

      for (const playlist of items) {
        if (!playlist.id) continue;

        allPlaylists.push({
          id: playlist.id,
          title: playlist.snippet?.title || "Untitled Playlist",
          description: playlist.snippet?.description || null,
          thumbnailUrl:
            playlist.snippet?.thumbnails?.high?.url ||
            playlist.snippet?.thumbnails?.medium?.url ||
            playlist.snippet?.thumbnails?.default?.url ||
            null,
          channelTitle: playlist.snippet?.channelTitle || null,
          publishedAt: playlist.snippet?.publishedAt
            ? new Date(playlist.snippet.publishedAt)
            : new Date(),
          itemCount: playlist.contentDetails?.itemCount || 0,
        });
      }

      pageToken = response.data.nextPageToken || undefined;

      if (pageCount >= maxPages) {
        console.log(`[${traceId}] Reached max pages limit (${maxPages})`);
        break;
      }
    } while (pageToken);

    console.log(
      `[${traceId}] ✅ Found ${allPlaylists.length} playlists on YouTube (${apiCalls} API calls)`
    );
    return allPlaylists;
  } catch (error) {
    console.error(`[${traceId}] Failed to fetch channel playlists:`, error);
    throw error;
  }
}

// STEP 2-4: Discover and add new playlists
async function discoverAndAddNewPlaylists(
  youtubePlaylist: Array<any>,
  channelId: string,
  traceId: string
): Promise<DiscoveredPlaylist[]> {
  console.log(`[${traceId}] Comparing with database...`);

  // Get existing playlists from database
  const existingPlaylists = await prisma.playlist.findMany({
    select: { playlistId: true },
  });

  const existingIds = new Set(existingPlaylists.map((p) => p.playlistId));
  const newPlaylists = youtubePlaylist.filter((p) => !existingIds.has(p.id));

  console.log(`[${traceId}] Found ${newPlaylists.length} new playlists to add`);

  if (newPlaylists.length === 0) {
    console.log(`[${traceId}] No new playlists discovered`);
    return [];
  }

  // Add new playlists to database
  const addedPlaylists: DiscoveredPlaylist[] = [];

  for (const playlist of newPlaylists) {
    try {
      const slug = generateSlug(playlist.title);

      await prisma.playlist.create({
        data: {
          playlistId: playlist.id,
          title: playlist.title,
          description: playlist.description || null,
          thumbnailUrl: playlist.thumbnailUrl || null,
          itemCount: 0, // Will be verified in next step
          isActive: true,
          visibility: "public",
          slug,
          channelId,
          channelTitle: playlist.channelTitle || "Free Malaysia Today",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSyncedAt: null,
          syncVersion: 1,
          privacyStatus: "public",
          publishedAt: playlist.publishedAt || new Date(),
          etag: null,
          lastModified: null,
          fingerprint: null,
          lastFingerprintAt: null,
          syncInProgress: false,
          lastSyncResult: null,
          syncLeaseUntil: null,
          syncLeaseOwner: null,
          activeWindowUntil: null,
        },
      });

      addedPlaylists.push({
        playlistId: playlist.id,
        title: playlist.title,
        itemCount: playlist.itemCount || 0,
      });

      console.log(`[${traceId}] ✅ Added: ${playlist.title}`);
    } catch (error) {
      console.error(
        `[${traceId}] Failed to add playlist ${playlist.title}:`,
        error
      );
    }
  }

  console.log(
    `[${traceId}] ✅ Successfully added ${addedPlaylists.length} playlists`
  );
  return addedPlaylists;
}

// STEP 5: Get actual playlist count by paginating through all items
async function getActualPlaylistCount(
  playlistId: string,
  traceId: string
): Promise<{ count: number; apiCalls: number }> {
  let totalCount = 0;
  let nextPageToken: string | undefined;
  let pageCount = 0;
  let apiCalls = 0;
  const maxPages = 100; // Safety limit (100 pages * 50 items = 5000 videos max)

  try {
    do {
      // Fetch page with minimal data (just IDs)
      const response = await youtube.playlistItems.list({
        playlistId,
        part: ["id"], // Minimal part to reduce quota usage
        maxResults: 50,
        pageToken: nextPageToken,
        fields: "nextPageToken,items(id)", // Only fetch necessary fields
      });
      apiCalls++;

      const itemCount = response.data.items?.length || 0;
      totalCount += itemCount;
      nextPageToken = response.data.nextPageToken || undefined;
      pageCount++;

      // Log progress for large playlists
      if (pageCount % 20 === 0) {
        console.log(
          `[${traceId}] Playlist ${playlistId}: ${totalCount} items so far (page ${pageCount})`
        );
      }

      // Safety check
      if (pageCount >= maxPages) {
        console.warn(
          `[${traceId}] Reached max pages for ${playlistId}, count may be incomplete`
        );
        break;
      }

      // Small delay to be respectful of API limits
      if (pageCount > 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } while (nextPageToken);

    return { count: totalCount, apiCalls };
  } catch (error) {
    console.error(
      `[${traceId}] Failed to count playlist ${playlistId}:`,
      error
    );
    throw error;
  }
}

// STEP 6: Verify counts for all playlists
async function verifyAllPlaylistCounts(traceId: string): Promise<{
  results: VerificationResult[];
  totalCorrected: number;
  totalErrors: number;
  apiCalls: number;
}> {
  console.log(`[${traceId}] Starting count verification for all playlists...`);

  // Get ALL active playlists (including newly added ones)
  const playlists = await prisma.playlist.findMany({
    where: { isActive: true },
    orderBy: { itemCount: "desc" },
  });

  console.log(`[${traceId}] Found ${playlists.length} playlists to verify`);

  const results: VerificationResult[] = [];
  let totalCorrected = 0;
  let totalErrors = 0;
  let totalApiCalls = 0;

  // Process each playlist
  for (const playlist of playlists) {
    try {
      console.log(
        `[${traceId}] Verifying ${playlist.playlistId} (${playlist.title})`
      );

      // Get actual count by paginating through playlist
      const { count: actualCount, apiCalls } = await getActualPlaylistCount(
        playlist.playlistId,
        traceId
      );
      totalApiCalls += apiCalls;

      const difference = actualCount - (playlist.itemCount || 0);

      // Only update if difference exists (any difference, even 1 video)
      const needsCorrection = difference !== 0;

      if (needsCorrection) {
        // Update the count in database
        await prisma.playlist.update({
          where: { playlistId: playlist.playlistId },
          data: {
            itemCount: actualCount,
            updatedAt: new Date(),
            lastSyncResult: {
              lastFullCount: new Date().toISOString(),
              countVerified: true,
              lastVerification: {
                date: new Date().toISOString(),
                previousCount: playlist.itemCount || 0,
                actualCount,
                difference,
              },
            },
          },
        });

        totalCorrected++;
        console.log(
          `[${traceId}] ✅ Corrected ${playlist.title}: ${playlist.itemCount} → ${actualCount} (${difference > 0 ? "+" : ""}${difference})`
        );
      }

      results.push({
        playlistId: playlist.playlistId,
        title: playlist.title,
        previousCount: playlist.itemCount || 0,
        actualCount,
        difference,
        corrected: needsCorrection,
      });
    } catch (error) {
      totalErrors++;
      console.error(
        `[${traceId}] ❌ Failed to verify ${playlist.title}:`,
        error
      );

      results.push({
        playlistId: playlist.playlistId,
        title: playlist.title,
        previousCount: playlist.itemCount || 0,
        actualCount: playlist.itemCount || 0,
        difference: 0,
        corrected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  console.log(
    `[${traceId}] ✅ Verification complete: ${totalCorrected} corrected, ${totalErrors} errors`
  );

  return {
    results,
    totalCorrected,
    totalErrors,
    apiCalls: totalApiCalls,
  };
}

// MAIN HANDLER
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EnhancedResponse>
) {
  const traceId = generateTraceId();
  const startTime = Date.now();

  console.log(`[${traceId}] ========================================`);
  console.log(
    `[${traceId}] Starting ENHANCED playlist discovery + verification`
  );
  console.log(`[${traceId}] Time: ${new Date().toISOString()}`);

  // Verify authorization
  if (!isAuthorized(req)) {
    console.error(`[${traceId}] Unauthorized request`);
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      traceId,
      timestamp: new Date().toISOString(),
    });
  }

  let totalApiCalls = 0;

  try {
    // Check if YouTube API key is configured
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error("YouTube API key not configured");
    }

    const channelId =
      process.env.YOUTUBE_CHANNEL_ID || "UC2CzLwbhTiI8pTKNVyrOnJQ";

    // STEP 1: Fetch all playlists from YouTube channel
    const youtubePlaylist = await fetchAllChannelPlaylists(channelId, traceId);
    totalApiCalls += Math.ceil(youtubePlaylist.length / 50); // Estimate API calls

    // STEP 2-4: Discover and add new playlists
    const discoveredPlaylists = await discoverAndAddNewPlaylists(
      youtubePlaylist,
      channelId,
      traceId
    );

    // Get database count AFTER adding new playlists
    const dbPlaylists = await prisma.playlist.findMany({
      where: { isActive: true },
    });

    // STEP 5-6: Verify counts for ALL playlists (including newly added)
    const {
      results,
      totalCorrected,
      totalErrors,
      apiCalls: verifyApiCalls,
    } = await verifyAllPlaylistCounts(traceId);
    totalApiCalls += verifyApiCalls;

    // Log the activity
    await prisma.admin_activity_logs.create({
      data: {
        action: "ENHANCED_PLAYLIST_VERIFICATION",
        entityType: "cron_job",
        userId: "system",
        metadata: {
          discovery: {
            totalOnYouTube: youtubePlaylist.length,
            existingInDB: dbPlaylists.length - discoveredPlaylists.length,
            newDiscovered: discoveredPlaylists.length,
          },
          verification: {
            totalVerified: results.length,
            totalCorrected,
            totalErrors,
          },
          apiCallsUsed: totalApiCalls,
          duration: Math.round((Date.now() - startTime) / 1000),
        },
      },
    });

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`[${traceId}] ========================================`);
    console.log(`[${traceId}] ✅ COMPLETED in ${duration}s`);
    console.log(
      `[${traceId}] Discovery: ${discoveredPlaylists.length} new playlists added`
    );
    console.log(
      `[${traceId}] Verification: ${totalCorrected} counts corrected`
    );
    console.log(`[${traceId}] API Calls Used: ${totalApiCalls}`);

    // STEP 7: Return combined results
    return res.status(200).json({
      success: true,
      message: `Discovered ${discoveredPlaylists.length} new playlists and verified ${results.length} playlists`,
      data: {
        discovery: {
          totalOnYouTube: youtubePlaylist.length,
          existingInDB: dbPlaylists.length - discoveredPlaylists.length,
          newDiscovered: discoveredPlaylists.length,
          discoveredPlaylists,
        },
        verification: {
          totalVerified: results.length,
          totalCorrected,
          totalErrors,
          results: results.filter((r) => r.corrected || r.error), // Only return changes/errors
        },
        duration,
        apiCallsUsed: totalApiCalls,
      },
      traceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${traceId}] ❌ Operation failed:`, error);

    // Log the error
    await prisma.admin_activity_logs
      .create({
        data: {
          action: "ENHANCED_VERIFICATION_ERROR",
          entityType: "cron_job",
          userId: "system",
          metadata: {
            error: error instanceof Error ? error.message : "Unknown error",
            duration: Math.round((Date.now() - startTime) / 1000),
            apiCallsUsed: totalApiCalls,
          },
        },
      })
      .catch(() => {}); // Ignore logging errors

    return res.status(500).json({
      success: false,
      error: "Operation failed",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
      timestamp: new Date().toISOString(),
    });
  }
}

// Export config for cron scheduling
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};
