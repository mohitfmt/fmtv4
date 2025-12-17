import { categoryCache } from "../cache/smart-cache-registry";
import { withSmartLRUCache } from "../cache/withSmartLRU";
import { gqlFetchAPI } from "./gql-fetch-api";

async function rawGetCategoryNews(
  categoryName: string,
  limit: number,
  preview: boolean
) {
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
                tags {
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

    // ✅ DEFENSIVE: Validate response structure BEFORE accessing
    if (!data || typeof data !== "object") {
      console.error(
        `[getCategoryNews] Invalid response type for category "${categoryName}":`,
        typeof data
      );
      return [];
    }

    if (!data.posts) {
      console.error(
        `[getCategoryNews] Missing 'posts' in response for category "${categoryName}":`,
        Object.keys(data)
      );
      return [];
    }

    if (!Array.isArray(data.posts.edges)) {
      console.error(
        `[getCategoryNews] posts.edges is not an array for category "${categoryName}":`,
        typeof data.posts.edges,
        data.posts.edges
      );
      return [];
    }

    // ✅ SAFE: Now we know structure is valid
    const posts = data.posts.edges.map((edge: any) => edge.node);

    // ✅ LOG: Success or empty result
    if (posts.length === 0) {
      console.warn(
        `[getCategoryNews] Category "${categoryName}" returned 0 posts (limit: ${limit})`
      );
    } else if (process.env.NODE_ENV === "development") {
      console.log(
        `[getCategoryNews] Category "${categoryName}": ${posts.length} posts`
      );
    }

    return posts;
  } catch (error: any) {
    console.error(
      `[getCategoryNews] Error fetching category "${categoryName}":`,
      error.message || error
    );
    return [];
  }
}

// Use smart cache wrapper
export const getCategoryNews = withSmartLRUCache(
  (categoryName: string, limit: number, preview: boolean) =>
    `category:${categoryName}:${limit}:${preview}`,
  rawGetCategoryNews,
  categoryCache
);
