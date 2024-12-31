// pages/api/subcategory-posts.ts
import { NextApiRequest, NextApiResponse } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";
import { categoriesNavigation } from "@/constants/categories-navigation";
import { 
  CustomHomeNewsExcludeVariables,
  CustomHomeBusinessExcludeVariables,
  CustomHomeSportsExcludeVariables 
} from "@/constants/categories-custom-variables";

// Map of parent categories to their exclude variables
const CATEGORY_EXCLUDE_VARIABLES: Record<string, any> = {
  news: CustomHomeNewsExcludeVariables,
  business: CustomHomeBusinessExcludeVariables,
  sports: CustomHomeSportsExcludeVariables,
};

// Function to find parent category based on subcategory slug
function findParentCategory(slug: string): string | undefined {
  for (const category of categoriesNavigation) {
    const hasSubCategory = category.subCategories?.some(
      (sub) => sub.slug === slug
    );
    if (hasSubCategory) {
      return category.path;
    }
  }
  return undefined;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { page = 1, slug } = req.query;
  const postsPerPage = 6;
  const offset = Number(page) * postsPerPage;

  if (!slug) {
    return res.status(400).json({ error: 'Slug is required' });
  }

  // Find parent category for the subcategory
  const parentCategory = findParentCategory(slug as string);
  const excludeVariables = parentCategory 
    ? CATEGORY_EXCLUDE_VARIABLES[parentCategory] 
    : undefined;

  // console.log("API Request:", {
  //   page,
  //   slug,
  //   offset,
  //   postsPerPage,
  //   parentCategory,
  //   hasExcludeVariables: !!excludeVariables,
  // });

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

    // console.log("API Response:", {
    //   postsCount: posts.posts.edges.length,
    //   hasMore: posts.posts.edges.length === postsPerPage,
    // });
   
    //  console.log("posts.posts.edges", posts);
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