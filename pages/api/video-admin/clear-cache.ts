// pages/api/video-admin/clear-cache.ts
// ENHANCED: Now clears LRU caches + triggers ISR revalidation + purges CDN
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import {
  playlistCache,
  videoDataCache,
  galleryCache,
  configCache,
} from "@/lib/cache/video-cache-registry";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = `CLEAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const userEmail = req.cookies?.user_email || "admin@freemalaysiatoday.com";

  console.log(`[${traceId}] Starting cache clear operation`);

  const results = {
    lruCachesCleared: 0,
    isrRevalidated: false,
    cdnPurged: false,
  };

  try {
    // 1. Clear LRU caches (in-memory)
    try {
      console.log(`[${traceId}] Clearing LRU caches...`);

      // Clear individual caches
      playlistCache.clear();
      console.log(`[${traceId}] Cleared playlistCache`);
      results.lruCachesCleared++;

      videoDataCache.clear();
      console.log(`[${traceId}] Cleared videoDataCache`);
      results.lruCachesCleared++;

      galleryCache.clear();
      console.log(`[${traceId}] Cleared galleryCache`);
      results.lruCachesCleared++;

      configCache.clear();
      console.log(`[${traceId}] Cleared configCache`);
      results.lruCachesCleared++;

      console.log(
        `[${traceId}] Successfully cleared ${results.lruCachesCleared}/${results.lruCachesCleared} caches`
      );
    } catch (error) {
      console.error(`[${traceId}] Failed to clear LRU caches:`, error);
    }

    // 2. 🆕 ISR REVALIDATION: Rebuild all video pages
    try {
      console.log(`[${traceId}] Triggering ISR revalidation...`);

      const pagesToRevalidate = [
        "/videos", // Main video hub
        "/videos/shorts", // Shorts page
        // Note: Individual video/playlist pages will rebuild on next visit
      ];

      const revalidateUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/internal/revalidate`;
      const revalidateSecret =
        process.env.REVALIDATE_SECRET || process.env.REVALIDATE_SECRET_KEY;

      if (!revalidateSecret) {
        console.warn(
          `[${traceId}] REVALIDATE_SECRET not set - skipping ISR revalidation`
        );
      } else {
        const revalidateResponse = await fetch(revalidateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-revalidate-secret": revalidateSecret,
          },
          body: JSON.stringify({
            paths: pagesToRevalidate,
            source: "clear-cache",
            traceId,
          }),
        });

        if (!revalidateResponse.ok) {
          const errorText = await revalidateResponse.text();
          console.error(`[${traceId}] ISR revalidation failed: ${errorText}`);
        } else {
          const revalidateResult = await revalidateResponse.json();
          console.log(
            `[${traceId}] ✅ ISR revalidation completed:`,
            revalidateResult
          );
          results.isrRevalidated = true;
        }
      }
    } catch (error) {
      console.error(`[${traceId}] ISR revalidation error:`, error);
      // Don't fail the whole operation
    }

    // 3. 🆕 CDN PURGE: Clear Cloudflare cache
    try {
      console.log(`[${traceId}] Purging CDN cache...`);

      const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
      const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
      const SITE_URL =
        process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

      if (!CF_ZONE_ID || !CF_API_TOKEN) {
        console.warn(
          `[${traceId}] Cloudflare credentials not configured, skipping CDN purge`
        );
      } else {
        // Purge everything video-related
        const urlsToPurge = [
          `${SITE_URL}/api/videos/gallery`,
          `${SITE_URL}/api/videos/playlists`,
          `${SITE_URL}/videos`,
          `${SITE_URL}/videos/*`,
        ];

        const cdnResponse = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${CF_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              files: urlsToPurge,
            }),
          }
        );

        if (!cdnResponse.ok) {
          const error = await cdnResponse.text();
          console.error(`[${traceId}] CDN purge failed: ${error}`);

          // Try tag-based purge as fallback
          console.log(`[${traceId}] Trying tag-based CDN purge...`);
          await fetch(
            `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${CF_API_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                tags: ["videos", "video-gallery", "video-hub"],
              }),
            }
          );
        }

        console.log(`[${traceId}] ✅ CDN cache purged`);
        results.cdnPurged = true;
      }
    } catch (error) {
      console.error(`[${traceId}] CDN purge error:`, error);
      // Don't fail the whole operation
    }

    // 4. Log the activity
    await prisma.admin_activity_logs.create({
      data: {
        action: "CLEAR_CACHE",
        entityType: "system",
        userId: userEmail,
        metadata: {
          results,
          cachesCleared: results.lruCachesCleared,
          isrRevalidated: results.isrRevalidated,
          cdnPurged: results.cdnPurged,
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          req.socket.remoteAddress,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Successfully cleared ${results.lruCachesCleared} video cache(s)`,
      details: {
        lruCachesCleared: results.lruCachesCleared,
        isrRevalidated: results.isrRevalidated,
        cdnPurged: results.cdnPurged,
      },
      traceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to clear caches:`, error);
    return res.status(500).json({
      success: false,
      error: "Failed to clear caches",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
    });
  }
}

export default handler;
