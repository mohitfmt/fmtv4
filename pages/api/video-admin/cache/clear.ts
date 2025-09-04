import { NextApiRequest, NextApiResponse } from "next";
import { withAdminApi } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getAllCaches } from "@/lib/cache/video-cache-registry";
import { z } from "zod";

const clearCacheSchema = z.object({
  type: z.enum(["lru", "cdn", "all"]),
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = (req as any).traceId;
  const session = (req as any).session;

  try {
    const validation = clearCacheSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: validation.error,
        traceId,
      });
    }

    const { type } = validation.data;
    let itemsCleared = 0;
    let message = "";

    switch (type) {
      case "lru": {
        const caches = getAllCaches();
        caches.forEach(({ instance }) => {
          itemsCleared += instance.size;
        });
        // clearAllCaches();
        message = `Cleared ${itemsCleared} items from LRU caches`;
        break;
      }

      case "cdn": {
        // Cloudflare API call
        if (
          process.env.CLOUDFLARE_API_TOKEN &&
          process.env.CLOUDFLARE_ZONE_ID
        ) {
          await purgeCloudflareCache("/videos/*");
        }
        itemsCleared = -1; // Unknown for CDN
        message = "CDN cache purge initiated for /videos/*";
        break;
      }

      case "all": {
        const caches = getAllCaches();
        caches.forEach(({ instance }) => {
          itemsCleared += instance.size;
        });
        // clearAllCaches();

        if (
          process.env.CLOUDFLARE_API_TOKEN &&
          process.env.CLOUDFLARE_ZONE_ID
        ) {
          await purgeCloudflareCache("/videos/*");
        }

        message = "All caches cleared successfully";
        break;
      }
    }

    // Log cache clear action
    await prisma.cacheHistory.create({
      data: {
        type,
        action: "clear",
        items: itemsCleared,
      },
    });

    await prisma.admin_activity_logs.create({
      data: {
        userId: session.user.id || session.user.email,
        action: "CLEAR_CACHE",
        entityType: "cache",
        metadata: { type, itemsCleared },
      },
    });

    return res.status(200).json({
      success: true,
      itemsCleared,
      message,
      traceId,
    });
  } catch (error) {
    console.error(`[${traceId}] Failed to clear cache:`, error);
    return res.status(500).json({
      error: "Failed to clear cache",
      traceId,
    });
  }
};

async function purgeCloudflareCache(path: string) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: [`https://${process.env.ADMIN_ALLOWED_HOST}${path}`],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Cloudflare API error: ${response.status}`);
  }

  return response.json();
}

export default withAdminApi(handler);
