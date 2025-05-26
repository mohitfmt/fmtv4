// lib/gql-queries/get-filtered-category-posts.ts - UPDATED VERSION
import { gqlFetchAPI } from "./gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "./get-filtered-category";
import { withSmartLRUCache } from "@/lib/cache/withSmartLRU";
import { filteredCategoryCache } from "@/lib/cache/smart-cache-registry";
import type { PostsResponse, PostsVariables } from "./get-filtered-category";

// Remove old cache creation - now using smart cache from registry

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

// Use withSmartLRUCache instead of withLRUCache
export const getFilteredCategoryPosts = withSmartLRUCache(
  generateCacheKey,
  rawGetFilteredCategoryPosts,
  filteredCategoryCache
);
