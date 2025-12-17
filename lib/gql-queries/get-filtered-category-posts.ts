// lib/gql-queries/get-filtered-category-posts.ts - FIXED VERSION
import { gqlFetchAPI } from "./gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "./get-filtered-category";
import { withSmartLRUCache } from "@/lib/cache/withSmartLRU";
import { filteredCategoryCache } from "@/lib/cache/smart-cache-registry";
import type { PostsResponse, PostsVariables } from "./get-filtered-category";

function generateCacheKey(variables: PostsVariables | any): string {
  const keyParts: string[] = [];

  if (variables.first) keyParts.push(`first:${variables.first}`);

  // Include pagination parameters
  if (variables.where?.offsetPagination?.offset !== undefined) {
    keyParts.push(`offset:${variables.where.offsetPagination.offset}`);
  }
  if (variables.where?.offsetPagination?.size !== undefined) {
    keyParts.push(`size:${variables.where.offsetPagination.size}`);
  }

  // Include status filter
  if (variables.where?.status) {
    keyParts.push(`status:${variables.where.status}`);
  }

  // CRITICAL FIX: Include author filter in cache key!
  if (variables.where?.author) {
    keyParts.push(`author:${variables.where.author}`);
  }

  // Include category filter if present
  if (variables.where?.categoryId) {
    keyParts.push(`categoryId:${variables.where.categoryId}`);
  }

  // Include tag filter if present
  if (variables.where?.tag) {
    keyParts.push(`tag:${variables.where.tag}`);
  }

  // Include taxonomy queries
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

  // Include any date queries
  if (variables.where?.dateQuery) {
    keyParts.push(`hasDateQuery:true`);
  }

  return `filteredPosts:${keyParts.join(":")}`;
}

async function rawGetFilteredCategoryPosts(
  variables: PostsVariables | any
): Promise<PostsResponse | any> {
  const categorySlug =
    variables?.where?.taxQuery?.taxArray?.[0]?.terms?.[0] || "unknown";

  try {
    const data = await gqlFetchAPI(GET_FILTERED_CATEGORY, { variables });

    // ✅ DEFENSIVE: Validate response structure
    if (!data || typeof data !== "object") {
      console.error(
        `[getFilteredCategoryPosts] Invalid response type for category "${categorySlug}":`,
        typeof data
      );
      return { posts: { edges: [] } };
    }

    if (!data.posts) {
      console.error(
        `[getFilteredCategoryPosts] Missing 'posts' in response for category "${categorySlug}":`,
        Object.keys(data)
      );
      return { posts: { edges: [] } };
    }

    if (!Array.isArray(data.posts.edges)) {
      console.error(
        `[getFilteredCategoryPosts] posts.edges is not an array for category "${categorySlug}":`,
        typeof data.posts.edges,
        data.posts.edges
      );
      return { posts: { edges: [] } };
    }

    // ✅ LOG SUCCESS (only in development or if empty)
    if (
      process.env.NODE_ENV === "development" ||
      data.posts.edges.length === 0
    ) {
      console.log(
        `[getFilteredCategoryPosts] Category "${categorySlug}": ${data.posts.edges.length} posts`
      );
    }

    return data?.posts ? data : { posts: { edges: [] } };
  } catch (error: any) {
    console.error(
      `[getFilteredCategoryPosts] Error fetching category "${categorySlug}":`,
      error.message
    );

    // ✅ RETURN SAFE FALLBACK instead of throwing
    return { posts: { edges: [] } };
  }
}

export const getFilteredCategoryPosts = withSmartLRUCache(
  generateCacheKey,
  rawGetFilteredCategoryPosts,
  filteredCategoryCache
);
