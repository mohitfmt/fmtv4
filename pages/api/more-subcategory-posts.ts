import type { NextApiRequest, NextApiResponse } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";

import {
  CustomHomeNewsExcludeVariables,
  CustomHomeBusinessExcludeVariables,
  CustomHomeSportsExcludeVariables,
  CustomHomeOpinionExcludeVariables,
  CustomHomeBeritaExcludeVariables,
  CustomHomeLifestyleExcludeVariables,
  CustomHomeWorldExcludeVariables,
} from "@/constants/categories-custom-variables";

// Map of parent categories to their exclude variables
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  //Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Method validation
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { page = 1, slug, parentCategory } = req.query;

  // Input validation
  const numericPage = Number(page);
  if (!slug || typeof slug !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'slug'" });
  }
  if (isNaN(numericPage) || numericPage < 1 || numericPage > 1000) {
    return res.status(400).json({ error: "Invalid page number" });
  }

  const offset = numericPage * POSTS_PER_PAGE;

  const categoryPath = Array.isArray(parentCategory)
    ? parentCategory[0]
    : parentCategory;

  const excludeVariables = categoryPath
    ? CATEGORY_EXCLUDE_VARIABLES[categoryPath]
    : undefined;

  try {
    const posts = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
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
                terms: [slug],
              },
            ],
          },
          ...(excludeVariables && { excludeQuery: excludeVariables }),
        },
      },
    });

    //Caching (Cloudflare-friendly)
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=60");

    return res.status(200).json({
      posts: posts.posts.edges,
      hasMore: posts.posts.edges.length === POSTS_PER_PAGE,
    });
  } catch (error) {
    console.error(`[API_ERROR] /${slug}/subcategory-posts page=${numericPage}:`, error);
    return res.status(500).json({
      error: "Failed to fetch posts",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
