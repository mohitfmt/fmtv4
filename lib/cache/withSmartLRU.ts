// lib/cache/withSmartLRU.ts
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
    if (cached) {
      if (process.env.DEBUG_CACHE === "true") {
        console.log(`[Cache HIT] - ${key}`);
      }
      return cached;
    }

    // Fetch data
    const result = await fetchFn(...args);

    // Extract dependencies
    const dependencies = extractDependencies(result);

    // Store with dependencies
    if (result && dependencies.length > 0) {
      cache.setWithDependencies(key, result, dependencies);
      if (process.env.DEBUG_CACHE === "true") {
        console.log(
          `[Cache MISS] - ${key} - Tracking ${dependencies.length} dependencies`
        );
      }
    } else if (result) {
      // Still cache even without dependencies
      cache.set(key, result);
      if (process.env.DEBUG_CACHE === "true") {
        console.log(
          `[Cache MISS] - ${key} - No dependencies found`
        );
      }
    }

    return result;
  }) as T;
}

/**
 * Enhanced dependency extraction that handles your data structures better
 */
function extractDependencies(data: any): string[] {
  const dependencies = new Set<string>();

  function extractFromNode(node: any) {
    if (node?.databaseId) {
      dependencies.add(node.databaseId.toString());
    }
  }

  function extractFromEdges(edges: any[]) {
    if (Array.isArray(edges)) {
      edges.forEach((edge) => {
        if (edge?.node) {
          extractFromNode(edge.node);
        }
      });
    }
  }

  // Handle single post responses
  if (data?.post) {
    extractFromNode(data.post);
  }

  // Handle user/author responses
  if (data?.user?.databaseId) {
    dependencies.add(`user:${data.user.databaseId}`);
  }

  // Handle posts array responses (most common)
  if (data?.posts?.edges) {
    extractFromEdges(data.posts.edges);
  }

  // Handle direct array of posts
  if (Array.isArray(data)) {
    data.forEach(extractFromNode);
  }

  // Handle paginated responses with edges at root
  if (data?.edges && Array.isArray(data.edges)) {
    extractFromEdges(data.edges);
  }

  // Debug logging
  if (dependencies.size === 0) {
    console.warn(
      "[extractDependencies] No dependencies found in:",
      JSON.stringify(data).substring(0, 200) + "..."
    );
  }

  return Array.from(dependencies);
}
