// pages/api/more-author-posts.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";
import { apiErrorResponse } from "@/lib/utils";
import { moreAuthorPostsCache } from "@/lib/cache/smart-cache-registry";
import { withSmartLRUCache } from "@/lib/cache/withSmartLRU";

const CONTEXT = "/api/more-author-posts";
const POSTS_PER_PAGE = 20;

// Create cached version using SmartNewsCache
const getCachedAuthorPosts = withSmartLRUCache(
  (variables: any) => {
    const authorId = variables.where?.authorIn?.[0] || "unknown";
    const offset = variables.where?.offsetPagination?.offset || 0;
    return `author:${authorId}:offset:${offset}:size:${POSTS_PER_PAGE}`;
  },
  getFilteredCategoryPosts,
  moreAuthorPostsCache
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Method check
  if (req.method !== "POST") {
    return apiErrorResponse({
      res,
      status: 405,
      context: CONTEXT,
      message: "Method not allowed. Use POST.",
    });
  }

  const { authorId, offset = 0 } = req.body;

  // Input validation
  const parsedAuthorId = Number(authorId);
  const parsedOffset = Number(offset);

  if (!authorId || isNaN(parsedAuthorId) || parsedAuthorId <= 0) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'authorId' is required and must be a valid number. (received: ${authorId})`,
    });
  }

  if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'offset' must be a non-negative integer. (received: ${offset})`,
    });
  }

  try {
    const variables = {
      first: POSTS_PER_PAGE,
      where: {
        offsetPagination: {
          offset: parsedOffset,
          size: POSTS_PER_PAGE,
        },
        authorIn: [parsedAuthorId],
        status: "PUBLISH",
      },
    };

    // Use SmartNewsCache
    const response = await getCachedAuthorPosts(variables);

    if (!response || !response.posts) {
      return apiErrorResponse({
        res,
        status: 500,
        context: CONTEXT,
        message: `Failed to fetch posts for author ID ${parsedAuthorId}.`,
      });
    }

    const result = {
      posts: response.posts,
      total: response.posts?.edges?.length ?? 0,
      meta: {
        authorId: parsedAuthorId,
        offset: parsedOffset,
        size: POSTS_PER_PAGE,
        hasMore: response.posts?.edges?.length === POSTS_PER_PAGE,
      },
    };

    // CDN-friendly caching
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error(`[${CONTEXT}] Error fetching author posts:`, {
      authorId: parsedAuthorId,
      offset: parsedOffset,
      error,
    });

    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: "Internal Server Error while fetching author posts.",
      error,
    });
  }
}
