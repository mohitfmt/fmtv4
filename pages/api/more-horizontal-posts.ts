// pages/api/more-horizontal-posts.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { apiErrorResponse } from "@/lib/utils";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";
import { moreHorizontalPostsCache } from "@/lib/cache/smart-cache-registry";
import { withSmartLRUCache } from "@/lib/cache/withSmartLRU";

const POSTS_PER_PAGE = 4;
const CONTEXT = "/api/more-horizontal-posts";

// Create cached version using SmartNewsCache
const getCachedHorizontalPosts = withSmartLRUCache(
  (variables: any) => {
    const category =
      variables.where?.taxQuery?.taxArray?.[0]?.terms?.[0] || "unknown";
    const offset = variables.where?.offsetPagination?.offset || 0;
    return `cat:${category}:offset:${offset}:size:${POSTS_PER_PAGE}`;
  },
  getFilteredCategoryPosts,
  moreHorizontalPostsCache
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

  const { page = 1, category } = req.query;
  const numericPage = Number(page);
  const categorySlug = category?.toString();

  // Input validation
  if (!categorySlug || categorySlug.trim() === "") {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'category' is required and must be a non-empty string.`,
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

  const offset = (numericPage - 1) * POSTS_PER_PAGE + 5; // Starting from 5 to skip featured posts

  try {
    const variables = {
      first: POSTS_PER_PAGE,
      where: {
        offsetPagination: {
          offset,
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
    const posts = await getCachedHorizontalPosts(variables);

    if (!posts || !posts.posts || !posts.posts.edges) {
      return apiErrorResponse({
        res,
        status: 500,
        context: CONTEXT,
        message: `Failed to fetch posts for category '${categorySlug}'.`,
      });
    }

    const response = {
      posts: posts.posts.edges,
      hasMore: posts.posts.edges.length === POSTS_PER_PAGE,
      meta: {
        category: categorySlug,
        page: numericPage,
        offset,
        size: POSTS_PER_PAGE,
        totalReturned: posts.posts.edges.length,
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
      category: categorySlug,
      page: numericPage,
      offset,
      error,
    });

    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: `Internal Server Error while fetching posts for category '${categorySlug}' and page '${page}'`,
      error,
    });
  }
}
