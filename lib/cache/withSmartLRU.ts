// lib/cache/withSmartLRU.ts
import { SmartNewsCache } from "./news-portal-cache-system";

// Category mappings from CMS to Frontend
const categoryMappings: Record<string, string> = {
  // Main categories
  bahasa: "berita",
  leisure: "lifestyle",
  nation: "news",
  business: "business",
  opinion: "opinion",
  sports: "sports",
  world: "world",

  // Subcategory mappings
  tempatan: "berita",
  pandangan: "berita",
  dunia: "berita",
  "local-business": "business",
  "world-business": "business",
  column: "opinion",
  editorial: "opinion",
  letters: "opinion",
  football: "sports",
  badminton: "sports",
  motorsports: "sports",
  tennis: "sports",
  "south-east-asia": "world",

  // Lifestyle subcategories
  "simple-stories": "lifestyle",
  travel: "lifestyle",
  food: "lifestyle",
  entertainment: "lifestyle",
  money: "lifestyle",
  health: "lifestyle",
  pets: "lifestyle",
  tech: "lifestyle",
  automotive: "lifestyle",
  property: "lifestyle",

  // Special mappings
  sabahsarawak: "news",
  "fmt-worldviews": "opinion",
};

const categoryIdToSlugMap: Record<number, string> = {
  // Homepage/Highlights
  127940: "super-highlight",
  45: "highlight",

  // News
  123704: "top-news",
  1: "nation",
  1099: "sabahsarawak",

  // Berita
  187155: "super-bm",
  183: "bahasa",
  118582: "tempatan",
  118583: "dunia",
  118584: "pandangan",
  123705: "top-bm",

  // Opinion
  13: "opinion",
  118585: "column",
  205: "letters",
  313: "editorial",
  311905: "analysis",
  124473: "top-opinion",

  // World
  195: "world",
  127852: "top-world",

  // Lifestyle
  15: "leisure",
  118596: "property",
  130532: "travel",
  118599: "automotive",
  118598: "food",
  118600: "health",
  118601: "entertainment",
  29628: "money",
  160346: "pets",
  188599: "simple-stories",
  222994: "tech",
  127849: "top-lifestyle",

  // Business
  187: "business",
  118602: "world-business",
  118603: "local-business",
  127850: "top-business",

  // Sports
  196: "sports",
  118604: "football",
  150965: "badminton",
  150966: "motorsports",
  118605: "tennis",
  127851: "top-sports",
};

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

    // Extract dependencies with enhanced extraction
    const { dependencies, affectedPaths } = extractDependenciesEnhanced(
      result,
      key
    );

    // Store with dependencies
    if (result && dependencies.length > 0) {
      cache.setWithDependencies(key, result, dependencies);

      // Register navigation paths that should be invalidated
      if (affectedPaths.length > 0) {
        cache.setNavigationPaths(key, affectedPaths);
      }

      if (process.env.DEBUG_CACHE === "true") {
        console.log(
          `[Cache MISS] - ${key} - Tracking ${dependencies.length} dependencies, ${affectedPaths.length} paths`
        );
      }
    } else if (result) {
      // Still cache even without dependencies
      cache.set(key, result);
      if (process.env.DEBUG_CACHE === "true") {
        console.log(`[Cache MISS] - ${key} - No dependencies found`);
      }
    }

    return result;
  }) as T;
}

/**
 * Enhanced recursive dependency extraction
 */
function extractDependenciesEnhanced(
  data: any,
  cacheKey: string
): {
  dependencies: string[];
  affectedPaths: string[];
} {
  const dependencies = new Set<string>();
  const affectedPaths = new Set<string>();
  const visited = new WeakSet();

  // Recursive function to extract all databaseIds
  function extractRecursive(obj: any, path: string[] = []): void {
    // Prevent infinite loops with circular references
    if (!obj || typeof obj !== "object" || visited.has(obj)) {
      return;
    }
    visited.add(obj);

    // Check if current object has databaseId
    if (obj.databaseId) {
      const id = obj.databaseId.toString();
      dependencies.add(id);

      // Track category dependencies
      if (obj.slug && categoryIdToSlugMap[obj.databaseId]) {
        const categorySlug = categoryIdToSlugMap[obj.databaseId];
        const frontendPath = categoryMappings[categorySlug] || categorySlug;

        // Add main category page
        affectedPaths.add(`/${frontendPath}`);

        // Add category listing pages
        affectedPaths.add(`/category/category/${categorySlug}`);

        // If it's a subcategory, add parent paths too
        if (path.includes("categories") || path.includes("tags")) {
          affectedPaths.add("/"); // Homepage

          // Add parent category if it's a subcategory
          const parentMapping = Object.entries(categoryMappings).find(
            ([_, frontend]) => frontend === frontendPath
          );
          if (parentMapping) {
            affectedPaths.add(`/category/category/${parentMapping[0]}`);
          }
        }
      }

      // Handle special content types
      if (path.includes("user") || path.includes("author")) {
        dependencies.add(`user:${id}`);
        if (obj.slug) {
          affectedPaths.add(`/category/author/${obj.slug}`);
        }
      }

      if (path.includes("tag")) {
        dependencies.add(`tag:${id}`);
        if (obj.slug) {
          affectedPaths.add(`/category/tag/${obj.slug}`);
        }
      }
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        extractRecursive(item, [...path, `[${index}]`]);
      });
      return;
    }

    // Recursively process all object properties
    Object.entries(obj).forEach(([key, value]) => {
      if (value && typeof value === "object") {
        extractRecursive(value, [...path, key]);
      }
    });
  }

  // Start recursive extraction
  extractRecursive(data);

  // Special handling for specific response types based on cache key
  if (cacheKey.includes("category:")) {
    const categoryMatch = cacheKey.match(/category:([^:]+)/);
    if (categoryMatch) {
      const category = categoryMatch[1];
      const frontendPath = categoryMappings[category] || category;
      affectedPaths.add(`/${frontendPath}`);
      affectedPaths.add(`/category/category/${category}`);
      affectedPaths.add("/"); // Homepage always affected by category changes
    }
  }

  if (cacheKey.includes("tag:")) {
    const tagMatch = cacheKey.match(/tag:([^:]+)/);
    if (tagMatch) {
      affectedPaths.add(`/category/tag/${tagMatch[1]}`);
    }
  }

  if (cacheKey.includes("author:")) {
    const authorMatch = cacheKey.match(/author:[^:]+:([^:]+)/);
    if (authorMatch) {
      affectedPaths.add(`/category/author/${authorMatch[1]}`);
    }
  }

  // Always include homepage for content changes
  if (dependencies.size > 0 && !cacheKey.includes("page:")) {
    affectedPaths.add("/");
  }

  // Debug logging
  if (process.env.DEBUG_CACHE === "true" && dependencies.size === 0) {
    console.warn(
      "[extractDependencies] No dependencies found in:",
      JSON.stringify(data).substring(0, 200) + "..."
    );
  }

  return {
    dependencies: Array.from(dependencies),
    affectedPaths: Array.from(affectedPaths),
  };
}
