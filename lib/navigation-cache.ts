// lib/navigation-cache.ts
import { navigation } from "../constants/navigation";

/**
 * Interface for navigation items
 */
interface NavigationItem {
  id: number;
  title: string;
  href: string;
  items?: NavigationItem[];
}

/**
 * Extract all paths from the navigation structure
 * This helps ensure we revalidate all relevant paths when content changes
 */
export function getAllNavigationPaths(): string[] {
  const paths: string[] = [];

  // Helper function to process a navigation item and its children
  const processItem = (item: NavigationItem) => {
    // Add the item's path
    paths.push(item.href);

    // Process any subitems
    if (item.items && item.items.length > 0) {
      item.items.forEach(processItem);
    }
  };

  // Process all navigation items
  navigation.forEach(processItem);

  return paths;
}

/**
 * Normalize a path to ensure it has the correct format
 * This function is now aligned with the normalizePath function in middleware and revalidate
 */
export function normalizePath(path: string): string {
  // Ensure path starts with a leading slash
  let normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Ensure path ends with a trailing slash
  if (!normalizedPath.endsWith("/")) {
    normalizedPath = `${normalizedPath}/`;
  }

  // Handle special pages
  const specialPaths = [
    "/photos/",
    "/videos/",
    "/accelerator/",
    "/contact-us/",
    "/about/",
    "/privacy-policy/",
  ];
  if (specialPaths.includes(normalizedPath)) {
    return normalizedPath;
  }

  // Handle main section pages without needing to add category prefix
  const mainSections = [
    "/news/",
    "/berita/",
    "/business/",
    "/lifestyle/",
    "/opinion/",
    "/world/",
    "/sports/",
  ];
  if (mainSections.includes(normalizedPath)) {
    return normalizedPath;
  }

  // Handle case where we already have double category
  if (normalizedPath.includes("/category/category/")) {
    return normalizedPath;
  }

  // Handle case where we have a standard article path
  if (normalizedPath.includes("/category/")) {
    return normalizedPath;
  }

  // If none of the above, assume it's an article path that needs the category prefix
  if (!normalizedPath.startsWith("/category/")) {
    // Strip leading slash first to avoid double slashes
    const pathWithoutLeadingSlash = normalizedPath.startsWith("/")
      ? normalizedPath.substring(1)
      : normalizedPath;

    normalizedPath = `/category/${pathWithoutLeadingSlash}`;
  }

  return normalizedPath;
}

/**
 * Get frontend path for a WordPress category
 * Handles the complex mapping between WP categories and frontend routes
 */
export function getFrontendPathForCategory(
  category: string,
  subcategory?: string
): string | null {
  // Special case for bahasa section
  if (category === "bahasa") {
    return "/berita";
  }

  // Special case for nation (maps to news)
  if (category === "nation") {
    return "/news";
  }

  // Special case for leisure (maps to lifestyle)
  if (category === "leisure") {
    return "/lifestyle";
  }

  // Find direct matches in navigation
  for (const item of navigation) {
    if (item.href.includes(`/category/${category}/`)) {
      return item.href;
    }

    // Check subitems
    if (item.items) {
      for (const subitem of item.items) {
        if (
          subitem.href.includes(`/category/${category}/`) ||
          (subcategory &&
            subitem.href.includes(`/category/${category}/${subcategory}/`))
        ) {
          return subitem.href;
        }
      }
    }
  }

  // For other categories, try a direct mapping
  const directMap: Record<string, string> = {
    business: "/business",
    opinion: "/opinion",
    world: "/world",
    sports: "/sports",
    "south-east-asia": "/world",
    education: "/category/category/education",
    "fmt-worldviews": "/opinion",
  };

  return directMap[category] || null;
}

/**
 * Generate cache tags for a category - aligned with middleware and WebSub
 * This ensures consistent cache invalidation across all components
 */
export function generateCacheTagsForCategory(
  category: string,
  subcategory?: string
): string[] {
  const cacheTags: string[] = [];

  // Add category tag
  cacheTags.push(`category:${category}`);

  // Add subcategory tag if available
  if (subcategory) {
    cacheTags.push(`subcategory:${subcategory}`);
    cacheTags.push(`category-path:${category}/${subcategory}`);
  }

  // Add section tag for main categories
  const sectionMap: Record<string, string> = {
    nation: "news",
    bahasa: "berita",
    business: "business",
    opinion: "opinion",
    world: "world",
    sports: "sports",
    leisure: "lifestyle",
  };

  if (sectionMap[category]) {
    cacheTags.push(`section:${sectionMap[category]}`);
  }

  return cacheTags;
}

/**
 * Get all related paths that should be revalidated for a given category
 * This ensures we catch all places where the content might appear
 * Now returns both paths and cache tags for more efficient invalidation
 */
export function getRelatedPathsForCategory(
  category: string,
  subcategory?: string
): string[] {
  const paths: string[] = [];

  // Always add the homepage
  paths.push("/");

  // Add the direct category path
  const directPath = getFrontendPathForCategory(category, subcategory);
  if (directPath) {
    paths.push(directPath);
  }

  // Add the WordPress category path format
  if (subcategory) {
    paths.push(`/category/category/${category}/${subcategory}`);
  } else {
    paths.push(`/category/category/${category}`);
  }

  // Add parent category for subcategories
  if (subcategory) {
    const parentPath = getFrontendPathForCategory(category);
    if (parentPath) {
      paths.push(parentPath);
    }
  }

  // Special case handling based on the category
  switch (category) {
    case "bahasa":
      paths.push("/berita");
      break;
    case "nation":
      paths.push("/news");
      break;
    case "leisure":
      paths.push("/lifestyle");
      // Leisure also affects property and automotive sections
      paths.push("/category/category/leisure/property");
      paths.push("/category/category/leisure/automotive");
      break;
  }

  return paths.filter(
    (path, index, self) =>
      // Remove duplicates
      self.indexOf(path) === index
  );
}

/**
 * Get both paths and cache tags for a category
 * This is a new function that combines path generation and cache tag generation
 */
export function getRelatedPathsAndTags(
  category: string,
  subcategory?: string
): { paths: string[]; cacheTags: string[] } {
  const paths = getRelatedPathsForCategory(category, subcategory);
  const cacheTags = generateCacheTagsForCategory(category, subcategory);

  // Add path tags for each path
  paths.forEach((path) => {
    cacheTags.push(`path:${path}`);
  });

  return {
    paths,
    cacheTags: [...new Set(cacheTags)], // Remove duplicates
  };
}

/**
 * Parse the article slug to extract categories
 * This function handles the complex URL structure to identify categories
 * Enhanced to handle more edge cases
 */
export function extractCategoriesFromSlug(slug: string): {
  category: string;
  subcategory?: string;
} {
  // Normalize the slug first
  const normalizedSlug = slug.startsWith("/") ? slug.substring(1) : slug;
  const parts = normalizedSlug.split("/").filter(Boolean);

  // Remove 'category' prefix if present
  let workingParts = parts;
  if (parts[0] === "category") {
    workingParts = parts.slice(1);

    // Handle double category pattern (category/category/...)
    if (workingParts[0] === "category") {
      workingParts = workingParts.slice(1);
    }
  }

  // Now find where the date pattern starts
  const datePattern = /^\d{4}$/;
  let dateIndex = -1;

  for (let i = 0; i < workingParts.length; i++) {
    if (datePattern.test(workingParts[i])) {
      // Verify it's followed by month and day
      if (
        i + 2 < workingParts.length &&
        /^\d{2}$/.test(workingParts[i + 1]) &&
        /^\d{2}$/.test(workingParts[i + 2])
      ) {
        dateIndex = i;
        break;
      }
    }
  }

  // Extract category and subcategory based on date position
  if (dateIndex > 0) {
    if (dateIndex === 1) {
      // Format: category/year/month/day/slug
      return { category: workingParts[0] };
    } else if (dateIndex === 2) {
      // Format: category/subcategory/year/month/day/slug
      return {
        category: workingParts[0],
        subcategory: workingParts[1],
      };
    } else if (dateIndex === 3) {
      // Format: category/subcategory/subsubcategory/year/month/day/slug
      return {
        category: workingParts[0],
        subcategory: workingParts[1], // Could also include workingParts[2] if needed
      };
    }
  }

  // No date pattern found, use simpler logic
  if (workingParts.length >= 2) {
    return {
      category: workingParts[0],
      subcategory: workingParts[1],
    };
  }

  // Default case
  return { category: workingParts[0] || "uncategorized" };
}
