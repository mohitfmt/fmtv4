// pages/api/video-admin/config.ts
// FIXED VERSION - Triggers ISR revalidation + clears all caches on config save

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  configCache,
  videoDataCache,
  galleryCache,
  playlistCache,
} from "@/lib/cache/video-cache-registry";

// Validation schema
const playlistConfigSchema = z.object({
  playlistId: z.string().min(1),
  position: z.number().int().min(0),
  maxVideos: z.number().int().min(3).max(99),
});

const configSchema = z.object({
  homepage: z.object({
    playlistId: z.string().min(1),
    fallbackPlaylistId: z.string().optional(),
  }),
  videoPage: z.object({
    heroPlaylistId: z.string().min(1),
    shortsPlaylistId: z.string().min(1),
    displayedPlaylists: z.array(playlistConfigSchema).min(5).max(8),
  }),
});

function generateTraceId(): string {
  return `CONFIG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const traceId = generateTraceId();

  if (req.method === "GET") {
    return handleGetConfig(req, res, traceId);
  }

  if (req.method === "POST") {
    return handleUpdateConfig(req, res, traceId);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}

// ============================================================================
// GET CONFIGURATION
// ============================================================================
async function handleGetConfig(
  req: NextApiRequest,
  res: NextApiResponse,
  traceId: string
) {
  try {
    // Check cache first
    const cached = configCache.get("main");
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json({
        data: cached,
        traceId,
        cached: true,
      });
    }

    // Fetch configuration from database
    const config = await prisma.videoConfig.findFirst();

    if (!config) {
      // Return default configuration if none exists
      const defaultConfig = {
        homepage: {
          playlistId: "",
          fallbackPlaylistId: "",
        },
        videoPage: {
          heroPlaylistId: "",
          shortsPlaylistId: "",
          displayedPlaylists: [],
        },
      };

      return res.status(200).json({
        data: defaultConfig,
        traceId,
        isDefault: true,
      });
    }

    // Transform to API format
    const configData = {
      homepage: {
        playlistId: config.homepagePlaylist || "",
        fallbackPlaylistId: config.fallbackPlaylist || "",
      },
      videoPage: {
        heroPlaylistId: config.heroPlaylist || "",
        shortsPlaylistId: config.shortsPlaylist || "",
        displayedPlaylists: (config.displayedPlaylists as any) || [],
      },
    };

    // Cache the configuration
    configCache.set("main", configData);

    res.setHeader("X-Cache", "MISS");
    return res.status(200).json({
      data: configData,
      traceId,
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to fetch config:`, error);
    return res.status(500).json({
      error: "Failed to fetch configuration",
      traceId,
    });
  }
}

// ============================================================================
// UPDATE CONFIGURATION - WITH ISR REVALIDATION + CACHE CLEARING
// ============================================================================
async function handleUpdateConfig(
  req: NextApiRequest,
  res: NextApiResponse,
  traceId: string
) {
  try {
    const userEmail = req.cookies?.user_email || "admin@freemalaysiatoday.com";

    console.log(`[${traceId}] ========================================`);
    console.log(`[${traceId}] Config update requested by ${userEmail}`);

    // Validate request body
    const validation = configSchema.safeParse(req.body);
    if (!validation.success) {
      console.error(
        `[${traceId}] Validation failed:`,
        validation.error.flatten()
      );
      return res.status(400).json({
        error: "Invalid configuration",
        details: validation.error.flatten(),
        traceId,
      });
    }

    const { homepage, videoPage } = validation.data;

    // Additional validation: Check for duplicate playlists within same section
    const heroShortsDuplicate =
      videoPage.heroPlaylistId === videoPage.shortsPlaylistId;
    if (heroShortsDuplicate) {
      return res.status(400).json({
        error: "Hero and Shorts sections cannot use the same playlist",
        traceId,
      });
    }

    // ========================================================================
    // STEP 1: Update database
    // ========================================================================
    const result = await prisma.$transaction(async (tx) => {
      // Find or create config
      const existingConfig = await tx.videoConfig.findFirst();

      let config;
      if (existingConfig) {
        // Update existing config
        config = await tx.videoConfig.update({
          where: { id: existingConfig.id },
          data: {
            homepagePlaylist: homepage.playlistId,
            fallbackPlaylist: homepage.fallbackPlaylistId,
            heroPlaylist: videoPage.heroPlaylistId,
            shortsPlaylist: videoPage.shortsPlaylistId,
            displayedPlaylists: videoPage.displayedPlaylists,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new config
        config = await tx.videoConfig.create({
          data: {
            homepagePlaylist: homepage.playlistId,
            fallbackPlaylist: homepage.fallbackPlaylistId,
            heroPlaylist: videoPage.heroPlaylistId,
            shortsPlaylist: videoPage.shortsPlaylistId,
            displayedPlaylists: videoPage.displayedPlaylists,
          },
        });
      }

      // Log the configuration change
      await tx.admin_activity_logs.create({
        data: {
          action: "CONFIG_UPDATE",
          entityType: "video_config",
          userId: userEmail || "system",
          metadata: {
            configId: config.id,
            homepage: homepage.playlistId,
            hero: videoPage.heroPlaylistId,
            shorts: videoPage.shortsPlaylistId,
            displayedCount: videoPage.displayedPlaylists.length,
            displayLimits: videoPage.displayedPlaylists.map((p) => p.maxVideos),
          },
          ipAddress:
            (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
            req.socket.remoteAddress,
          userAgent: req.headers["user-agent"] || null,
        },
      });

      return config;
    });

    console.log(`[${traceId}] ✅ Database updated successfully`);

    // ========================================================================
    // STEP 2: Clear ALL video-related LRU caches
    // ========================================================================
    try {
      configCache.clear();
      galleryCache.clear();
      videoDataCache.clear();
      playlistCache.clear();
      console.log(
        `[${traceId}] ✅ Cleared all LRU caches (config, gallery, videoData, playlist)`
      );
    } catch (cacheError) {
      console.error(`[${traceId}] ⚠️ Failed to clear LRU caches:`, cacheError);
    }

    // ========================================================================
    // STEP 3: Trigger ISR revalidation for affected pages
    // ========================================================================
    const revalidateSecret = process.env.REVALIDATE_SECRET;
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!revalidateSecret) {
      console.error(
        `[${traceId}] ⚠️ REVALIDATE_SECRET not configured - ISR skipped`
      );
    } else if (!siteUrl) {
      console.error(
        `[${traceId}] ⚠️ NEXT_PUBLIC_APP_URL not configured - ISR skipped`
      );
    } else {
      // Determine which pages need revalidation based on config changes
      const paths = [
        "/videos", // Main video gallery (always affected by config changes)
      ];

      // Add playlist-specific pages if we have slugs
      // (We could enhance this later to revalidate specific playlist pages)

      console.log(
        `[${traceId}] Triggering ISR revalidation for ${paths.length} paths`
      );

      try {
        const revalidateResponse = await fetch(
          `${siteUrl}/api/internal/revalidate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-revalidate-secret": revalidateSecret,
            },
            body: JSON.stringify({ paths }),
            signal: AbortSignal.timeout(10000), // 10s timeout
          }
        );

        if (revalidateResponse.ok) {
          const result = await revalidateResponse.json();
          console.log(
            `[${traceId}] ✅ ISR revalidation successful:`,
            result.revalidated?.length || 0,
            "paths"
          );
        } else {
          const errorText = await revalidateResponse.text();
          console.error(
            `[${traceId}] ❌ ISR revalidation failed (${revalidateResponse.status}):`,
            errorText
          );
        }
      } catch (revalidateError: any) {
        // Log error but don't fail the config save
        console.error(
          `[${traceId}] ⚠️ ISR revalidation error (non-fatal):`,
          revalidateError.message
        );
      }
    }

    console.log(`[${traceId}] ✅ Config update complete`);
    console.log(`[${traceId}] ========================================`);

    // Return updated configuration
    const updatedConfig = {
      homepage: {
        playlistId: result.homepagePlaylist || "",
        fallbackPlaylistId: result.fallbackPlaylist || "",
      },
      videoPage: {
        heroPlaylistId: result.heroPlaylist || "",
        shortsPlaylistId: result.shortsPlaylist || "",
        displayedPlaylists: (result.displayedPlaylists as any) || [],
      },
    };

    return res.status(200).json({
      data: updatedConfig,
      message: "Configuration updated successfully",
      traceId,
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to update config:`, error);

    // Clear cache on error to prevent stale data
    try {
      configCache.clear();
      galleryCache.clear();
    } catch {
      // Ignore cache clear errors
    }

    return res.status(500).json({
      error: "Failed to update configuration",
      traceId,
    });
  }
}

export default handler;
