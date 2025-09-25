// pages/api/cron/verify-playlist-counts.ts - WEEKLY VERIFICATION
// Runs every Saturday at 2:40 PM MYT (06:40 UTC)
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

// Helper to check if request is authorized (cron secret or admin)
function isAuthorized(req: NextApiRequest): boolean {
  const cronSecret = process.env.CRON_SECRET_KEY;

  if (cronSecret && req.headers["x-cron-key"] === cronSecret) {
    return true;
  }

  // Could also check for admin session here
  return false;
}

// Generate trace ID for logging
function generateTraceId(): string {
  return `VERIFY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const traceId = generateTraceId();
  const startTime = Date.now();

  console.log(`[${traceId}] ========================================`);
  console.log(`[${traceId}] Starting weekly playlist count verification`);
  console.log(`[${traceId}] Time: ${new Date().toISOString()}`);

  // Verify authorization
  if (!isAuthorized(req)) {
    console.error(`[${traceId}] Unauthorized request`);
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      traceId,
    });
  }

  // Check if it's Saturday (considering timezone)
  // const now = new Date();
  // const malaysiaTime = new Date(
  //   now.toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" })
  // );
  // const dayOfWeek = malaysiaTime.getDay();

  // // Allow manual trigger or Saturday only
  // const forceRun = req.query.force === "true";
  // if (dayOfWeek !== 6 && !forceRun) {
  //   console.log(
  //     `[${traceId}] Not Saturday (day ${dayOfWeek}), skipping unless forced`
  //   );
  //   return res.status(200).json({
  //     success: true,
  //     message: "Verification only runs on Saturdays",
  //     dayOfWeek,
  //     traceId,
  //   });
  // }

  try {
    // Check if YouTube API key is configured
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error("YouTube API key not configured");
    }

    // Get all active playlists
    const playlists = await prisma.playlist.findMany({
      where: { isActive: true },
      orderBy: { itemCount: "desc" },
    });

    if (playlists.length === 0) {
      console.log(`[${traceId}] No active playlists found`);
      return res.status(200).json({
        success: true,
        message: "No active playlists to verify",
        traceId,
      });
    }

    console.log(`[${traceId}] Found ${playlists.length} playlists to verify`);

    const results: VerificationResult[] = [];
    let totalCorrected = 0;
    let totalErrors = 0;

    // Process each playlist
    for (const playlist of playlists) {
      try {
        console.log(
          `[${traceId}] Verifying ${playlist.playlistId} (${playlist.title})`
        );

        // Get actual count by paginating through playlist
        const actualCount = await getActualPlaylistCount(
          playlist.playlistId,
          traceId
        );

        const difference = actualCount - (playlist.itemCount || 0);

        // Only update if difference is significant (more than 1%)
        const needsCorrection =
          Math.abs(difference) > Math.max(1, playlist.itemCount * 0.01);

        if (needsCorrection) {
          console.log(
            `[${traceId}] Correcting count for ${playlist.playlistId}: ` +
              `${playlist.itemCount} -> ${actualCount} (diff: ${difference})`
          );

          // Update the count
          await prisma.playlist.update({
            where: { playlistId: playlist.playlistId },
            data: {
              itemCount: actualCount,
              lastSyncedAt: new Date(),
              lastSyncResult: {
                lastFullCount: new Date(),
                countVerified: true,
                lastVerification: {
                  date: new Date(),
                  previousCount: playlist.itemCount,
                  actualCount,
                  difference,
                },
              },
            },
          });

          totalCorrected++;
        }

        results.push({
          playlistId: playlist.playlistId,
          title: playlist.title,
          previousCount: playlist.itemCount || 0,
          actualCount,
          difference,
          corrected: needsCorrection,
        });

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(
          `[${traceId}] Error verifying ${playlist.playlistId}:`,
          error
        );
        totalErrors++;

        results.push({
          playlistId: playlist.playlistId,
          title: playlist.title,
          previousCount: playlist.itemCount || 0,
          actualCount: 0,
          difference: 0,
          corrected: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Log the verification activity
    await prisma.admin_activity_logs.create({
      data: {
        action: "PLAYLIST_COUNT_VERIFICATION",
        entityType: "cron_job",
        userId: "system",
        metadata: {
          totalPlaylists: playlists.length,
          totalCorrected,
          totalErrors,
          results: results
            .filter((r) => r.corrected || r.error)
            .map((r) => ({
              playlistId: r.playlistId,
              title: r.title,
              previousCount: r.previousCount,
              actualCount: r.actualCount,
              difference: r.difference,
              corrected: r.corrected,
              error: r.error,
            })),
          duration: Math.round((Date.now() - startTime) / 1000),
        },
      },
    });

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`[${traceId}] ========================================`);
    console.log(`[${traceId}] Verification completed in ${duration}s`);
    console.log(
      `[${traceId}] Corrected: ${totalCorrected}, Errors: ${totalErrors}`
    );

    return res.status(200).json({
      success: true,
      message: "Playlist count verification completed",
      data: {
        totalPlaylists: playlists.length,
        totalCorrected,
        totalErrors,
        duration,
        results: results.filter((r) => r.corrected || r.error), // Only return changes/errors
      },
      traceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${traceId}] Verification failed:`, error);

    // Log the error
    await prisma.admin_activity_logs
      .create({
        data: {
          action: "PLAYLIST_COUNT_VERIFICATION_ERROR",
          entityType: "cron_job",
          userId: "system",
          metadata: {
            error: error instanceof Error ? error.message : "Unknown error",
            duration: Math.round((Date.now() - startTime) / 1000),
          },
        },
      })
      .catch(() => {}); // Ignore logging errors

    return res.status(500).json({
      success: false,
      error: "Verification failed",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
      timestamp: new Date().toISOString(),
    });
  }
}

// Get actual playlist count by paginating through all items
async function getActualPlaylistCount(
  playlistId: string,
  traceId: string
): Promise<number> {
  let totalCount = 0;
  let nextPageToken: string | undefined;
  let pageCount = 0;
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

      const itemCount = response.data.items?.length || 0;
      totalCount += itemCount;
      nextPageToken = response.data.nextPageToken || undefined;
      pageCount++;

      // Log progress for large playlists
      if (pageCount % 10 === 0) {
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

    console.log(
      `[${traceId}] Playlist ${playlistId}: Total ${totalCount} items in ${pageCount} pages`
    );
    return totalCount;
  } catch (error) {
    console.error(
      `[${traceId}] Failed to count playlist ${playlistId}:`,
      error
    );
    throw error;
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
