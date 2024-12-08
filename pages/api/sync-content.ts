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
  ],
};

async function revalidateContent(updates: ContentUpdate[]) {
  const revalidatedPaths = new Set<string>();

  try {
    console.info(`[Sync] Starting revalidation for ${updates.length} updates`);

    // 1. Revalidate individual article pages
    for (const update of updates) {
      try {
        const articlePath = new URL(update.link).pathname;
        await revalidateTag(`article-${update.id}`);
        await revalidatePath(articlePath);
        revalidatedPaths.add(articlePath);
        console.info(
          `[Revalidate] Success: Article ${update.id} at ${articlePath}`
        );
      } catch (error) {
        const articlePath = new URL(update.link).pathname;
        console.error(
          `[Revalidate] Failed: Article ${update.id} ${articlePath}`,
          error
        );
      }
    }

    // 2. Revalidate collection pages
    const collectionPaths = [
      ...COLLECTION_PAGES.sections,
      ...COLLECTION_PAGES.special,
    ];

    for (const path of collectionPaths) {
      try {
        await revalidateTag(`page-${path}`);
        await revalidatePath(path);
        revalidatedPaths.add(path);
        console.info(`[Revalidate] Success: Collection page ${path}`);
      } catch (error) {
        console.error(`[Revalidate] Failed: Collection page ${path}`, error);
      }
    }

    // 3. Handle Cloudflare cache
    if (revalidatedPaths.size > 0) {
      try {
        await purgeCloudflareCache(Array.from(revalidatedPaths));
        console.info(
          `[Cache] Successfully purged ${revalidatedPaths.size} URLs from Cloudflare`,
          revalidatedPaths
        );
      } catch (error) {
        console.error("[Cache] Cloudflare purge failed:", error);
      }
    }

    return revalidatedPaths;
  } catch (error) {
    console.error("[Sync] Revalidation process failed:", error);
    throw error;
  }
}

async function purgeCloudflareCache(paths: string[]) {
  if (!process.env.CLOUDFLARE_ZONE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    console.warn("[Cache] Cloudflare credentials not configured");
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
  } catch (error) {
    console.error("[Cache] Purge request failed:", error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Send immediate acknowledgment
    res.status(200).json({ received: true });

    console.info("[Handler] Received sync request", {
      method: req.method,
      timestamp: new Date().toISOString(),
    });

    // Process the update asynchronously
    if (req.method === "POST") {
      try {
        const payload = req.body as UpdatePayload;
        await revalidateContent(payload.updates);
      } catch (error) {
        console.error("[Handler] Update processing failed:", error);
      }
    }
  } catch (error) {
    console.error("[Handler] Critical error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
