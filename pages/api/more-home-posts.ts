// pages/api/more-home-posts.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getMoreHomePosts } from "@/lib/gql-queries/get-more-home-posts";
import { apiErrorResponse } from "@/lib/utils";
import { moreHomePostsCache } from "@/lib/cache/smart-cache-registry";
import { withSmartLRUCache } from "@/lib/cache/withSmartLRU";

const CONTEXT = "/api/more-home-posts";

const CATEGORY_CONFIGS = {
  "top-news": {
    baseOffset: 0,
    pageSize: 6,
    getOffset: (page: number) => (page - 1) * 6,
  },
  opinion: {
    baseOffset: 0,
    pageSize: 6,
    getOffset: (page: number) => (page - 1) * 6,
  },
  default: {
    baseOffset: 5,
    pageSize: 4,
    getOffset: (page: number) => 5 + (page - 1) * 4,
  },
} as const;

// Create cached version using SmartNewsCache
const getCachedMoreHomePosts = withSmartLRUCache(
  ({
    category,
    offset,
    size,
  }: {
    category: string;
    offset: number;
    size: number;
  }) => `cat:${category}:offset:${offset}:size:${size}`,
  getMoreHomePosts,
  moreHomePostsCache
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Method check
  if (req.method !== "GET") {
    return apiErrorResponse({
      res,
      status: 405,
      context: CONTEXT,
      message: "Method not allowed. Use GET.",
    });
  }

  const { page = 1, category = "" } = req.query;

  const numericPage = Number(page);
  const categoryKey = category.toString();

  // Input validation
  if (!categoryKey || typeof categoryKey !== "string") {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: "'category' is required and must be a string.",
    });
  }

  if (!Number.isInteger(numericPage) || numericPage < 1 || numericPage > 1000) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'page' must be an integer between 1 and 1000 (received: ${page}).`,
    });
  }

  const config =
    CATEGORY_CONFIGS[categoryKey as keyof typeof CATEGORY_CONFIGS] ||
    CATEGORY_CONFIGS.default;

  const offset = config?.getOffset(numericPage);
  const size = config?.pageSize;

  try {
    // Use SmartNewsCache - automatically tracks dependencies!
    const data = await getCachedMoreHomePosts({
      category: categoryKey,
      offset,
      size,
    });

    if (!data || !data.posts) {
      return apiErrorResponse({
        res,
        status: 500,
        context: CONTEXT,
        message: "Failed to fetch posts data.",
      });
    }

    const total = data?.posts?.pageInfo?.offsetPagination?.total ?? 0;
    const adjustedTotal = total - config?.baseOffset;
    const hasMore = offset + size < adjustedTotal;

    const response = {
      posts: data.posts,
      hasMore,
      total: adjustedTotal,
      currentConfig: {
        category: categoryKey,
        offset,
        size,
        page: numericPage,
        baseOffset: config?.baseOffset,
        pageSize: config?.pageSize,
      },
    };

    // Cache control for CDN
    res.setHeader(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=60"
    );

    return res.status(200).json(response);
  } catch (error) {
    console.error(`[${CONTEXT}] Error fetching posts:`, {
      category: categoryKey,
      page: numericPage,
      offset,
      size,
      error,
    });

    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: "Internal Server Error while fetching more home posts.",
      error,
    });
  }
}
