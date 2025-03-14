import { addMinutes } from "date-fns";
import { NextApiRequest, NextApiResponse } from "next";
import { mutate } from "swr";

// Define types for WordPress API responses
interface WPPost {
  id: number;
  date: string;
  modified: string;
  link: string;
  slug: string;
  title: { rendered: string };
  categories: number[];
}

// Category mapping for frontend routes
const categoryMappings: Record<string, string> = {
  bahasa: "berita",
  leisure: "lifestyle",
  nation: "news",
  business: "business",
  opinion: "opinion",
  sports: "sports",
  world: "world",
};

/**
 * Transforms WordPress URLs to the frontend domain
 */
function transformUrl(url: string, targetDomain: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.hostname = targetDomain;
    return urlObj.toString();
  } catch (error) {
    console.error(`Failed to transform URL ${url}:`, error);
    return url;
  }
}

/**
 * Extract category from article URL
 * Handles both standard and bahasa subcategory URLs
 */
function extractCategoryFromUrl(url: string): string[] {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    // Handle normal category structure: /category/categoryName/...
    if (pathParts.length >= 2 && pathParts[0] === "category") {
      const category = pathParts[1];

      // Special case for bahasa (has subcategories)
      if (category === "bahasa" && pathParts.length >= 3) {
        return ["bahasa", pathParts[2]]; // Return both bahasa and its subcategory
      }

      return [category];
    }

    return [];
  } catch (error) {
    console.error(`Failed to extract category from ${url}:`, error);
    return [];
  }
}

/**
 * Get frontend category path from WordPress category
 */
function getCategoryPath(category: string): string {
  return categoryMappings[category] || "news";
}

/**
 * Get recently modified articles from WordPress
 */
async function getRecentlyModifiedArticles(
  wpDomain: string
): Promise<WPPost[]> {
  try {
    // Get posts modified in the last 10 minutes
    const now = new Date();
    const tenMinsAgo = addMinutes(now, -10);
    const modifiedAfter = tenMinsAgo.toISOString();

    console.log(`[WebSub] Fetching posts modified after ${modifiedAfter}`);

    const response = await fetch(
      `${wpDomain}/wp-json/wp/v2/posts?modified_after=${modifiedAfter}&per_page=50`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "WebSub-Subscriber/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `WordPress API returned ${response.status}: ${response.statusText}`
      );
    }

    const posts: WPPost[] = await response.json();
    console.log(`[WebSub] Found ${posts.length} recently modified posts`);

    return posts;
  } catch (error) {
    console.error("[WebSub] Error fetching modified articles:", error);
    return [];
  }
}

/**
 * Purge Cloudflare cache for a set of URLs
 */
async function purgeCloudflareCache(urls: string[]): Promise<boolean> {
  if (!process.env.CLOUDFLARE_ZONE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    console.warn("[Cache] Cloudflare credentials not configured");
    return false;
  }

  if (urls.length === 0) {
    console.log("[Cache] No URLs to purge");
    return true;
  }

  try {
    console.log(`[Cache] Purging ${urls.length} URLs from Cloudflare`);

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

    console.log(
      `[Cache] Successfully purged ${urls.length} URLs from Cloudflare`
    );
    return true;
  } catch (error) {
    console.error("[Cache] Purge request failed:", error);
    return false;
  }
}

/**
 * Simplified revalidation process - processes all items at once
 * with a reasonable concurrency limit
 */
async function processRevalidation(
  baseUrl: string,
  items: { path: string; type: string }[],
  revalidateKey: string
): Promise<void> {
  if (items.length === 0) return;

  console.log(`[WebSub] Revalidating ${items.length} items`);

  // Process all items in parallel, but with reasonable concurrency
  // This is a simplified approach that still provides some protection against
  // overwhelming the server with too many simultaneous requests
  const maxConcurrency = 20; // Maximum number of concurrent requests

  // Sort items to prioritize category pages before individual posts
  const sortedItems = [...items].sort((a, b) => {
    if (a.type === "category" && b.type !== "category") return -1;
    if (a.type !== "category" && b.type === "category") return 1;
    return 0;
  });

  const pendingPromises: Promise<any>[] = [];

  for (const item of sortedItems) {
    // Create the revalidation promise
    const revalidationPromise = fetch(`${baseUrl}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-key": revalidateKey,
      },
      body: JSON.stringify({
        type: item.type,
        [item.type === "post" ? "postSlug" : "path"]: item.path,
      }),
    }).catch((error) => {
      console.error(
        `[WebSub] Error revalidating ${item.type} ${item.path}:`,
        error
      );
    });

    pendingPromises.push(revalidationPromise);

    // If we've reached max concurrency, wait for one to complete
    if (pendingPromises.length >= maxConcurrency) {
      await Promise.race(pendingPromises);
      // Remove completed promises
      const completedIndex = await Promise.all(
        pendingPromises.map(async (p, index) => {
          const settled = await Promise.race([
            p.then(() => true),
            Promise.resolve(false),
          ]);
          return settled ? index : -1;
        })
      ).then((indexes) => indexes.find((i) => i !== -1) || -1);

      if (completedIndex >= 0) {
        pendingPromises.splice(completedIndex, 1);
      }
    }
  }

  // Wait for any remaining promises to complete
  if (pendingPromises.length > 0) {
    await Promise.all(pendingPromises);
  }
}

/**
 * Process different article types and generate URLs to purge
 */
function processArticles(
  articles: WPPost[],
  frontendDomain: string
): {
  newArticleUrls: string[];
  updatedArticleUrls: string[];
  categoryPaths: Set<string>;
  revalidationItems: { path: string; type: string }[];
} {
  // Separate new vs updated articles
  const newArticles = articles.filter(
    (post) =>
      new Date(post.date).getTime() === new Date(post.modified).getTime()
  );

  const updatedArticles = articles.filter(
    (post) =>
      new Date(post.date).getTime() !== new Date(post.modified).getTime()
  );

  console.log(
    `[WebSub] Processing ${newArticles.length} new articles and ${updatedArticles.length} updated articles`
  );

  // Transform URLs to frontend domain
  const newArticleUrls = newArticles.map((post) =>
    transformUrl(post.link, frontendDomain)
  );

  const updatedArticleUrls = updatedArticles.map((post) =>
    transformUrl(post.link, frontendDomain)
  );

  // Collect categories for all articles
  const categoryPaths = new Set<string>();
  categoryPaths.add("/"); // Always include homepage

  // Items for revalidation
  const revalidationItems: { path: string; type: string }[] = [];

  // Process each article for revalidation
  [...newArticles, ...updatedArticles].forEach((post) => {
    const categories = extractCategoryFromUrl(post.link);

    categories.forEach((category) => {
      const frontendPath = `/${getCategoryPath(category)}`;
      categoryPaths.add(frontendPath);

      // Add category to revalidation items (only once per unique path)
      if (
        !revalidationItems.some(
          (item) => item.type === "category" && item.path === frontendPath
        )
      ) {
        revalidationItems.push({
          type: "category",
          path: frontendPath,
        });
      }
    });

    // Extract path parts for article revalidation
    const urlObj = new URL(post.link);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    // Handle both standard and bahasa URLs
    if (pathParts.length >= 5 && pathParts[0] === "category") {
      let articlePath = "";

      // Handle bahasa with subcategory
      if (pathParts[1] === "bahasa" && pathParts.length >= 6) {
        // Format: /category/bahasa/subcategory/year/month/day/slug
        articlePath = `${pathParts[1]}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/${pathParts[5]}/${pathParts.slice(6).join("/")}`;
      } else {
        // Format: /category/categoryName/year/month/day/slug
        articlePath = `${pathParts[1]}/${pathParts[2]}/${pathParts[3]}/${pathParts[4]}/${pathParts.slice(5).join("/")}`;
      }

      // Only revalidate if it's an updated article (not new)
      if (updatedArticles.some((a) => a.id === post.id)) {
        revalidationItems.push({
          type: "post",
          path: articlePath,
        });
      }
    }
  });

  // Add homepage revalidation (just once)
  revalidationItems.push({
    type: "category",
    path: "/",
  });

  return {
    newArticleUrls,
    updatedArticleUrls,
    categoryPaths,
    revalidationItems,
  };
}

/**
 * Main handler function
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle WebSub subscription verification
  if (req.method === "GET") {
    const { "hub.mode": mode, "hub.challenge": challenge } = req.query;

    if (mode === "subscribe" && challenge) {
      console.log("[WebSub] Subscription verified");
      return res.status(200).send(challenge);
    }

    return res.status(400).json({ error: "Invalid verification request" });
  }

  // Handle content notifications
  if (req.method === "POST") {
    try {
      console.log("[WebSub] Received content update notification");
      console.log(
        "[WebSub] Content-Type:",
        req.headers["content-type"],
        req.headers.host
      );

      // Get current domains
      const wpDomain =
        process.env.NEXT_PUBLIC_CMS_URL || "https://cms.freemalaysiatoday.com";
      const frontendDomain =
        process.env.NEXT_PUBLIC_DOMAIN || "dev-v4.freemalaysiatoday.com";

      // Get revalidate key
      const revalidateKey =
        process.env.REVALIDATE_SECRET_KEY || "default-secret";

      // Set up base URL for API calls
      const protocol = "https";
      const host = req.headers.host || frontendDomain;
      const baseUrl = `${protocol}://${host}`;

      // Get recently modified articles directly from WordPress API
      const modifiedArticles = await getRecentlyModifiedArticles(wpDomain);

      if (modifiedArticles.length === 0) {
        console.log("[WebSub] No recently modified articles found");
        return res.status(200).json({
          success: true,
          message: "No content changes detected",
        });
      }

      // Process articles to get URLs to purge and paths to revalidate
      const {
        newArticleUrls,
        updatedArticleUrls,
        categoryPaths,
        revalidationItems,
      } = processArticles(modifiedArticles, frontendDomain);

      console.log(
        `[WebSub] Found ${newArticleUrls.length} new articles, ${updatedArticleUrls.length} updated articles`
      );
      console.log(
        `[WebSub] Found ${categoryPaths.size} category paths to purge`
      );

      // Purge Cloudflare cache for updated article URLs
      if (updatedArticleUrls.length > 0) {
        await purgeCloudflareCache(updatedArticleUrls);
      }

      // Purge category pages and homepage for both new and updated articles
      const categoryUrls = Array.from(categoryPaths).map(
        (path) => `https://${frontendDomain}${path}`
      );

      if (categoryUrls.length > 0) {
        await purgeCloudflareCache(categoryUrls);
      }

      // Process revalidation with simplified approach
      await processRevalidation(baseUrl, revalidationItems, revalidateKey);

      // Revalidate API endpoints for fresh data
      try {
        await fetch(`${baseUrl}/api/top-news`, { method: "POST" });
        await fetch(`${baseUrl}/api/last-update`, { method: "POST" });
        mutate("/api/top-news");
        mutate("/api/last-update");
        console.log(`[WebSub] API endpoints revalidated`);
      } catch (error) {
        console.error(`[WebSub] Error revalidating API endpoints:`, error);
      }

      return res.status(200).json({
        success: true,
        message: "Content updated successfully",
        stats: {
          newArticles: newArticleUrls.length,
          updatedArticles: updatedArticleUrls.length,
          categoryPaths: categoryPaths.size,
          revalidationItems: revalidationItems.length,
        },
      });
    } catch (error) {
      console.error("[WebSub] Error:", error);
      return res.status(500).json({
        error: "Process failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
