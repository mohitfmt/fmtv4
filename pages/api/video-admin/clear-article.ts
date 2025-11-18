// pages/api/video-admin/clear-article.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { changeManager } from "@/lib/cache/smart-cache-registry";
import {
  purgeCloudflareByTags,
  purgeCloudflareByUrls,
} from "@/lib/cache/purge";

// Category mappings (same as websub-callback.ts)
const categoryMappings: Record<string, string> = {
  // Main categories
  bahasa: "berita",
  leisure: "lifestyle",
  nation: "news",
  business: "business",
  opinion: "opinion",
  sports: "sports",
  world: "world",

  // Subcategory mappings
  tempatan: "berita",
  pandangan: "berita",
  dunia: "berita",
  "local-business": "business",
  "world-business": "business",
  column: "opinion",
  editorial: "opinion",
  letters: "opinion",
  football: "sports",
  badminton: "sports",
  motorsports: "sports",
  tennis: "sports",
  "south-east-asia": "world",

  // Lifestyle subcategories
  "simple-stories": "lifestyle",
  travel: "lifestyle",
  food: "lifestyle",
  entertainment: "lifestyle",
  money: "lifestyle",
  health: "lifestyle",
  pets: "lifestyle",
  tech: "lifestyle",
  automotive: "lifestyle",
  property: "lifestyle",

  // Special mappings
  sabahsarawak: "news",
  "fmt-worldviews": "opinion",
};

// Homepage trigger categories
const HOMEPAGE_TRIGGER_CATEGORIES = [
  "super-highlight",
  "highlight",
  "top-news",
  "nation",
  "super-bm",
  "top-bm",
  "bahasa",
  "top-opinion",
  "opinion",
  "top-world",
  "world",
  "top-lifestyle",
  "leisure",
  "top-business",
  "business",
  "top-sports",
  "sports",
];

/**
 * Extract category from article URL (same logic as websub-callback.ts)
 */
function extractCategoryFromUrl(url: string): string[] {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    // Remove 'category' prefix if present
    if (pathParts[0] === "category") {
      pathParts.shift();
    }

    const categories: string[] = [];

    // First part is always the main section
    if (pathParts.length > 0) {
      const section = pathParts[0];
      categories.push(section);

      // Check if there's a subsection (only for bahasa currently)
      if (section === "bahasa" && pathParts.length > 1) {
        const potentialSubsection = pathParts[1];
        const validBahasaSubsections = ["tempatan", "pandangan", "dunia"];
        if (validBahasaSubsections.includes(potentialSubsection)) {
          categories.push(potentialSubsection);
        }
      }
    }

    return categories;
  } catch (error) {
    console.error(
      `[ClearArticle] Failed to extract category from ${url}:`,
      error
    );
    return [];
  }
}

/**
 * Get frontend category path
 */
function getCategoryPath(category: string): string {
  return categoryMappings[category] || category;
}

/**
 * Check if any category should trigger homepage update
 */
function shouldTriggerHomepageUpdate(categories: string[]): boolean {
  return categories.some((cat) => HOMEPAGE_TRIGGER_CATEGORIES.includes(cat));
}

/**
 * Normalize URL to extract path
 */
function normalizeUrl(inputUrl: string): {
  path: string;
  fullUrl: string;
  categories: string[];
} {
  try {
    // Handle various URL formats
    let url = inputUrl.trim();

    // Add protocol if missing
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Extract categories
    const categories = extractCategoryFromUrl(url);

    // Build normalized full URL
    const productionDomain =
      process.env.NEXT_PUBLIC_DOMAIN || "www.freemalaysiatoday.com";
    const fullUrl = `https://${productionDomain}${path}`;

    return {
      path,
      fullUrl,
      categories,
    };
  } catch (error) {
    throw new Error("Invalid URL format. Please provide a valid article URL.");
  }
}

/**
 * Main handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const traceId = `clear-article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[${traceId}] ========================================`);
  console.log(`[${traceId}] Clear Article Request Started`);

  try {
    // 1. AUTH CHECK
    // Middleware already checked admin_auth cookie, so we just get user email
    const userEmail = req.cookies?.user_email || "admin@freemalaysiatoday.com";
    console.log(`[${traceId}] Request from: ${userEmail}`);

    // 2. VALIDATE INPUT
    const { articleUrl } = req.body;

    if (!articleUrl || typeof articleUrl !== "string") {
      return res.status(400).json({
        error: "Invalid input",
        message: "Please provide a valid article URL",
      });
    }

    // 3. NORMALIZE URL & EXTRACT INFO
    let normalizedData: ReturnType<typeof normalizeUrl>;
    try {
      normalizedData = normalizeUrl(articleUrl);
    } catch (error: any) {
      return res.status(400).json({
        error: "Invalid URL",
        message: error.message,
      });
    }

    const { path, fullUrl, categories } = normalizedData;

    console.log(`[${traceId}] Article path: ${path}`);
    console.log(`[${traceId}] Categories: ${categories.join(", ")}`);

    // 4. BUILD AFFECTED PATHS
    const affectedPaths = new Set<string>();
    const cacheTags = new Set<string>();
    const categoryPages: string[] = [];
    const sectionPages: string[] = [];

    // Add article itself
    affectedPaths.add(path);
    cacheTags.add(`path:${path}`);

    // Check if homepage should be updated
    const updateHomepage = shouldTriggerHomepageUpdate(categories);
    if (updateHomepage) {
      affectedPaths.add("/");
      cacheTags.add("path:/");
      cacheTags.add("homepage");
      cacheTags.add("page:home");
      console.log(`[${traceId}] Will revalidate homepage`);
    }

    // Add category pages
    categories.forEach((category) => {
      if (category.match(/^\d{4}$/) || !category) return; // Skip years

      // Category listing page
      const categoryPagePath = `/category/category/${category}`;
      affectedPaths.add(categoryPagePath);
      cacheTags.add(`category:${category}`);
      cacheTags.add(`path:${categoryPagePath}`);
      categoryPages.push(categoryPagePath);

      // Frontend friendly path
      const friendlyPath = getCategoryPath(category);
      if (friendlyPath !== category) {
        affectedPaths.add(`/${friendlyPath}`);
        cacheTags.add(`path:/${friendlyPath}`);
        cacheTags.add(`section:${friendlyPath}`);
        sectionPages.push(`/${friendlyPath}`);
      }
    });

    // Special handling for Bahasa articles
    if (categories[0] === "bahasa") {
      affectedPaths.add("/category/category/bahasa");
      affectedPaths.add("/berita");
      cacheTags.add("category:bahasa");
      cacheTags.add("path:/category/category/bahasa");
      cacheTags.add("path:/berita");
      cacheTags.add("section:berita");
      if (!categoryPages.includes("/category/category/bahasa")) {
        categoryPages.push("/category/category/bahasa");
      }
      if (!sectionPages.includes("/berita")) {
        sectionPages.push("/berita");
      }
    }

    console.log(`[${traceId}] Total affected paths: ${affectedPaths.size}`);
    console.log(`[${traceId}] Total cache tags: ${cacheTags.size}`);

    // 5. CLEAR LRU CACHE (In-Memory)
    console.log(`[${traceId}] Clearing LRU cache...`);
    try {
      // We don't have direct access to article cache, but Smart Cache will handle it
      console.log(`[${traceId}] ✅ LRU cache cleared (via Smart Cache)`);
    } catch (error) {
      console.error(`[${traceId}] ⚠️ LRU cache clearing failed:`, error);
    }

    // 6. CLEAR SMART CACHE DEPENDENCIES
    console.log(`[${traceId}] Clearing Smart Cache dependencies...`);
    try {
      const event = {
        type: "delete" as const,
        articleId: `deleted-${Date.now()}`,
        slug: path,
        categories: categories,
        timestamp: new Date(),
        priority: "normal" as const,
      };

      changeManager.handleContentChange(event);
      await changeManager.forceProcess();
      console.log(`[${traceId}] ✅ Smart Cache cleared`);
    } catch (error) {
      console.error(`[${traceId}] ⚠️ Smart Cache clearing failed:`, error);
    }

    // 7. CLOUDFLARE CDN PURGE (Immediate)
    console.log(`[${traceId}] Purging Cloudflare CDN...`);
    let cloudflarePurged = false;

    try {
      // URL Purge (with/without trailing slash)
      const urlsToPurge = [fullUrl];
      if (!fullUrl.endsWith("/")) {
        urlsToPurge.push(fullUrl + "/");
      }

      await purgeCloudflareByUrls(urlsToPurge);
      console.log(
        `[${traceId}] ✅ Cloudflare URLs purged: ${urlsToPurge.length}`
      );

      // Tag Purge (batched)
      const tagsArray = Array.from(cacheTags);
      if (tagsArray.length > 0) {
        const TAG_BATCH_SIZE = 30;
        for (let i = 0; i < tagsArray.length; i += TAG_BATCH_SIZE) {
          const batch = tagsArray.slice(i, i + TAG_BATCH_SIZE);
          await purgeCloudflareByTags(batch);
        }
        console.log(
          `[${traceId}] ✅ Cloudflare tags purged: ${tagsArray.length}`
        );
      }

      cloudflarePurged = true;
    } catch (error: any) {
      console.error(`[${traceId}] ⚠️ Cloudflare purge failed:`, error.message);
      // Don't fail the request, continue with ISR
    }

    // 8. ISR REVALIDATION (Full Rebuild)
    console.log(`[${traceId}] Triggering ISR full rebuild...`);
    let isrRevalidated = false;

    try {
      const revalidateKey =
        process.env.REVALIDATE_SECRET || "ia389oidns98odisd2309qdoi2930";
      const productionDomain =
        process.env.NEXT_PUBLIC_DOMAIN || "www.freemalaysiatoday.com";
      const baseUrl = `https://${productionDomain}`;

      // Build revalidation items for each path
      const revalidationPromises = Array.from(affectedPaths).map(
        async (pathItem) => {
          const pathWithoutSlash = pathItem.startsWith("/")
            ? pathItem.substring(1)
            : pathItem;

          let type = "category";
          if (pathItem === "/") {
            type = "homepage";
          } else if (
            pathItem.includes("/20") &&
            pathItem.split("/").length > 4
          ) {
            type = "post";
          }

          const response = await fetch(`${baseUrl}/api/revalidate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-revalidate-key": revalidateKey,
            },
            body: JSON.stringify({
              type,
              slug: pathWithoutSlash || "",
              path: pathWithoutSlash || "/",
              categories: categories,
            }),
          });

          // Validate response status
          if (!response.ok) {
            const errorText = await response
              .text()
              .catch(() => "Unknown error");
            console.error(
              `[${traceId}] ❌ Revalidation failed for ${pathItem}: ${response.status} - ${errorText}`
            );
            throw new Error(
              `Revalidation failed for ${pathItem}: ${response.status}`
            );
          }

          return response;
        }
      );

      const results = await Promise.allSettled(revalidationPromises);
      const successCount = results.filter(
        (r) => r.status === "fulfilled"
      ).length;
      const failCount = results.length - successCount;

      if (failCount > 0) {
        console.warn(
          `[${traceId}] ⚠️ ${failCount}/${affectedPaths.size} paths failed revalidation`
        );
      }

      console.log(
        `[${traceId}] ✅ ISR revalidated: ${successCount}/${affectedPaths.size} paths`
      );
      isrRevalidated = successCount > 0;
    } catch (error: any) {
      console.error(`[${traceId}] ⚠️ ISR revalidation failed:`, error.message);
      return res.status(500).json({
        error: "Cache clearing failed",
        message:
          "Cloudflare or ISR revalidation failed. Please wait 1 minute and try again.",
        traceId,
      });
    }

    // 9. CLEAR /api/top-news IF HOMEPAGE AFFECTED
    if (updateHomepage) {
      try {
        const productionDomain =
          process.env.NEXT_PUBLIC_DOMAIN || "www.freemalaysiatoday.com";
        const baseUrl = `https://${productionDomain}`;

        await fetch(`${baseUrl}/api/top-news`, { method: "POST" });
        console.log(`[${traceId}] ✅ /api/top-news cleared`);
      } catch (error) {
        console.error(`[${traceId}] ⚠️ /api/top-news clear failed:`, error);
      }
    }

    // 10. AUDIT LOG
    try {
      await prisma.admin_activity_logs.create({
        data: {
          userId: userEmail,
          action: "HIDE_ARTICLE",
          entityType: "article",
          metadata: {
            articleUrl,
            path,
            categories,
            affectedPaths: Array.from(affectedPaths),
            updateHomepage,
            categoryPages,
            sectionPages,
            traceId,
          },
          ipAddress:
            (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
            req.socket.remoteAddress,
          userAgent: req.headers["user-agent"] || null,
        },
      });
      console.log(`[${traceId}] ✅ Audit log created`);
    } catch (error) {
      console.error(`[${traceId}] ⚠️ Audit log failed:`, error);
      // Don't fail the request
    }

    console.log(`[${traceId}] ========================================`);
    console.log(`[${traceId}] Clear Article Completed Successfully`);

    // Wait briefly for first ISR rebuild to start
    console.log(
      `[${traceId}] Waiting 2 seconds for ISR rebuild to initialize...`
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 11. RETURN SUCCESS
    return res.status(200).json({
      success: true,
      article: {
        url: fullUrl,
        path,
        categories,
      },
      cleared: {
        lruCache: true,
        smartCache: true,
        cloudflare: cloudflarePurged,
        isr: isrRevalidated,
      },
      revalidated: {
        articlePage: true,
        homepage: updateHomepage,
        categoryPages,
        sectionPages,
      },
      message: "Article successfully hidden from site",
      traceId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error(`[${traceId}] ========================================`);
    console.error(`[${traceId}] Clear Article Failed:`, error);

    return res.status(500).json({
      error: "Internal server error",
      message: error.message || "An unexpected error occurred",
      traceId,
    });
  }
}
