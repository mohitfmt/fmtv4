import { gqlFetchAPI } from "./gql-fetch-api";
import { withLRUCache } from "@/lib/cache/withLRU";
import { LRUCache } from "lru-cache";

// LRU cache setup
export const headlineNewsCache = new LRUCache<string, any[]>({
  max: 100,
  ttl: 1000 * 60, // 1 minute
  allowStale: false,
  updateAgeOnGet: false,
});

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
              title
              slug
              uri
              date
              categories {
                edges {
                  node {
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

export const getHeadlineNews = withLRUCache(
  (categoryName: string, limit: number, preview: boolean) =>
    `headline:${categoryName}:${limit}:${preview ? "p" : "np"}`,
  rawGetHeadlineNews,
  headlineNewsCache
);
