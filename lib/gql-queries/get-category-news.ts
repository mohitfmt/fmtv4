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
        // REMOVED cacheSeconds - let smart cache handle it
      }
    );

    return data?.posts || { edges: [] };
  } catch (error) {
    console.error(`Error fetching posts for category ${categoryName}:`, error);
    return { edges: [] };
  }
}

// Use smart cache wrapper
export const getCategoryNews = withSmartLRUCache(
  (categoryName: string, limit: number, preview: boolean) =>
    `category:${categoryName}:${limit}:${preview}`,
  rawGetCategoryNews,
  categoryCache
);
