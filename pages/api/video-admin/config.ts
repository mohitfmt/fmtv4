// pages/api/video-admin/config.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { configCache } from "@/lib/cache/video-cache-registry";

const configSchema = z.object({
  homepage: z.object({
    playlistId: z.string(),
    fallbackPlaylistId: z.string().optional(),
  }),
  videoPage: z.object({
    heroPlaylistId: z.string(),
    shortsPlaylistId: z.string(),
    displayedPlaylists: z
      .array(
        z.object({
          playlistId: z.string(),
          position: z.number(),
          maxVideos: z.number().min(1).max(50),
        })
      )
      .min(5)
      .max(8), // Enforce min 5, max 8 playlist sections
  }),
});

// Your specified default playlists
const DEFAULT_PLAYLIST_IDS = [
  "PLKe9JQ8opkEAErOOqs4tB87iWhuh_-osl",
  "PLKe9JQ8opkEBA3B18pmiK2B5nE95A74qI",
  "PLKe9JQ8opkED1GXiSi3Q6kPc5ttqISipf",
  "PLKe9JQ8opkECd7X7RJ6WjKEW9TX39kERS",
  "PLKe9JQ8opkECLh07v3VLtdPDaD4PJ_VqB",
  "PLKe9JQ8opkECFhIRt6ARjHweZoDAdWxv-",
];

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;
  const traceId = (req as any).traceId;

  switch (method) {
    case "GET":
      return handleGetConfig(req, res, traceId);
    case "POST":
      return handleUpdateConfig(req, res, traceId);
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).json({ error: "Method not allowed" });
  }
};

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
      });
    }

    // Using your VideoConfig model
    let config = await prisma.videoConfig.findFirst();

    if (!config) {
      console.log(
        "No config found, creating default configuration with your specified playlists..."
      );

      // Try to get actual playlists from database to verify they exist
      const existingPlaylists = await prisma.playlist.findMany({
        where: {
          playlistId: { in: DEFAULT_PLAYLIST_IDS },
        },
        orderBy: { itemCount: "desc" },
      });

      // If we have playlists in DB, use them; otherwise use the IDs directly
      const playlistIds =
        existingPlaylists.length > 0
          ? existingPlaylists.map((p) => p.playlistId)
          : DEFAULT_PLAYLIST_IDS;

      // Look for a shorts playlist (one with "shorts" or "reel" in the name)
      let shortsPlaylistId = playlistIds[1]; // Default to second playlist
      const shortsPlaylist = existingPlaylists.find(
        (p) =>
          p.title.toLowerCase().includes("short") ||
          p.title.toLowerCase().includes("reel")
      );
      if (shortsPlaylist) {
        shortsPlaylistId = shortsPlaylist.playlistId;
      }

      // Create the default configuration with 6 displayed playlists
      const defaultConfig = {
        homepage: {
          playlistId: playlistIds[0], // First playlist for homepage
          fallbackPlaylistId: playlistIds[1], // Second as fallback
        },
        videoPage: {
          heroPlaylistId: playlistIds[0], // First playlist for hero
          shortsPlaylistId: shortsPlaylistId,
          displayedPlaylists: DEFAULT_PLAYLIST_IDS.map((playlistId, index) => ({
            playlistId: playlistId,
            position: index + 1,
            maxVideos: 10,
          })),
        },
      };

      config = await prisma.videoConfig.create({
        data: {
          homepagePlaylist: defaultConfig.homepage.playlistId,
          fallbackPlaylist: defaultConfig.homepage.fallbackPlaylistId,
          heroPlaylist: defaultConfig.videoPage.heroPlaylistId,
          shortsPlaylist: defaultConfig.videoPage.shortsPlaylistId,
          displayedPlaylists: defaultConfig.videoPage.displayedPlaylists,
        },
      });
    }

    // Transform to expected format
    const configData = {
      homepage: {
        playlistId: config.homepagePlaylist,
        fallbackPlaylistId: config.fallbackPlaylist,
      },
      videoPage: {
        heroPlaylistId: config.heroPlaylist,
        shortsPlaylistId: config.shortsPlaylist,
        displayedPlaylists: config.displayedPlaylists as any,
      },
    };

    // Cache for 30 minutes
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

    const validation = configSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid configuration",
        details: validation.error,
        traceId,
      });
    }

    const { homepage, videoPage } = validation.data;

    // Validate that the number of displayed playlists is between 5 and 8
    if (
      videoPage.displayedPlaylists.length < 5 ||
      videoPage.displayedPlaylists.length > 8
    ) {
      return res.status(400).json({
        error: "Video page must have between 5 and 8 playlist sections",
        traceId,
      });
    }

    // Find existing config
    const existingConfig = await prisma.videoConfig.findFirst();

    let config;
    if (existingConfig) {
      // Update existing
      config = await prisma.videoConfig.update({
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
      // Create new
      config = await prisma.videoConfig.create({
        data: {
          homepagePlaylist: homepage.playlistId,
          fallbackPlaylist: homepage.fallbackPlaylistId,
          heroPlaylist: videoPage.heroPlaylistId,
          shortsPlaylist: videoPage.shortsPlaylistId,
          displayedPlaylists: videoPage.displayedPlaylists,
        },
      });
    }

    // Clear cache
    configCache.delete("main");

    // Log admin action using correct model name
    await prisma.admin_activity_logs.create({
      data: {
        userId: session.user.id || session.user.email,
        action: "UPDATE_CONFIG",
        entityType: "config",
        metadata: validation.data,
        ipAddress:
          (req.headers["x-forwarded-for"] as string) ||
          req.socket.remoteAddress,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    // Transform back to expected format
    const configData = {
      homepage: {
        playlistId: config.homepagePlaylist,
        fallbackPlaylistId: config.fallbackPlaylist,
      },
      videoPage: {
        heroPlaylistId: config.heroPlaylist,
        shortsPlaylistId: config.shortsPlaylist,
        displayedPlaylists: config.displayedPlaylists,
      },
    };

    return res.status(200).json({
      data: configData,
      traceId,
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to update config:`, error);
    return res.status(500).json({
      error: "Failed to update configuration",
      traceId,
    });
  }
}

export default withAdminApi(handler);
