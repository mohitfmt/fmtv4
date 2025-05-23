// pages/api/revalidate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { aboutPageCache } from "@/lib/gql-queries/get-about-page";
import { playlistCache, postDataCache } from "@/lib/api";
import { filteredCategoryCache } from "@/lib/gql-queries/get-filtered-category-posts";
import { purgeCloudflareByTags } from "@/lib/cache/purge";

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
    .replace(/^(category\/)+/g, "") // handles "category/category"
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
    console.error("[Validation Error]", { type, slug, id });
    return res.status(400).json({ message: "Missing required parameters" });
  }

  const tagsToPurge: string[] = [];
  const pathsToRevalidate: string[] = [];

  try {
    switch (type) {
      case "about": {
        aboutPageCache.delete("page:about");
        pathsToRevalidate.push("/about");
        tagsToPurge.push("path:/about", "page:about");
        break;
      }

      case "article":
      case "post": {
        postDataCache.delete(`post:${slug}`);
        postDataCache.delete(`related:${slug}`);
        pathsToRevalidate.push(`/category/${slug}`);
        tagsToPurge.push(
          `post:${slug}`,
          `related:${slug}`,
          `path:/category/${slug}`
        );

        const section = extractSectionFromSlug(slug);
        if (section) {
          const sectionPath = `/${section}`;
          filteredCategoryCache.clear();
          pathsToRevalidate.push(sectionPath);
          tagsToPurge.push(`path:${sectionPath}`);
        }

        // Always revalidate homepage for any article
        filteredCategoryCache.clear();
        pathsToRevalidate.push("/");
        tagsToPurge.push("path:/");
        break;
      }

      case "author": {
        filteredCategoryCache.clear();
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
        filteredCategoryCache.clear();
        pathsToRevalidate.push(`/category/tag/${slug}`);
        pathsToRevalidate.push("/");
        tagsToPurge.push(`tag:${slug}`, `path:/category/tag/${slug}`, "path:/");
        break;
      }

      case "video": {
        playlistCache.delete(`playlist:${id}`);
        pathsToRevalidate.push(`/videos/${slug}`);
        pathsToRevalidate.push("/");
        tagsToPurge.push(`playlist:${id}`, `path:/videos/${slug}`, "path:/");
        break;
      }

      case "homepage": {
        filteredCategoryCache.clear();
        pathsToRevalidate.push("/");
        tagsToPurge.push("path:/");
        break;
      }

      case "section":
      case "category": {
        const sectionPath = resolveSectionPath(slug);
        filteredCategoryCache.clear();
        pathsToRevalidate.push(`/${sectionPath}`, "/");
        tagsToPurge.push(`path:/${sectionPath}`, "path:/");
        break;
      }

      default:
        console.error(`[Unsupported Type]`, type);
        return res.status(400).json({ message: `Unsupported type: ${type}` });
    }

    for (const path of pathsToRevalidate) {
      try {
        await res.revalidate(path);
      } catch (err) {
        console.error("[Revalidate Fail]", { path, error: err });
      }
    }

    try {
      await purgeCloudflareByTags(tagsToPurge);
    } catch (err) {
      console.error("[Cloudflare Purge Fail]", {
        tags: tagsToPurge,
        error: err,
      });
    }

    return res
      .status(200)
      .json({ revalidated: true, type, slugOrId: slug || id });
  } catch (error: any) {
    console.error("[Revalidate Error]", { type, slug, id, error });

    if (retryCount < 2) {
      console.warn(
        `[Retrying] Attempt ${retryCount + 1}/3 for type=${type}, slug=${slug}`
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
          }).catch((e) => console.error("[Retry Failed]", e));
        },
        (retryCount + 1) * 3000
      );
    }

    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
}
