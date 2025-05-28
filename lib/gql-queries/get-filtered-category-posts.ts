// lib/gql-queries/get-filtered-category-posts.ts - FIXED VERSION
import { gqlFetchAPI } from "./gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "./get-filtered-category";
import { withSmartLRUCache } from "@/lib/cache/withSmartLRU";
import { filteredCategoryCache } from "@/lib/cache/smart-cache-registry";
import type { PostsResponse, PostsVariables } from "./get-filtered-category";

function generateCacheKey(variables: PostsVariables | any): string {
  const keyParts: string[] = [];

  if (variables.first) keyParts.push(`first:${variables.first}`);

  // CRITICAL FIX: Include offset in the cache key!
  if (variables.where?.offsetPagination?.offset !== undefined) {
    keyParts.push(`offset:${variables.where.offsetPagination.offset}`);
  }
  if (variables.where?.offsetPagination?.size !== undefined) {
    keyParts.push(`size:${variables.where.offsetPagination.size}`);
  }

  if (variables.where?.status) {
    keyParts.push(`status:${variables.where.status}`);
  }

  const taxQuery = variables.where?.taxQuery?.taxArray
    ?.map(
      (tax: any) =>
        `${tax.taxonomy}:${tax.field}:${tax.operator}:${tax.terms?.join(",")}`
    )
    .join("|");

  if (taxQuery) keyParts.push(`tax:${taxQuery}`);

  // Include excludeQuery in key if present
  if (variables.where?.excludeQuery) {
    keyParts.push(`hasExclude:true`);
  }

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

// Use withSmartLRUCache instead of withLRUCache
export const getFilteredCategoryPosts = withSmartLRUCache(
  generateCacheKey,
  rawGetFilteredCategoryPosts,
  filteredCategoryCache
);
