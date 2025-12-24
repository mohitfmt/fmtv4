// pages/api/video-admin/config.ts
// FIXED VERSION - With pinned hero video support

import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  configCache,
  videoDataCache,
  galleryCache,
  playlistCache,
} from "@/lib/cache/video-cache-registry";

// Validation schema - WITH PINNED HERO FIELDS
const playlistConfigSchema = z.object({
  playlistId: z.string().min(1),
  position: z.number().int().min(0),
  maxVideos: z.number().int().min(3).max(99),
});

const configSchema = z.object({
  homepage: z.object({
    playlistId: z.string().min(1),
    fallbackPlaylistId: z.string().optional(),
    usePinnedHero: z.boolean().optional(), // 🆕 NEW
    pinnedHeroVideoId: z.string().optional(), // 🆕 NEW
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
// GET CONFIGURATION - WITH PINNED HERO FIELDS
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
          usePinnedHero: false, // 🆕 NEW
          pinnedHeroVideoId: "", // 🆕 NEW
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

    // Transform to API format - WITH PINNED HERO FIELDS
    const configData = {
      homepage: {
        playlistId: config.homepagePlaylist || "",
        fallbackPlaylistId: config.fallbackPlaylist || "",
        usePinnedHero: config.usePinnedHero || false, // 🆕 NEW
        pinnedHeroVideoId: config.pinnedHeroVideoId || "", // 🆕 NEW
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
// UPDATE CONFIGURATION - WITH PINNED HERO FIELDS
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

    // Validate no duplicate playlists within displayedPlaylists array
    const displayedPlaylistIds = videoPage.displayedPlaylists.map(
      (p) => p.playlistId
    );
    const hasDuplicates = displayedPlaylistIds.some(
      (id, index) => displayedPlaylistIds.indexOf(id) !== index
    );

    if (hasDuplicates) {
      return res.status(400).json({
        error:
          "Duplicate playlists detected in Displayed Playlists section. Each playlist can only appear once in this section.",
        traceId,
      });
    }

    // Fetch OLD config BEFORE updating
    const oldConfig = await prisma.videoConfig.findFirst();

    console.log(`[${traceId}] Old config:`, {
      homepage: oldConfig?.homepagePlaylist || "none",
      hero: oldConfig?.heroPlaylist || "none",
      shorts: oldConfig?.shortsPlaylist || "none",
      displayed: oldConfig?.displayedPlaylists
        ? JSON.stringify(oldConfig.displayedPlaylists).substring(0, 50) + "..."
        : "none",
      usePinnedHero: oldConfig?.usePinnedHero || false, // 🆕 NEW
      pinnedHeroVideoId: oldConfig?.pinnedHeroVideoId || "none", // 🆕 NEW
    });

    console.log(`[${traceId}] New config:`, {
      homepage: homepage.playlistId,
      hero: videoPage.heroPlaylistId,
      shorts: videoPage.shortsPlaylistId,
      displayed:
        JSON.stringify(videoPage.displayedPlaylists).substring(0, 50) + "...",
      usePinnedHero: homepage.usePinnedHero || false, // 🆕 NEW
      pinnedHeroVideoId: homepage.pinnedHeroVideoId || "none", // 🆕 NEW
    });

    // ========================================================================
    // STEP 1: Update database with NEW values - INCLUDING PINNED HERO
    // ========================================================================
    const result = await prisma.$transaction(async (tx) => {
      let config;
      if (oldConfig) {
        // Update existing config - WITH PINNED HERO FIELDS
        config = await tx.videoConfig.update({
          where: { id: oldConfig.id },
          data: {
            homepagePlaylist: homepage.playlistId,
            fallbackPlaylist: homepage.fallbackPlaylistId || null,
            usePinnedHero: homepage.usePinnedHero || false, // 🆕 NEW
            pinnedHeroVideoId:
              homepage.usePinnedHero && homepage.pinnedHeroVideoId
                ? homepage.pinnedHeroVideoId
                : null, // 🆕 NEW
            heroPlaylist: videoPage.heroPlaylistId,
            shortsPlaylist: videoPage.shortsPlaylistId,
            displayedPlaylists: videoPage.displayedPlaylists,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new config (first time setup) - WITH PINNED HERO FIELDS
        config = await tx.videoConfig.create({
          data: {
            homepagePlaylist: homepage.playlistId,
            fallbackPlaylist: homepage.fallbackPlaylistId || null,
            usePinnedHero: homepage.usePinnedHero || false, // 🆕 NEW
            pinnedHeroVideoId:
              homepage.usePinnedHero && homepage.pinnedHeroVideoId
                ? homepage.pinnedHeroVideoId
                : null, // 🆕 NEW
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
            usePinnedHero: homepage.usePinnedHero || false, // 🆕 NEW
            pinnedHeroVideoId: homepage.pinnedHeroVideoId || null, // 🆕 NEW
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
    // STEP 2: Clear ALL video-related LRU caches (including homepage)
    // ========================================================================
    try {
      configCache.clear();
      galleryCache.clear();
      videoDataCache.clear();
      playlistCache.clear();

      // Also clear homepage cache
      const { homepageCache } = await import("@/pages/api/homepage");
      homepageCache.clear();

      console.log(
        `[${traceId}] ✅ Cleared all LRU caches (config, gallery, videoData, playlist, homepage)`
      );
    } catch (cacheError) {
      console.error(`[${traceId}] ⚠️ Failed to clear LRU caches:`, cacheError);
    }

    // ========================================================================
    // STEP 3: Determine affected pages by comparing OLD vs NEW
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
      const paths = new Set<string>();
      const urlsToPurge: string[] = [];

      const isFirstTimeSetup = !oldConfig;

      const homepageChanged =
        isFirstTimeSetup ||
        homepage.playlistId !== (oldConfig?.homepagePlaylist || "") ||
        homepage.usePinnedHero !== (oldConfig?.usePinnedHero || false) || // 🆕 NEW
        homepage.pinnedHeroVideoId !== (oldConfig?.pinnedHeroVideoId || ""); // 🆕 NEW

      const heroChanged =
        isFirstTimeSetup ||
        videoPage.heroPlaylistId !== (oldConfig?.heroPlaylist || "");

      const shortsChanged =
        isFirstTimeSetup ||
        videoPage.shortsPlaylistId !== (oldConfig?.shortsPlaylist || "");

      const displayedChanged =
        isFirstTimeSetup ||
        JSON.stringify(videoPage.displayedPlaylists) !==
          JSON.stringify(oldConfig?.displayedPlaylists || []);

      // Log what changed
      if (isFirstTimeSetup) {
        console.log(
          `[${traceId}] First time setup - will revalidate all pages`
        );
      } else {
        console.log(`[${traceId}] Change detection:`, {
          homepage: homepageChanged,
          hero: heroChanged,
          shorts: shortsChanged,
          displayed: displayedChanged,
        });
      }

      // Check if homepage playlist changed
      if (homepageChanged) {
        paths.add("/");
        urlsToPurge.push(`${siteUrl}/`, `${siteUrl}/api/homepage`);
        console.log(
          `[${traceId}] Homepage config changed - will revalidate / and purge CDN`
        );
      }

      // Check if VideoHub-related configs changed
      if (heroChanged || shortsChanged || displayedChanged) {
        paths.add("/videos");
        urlsToPurge.push(`${siteUrl}/videos`, `${siteUrl}/api/videos/gallery`);
        console.log(
          `[${traceId}] VideoHub config changed - will revalidate /videos and purge CDN`
        );
      }

      // If shorts playlist changed specifically, also revalidate shorts page
      if (shortsChanged) {
        paths.add("/videos/shorts");
        urlsToPurge.push(`${siteUrl}/videos/shorts`);
        console.log(
          `[${traceId}] Shorts playlist changed - will revalidate /videos/shorts and purge CDN`
        );
      }

      const pathsArray = Array.from(paths);

      if (pathsArray.length === 0) {
        console.log(`[${traceId}] No pages affected by config changes`);
      } else {
        console.log(
          `[${traceId}] Starting ISR revalidation for ${pathsArray.length} page(s)`
        );

        // Trigger ISR revalidation
        try {
          const revalidateResponse = await fetch(
            `${siteUrl}/api/internal/revalidate`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${revalidateSecret}`,
              },
              body: JSON.stringify({ paths: pathsArray }),
            }
          );

          const revalidateData = await revalidateResponse.json();

          if (revalidateData.revalidated) {
            console.log(
              `[${traceId}] ✅ ISR revalidated successfully:`,
              pathsArray
            );
          } else {
            console.error(
              `[${traceId}] ❌ ISR revalidation failed:`,
              revalidateData
            );
          }
        } catch (revalidateError: any) {
          console.error(
            `[${traceId}] ⚠️ ISR revalidation error (non-fatal):`,
            revalidateError.message
          );
        }

        // Purge Cloudflare CDN
        if (urlsToPurge.length > 0) {
          const CF_ZONE_ID = process.env.CF_ZONE_ID;
          const CF_API_TOKEN = process.env.CF_API_TOKEN;

          if (CF_ZONE_ID && CF_API_TOKEN) {
            console.log(
              `[${traceId}] Purging ${urlsToPurge.length} URL(s) from Cloudflare CDN`
            );

            try {
              const cfResponse = await fetch(
                `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${CF_API_TOKEN}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ files: urlsToPurge }),
                }
              );

              const cfData = await cfResponse.json();

              if (cfData.success) {
                console.log(
                  `[${traceId}] ✅ Cloudflare CDN purged successfully`
                );
              } else {
                console.error(
                  `[${traceId}] ❌ Cloudflare CDN purge failed:`,
                  cfData.errors
                );
              }
            } catch (cfError: any) {
              console.error(
                `[${traceId}] ⚠️ Cloudflare CDN purge error (non-fatal):`,
                cfError.message
              );
            }
          } else if (urlsToPurge.length > 0) {
            console.warn(
              `[${traceId}] ⚠️ Cloudflare credentials not configured - CDN purge skipped`
            );
          }
        }
      }
    }

    console.log(`[${traceId}] ✅ Config update complete`);
    console.log(`[${traceId}] ========================================`);

    // Return updated configuration - WITH PINNED HERO FIELDS
    const updatedConfig = {
      homepage: {
        playlistId: result.homepagePlaylist || "",
        fallbackPlaylistId: result.fallbackPlaylist || "",
        usePinnedHero: result.usePinnedHero || false, // 🆕 NEW
        pinnedHeroVideoId: result.pinnedHeroVideoId || "", // 🆕 NEW
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
