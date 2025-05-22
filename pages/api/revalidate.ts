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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { type, slug, id } = req.body;

  if (!type || (!slug && !id)) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    const tagsToPurge: string[] = [];

    switch (type) {
      case "about": {
        aboutPageCache.delete("page:about");
        await res.revalidate("/about");
        tagsToPurge.push("path:/about", "page:about");
        break;
      }

      case "article": {
        postDataCache.delete(`post:${slug}`);
        postDataCache.delete(`related:${slug}`);
        await res.revalidate(`/category/${slug}`);
        tagsToPurge.push(
          `post:${slug}`,
          `related:${slug}`,
          `path:/category/${slug}`
        );
        break;
      }

      case "author": {
        filteredCategoryCache.clear();
        await res.revalidate(`/category/author/${slug}`);
        tagsToPurge.push(`author:${slug}`, `path:/category/author/${slug}`);
        break;
      }

      case "tag": {
        filteredCategoryCache.clear();
        await res.revalidate(`/category/tag/${slug}`);
        tagsToPurge.push(`tag:${slug}`, `path:/category/tag/${slug}`);
        break;
      }

      case "video": {
        playlistCache.delete(`playlist:${id}`);
        await res.revalidate(`/videos/${slug}`);
        tagsToPurge.push(`playlist:${id}`, `path:/videos/${slug}`);
        break;
      }

      case "homepage": {
        filteredCategoryCache.clear();
        await res.revalidate("/");
        tagsToPurge.push("path:/");
        break;
      }

      case "section": {
        const sectionPath = resolveSectionPath(slug);
        filteredCategoryCache.clear();
        await res.revalidate(`/${sectionPath}`);
        tagsToPurge.push(`path:/${sectionPath}`);
        break;
      }

      default:
        return res.status(400).json({ message: `Unsupported type: ${type}` });
    }

    await purgeCloudflareByTags(tagsToPurge);

    return res
      .status(200)
      .json({ revalidated: true, type, slugOrId: slug || id });
  } catch (error: any) {
    console.error("[Revalidate Error]", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
}
