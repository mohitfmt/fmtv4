import { NextApiRequest, NextApiResponse } from "next";
import { revalidatePath } from "next/cache";

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

function getCanonicalPath(
  url: string,
  currentDomain: string = "dev-v4.freemalaysiatoday.com"
): string {
  try {
    const urlObj = new URL(url);
    // Handle both www and dev-v4 domains
    if (
      urlObj.hostname === "www.freemalaysiatoday.com" ||
      urlObj.hostname === currentDomain
    ) {
      return urlObj.pathname;
    }
    // If it's a relative path or different domain, just return the pathname
    return urlObj.pathname;
  } catch (error) {
    console.error(`Invalid URL: ${url}`, error);
    return url;
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

async function revalidateContent(updates: ContentUpdate[]) {
  const revalidatedPaths = new Set<string>();
  const failedPaths = new Set<string>();

  try {
    console.info(`[Sync] Starting revalidation for ${updates.length} updates`);

    // 1. Revalidate collection pages first as they're most important
    const collectionPaths = [
      ...COLLECTION_PAGES.sections,
      ...COLLECTION_PAGES.special,
    ];

    for (const path of collectionPaths) {
      try {
        await revalidatePath(path);
        revalidatedPaths.add(path);
        console.info(`[Revalidate] Success: Collection page ${path}`);
      } catch (error) {
        console.error(`[Revalidate] Failed: Collection page ${path}`, error);
        failedPaths.add(path);
      }
    }

    // 2. Revalidate individual article paths
    for (const update of updates) {
      const canonicalPath = getCanonicalPath(update.link);

      try {
        await revalidatePath(canonicalPath);
        revalidatedPaths.add(canonicalPath);
        console.info(`[Revalidate] Success: Article at ${canonicalPath}`);
      } catch (error) {
        console.error(
          `[Revalidate] Failed: Article at ${canonicalPath}`,
          error
        );
        failedPaths.add(canonicalPath);
      }
    }

    // 3. Handle Cloudflare cache with proper domain handling
    if (revalidatedPaths.size > 0) {
      try {
        const currentDomain =
          process.env.NEXT_PUBLIC_DOMAIN || "dev-v4.freemalaysiatoday.com";
        const urls = Array.from(revalidatedPaths).map(
          (path) => `https://${currentDomain}${path}`
        );

        await purgeCloudflareCache(urls);
        console.info(
          `[Cache] Successfully purged ${urls.length} URLs from Cloudflare`,
          urls
        );
      } catch (error) {
        console.error("[Cache] Cloudflare purge failed:", error);
      }
    }

    // Log summary
    console.info(
      `[Sync] Revalidation complete. Success: ${revalidatedPaths.size}, Failed: ${failedPaths.size}`
    );
    if (failedPaths.size > 0) {
      console.error("[Sync] Failed paths:", Array.from(failedPaths));
    }

    return {
      success: Array.from(revalidatedPaths),
      failed: Array.from(failedPaths),
    };
  } catch (error) {
    console.error("[Sync] Revalidation process failed:", error);
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
