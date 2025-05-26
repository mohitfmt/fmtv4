import { categoryCache } from "../cache/smart-cache-registry";
import { gqlFetchAPI } from "./gql-fetch-api";

export async function getCategoryNews(
  categoryName: string,
  limit: number,
  preview: boolean
) {
  // Generate a unique cache key for this specific query
  const cacheKey = JSON.stringify({ categoryName, limit, preview });

  // Check smart cache first
  const cached = categoryCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const data = await gqlFetchAPI(
      `
        query categoryPost($categoryName: String, $limit: Int) {
          posts(first: $limit, 
            where: { 
              status: PUBLISH,
              taxQuery: {
                relation: AND,
                taxArray: [
                  {
                    field: SLUG,
                    operator: AND,
                    taxonomy: CATEGORY,
                    terms: [$categoryName],
                  },
                ],
              }, 
            }) {
            edges {
              node {
                title
                excerpt
                slug
                uri
                date
                dateGmt
                databaseId
                featuredImage {
                  node {
                    sourceUrl
                  }
                }
                categories {
                  edges {
                    node {
                      slug
                      name
                      id
                    }
                  }
                }
                author {
                  node {
                    slug
                    name
                    firstName
                    lastName
                    avatar {
                      url
                    }
                  }
                }
              }
            }
          }
        }
      `,
      {
        variables: {
          categoryName,
          limit,
          preview,
        },
        cacheSeconds: 30,
      }
    );

    // Transform the response to extract just the nodes
    const result = data?.posts?.edges.map((edge: any) => edge.node) || [];

    // Extract dependencies - these are the article IDs this cache entry depends on
    const dependencies = result
      .map((post: any) => post.databaseId?.toString())
      .filter(Boolean); // Remove any undefined values

    // Store in smart cache with dependencies
    // When any of these articles update, this cache entry will be automatically invalidated
    if (result.length > 0) {
      categoryCache.setWithDependencies(cacheKey, result, dependencies);
    }

    return result;
  } catch (error) {
    console.error(`Error fetching posts for category ${categoryName}:`, error);
    return [];
  }
}
