import { gqlFetchAPI } from "./gql-fetch-api";
import { withLRUCache } from "@/lib/cache/withLRU";
import { LRUCache } from "lru-cache";

const COLUMNISTS_CACHE_TTL = 1000 * 60 * 10; // 10 minutes

// Setup cache
export const columnistCache = new LRUCache<string, any[]>({
  max: 50,
  ttl: COLUMNISTS_CACHE_TTL,
  allowStale: false,
  updateAgeOnGet: false,
});

async function rawGetColumnists(
  ids: string[],
  preview: boolean
): Promise<any[]> {
  const query = `
    query Author(
      $first: Int
      $where: RootQueryToUserConnectionWhereArgs
      $afterPost: String
      $wherePost: UserToPostConnectionWhereArgs
      $firstPost: Int
    ) {
      users(first: $first, where: $where) {
        edges {
          node {
            id
            name
            uri
            avatar {
              url
            }
            description
            posts(after: $afterPost, where: $wherePost, first: $firstPost) {
              nodes {
                title
                uri
                dateGmt
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    first: ids?.length ?? 1,
    where: { include: ids?.length > 0 ? ids : [] },
    afterPost: "",
    wherePost: {
      status: "PUBLISH",
      taxQuery: {
        taxArray: [
          {
            terms: ["opinion"],
            operator: "AND",
            taxonomy: "CATEGORY",
            field: "SLUG",
          },
        ],
        relation: "AND",
      },
    },
    firstPost: 1,
    preview,
  };

  try {
    const data = await gqlFetchAPI(query, { variables });
    return data?.users?.edges?.map((edge: any) => edge.node) || [];
  } catch (error) {
    console.error("[getColumnists] Error fetching columnists:", error);
    return [];
  }
}

export const getColumnists = withLRUCache(
  (ids, preview) => `columnists:${ids?.join(",")}:${preview ? "p" : "np"}`,
  rawGetColumnists,
  columnistCache
);
