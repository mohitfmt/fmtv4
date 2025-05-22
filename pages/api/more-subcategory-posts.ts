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

  if (!slug) {
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

  if (!parentCategory) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: "Missing param: 'parentCategory' is required.",
    });
  }

  if (typeof slug !== "string" || slug.trim().length === 0) {
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

  if (typeof parentCategory !== "string") {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: `'parentCategory' must be a string (received: ${parentCategory}).`,
    });
  }

  const offset = numericPage * POSTS_PER_PAGE;
  const excludeVariables = CATEGORY_EXCLUDE_VARIABLES[parentCategory];

  try {
    const variables = {
      first: POSTS_PER_PAGE,
      where: {
        offsetPagination: { offset, size: POSTS_PER_PAGE },
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
    };
    const posts = await getFilteredCategoryPosts(variables);

    return res.status(200).json({
      posts: posts?.posts?.edges,
      hasMore: posts?.posts?.edges?.length === POSTS_PER_PAGE,
    });
  } catch (error) {
    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: `Internal Server Error while fetching posts for category '${slug}' and page '${page}'`,
      error,
    });
  }
}
