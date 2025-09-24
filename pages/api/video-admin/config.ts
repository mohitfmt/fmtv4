// pages/api/video-admin/config.ts - OPTIMIZED VERSION WITHOUT FALLBACK
import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { LRUCache } from "lru-cache";

// Configuration validation schema
const configSchema = z.object({
  homepage: z.object({
    playlistId: z.string().min(1, "Homepage playlist is required"),
    fallbackPlaylistId: z.string().optional(), // Keep it optional
  }),
  videoPage: z.object({
    heroPlaylistId: z.string().min(1, "Hero playlist is required"),
    shortsPlaylistId: z.string().min(1, "Shorts playlist is required"),
    displayedPlaylists: z
      .array(
        z.object({
          playlistId: z.string().min(1),
          position: z.number().min(1).max(8),
          maxVideos: z
            .number()
            .min(3)
            .max(99)
            .refine((val) => val % 3 === 0, {
              message: "Display limit must be a multiple of 3",
            }),
        })
      )
      .min(5, "Minimum 5 playlist sections required")
      .max(8, "Maximum 8 playlist sections allowed"),
  }),
});

// Cache configuration for 30 minutes
const configCache = new LRUCache<string, any>({
  max: 10,
  ttl: 1000 * 60 * 30, // 30 minutes
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const traceId = (req as any).traceId;

  if (req.method === "GET") {
    return handleGetConfig(req, res, traceId);
  } else if (req.method === "POST") {
    return handleUpdateConfig(req, res, traceId);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }
}

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

async function handleUpdateConfig(
  req: NextApiRequest,
  res: NextApiResponse,
  traceId: string
) {
  try {
    const session = (req as any).session;

    // Validate request body
    const validation = configSchema.safeParse(req.body);
    if (!validation.success) {
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

    // Start transaction
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
          userId: session.user?.email || session.user?.id || "system",
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

    // Clear cache after successful update
    configCache.clear();

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
    configCache.clear();

    return res.status(500).json({
      error: "Failed to update configuration",
      traceId,
    });
  }
}

export default withAdminApi(handler);
