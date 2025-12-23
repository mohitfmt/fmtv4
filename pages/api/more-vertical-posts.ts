// pages/api/more-vertical-posts.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { apiErrorResponse } from "@/lib/utils";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";
import { moreVerticalPostsCache } from "@/lib/cache/smart-cache-registry";
import { withSmartLRUCache } from "@/lib/cache/withSmartLRU";

const CONTEXT = "/api/more-vertical-posts";
const POSTS_PER_PAGE = 20;

// Create cached version using SmartNewsCache
const getCachedVerticalPosts = withSmartLRUCache(
  (variables: any) => {
    const category =
      variables.where?.taxQuery?.taxArray?.[0]?.terms?.[0] || "unknown";
    const offset = variables.where?.offsetPagination?.offset || 0;
    return `cat:${category}:offset:${offset}:size:${POSTS_PER_PAGE}`;
  },
  getFilteredCategoryPosts,
  moreVerticalPostsCache
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

  const { categorySlug, offset } = req.body;

  // Input validation
  if (
    !categorySlug ||
    typeof categorySlug !== "string" ||
    categorySlug.trim() === ""
  ) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message:
        "Missing or invalid 'categorySlug'. It must be a non-empty string.",
    });
  }

  const parsedOffset = Number(offset);
  if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'offset' must be a positive integer. (received: ${offset})`,
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
        status: "PUBLISH",
        taxQuery: {
          relation: "AND",
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: [categorySlug],
            },
          ],
        },
      },
    };

    // Use SmartNewsCache
    const response = await getCachedVerticalPosts(variables);

    if (!response || !response.posts) {
      return apiErrorResponse({
        res,
        status: 500,
        context: CONTEXT,
        message: `Failed to fetch posts for category '${categorySlug}'.`,
      });
    }

    const result = {
      posts: response.posts,
      meta: {
        category: categorySlug,
        offset: parsedOffset,
        size: POSTS_PER_PAGE,
        hasMore: response.posts?.edges?.length === POSTS_PER_PAGE,
        totalReturned: response.posts?.edges?.length || 0,
      },
    };

    // Cache control for CDN
    res.setHeader(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=60"
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error(`[${CONTEXT}] Error fetching posts:`, {
      categorySlug,
      offset: parsedOffset,
      error,
    });

    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: `Internal Server Error while fetching posts for category '${categorySlug}' and offset '${offset}'`,
      error,
    });
  }
}
