// constants/canonical-url-mappings.ts

import siteConfig from "@/constants/site-config";

/**
 * Canonical URL Mapping Configuration
 * Maps duplicate URLs to their canonical versions
 */

interface UrlMapping {
  canonical: string;
  alternates: string[];
  type: "category" | "subcategory" | "section";
  priority: number; // For sitemap priority
}

// Main category mappings - shorter URLs are canonical
export const CATEGORY_URL_MAPPINGS: Record<string, UrlMapping> = {
  // News Section
  news: {
    canonical: "/news",
    alternates: ["/category/category/nation", "/category/nation"],
    type: "section",
    priority: 0.9,
  },

  // Berita (Bahasa) Section
  berita: {
    canonical: "/berita",
    alternates: ["/category/category/bahasa", "/category/bahasa"],
    type: "section",
    priority: 0.9,
  },

  // Business Section
  business: {
    canonical: "/business",
    alternates: [
      "/category/category/business",
      "/category/business",
      "/category/category/top-business",
    ],
    type: "section",
    priority: 0.8,
  },

  // Lifestyle Section
  lifestyle: {
    canonical: "/lifestyle",
    alternates: ["/category/category/leisure", "/category/leisure"],
    type: "section",
    priority: 0.8,
  },

  // Opinion Section
  opinion: {
    canonical: "/opinion",
    alternates: ["/category/category/opinion", "/category/opinion"],
    type: "section",
    priority: 0.8,
  },

  // Sports Section
  sports: {
    canonical: "/sports",
    alternates: ["/category/category/sports", "/category/sports"],
    type: "section",
    priority: 0.8,
  },

  // World Section
  world: {
    canonical: "/world",
    alternates: ["/category/category/world", "/category/world"],
    type: "section",
    priority: 0.8,
  },
};

// Subcategory mappings
export const SUBCATEGORY_MAPPINGS: Record<string, UrlMapping> = {
  // News Subcategories
  sabahsarawak: {
    canonical: "/category/category/nation/sabahsarawak",
    alternates: ["/category/nation/sabahsarawak", "/news/sabah-sarawak"],
    type: "subcategory",
    priority: 0.7,
  },
  "south-east-asia": {
    canonical: "/category/category/south-east-asia",
    alternates: ["/category/south-east-asia", "/world/southeast-asia"],
    type: "subcategory",
    priority: 0.7,
  },

  // Bahasa Subcategories
  tempatan: {
    canonical: "/category/category/bahasa/tempatan",
    alternates: ["/category/bahasa/tempatan", "/berita/tempatan"],
    type: "subcategory",
    priority: 0.7,
  },
  pandangan: {
    canonical: "/category/category/bahasa/pandangan",
    alternates: ["/category/bahasa/pandangan", "/berita/pandangan"],
    type: "subcategory",
    priority: 0.7,
  },
  dunia: {
    canonical: "/category/category/bahasa/dunia",
    alternates: ["/category/bahasa/dunia", "/berita/dunia"],
    type: "subcategory",
    priority: 0.7,
  },

  // Business Subcategories
  "local-business": {
    canonical: "/category/category/business/local-business",
    alternates: ["/category/business/local-business", "/business/local"],
    type: "subcategory",
    priority: 0.7,
  },
  "world-business": {
    canonical: "/category/category/business/world-business",
    alternates: ["/category/business/world-business", "/business/world"],
    type: "subcategory",
    priority: 0.7,
  },

  // Lifestyle Subcategories
  "simple-stories": {
    canonical: "/category/category/leisure/simple-stories",
    alternates: ["/category/leisure/simple-stories", "/lifestyle/stories"],
    type: "subcategory",
    priority: 0.6,
  },
  food: {
    canonical: "/category/category/leisure/food",
    alternates: ["/category/leisure/food", "/lifestyle/food"],
    type: "subcategory",
    priority: 0.6,
  },
  entertainment: {
    canonical: "/category/category/leisure/entertainment",
    alternates: ["/category/leisure/entertainment", "/lifestyle/entertainment"],
    type: "subcategory",
    priority: 0.6,
  },
  health: {
    canonical: "/category/category/leisure/health",
    alternates: ["/category/leisure/health", "/lifestyle/health"],
    type: "subcategory",
    priority: 0.6,
  },
  money: {
    canonical: "/category/category/leisure/money",
    alternates: ["/category/leisure/money", "/lifestyle/money"],
    type: "subcategory",
    priority: 0.6,
  },
  travel: {
    canonical: "/category/category/leisure/travel",
    alternates: ["/category/leisure/travel", "/lifestyle/travel"],
    type: "subcategory",
    priority: 0.6,
  },
  tech: {
    canonical: "/category/category/leisure/tech",
    alternates: ["/category/leisure/tech", "/lifestyle/tech"],
    type: "subcategory",
    priority: 0.6,
  },
  pets: {
    canonical: "/category/category/leisure/pets",
    alternates: ["/category/leisure/pets", "/lifestyle/pets"],
    type: "subcategory",
    priority: 0.6,
  },
  automotive: {
    canonical: "/category/category/leisure/automotive",
    alternates: ["/category/leisure/automotive", "/lifestyle/automotive"],
    type: "subcategory",
    priority: 0.6,
  },
  property: {
    canonical: "/category/category/leisure/property",
    alternates: ["/category/leisure/property", "/lifestyle/property"],
    type: "subcategory",
    priority: 0.6,
  },

  // Opinion Subcategories
  editorial: {
    canonical: "/category/category/opinion/editorial",
    alternates: ["/category/opinion/editorial", "/opinion/editorial"],
    type: "subcategory",
    priority: 0.7,
  },
  column: {
    canonical: "/category/category/opinion/column",
    alternates: ["/category/opinion/column", "/opinion/columns"],
    type: "subcategory",
    priority: 0.7,
  },
  letters: {
    canonical: "/category/category/opinion/letters",
    alternates: ["/category/opinion/letters", "/opinion/letters"],
    type: "subcategory",
    priority: 0.7,
  },
  "fmt-worldviews": {
    canonical: "/category/category/fmt-worldviews",
    alternates: ["/category/fmt-worldviews", "/opinion/worldviews"],
    type: "subcategory",
    priority: 0.7,
  },

  // Sports Subcategories
  football: {
    canonical: "/category/category/sports/football",
    alternates: ["/category/sports/football", "/sports/football"],
    type: "subcategory",
    priority: 0.6,
  },
  badminton: {
    canonical: "/category/category/sports/badminton",
    alternates: ["/category/sports/badminton", "/sports/badminton"],
    type: "subcategory",
    priority: 0.6,
  },
  motorsports: {
    canonical: "/category/category/sports/motorsports",
    alternates: ["/category/sports/motorsports", "/sports/racing"],
    type: "subcategory",
    priority: 0.6,
  },
  tennis: {
    canonical: "/category/category/sports/tennis",
    alternates: ["/category/sports/tennis", "/sports/tennis"],
    type: "subcategory",
    priority: 0.6,
  },

  // Education
  education: {
    canonical: "/category/category/education",
    alternates: ["/category/education", "/news/education"],
    type: "subcategory",
    priority: 0.6,
  },
};

// Build reverse mapping for quick lookups
const buildReverseMapping = (): Map<string, string> => {
  const reverseMap = new Map<string, string>();

  // Add main category mappings
  Object.values(CATEGORY_URL_MAPPINGS).forEach((mapping) => {
    reverseMap.set(mapping.canonical, mapping.canonical);
    mapping.alternates.forEach((alt) => {
      reverseMap.set(alt, mapping.canonical);
    });
  });

  // Add subcategory mappings
  Object.values(SUBCATEGORY_MAPPINGS).forEach((mapping) => {
    reverseMap.set(mapping.canonical, mapping.canonical);
    mapping.alternates.forEach((alt) => {
      reverseMap.set(alt, mapping.canonical);
    });
  });

  return reverseMap;
};

// Cache the reverse mapping
const CANONICAL_URL_MAP = buildReverseMapping();

/**
 * Get the canonical URL for a given path
 */
export const getCanonicalUrl = (path: string): string => {
  // Normalize the path
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Check if this path has a canonical mapping
  const canonicalPath = CANONICAL_URL_MAP.get(normalizedPath);

  if (canonicalPath) {
    return `${siteConfig.baseUrl}${canonicalPath}`;
  }

  // If no mapping found, return the original path as canonical
  return `${siteConfig.baseUrl}${normalizedPath}`;
};

/**
 * Check if a path is already canonical
 */
export const isCanonicalPath = (path: string): boolean => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalPath = CANONICAL_URL_MAP.get(normalizedPath);
  return canonicalPath === normalizedPath;
};

/**
 * Get all alternate URLs for a given path
 */
export const getAlternateUrls = (path: string): string[] => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Find the mapping that contains this path
  for (const mapping of Object.values(CATEGORY_URL_MAPPINGS)) {
    if (mapping.canonical === normalizedPath) {
      return mapping.alternates;
    }
    if (mapping.alternates.includes(normalizedPath)) {
      return [
        mapping.canonical,
        ...mapping.alternates.filter((alt) => alt !== normalizedPath),
      ];
    }
  }

  for (const mapping of Object.values(SUBCATEGORY_MAPPINGS)) {
    if (mapping.canonical === normalizedPath) {
      return mapping.alternates;
    }
    if (mapping.alternates.includes(normalizedPath)) {
      return [
        mapping.canonical,
        ...mapping.alternates.filter((alt) => alt !== normalizedPath),
      ];
    }
  }

  return [];
};

/**
 * Get the priority for a given path (for sitemap generation)
 */
export const getUrlPriority = (path: string): number => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Check main categories
  for (const mapping of Object.values(CATEGORY_URL_MAPPINGS)) {
    if (
      mapping.canonical === normalizedPath ||
      mapping.alternates.includes(normalizedPath)
    ) {
      return mapping.priority;
    }
  }

  // Check subcategories
  for (const mapping of Object.values(SUBCATEGORY_MAPPINGS)) {
    if (
      mapping.canonical === normalizedPath ||
      mapping.alternates.includes(normalizedPath)
    ) {
      return mapping.priority;
    }
  }

  // Default priority for unmapped paths
  return 0.5;
};

/**
 * Get redirect URL if the current path should be redirected to canonical
 */
export const getRedirectUrl = (path: string): string | null => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalPath = CANONICAL_URL_MAP.get(normalizedPath);

  if (canonicalPath && canonicalPath !== normalizedPath) {
    return canonicalPath;
  }

  return null;
};

/**
 * Category path normalizer for consistent URLs
 */
export const normalizeCategoryPath = (path: string): string => {
  // Remove trailing slashes
  let normalized = path.replace(/\/+$/, "");

  // Remove duplicate slashes
  normalized = normalized.replace(/\/+/g, "/");

  // Ensure leading slash
  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  return normalized;
};
