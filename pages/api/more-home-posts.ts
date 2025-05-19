import type { NextApiRequest, NextApiResponse } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_MORE_HOME_POSTS_QUERY } from "@/lib/gql-queries/get-more-home-posts";

const CATEGORY_CONFIGS = {
  "top-news": {
    baseOffset: 0,
    pageSize: 6,
    getOffset: (page: number) => (Number(page) - 1) * 6,
  },
  opinion: {
    baseOffset: 0,
    pageSize: 6,
    getOffset: (page: number) => (Number(page) - 1) * 6,
  },
  default: {
    baseOffset: 5,
    pageSize: 4,
    getOffset: (page: number) => 5 + (Number(page) - 1) * 4,
  },
} as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  //Security Headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  const { page = 1, category } = req.query;

  try {
    const config =
      CATEGORY_CONFIGS[category as keyof typeof CATEGORY_CONFIGS] ||
      CATEGORY_CONFIGS.default;

    const offset = config.getOffset(Number(page));
    const size = config.pageSize;

    const data = await gqlFetchAPI(GET_MORE_HOME_POSTS_QUERY, {
      variables: {
        category,
        offset,
        size,
      },
    });

    const adjustedTotal =
      data.posts?.pageInfo?.offsetPagination?.total != null
        ? data.posts.pageInfo.offsetPagination.total - 5
        : 0;

    const hasMore = offset + size < adjustedTotal;

    //Add Cache-Control for edge and browser caching
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=60");


    return res.status(200).json({
      posts: data.posts,
      hasMore,
      total: adjustedTotal,
      currentConfig: {
        category,
        offset,
        size,
        page: Number(page),
        baseOffset: config.baseOffset,
        pageSize: config.pageSize,
      },
    });
  } catch (error) {
    console.error("[API_ERROR] /more-home-posts:", error);
    return res.status(500).json({
      error: "Failed to fetch posts",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
