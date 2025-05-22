// lib/gql-queries/get-filtered-category-posts.ts
import { gqlFetchAPI } from "./gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "./get-filtered-category";
import { withLRUCache } from "@/lib/cache/withLRU";
import { LRUCache } from "lru-cache";
import type { PostsResponse, PostsVariables } from "./get-filtered-category";

export const filteredCategoryCache = new LRUCache<string, PostsResponse>({
  max: 300,
  ttl: 1000 * 60 * 3, // 3 minutes
  allowStale: false,
  updateAgeOnGet: false,
});

function generateCacheKey(variables: PostsVariables): string {
  const keyParts: string[] = [];

  if (variables.first) keyParts.push(`first:${variables.first}`);
  if (variables.where?.status)
    keyParts.push(`status:${variables.where.status}`);

  const taxQuery = variables.where?.taxQuery?.taxArray
    ?.map(
      (tax) =>
        `${tax.taxonomy}:${tax.field}:${tax.operator}:${tax.terms?.join(",")}`
    )
    .join("|");

  if (taxQuery) keyParts.push(`tax:${taxQuery}`);

  return `filteredPosts:${keyParts.join(":")}`;
}

async function rawGetFilteredCategoryPosts(
  variables: PostsVariables | any
): Promise<PostsResponse | any> {
  try {
    const data = await gqlFetchAPI(GET_FILTERED_CATEGORY, { variables });
    return data?.posts ? data : { posts: { edges: [] } };
  } catch (error) {
    console.error("[getFilteredCategoryPosts] Error:", error);
    return { posts: { edges: [] } };
  }
}

export const getFilteredCategoryPosts = withLRUCache(
  generateCacheKey,
  rawGetFilteredCategoryPosts,
  filteredCategoryCache
);
