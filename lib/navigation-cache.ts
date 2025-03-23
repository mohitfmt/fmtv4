// utils/navigation-cache.ts
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
 * Get all related paths that should be revalidated for a given category
 * This ensures we catch all places where the content might appear
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
 * Parse the article slug to extract categories
 * This function handles the complex URL structure to identify categories
 */
export function extractCategoriesFromSlug(slug: string): {
  category: string;
  subcategory?: string;
} {
  // Parse the slug to extract categories
  const parts = slug.split("/");

  // Handle direct category URLs
  if (parts[0] === "category") {
    if (parts.length > 2) {
      return {
        category: parts[1],
        subcategory: parts[2],
      };
    }
    return { category: parts[1] };
  }

  // Handle URLs with year/month/day structure
  // Format: category/subcategory/year/month/day/title
  if (parts.length >= 5 && !isNaN(Number(parts[2]))) {
    if (parts[0] === "bahasa") {
      return {
        category: "bahasa",
        subcategory: parts[1],
      };
    }

    return {
      category: parts[0],
      subcategory: parts[1] !== parts[0] ? parts[1] : undefined,
    };
  }

  // Default case - just return first part as category
  return { category: parts[0] };
}
