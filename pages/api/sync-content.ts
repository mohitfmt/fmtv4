import { NextApiRequest, NextApiResponse } from "next";
import { revalidateTag, revalidatePath } from "next/cache";

interface ContentUpdate {
  id: string;
  title: string;
  link: string;
  sections: string[];
  categories: string[];
  pubDate: string;
  modifiedDate: string;
}

interface UpdatePayload {
  updates: ContentUpdate[];
  timestamp: string;
}

// Collection pages that need to be revalidated
const COLLECTION_PAGES = {
  sections: [
    "/category/nation",
    "/category/top-bm",
    "/category/business",
    "/category/leisure",
    "/category/opinion",
    "/category/sports",
    "/category/world",
  ],
  special: [
    "/", // Homepage
    // "/latest-news", // Latest news page
    // "/trending", // Trending articles
    // "/most-read", // Most read articles
    // "/editors-picks", // Editor's picks
  ],
};

async function revalidateContent(updates: ContentUpdate[]) {
  const revalidatedPaths = new Set<string>();

  try {
    // 1. Revalidate individual article pages
    for (const update of updates) {
      try {
        const articlePath = new URL(update.link).pathname;
        await revalidateTag(`article-${update.id}`);
        await revalidatePath(articlePath);
        revalidatedPaths.add(articlePath);

        // Log success but don't stop on error
        console.log(`[REVALIDATE] Article: ${update.title}`);
      } catch (error) {
        console.error(
          `[ERROR] Failed to revalidate article ${update.link}:`,
          error
        );
        // Continue with other updates
      }
    }

    // 2. Revalidate all collection pages
    const collectionPaths = [
      ...COLLECTION_PAGES.sections,
      ...COLLECTION_PAGES.special,
    ];

    for (const path of collectionPaths) {
      try {
        await revalidateTag(`page-${path}`);
        await revalidatePath(path);
        revalidatedPaths.add(path);
        console.log(`[REVALIDATE] Collection: ${path}`);
      } catch (error) {
        console.error(
          `[ERROR] Failed to revalidate collection ${path}:`,
          error
        );
        // Continue with other pages
      }
    }

    // 3. Handle Cloudflare cache
    if (revalidatedPaths.size > 0) {
      try {
        // Once we have the APIKEY and ZONEID, we can purge the cache
        await purgeCloudflareCache(Array.from(revalidatedPaths));
      } catch (error) {
        console.error("[ERROR] Cloudflare cache purge failed:", error);
        // Continue execution
      }
    }

    return revalidatedPaths;
  } catch (error) {
    console.error("[ERROR] Revalidation process failed:", error);
    throw error;
  }
}

async function purgeCloudflareCache(paths: string[]) {
  if (!process.env.CLOUDFLARE_ZONE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    console.warn("[WARN] Cloudflare credentials not configured");
    return;
  }

  const urls = paths.map((path) => `https://www.freemalaysiatoday.com${path}`);

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: urls }),
      }
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        `Cloudflare purge failed: ${result.errors?.[0]?.message}`
      );
    }

    console.log(`[CACHE] Purged ${urls.length} URLs from Cloudflare`);
  } catch (error) {
    console.error("[CACHE] Purge failed:", error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Send immediate acknowledgment
  res.status(200).json({ received: true });

  // Process the update asynchronously
  if (req.method === "POST") {
    try {
      const payload = req.body as UpdatePayload;
      console.log(`[SYNC] Processing ${payload.updates.length} updates`);

      await revalidateContent(payload.updates);
      console.log("[SYNC] Update processing completed");
    } catch (error) {
      console.error("[ERROR] Update processing failed:", error);
      // Error is logged but not returned since response is already sent
    }
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
