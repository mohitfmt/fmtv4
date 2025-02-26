import { NextApiRequest, NextApiResponse } from "next";
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

// Function to find parent category based on subcategory slug

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { page = 1, slug, parentCategory } = req.query;
  const postsPerPage = 6;
  const offset = Number(page) * postsPerPage;

  if (!slug) {
    return res.status(400).json({ error: "Slug is required" });
  }

  // Find parent category for the subcategory

  const categoryPath = Array.isArray(parentCategory)
    ? parentCategory[0]
    : parentCategory;
  const excludeVariables = categoryPath
    ? CATEGORY_EXCLUDE_VARIABLES[categoryPath]
    : undefined;

  try {
    const posts = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: postsPerPage,
        where: {
          offsetPagination: {
            offset,
            size: postsPerPage,
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

    res.status(200).json({
      posts: posts.posts.edges,
      hasMore: posts.posts.edges.length === postsPerPage,
    });
  } catch (error) {
    console.error("API Error Details:", error);
    res.status(500).json({
      error: "Failed to fetch posts",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
