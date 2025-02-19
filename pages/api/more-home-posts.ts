import { NextApiRequest, NextApiResponse } from "next";
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
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

    // Adjust total to account for excluded posts
    const adjustedTotal = data.posts?.pageInfo?.offsetPagination?.total - 5; // 1 super-highlight + 4 highlights
    const hasMore = offset + size < adjustedTotal;

    res.status(200).json({
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
    console.error("API Error:", error);
    res.status(500).json({
      error: "Failed to fetch posts",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
