// lib/cache/withSmartLRU.ts
/**
 * Enhanced version of withLRU that adds dependency tracking
 * This is a drop-in replacement for your existing withLRUCache
 */

import { SmartNewsCache } from "./news-portal-cache-system";

export function withSmartLRUCache<T extends (...args: any[]) => Promise<any>>(
  keyFn: (...args: Parameters<T>) => string,
  fetchFn: T,
  cache: SmartNewsCache<any>
): T {
  return (async (...args: Parameters<T>) => {
    const key = keyFn(...args);

    // Check cache first
    const cached = cache.get(key);
    if (cached) return cached;

    // Fetch data
    const result = await fetchFn(...args);

    // Extract dependencies based on the result structure
    const dependencies = extractDependencies(result);

    // Store with dependencies
    if (result) {
      cache.setWithDependencies(key, result, dependencies);
    }

    return result;
  }) as T;
}

/**
 * Intelligent dependency extraction from GraphQL responses
 * This understands your data structure and extracts article IDs
 */
function extractDependencies(data: any): string[] {
  const dependencies = new Set<string>();

  // Handle single post responses
  if (data?.post?.databaseId) {
    dependencies.add(data.post.databaseId.toString());
  }

  // Handle user/author responses
  if (data?.user?.databaseId) {
    dependencies.add(`user:${data.user.databaseId}`);
  }

  // Handle posts array responses (most common)
  if (data?.posts?.edges) {
    data.posts.edges.forEach((edge: any) => {
      if (edge.node?.databaseId) {
        dependencies.add(edge.node.databaseId.toString());
      }
    });
  }

  // Handle direct array of posts
  if (Array.isArray(data)) {
    data.forEach((item: any) => {
      if (item?.databaseId) {
        dependencies.add(item.databaseId.toString());
      }
    });
  }

  // Handle paginated responses with nodes
  if (data?.edges) {
    data.edges.forEach((edge: any) => {
      if (edge.node?.databaseId) {
        dependencies.add(edge.node.databaseId.toString());
      }
    });
  }

  return Array.from(dependencies);
}
