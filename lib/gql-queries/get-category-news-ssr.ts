// lib/gql-queries/get-category-news-ssr.ts
// Direct category news fetcher for SSR that bypasses LRU cache

import { gqlFetchAPI } from "./gql-fetch-api";

/**
 * Direct GraphQL fetch for SSR - bypasses LRU cache
 * Use this in getServerSideProps to avoid cache issues
 */
export async function getCategoryNewsSSR(
  categoryName: string,
  limit: number,
  preview: boolean = false
): Promise<any[]> {
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
                databaseId
                title
                excerpt
                slug
                uri
                date
                dateGmt
                featuredImage {
                  node {
                    sourceUrl
                  }
                }
                categories {
                  edges {
                    node {
                      databaseId
                      slug
                      name
                      id
                    }
                  }
                }
                author {
                  node {
                    databaseId
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
      }
    );

    // Extract nodes from edges and return array
    const posts = data?.posts?.edges?.map((edge: any) => edge.node) || [];

    // Ensure we always return an array
    return Array.isArray(posts) ? posts : [];
  } catch (error) {
    console.error(
      `[getCategoryNewsSSR] Error fetching ${categoryName}:`,
      error
    );
    // Always return empty array on error
    return [];
  }
}

/**
 * Helper for SSR to fetch and filter posts like the original
 */
export async function getFilteredCategoryNewsSSR(
  categoryName: string,
  limit: number,
  excludeSlugs: string[] = [],
  additionalExcludes: string[] = [],
  preview: boolean = false
): Promise<any[]> {
  try {
    // Fetch extra posts to account for exclusions
    const fetchLimit = limit + excludeSlugs.length + additionalExcludes.length;
    const allPosts = await getCategoryNewsSSR(
      categoryName,
      fetchLimit,
      preview
    );

    // Filter and limit
    return allPosts
      .filter(
        (post: any) =>
          post?.slug &&
          !excludeSlugs.includes(post.slug) &&
          !additionalExcludes.includes(post.slug)
      )
      .slice(0, limit);
  } catch (error) {
    console.error(
      `[getFilteredCategoryNewsSSR] Error for ${categoryName}:`,
      error
    );
    return [];
  }
}
