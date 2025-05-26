// pages/api/revalidate.ts
/**
 * Revalidation API with Smart Cache Integration
 * This version removes all cache clearing and relies on smart invalidation
 */

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

function resolveSectionPath(slug: string): string {
  return SECTION_PATH_MAP[slug] || slug;
}

function extractSectionFromSlug(slug: string): string | null {
  const parts = slug?.split("/").filter(Boolean);
  if (!parts?.length) return null;
  return resolveSectionPath(parts[0]);
}

function normalizeSlugPath(path?: string): string | undefined {
  return path
    ?.replace(/^\/+/g, "")
    .replace(/^(category\/)+/g, "")
    .replace(/^\/+|\/+$/g, "");
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
  const pathsToRevalidate: string[] = [];

  try {
    switch (type) {
      case "about": {
        // About page is special - it doesn't use smart cache, so we handle it manually
        aboutPageCache.delete("page:about");
        pathsToRevalidate.push("/about");
        tagsToPurge.push("path:/about", "page:about");
        break;
      }

      case "article":
      case "post": {
        // For articles, we trigger smart invalidation if we can get the article ID
        try {
          const postData = await getPostData(slug);
          if (postData?.post?.databaseId) {
            // Create a content change event for the smart cache system
            const event = {
              type: "update" as const,
              articleId: postData.post.databaseId.toString(),
              slug: slug,
              categories: extractCategoriesFromSlug(slug) || [],
              timestamp: new Date(),
              priority: "normal" as const,
            };

            // This single call will invalidate all cache entries that depend on this article
            changeManager.handleContentChange(event as any);

            console.log(
              `[Revalidate] Smart invalidation triggered for article ${postData.post.databaseId}`
            );
          }
        } catch (e) {
          // If we can't get the article ID, we still continue with path revalidation
          console.log(
            `[Revalidate] Could not fetch article ID for ${slug}, continuing with path revalidation`
          );
        }

        // Continue with path-based revalidation for Next.js ISR
        pathsToRevalidate.push(`/category/${slug}`);
        tagsToPurge.push(
          `post:${slug}`,
          `related:${slug}`,
          `path:/category/${slug}`
        );

        const section = extractSectionFromSlug(slug);
        if (section) {
          const sectionPath = `/${section}`;
          pathsToRevalidate.push(sectionPath);
          tagsToPurge.push(`path:${sectionPath}`);
        }

        // Always revalidate homepage for any article
        pathsToRevalidate.push("/");
        tagsToPurge.push("path:/");
        break;
      }

      case "author": {
        // Author pages don't need cache clearing - smart cache handles it
        pathsToRevalidate.push(`/category/author/${slug}`);
        pathsToRevalidate.push("/");
        tagsToPurge.push(
          `author:${slug}`,
          `path:/category/author/${slug}`,
          "path:/"
        );
        break;
      }

      case "tag": {
        // Tag pages don't need cache clearing - smart cache handles it
        pathsToRevalidate.push(`/category/tag/${slug}`);
        pathsToRevalidate.push("/");
        tagsToPurge.push(`tag:${slug}`, `path:/category/tag/${slug}`, "path:/");
        break;
      }

      case "video": {
        // Videos use a separate cache that's not article-based
        playlistCache.delete(`playlist:${id}`);
        pathsToRevalidate.push(`/videos/${slug}`);
        pathsToRevalidate.push("/");
        tagsToPurge.push(`playlist:${id}`, `path:/videos/${slug}`, "path:/");
        break;
      }

      case "homepage": {
        // Homepage revalidation - no cache clearing needed
        pathsToRevalidate.push("/");
        tagsToPurge.push("path:/", "homepage");
        break;
      }

      case "section":
      case "category": {
        // Section/category revalidation - no cache clearing needed
        const sectionPath = resolveSectionPath(slug);
        pathsToRevalidate.push(`/${sectionPath}`, "/");
        tagsToPurge.push(
          `path:/${sectionPath}`,
          `section:${sectionPath}`,
          "path:/"
        );
        break;
      }

      default:
        console.error(`[Revalidate] Unsupported Type`, type);
        return res.status(400).json({ message: `Unsupported type: ${type}` });
    }

    // Revalidate Next.js paths (ISR)
    console.log(`[Revalidate] Revalidating ${pathsToRevalidate.length} paths`);
    for (const path of pathsToRevalidate) {
      try {
        await res.revalidate(path);
        console.log(`[Revalidate] Successfully revalidated: ${path}`);
      } catch (err) {
        console.error("[Revalidate] Failed to revalidate path", {
          path,
          error: err,
        });
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
      pathsRevalidated: pathsToRevalidate.length,
      tagsPurged: tagsToPurge.length,
    });
  } catch (error: any) {
    console.error("[Revalidate] Error", { type, slug, id, error });

    // Retry logic for resilience
    if (retryCount < 2) {
      console.warn(
        `[Revalidate] Retrying... Attempt ${retryCount + 1}/3 for type=${type}, slug=${slug}`
      );

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        "https://dev-v4.freemalaysiatoday.com";

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
