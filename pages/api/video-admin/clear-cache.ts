// pages/api/video-admin/clear-cache.ts
// ENHANCED: Now uses BLOCKING cache clear operations
// Returns success only when caches are actually cleared

import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { clearVideoCache } from "@/lib/cache-utils";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = `CLEAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const userEmail = req.cookies?.user_email || "admin@freemalaysiatoday.com";

  console.log(`[${traceId}] ========================================`);
  console.log(`[${traceId}] Clear Video Caches (BLOCKING)`);
  console.log(`[${traceId}] User: ${userEmail}`);

  try {
    // Use blocking cache clear utility
    const result = await clearVideoCache();

    console.log(
      `[${traceId}] Cache clear completed in ${result.totalDuration}ms`
    );
    console.log(`[${traceId}] LRU cleared: ${result.lruCleared}`);
    console.log(
      `[${traceId}] Cloudflare purged: ${result.cloudflarePurged} (${result.cloudflareUrls.length} URLs)`
    );
    console.log(
      `[${traceId}] ISR revalidated: ${result.isrRevalidated} (${result.isrPaths.length} paths)`
    );

    if (result.errors.length > 0) {
      console.warn(`[${traceId}] Errors encountered:`, result.errors);
    }

    // Log activity
    await prisma.admin_activity_logs.create({
      data: {
        action: "CACHE_CLEAR",
        entityType: "video",
        userId: userEmail,
        metadata: {
          lruCleared: result.lruCleared,
          cloudflarePurged: result.cloudflarePurged,
          isrRevalidated: result.isrRevalidated,
          duration: result.totalDuration,
          errors: result.errors,
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          req.socket.remoteAddress ||
          null,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    console.log(`[${traceId}] ========================================`);

    const allSuccess =
      result.lruCleared && result.cloudflarePurged && result.isrRevalidated;

    return res.status(200).json({
      success: allSuccess,
      message: allSuccess
        ? "All video caches cleared successfully"
        : "Cache clear completed with some errors",
      details: {
        lruCachesCleared: result.lruCleared ? 5 : 0, // playlistCache, videoDataCache, galleryCache, configCache, homepageCache
        isrRevalidated: result.isrRevalidated,
        cdnPurged: result.cloudflarePurged,
        duration: result.totalDuration,
        errors: result.errors,
      },
      traceId,
    });
  } catch (error: any) {
    console.error(`[${traceId}] Fatal error:`, error);

    return res.status(500).json({
      success: false,
      message: `Cache clear failed: ${error.message}`,
      details: {
        lruCachesCleared: 0,
        isrRevalidated: false,
        cdnPurged: false,
        duration: 0,
        errors: [error.message],
      },
      traceId,
    });
  }
}

export default handler;
