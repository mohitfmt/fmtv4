import { gqlFetchAPI } from "./gql-fetch-api";
import { withLRUCache } from "@/lib/cache/withLRU";
import { LRUCache } from "lru-cache";

export const allPostSlugsCache = new LRUCache<string, any>({
  max: 1,
  ttl: 1000 * 60, // 1 minute
  allowStale: false,
  updateAgeOnGet: false,
});

async function rawGetAllPostsWithSlug() {
  try {
    const data = await gqlFetchAPI(`
      {
        posts(first: 100) {
          edges {
            node {
              slug
              uri
            }
          }
        }
      }
    `);

    if (!data?.posts?.edges?.length) {
      console.warn("[getAllPostsWithSlug] No posts found");
      return { edges: [] };
    }

    console.log(
      `[getAllPostsWithSlug] Fetched ${data.posts.edges.length} slugs`
    );
    return data.posts;
  } catch (error) {
    console.error("[getAllPostsWithSlug] Fetch failed:", error);
    return { edges: [] };
  }
}

export const getAllPostsWithSlug = withLRUCache(
  () => "post:all-slugs",
  rawGetAllPostsWithSlug,
  allPostSlugsCache
);
