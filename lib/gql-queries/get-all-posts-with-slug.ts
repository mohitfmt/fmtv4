import { allPostSlugsCache } from "../cache/smart-cache-registry";
import { withSmartLRUCache } from "../cache/withSmartLRU";
import { gqlFetchAPI } from "./gql-fetch-api";

async function rawGetAllPostsWithSlug() {
  try {
    const data = await gqlFetchAPI(`
      {
        posts(first: 100) {
          edges {
            node {
              databaseId
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

export const getAllPostsWithSlug = withSmartLRUCache(
  () => "all-post-slugs", // Fixed cache key
  rawGetAllPostsWithSlug,
  allPostSlugsCache
);
