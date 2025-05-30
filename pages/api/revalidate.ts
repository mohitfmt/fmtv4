// pages/api/revalidate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { aboutPageCache } from "@/lib/gql-queries/get-about-page";
import { getPostData, playlistCache } from "@/lib/api";
import { purgeCloudflareByTags } from "@/lib/cache/purge";
import { extractCategoriesFromSlug } from "@/lib/navigation-cache";
import { changeManager } from "@/lib/cache/smart-cache-registry";

const SECTION_PATH_MAP: Record<string, string> = {
  nation: "news",
  bahasa: "berita",
  business: "business",
  opinion: "opinion",
  world: "world",
  sports: "sports",
  leisure: "lifestyle",
};

// Navigation structure for path generation
const navigationPaths: Record<string, string[]> = {
  news: [
    "/news",
    "/category/category/nation",
    "/category/category/nation/sabahsarawak",
  ],
  berita: [
    "/berita",
    "/category/category/bahasa/tempatan",
    "/category/category/bahasa/pandangan",
    "/category/category/bahasa/dunia",
  ],
  business: [
    "/business",
    "/category/category/business/local-business",
    "/category/category/business/world-business",
  ],
  lifestyle: [
    "/lifestyle",
    "/category/category/leisure/simple-stories",
    "/category/category/leisure/travel",
    "/category/category/leisure/food",
    "/category/category/leisure/entertainment",
    "/category/category/leisure/money",
    "/category/category/leisure/health",
    "/category/category/leisure/pets",
    "/category/category/leisure/tech",
    "/category/category/leisure/automotive",
    "/category/category/leisure/property",
  ],
  opinion: [
    "/opinion",
    "/category/category/opinion/column",
    "/category/category/opinion/editorial",
    "/category/category/opinion/letters",
    "/category/category/fmt-worldviews",
  ],
  world: ["/world", "/category/category/south-east-asia"],
  sports: [
    "/sports",
    "/category/category/sports/football",
    "/category/category/sports/badminton",
    "/category/category/sports/motorsports",
    "/category/category/sports/tennis",
  ],
  property: ["/category/category/leisure/property"],
  education: ["/category/category/education"],
  photos: ["/photos"],
  videos: ["/videos"],
  accelerator: ["/accelerator"],
};

function resolveSectionPath(slug: string): string {
  return SECTION_PATH_MAP[slug] || slug;
}

function extractSectionFromSlug(slug: string): string | null {
  const extracted = extractCategoriesFromSlug(slug);
  if (!extracted.category) return null;

  // Use the category and resolve it through the section map
  return resolveSectionPath(extracted.category);
}

function normalizeSlugPath(path?: string): string | undefined {
  return path
    ?.replace(/^\/+/g, "")
    .replace(/^(category\/)+/g, "")
    .replace(/^\/+|\/+$/g, "");
}

// Helper to get all related paths for a category
function getRelatedPaths(category: string): string[] {
  const paths = new Set<string>();

  // Always include homepage
  paths.add("/");

  // Add direct category paths
  const sectionPath = resolveSectionPath(category);
  if (navigationPaths[sectionPath]) {
    navigationPaths[sectionPath].forEach((path: any) => paths.add(path));
  }

  // Add the category itself
  paths.add(`/${sectionPath}`);
  paths.add(`/category/category/${category}`);

  // Check if this category is a subcategory
  Object.entries(navigationPaths).forEach(([parent, childPaths]) => {
    childPaths.forEach((childPath) => {
      if (childPath.includes(category)) {
        paths.add(`/${parent}`);
        paths.add(childPath);
      }
    });
  });

  return Array.from(paths);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { type, slug: rawSlug, path, postSlug, id, retryCount = 0 } = req.body;
  const slug = rawSlug || postSlug || normalizeSlugPath(path);

  if (!type || (!slug && slug !== "" && !id)) {
    console.error("[Revalidate] Validation Error", { type, slug, id });
    return res.status(400).json({ message: "Missing required parameters" });
  }

  const tagsToPurge: string[] = [];
  const pathsToRevalidate = new Set<string>();
  let smartCacheInvalidated = false;

  try {
    switch (type) {
      case "about": {
        aboutPageCache.delete("page:about");
        pathsToRevalidate.add("/about");
        tagsToPurge.push("path:/about", "page:about");
        break;
      }

      case "article":
      case "post": {
        try {
          // Clean the slug - remove any leading/trailing slashes
          const cleanSlug = slug.replace(/^\/+|\/+$/g, "");

          // For the API call, we need just the path after /category/
          // If slug is "/category/business/2025/05/29/article", extract "business/2025/05/29/article"
          const slugForApi = cleanSlug.replace(/^category\//, "");

          console.log(`[Revalidate] Processing article:`, {
            originalSlug: slug,
            cleanSlug: cleanSlug,
            slugForApi: slugForApi,
          });

          const postData = await getPostData(slugForApi);
          if (postData?.post?.databaseId) {
            // Create content change event
            const extractedCategories = extractCategoriesFromSlug(slugForApi);
            const categoriesArray = [
              extractedCategories.category,
              extractedCategories.subcategory,
            ].filter(Boolean);

            const event = {
              type: "update" as const,
              articleId: postData.post.databaseId.toString(),
              slug: slugForApi,
              categories: categoriesArray,
              timestamp: new Date(),
              priority: "normal" as const,
            };

            // Trigger smart invalidation
            changeManager.handleContentChange(event as any);
            smartCacheInvalidated = true;

            // Wait a bit for cache invalidation to process
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Get all affected paths from the change manager
            const affectedPaths = changeManager.getAffectedPaths();
            affectedPaths.forEach((path) => pathsToRevalidate.add(path));

            // Also add category-specific paths
            const categories =
              postData.post.categories?.edges?.map(
                (edge: any) => edge.node.slug
              ) || [];

            categories.forEach((cat: string) => {
              getRelatedPaths(cat).forEach((path) =>
                pathsToRevalidate.add(path)
              );
            });

            console.log(
              `[Revalidate] Smart invalidation for article ${postData.post.databaseId} - ${pathsToRevalidate.size} paths affected`
            );
          }
        } catch (e) {
          console.log(
            `[Revalidate] Could not fetch article ID for ${slug}, continuing with path revalidation`
          );
        }

        // For the actual revalidation path:
        // If the slug already starts with "category/", just add leading slash
        // Otherwise, add "/category/" prefix
        let articlePath: string;

        if (slug.startsWith("category/") || slug.startsWith("/category/")) {
          // Already has category prefix, just ensure single leading slash
          articlePath = "/" + slug.replace(/^\/+/, "");
        } else {
          // Need to add category prefix
          articlePath = "/category/" + slug.replace(/^\/+/, "");
        }

        // Clean up any double slashes and remove trailing slash
        articlePath = articlePath.replace(/\/+/g, "/").replace(/\/$/, "");

        console.log(
          `[Revalidate] Adding article path for revalidation: ${articlePath}`
        );
        pathsToRevalidate.add(articlePath);

        // For cache tags, use the slug without /category/ prefix and without slashes
        const slugForTags = slug
          .replace(/^\/?(category\/)?/, "")
          .replace(/\/$/, "");

        tagsToPurge.push(
          `post:${slugForTags}`,
          `related:${slugForTags}`,
          `path:${articlePath}`
        );

        // Add section paths
        const section = extractSectionFromSlug(slugForTags);
        if (section) {
          getRelatedPaths(section).forEach((path) =>
            pathsToRevalidate.add(path)
          );
          tagsToPurge.push(`path:/${section}`, `section:${section}`);
        }

        // Always revalidate homepage
        pathsToRevalidate.add("/");
        tagsToPurge.push("path:/", "page:home");

        console.log(`[Revalidate] Article processing complete:`, {
          articlePath,
          totalPaths: pathsToRevalidate.size,
          tags: tagsToPurge.length,
        });

        break;
      }

      case "author": {
        const event = {
          type: "update" as const,
          articleId: `author-${id || slug}`,
          slug: `author/${slug}`,
          categories: ["author"],
          timestamp: new Date(),
          priority: "normal" as const,
        };

        changeManager.handleContentChange(event);
        smartCacheInvalidated = true;

        pathsToRevalidate.add(`/category/author/${slug}`);
        pathsToRevalidate.add("/");
        tagsToPurge.push(
          `author:${slug}`,
          `path:/category/author/${slug}`,
          "path:/"
        );
        break;
      }

      case "tag": {
        const event = {
          type: "update" as const,
          articleId: `tag-${id || slug}`,
          slug: `tag/${slug}`,
          categories: ["tag"],
          timestamp: new Date(),
          priority: "normal" as const,
        };

        changeManager.handleContentChange(event);
        smartCacheInvalidated = true;

        pathsToRevalidate.add(`/category/tag/${slug}`);
        pathsToRevalidate.add("/");
        tagsToPurge.push(`tag:${slug}`, `path:/category/tag/${slug}`, "path:/");
        break;
      }

      case "video": {
        playlistCache.delete(`playlist:${id}`);
        pathsToRevalidate.add(`/videos/${slug}`);
        pathsToRevalidate.add("/videos");
        pathsToRevalidate.add("/");
        tagsToPurge.push(
          `playlist:${id}`,
          `path:/videos/${slug}`,
          "path:/videos",
          "path:/"
        );
        break;
      }

      case "homepage": {
        const event = {
          type: "update" as const,
          articleId: "homepage-manual",
          slug: "homepage",
          categories: ["homepage", "top-news", "highlight", "super-highlight"],
          timestamp: new Date(),
          priority: "normal" as const,
        };

        changeManager.handleContentChange(event);
        smartCacheInvalidated = true;

        pathsToRevalidate.add("/");

        // Also revalidate all main section pages
        Object.keys(navigationPaths).forEach((section) => {
          pathsToRevalidate.add(`/${section}`);
          tagsToPurge.push(`path:/${section}`, `section:${section}`);
        });

        tagsToPurge.push("path:/", "homepage", "page:home");
        break;
      }

      case "section":
      case "category": {
        const event = {
          type: "update" as const,
          articleId: `category-${slug}`,
          slug: slug,
          categories: [slug, resolveSectionPath(slug)],
          timestamp: new Date(),
          priority: "normal" as const,
        };

        changeManager.handleContentChange(event);
        smartCacheInvalidated = true;

        // Get all related paths for this category
        getRelatedPaths(slug).forEach((path) => pathsToRevalidate.add(path));

        const sectionPath = resolveSectionPath(slug);
        tagsToPurge.push(
          `path:/${sectionPath}`,
          `section:${sectionPath}`,
          `category:${slug}`,
          "path:/"
        );
        break;
      }

      default:
        console.error(`[Revalidate] Unsupported Type`, type);
        return res.status(400).json({ message: `Unsupported type: ${type}` });
    }

    // Convert Set to Array for revalidation
    const pathsArray = Array.from(pathsToRevalidate);

    console.log(`[Revalidate] Revalidating ${pathsArray.length} paths`);

    // Revalidate paths in parallel batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < pathsArray.length; i += BATCH_SIZE) {
      const batch = pathsArray.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (path) => {
          try {
            await res.revalidate(path);
            console.log(`[Revalidate] Successfully revalidated: ${path}`);
          } catch (err) {
            console.error("[Revalidate] Failed to revalidate path", {
              path,
              error: err,
            });
          }
        })
      );

      // Small delay between batches
      if (i + BATCH_SIZE < pathsArray.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Purge Cloudflare cache by tags
    if (tagsToPurge.length > 0) {
      try {
        await purgeCloudflareByTags(tagsToPurge);
        console.log(
          `[Revalidate] Cloudflare tags purged: ${tagsToPurge.join(", ")}`
        );
      } catch (err) {
        console.error("[Revalidate] Cloudflare purge failed", {
          tags: tagsToPurge,
          error: err,
        });
      }
    }

    return res.status(200).json({
      revalidated: true,
      type,
      slugOrId: slug || id,
      pathsRevalidated: pathsArray.length,
      tagsPurged: tagsToPurge.length,
      smartCacheInvalidated,
      affectedPaths: pathsArray,
    });
  } catch (error: any) {
    console.error("[Revalidate] Error", { type, slug, id, error });

    // Retry logic for resilience
    if (retryCount < 2) {
      console.warn(
        `[Revalidate] Retrying... Attempt ${retryCount + 1}/3 for type=${type}, slug=${slug}`
      );

      const baseUrl = `https://${process.env.NEXT_PUBLIC_DOMAIN || "www.freemalaysiatoday.com"}`;

      setTimeout(
        () => {
          fetch(`${baseUrl}/api/revalidate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type,
              slug,
              id,
              retryCount: retryCount + 1,
            }),
          }).catch((e) => console.error("[Revalidate] Retry failed", e));
        },
        (retryCount + 1) * 3000
      ); // Exponential backoff
    }

    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
}
