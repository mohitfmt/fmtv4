// pages/api/video-admin/clear-cache.ts
// CLEAR ALL VIDEO CACHES - Admin utility endpoint

import { NextApiRequest, NextApiResponse } from "next";
import {
  playlistCache,
  videoDataCache,
  galleryCache,
  configCache,
} from "@/lib/cache/video-cache-registry";
import { prisma } from "@/lib/prisma";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = (req as any).traceId || `CLEAR-${Date.now()}`;
  const userEmail = req.cookies?.user_email || "admin@freemalaysiatoday.com";

  console.log(`[${traceId}] Starting cache clear operation`);

  try {
    // Clear all video-related caches
    const caches = [
      { name: "playlistCache", cache: playlistCache },
      { name: "videoDataCache", cache: videoDataCache },
      { name: "galleryCache", cache: galleryCache },
      { name: "configCache", cache: configCache },
    ];

    let clearedCount = 0;

    for (const { name, cache } of caches) {
      try {
        cache.clear();
        clearedCount++;
        console.log(`[${traceId}] Cleared ${name}`);
      } catch (error) {
        console.error(`[${traceId}] Failed to clear ${name}:`, error);
      }
    }

    // Log the activity
    await prisma.admin_activity_logs.create({
      data: {
        action: "CLEAR_CACHE",
        entityType: "cache",
        userId: userEmail,
        metadata: {
          cachesCleared: clearedCount,
          caches: caches.map((c) => c.name),
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          req.socket.remoteAddress,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    console.log(
      `[${traceId}] Successfully cleared ${clearedCount}/${caches.length} caches`
    );

    return res.status(200).json({
      success: true,
      message: `Successfully cleared ${clearedCount} video cache(s)`,
      clearedCaches: caches.map((c) => c.name),
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
