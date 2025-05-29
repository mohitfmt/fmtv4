import { withSmartLRUCache } from "../cache/withSmartLRU";
import { gqlFetchAPI } from "./gql-fetch-api";
import { headlineNewsCache } from "../cache/smart-cache-registry";

async function rawGetHeadlineNews(
  categoryName: string,
  limit: number,
  preview: boolean
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
              slug
              uri
              date
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
            }
          }
        }
      }`,
      {
        variables: {
          categoryName,
          limit,
          preview,
        },
      }
    );

    return data?.posts?.edges.map((edge: any) => edge.node) || [];
  } catch (error) {
    console.error(`[getHeadlineNews] Error for ${categoryName}:`, error);
    return [];
  }
}

export const getHeadlineNews = withSmartLRUCache(
  (categoryName: string, limit: number, preview: boolean) =>
    `headline:${categoryName}:${limit}:${preview ? "p" : "np"}`,
  rawGetHeadlineNews,
  headlineNewsCache
);
