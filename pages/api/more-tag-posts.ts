// pages/api/more-tag-posts.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { apiErrorResponse } from "@/lib/utils";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";
import { moreTagPostsCache } from "@/lib/cache/smart-cache-registry";
import { withSmartLRUCache } from "@/lib/cache/withSmartLRU";

const CONTEXT = "/api/more-tag-posts";
const POSTS_PER_PAGE = 20;

// Create cached version using SmartNewsCache
const getCachedTagPosts = withSmartLRUCache(
  (variables: any) => {
    const tagId =
      variables.where?.taxQuery?.taxArray?.[0]?.terms?.[0] || "unknown";
    const offset = variables.where?.offsetPagination?.offset || 0;
    return `tag:${tagId}:offset:${offset}:size:${POSTS_PER_PAGE}`;
  },
  getFilteredCategoryPosts,
  moreTagPostsCache
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Method validation
  if (req.method !== "POST") {
    return apiErrorResponse({
      res,
      status: 405,
      context: CONTEXT,
      message: "Method not allowed. Use POST.",
    });
  }

  const { tagId, offset } = req.body;

  // Validation
  const parsedTagId = Number(tagId);
  const parsedOffset = Number(offset) || 0;

  if (!tagId || isNaN(parsedTagId)) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `Missing or invalid 'tagId' (received: ${tagId}).`,
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
        taxQuery: {
          relation: "AND",
          taxArray: [
            {
              field: "ID",
              operator: "IN",
              taxonomy: "TAG",
              terms: [parsedTagId.toString()], // Convert to string as per original
            },
          ],
        },
        status: "PUBLISH",
      },
    };

    // Use SmartNewsCache
    const response = await getCachedTagPosts(variables);

    if (!response || !response.posts || !response.posts.edges) {
      return apiErrorResponse({
        res,
        status: 500,
        context: CONTEXT,
        message: `Failed to fetch posts for tag ID ${parsedTagId}.`,
      });
    }

    const result = {
      posts: response.posts,
      total: response.posts.edges.length,
      meta: {
        tagId: parsedTagId,
        offset: parsedOffset,
        size: POSTS_PER_PAGE,
        hasMore: response.posts.edges.length === POSTS_PER_PAGE,
      },
    };

    // Cache control headers
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error(`[${CONTEXT}] Error fetching tag posts:`, {
      tagId: parsedTagId,
      offset: parsedOffset,
      error,
    });

    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: "Internal Server Error:",
      error,
    });
  }
}
