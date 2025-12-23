// pages/api/more-subcategory-posts.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  CustomHomeNewsExcludeVariables,
  CustomHomeBusinessExcludeVariables,
  CustomHomeSportsExcludeVariables,
  CustomHomeOpinionExcludeVariables,
  CustomHomeBeritaExcludeVariables,
  CustomHomeLifestyleExcludeVariables,
  CustomHomeWorldExcludeVariables,
} from "@/constants/categories-custom-variables";
import { apiErrorResponse } from "@/lib/utils";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";
import { moreSubcategoryPostsCache } from "@/lib/cache/smart-cache-registry";
import { withSmartLRUCache } from "@/lib/cache/withSmartLRU";

const CATEGORY_EXCLUDE_VARIABLES: Record<string, any> = {
  news: CustomHomeNewsExcludeVariables,
  business: CustomHomeBusinessExcludeVariables,
  sports: CustomHomeSportsExcludeVariables,
  opinion: CustomHomeOpinionExcludeVariables,
  berita: CustomHomeBeritaExcludeVariables,
  lifestyle: CustomHomeLifestyleExcludeVariables,
  world: CustomHomeWorldExcludeVariables,
};

const POSTS_PER_PAGE = 6;
const CONTEXT = "/api/more-subcategory-posts";

// Create cached version using SmartNewsCache
const getCachedSubcategoryPosts = withSmartLRUCache(
  (variables: any) => {
    const slug =
      variables.where?.taxQuery?.taxArray?.[0]?.terms?.[0] || "unknown";
    const offset = variables.where?.offsetPagination?.offset || 0;
    const hasExclude = !!variables.where?.excludeQuery;
    return `slug:${slug}:offset:${offset}:size:${POSTS_PER_PAGE}:exclude:${hasExclude}`;
  },
  getFilteredCategoryPosts,
  moreSubcategoryPostsCache
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  if (req.method !== "GET") {
    return apiErrorResponse({
      res,
      status: 405,
      context: CONTEXT,
      message: "Method not allowed. Use GET.",
    });
  }

  const { page = 1, slug, parentCategory } = req.query;

  // Convert query params to strings
  const slugStr = slug?.toString();
  const parentCategoryStr = parentCategory?.toString();

  if (!slugStr) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: "Missing param: 'slug' is required.",
    });
  }

  if (!page) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: "Missing param: 'page' is required.",
    });
  }

  if (!parentCategoryStr) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: "Missing param: 'parentCategory' is required.",
    });
  }

  if (slugStr.trim().length === 0) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'slug' must be a non-empty string (received: ${slug}).`,
    });
  }

  const numericPage = Number(page);
  if (!Number.isInteger(numericPage) || numericPage < 1 || numericPage > 1000) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'page' must be an integer between 1 and 1000 (received: ${page}).`,
    });
  }

  const offset = numericPage * POSTS_PER_PAGE;
  const excludeVariables = CATEGORY_EXCLUDE_VARIABLES[parentCategoryStr];

  try {
    const variables = {
      first: POSTS_PER_PAGE,
      where: {
        offsetPagination: { offset, size: POSTS_PER_PAGE },
        status: "PUBLISH",
        taxQuery: {
          relation: "AND",
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: [slugStr],
            },
          ],
        },
        ...(excludeVariables && { excludeQuery: excludeVariables }),
      },
    };

    // Use SmartNewsCache
    const posts = await getCachedSubcategoryPosts(variables);

    if (!posts || !posts.posts || !posts.posts.edges) {
      return apiErrorResponse({
        res,
        status: 500,
        context: CONTEXT,
        message: `Failed to fetch posts for subcategory '${slugStr}'.`,
      });
    }

    const response = {
      posts: posts.posts.edges,
      hasMore: posts.posts.edges.length === POSTS_PER_PAGE,
      meta: {
        slug: slugStr,
        parentCategory: parentCategoryStr,
        page: numericPage,
        offset,
        size: POSTS_PER_PAGE,
        totalReturned: posts.posts.edges.length,
        hasExcludeRules: !!excludeVariables,
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
      slug: slugStr,
      parentCategory: parentCategoryStr,
      page: numericPage,
      offset,
      error,
    });

    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: `Internal Server Error while fetching posts for category '${slugStr}' and page '${page}'`,
      error,
    });
  }
}
