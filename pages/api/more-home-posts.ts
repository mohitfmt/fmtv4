import type { NextApiRequest, NextApiResponse } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_MORE_HOME_POSTS_QUERY } from "@/lib/gql-queries/get-more-home-posts";
import { apiErrorResponse } from "@/lib/utils";

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

  if (!Number.isInteger(numericPage) || numericPage < 0 || numericPage > 1000) {
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
    const data = await gqlFetchAPI(GET_MORE_HOME_POSTS_QUERY, {
      variables: {
        category: categoryKey,
        offset,
        size,
      },
    });

    const total = data?.posts?.pageInfo?.offsetPagination?.total ?? 0;
    const adjustedTotal = total - config?.baseOffset;
    const hasMore = offset + size < adjustedTotal;

    // Cache control
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
    );

    return res.status(200).json({
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
    });
  } catch (error) {
    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: "Internal Server Error while fetching more home posts.",
      error,
    });
  }
}
