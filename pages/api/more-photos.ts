// pages/api/more-photos.ts
import { NextApiRequest, NextApiResponse } from "next";
import { apiErrorResponse } from "@/lib/utils";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";
import { morePhotosCache } from "@/lib/cache/smart-cache-registry";
import { withSmartLRUCache } from "@/lib/cache/withSmartLRU";

const CONTEXT = "/api/more-photos";
const POSTS_PER_PAGE = 12;

// Create cached version using SmartNewsCache
const getCachedPhotos = withSmartLRUCache(
  (variables: any) => {
    const category =
      variables.where?.taxQuery?.taxArray?.[0]?.terms?.[0] || "photos";
    const offset = variables.where?.offsetPagination?.offset || 0;
    return `cat:${category}:offset:${offset}:size:${POSTS_PER_PAGE}`;
  },
  getFilteredCategoryPosts,
  morePhotosCache
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Method validation
  if (req.method !== "POST") {
    return apiErrorResponse({
      res,
      status: 405,
      context: CONTEXT,
      message: "Method not allowed. Use POST.",
    });
  }

  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  const { categorySlug = "photos", offset } = req.body;

  // Input validation
  if (typeof categorySlug !== "string" || categorySlug?.trim() === "") {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'categorySlug' must be a non-empty string. (received: ${categorySlug})`,
    });
  }

  const parsedOffset = Number(offset);
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
    const response = await getCachedPhotos(variables);

    if (!response || !response.posts) {
      return apiErrorResponse({
        res,
        status: 500,
        context: CONTEXT,
        message: `Failed to fetch photos for category '${categorySlug}'.`,
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

    // Cache control for Cloudflare or similar CDN
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=60");

    return res.status(200).json(result);
  } catch (error) {
    console.error(`[${CONTEXT}] Error loading photo posts:`, {
      categorySlug,
      offset: parsedOffset,
      error,
    });

    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: "Internal Server Error while loading more photo posts.",
      error,
    });
  }
}
