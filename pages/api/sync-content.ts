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

function getCanonicalPath(url: string): string {
  try {
    const currentDomain =
      process.env.NEXT_PUBLIC_DOMAIN || "dev-v4.freemalaysiatoday.com";
    const productionDomain = "www.freemalaysiatoday.com";

    const urlObj = new URL(url);
    // Handle both production and development domains
    if (
      urlObj.hostname === productionDomain ||
      urlObj.hostname === currentDomain
    ) {
      return urlObj.pathname;
    }
    return urlObj.pathname;
  } catch (error) {
    console.error(`[URL] Invalid URL: ${url}`, error);
    return url;
  }
}

async function purgeCloudflareCache(paths: string[]) {
  if (!process.env.CLOUDFLARE_ZONE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    console.warn("[Cache] Cloudflare credentials not configured");
    return;
  }

  const currentDomain =
    process.env.NEXT_PUBLIC_DOMAIN || "dev-v4.freemalaysiatoday.com";
  const urls = paths.map((path) => `https://${currentDomain}${path}`);

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
    console.log(`[Cache] Purged ${urls.length} URLs from Cloudflare`);
  } catch (error) {
    console.error("[Cache] Purge request failed:", error);
  }
}

async function revalidateCollectionPages(sectionsToUpdate: string[] = []) {
  const revalidatedPaths = new Set<string>();
  const failedPaths = new Set<string>();

  try {
    // Always revalidate homepage
    try {
      await revalidatePath("/");
      await revalidateTag("home-page");
      revalidatedPaths.add("/");
      console.log("[Revalidate] Homepage successful");
    } catch (error) {
      console.error("[Revalidate] Homepage failed:", error);
      failedPaths.add("/");
    }

    // Only revalidate affected section pages
    for (const section of sectionsToUpdate) {
      const sectionPath = `/category/${section}`;
      if (COLLECTION_PAGES.sections.includes(sectionPath)) {
        try {
          await revalidatePath(sectionPath);
          revalidatedPaths.add(sectionPath);
          console.log(`[Revalidate] Section successful: ${sectionPath}`);
        } catch (error) {
          console.error(`[Revalidate] Section failed: ${sectionPath}`, error);
          failedPaths.add(sectionPath);
        }
      }
    }

    return {
      success: Array.from(revalidatedPaths),
      failed: Array.from(failedPaths),
    };
  } catch (error) {
    console.error("[Revalidate] Collection pages failed:", error);
    return {
      success: Array.from(revalidatedPaths),
      failed: Array.from(failedPaths),
    };
  }
}

async function revalidateContent(updates: ContentUpdate[]) {
  console.log(`[Sync] Processing ${updates.length} updates`);
  const revalidatedPaths = new Set<string>();
  const failedPaths = new Set<string>();

  try {
    // Extract affected sections
    const sectionsToUpdate = new Set(
      updates
        .map((update) => {
          const match = update.link.match(/\/category\/([^/]+)\//);
          return match ? match[1] : null;
        })
        .filter(Boolean)
    );

    // First revalidate collection pages
    const collectionResults = await revalidateCollectionPages(
      Array.from(sectionsToUpdate).filter(
        (section): section is string => section !== null
      )
    );
    collectionResults.success.forEach((path) => revalidatedPaths.add(path));
    collectionResults.failed.forEach((path) => failedPaths.add(path));

    // Then handle individual articles
    for (const update of updates) {
      // Skip ?p= URLs
      if (update.link.includes("/?p=")) {
        console.log(`[Skip] Ignoring ?p= URL: ${update.link}`);
        continue;
      }

      const canonicalPath = getCanonicalPath(update.link);
      try {
        await revalidatePath(canonicalPath);
        revalidatedPaths.add(canonicalPath);
        console.log(`[Revalidate] Article successful: ${canonicalPath}`);
      } catch (error) {
        console.error(`[Revalidate] Article failed: ${canonicalPath}`, error);
        failedPaths.add(canonicalPath);
      }
    }

    // Purge Cloudflare cache for successful revalidations
    if (revalidatedPaths.size > 0) {
      await purgeCloudflareCache(Array.from(revalidatedPaths));
    }

    return {
      revalidated: Array.from(revalidatedPaths),
      failed: Array.from(failedPaths),
    };
  } catch (error) {
    console.error("[Sync] Revalidation process failed:", error);
    return {
      revalidated: Array.from(revalidatedPaths),
      failed: Array.from(failedPaths),
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
      const result = await revalidateContent(payload.updates);

      console.info("[Sync] Complete", {
        revalidated: result.revalidated.length,
        failed: result.failed.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Sync] Failed:", error);
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
