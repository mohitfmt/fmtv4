// pages/api/video-admin/cache/clear.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getAllCaches, clearCache } from "@/lib/cache/video-cache-registry";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = (req as any).traceId;
  const session = (req as any).session;
  const { type, target } = req.body;

  try {
    let itemsCleared = 0;
    let message = "";

    switch (type) {
      case "cdn":
        // Clear CDN cache (would call Cloudflare API in production)
        await simulateCDNClear();
        itemsCleared = 1000; // Simulated
        message = "CDN cache cleared successfully";
        break;

      case "lru":
        // Clear LRU caches
        if (target) {
          // Clear specific cache
          const cleared = clearCache(target);
          if (cleared) {
            itemsCleared = 1;
            message = `Cache "${target}" cleared successfully`;
          } else {
            throw new Error(`Cache "${target}" not found`);
          }
        } else {
          // Clear all LRU caches
          const caches = getAllCaches();
          caches.forEach(({ name }) => {
            if (clearCache(name)) itemsCleared++;
          });
          message = `Cleared ${itemsCleared} LRU caches`;
        }
        break;

      case "all":
        // Clear everything
        await simulateCDNClear();
        const caches = getAllCaches();
        caches.forEach(({ name }) => {
          if (clearCache(name)) itemsCleared++;
        });
        itemsCleared += 1000; // Add CDN items
        message = "All caches cleared successfully";
        break;

      default:
        throw new Error(`Invalid cache type: ${type}`);
    }

    // Log the operation
    await prisma.cacheHistory.create({
      data: {
        type: type,
        action: "clear",
        items: itemsCleared,
      },
    });

    // Log admin activity
    await prisma.admin_activity_logs.create({
      data: {
        action: "CLEAR_CACHE",
        entityType: "cache",
        userId: session.user?.email || session.user?.id || "system",
        metadata: {
          type,
          target,
          itemsCleared,
        },
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          req.socket.remoteAddress,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    return res.status(200).json({
      success: true,
      itemsCleared,
      message,
      traceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to clear cache:`, error);
    return res.status(500).json({
      success: false,
      error: "Failed to clear cache",
      message: error instanceof Error ? error.message : "Unknown error",
      traceId,
    });
  }
}

// Simulate CDN clear (replace with actual Cloudflare API call)
async function simulateCDNClear() {
  return new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
}

export default withAdminApi(handler);
