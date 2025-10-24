// constants/jsonlds/shared-schemas.ts
/**
 * Shared JSON-LD schema functions
 *
 * ARCHITECTURE:
 * - org.ts = SINGLE SOURCE OF TRUTH for organization data
 * - This file = Helper functions that return reusable schema components
 * - All other files import from these two files only
 *
 * NEVER duplicate organization data!
 */

import siteConfig from "@/constants/site-config";
import { OrgJsonLD, FullOrgJsonLD } from "./org";

/**
 * Get full organization schema with ALL details
 * Use this on About page or when you need complete organization information
 * Includes: policies, multiple contact points, founder, awards, etc.
 */
export const getFullOrganization = () => {
  return {
    ...FullOrgJsonLD, // Use enriched version
    "@id": `${siteConfig.baseUrl}#organization`, // Always include @id as identifier
  };
};

/**
 * Get lightweight organization for publisher/provider fields
 * Use this in articles, services, category pages, etc.
 * This is the MOST COMMONLY USED helper function
 */
export const getLightweightOrganization = () => {
  return {
    "@type": "NewsMediaOrganization",
    "@id": `${siteConfig.baseUrl}#organization`,
    name: siteConfig.siteName,
    url: siteConfig.baseUrl,
    logo: OrgJsonLD.logo, // Reuse from org.ts
  };
};

/**
 * Get minimal organization reference
 * Use this ONLY when the full organization is already in the same @graph
 * (Spoiler: You probably won't use this much because cross-page references don't work)
 */
export const getOrganizationReference = () => {
  return {
    "@id": `${siteConfig.baseUrl}#organization`,
  };
};

/**
 * Get website schema
 * Reusable website schema for isPartOf fields
 * Moved from org.ts for better organization
 */
export const getWebsiteSchema = () => {
  return {
    "@type": "WebSite",
    "@id": `${siteConfig.baseUrl}#website`,
    url: siteConfig.baseUrl,
    name: siteConfig.siteName,
    description: siteConfig.siteDescription,
    publisher: getLightweightOrganization(),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.baseUrl}/search/?term={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: ["en-MY", "ms-MY"],
  };
};

/**
 * Get WebPage schema
 * Reusable for any page on the site
 * Moved from org.ts for better organization
 */
export const getWebPageSchema = (options?: {
  url?: string;
  name?: string;
  description?: string;
  inLanguage?: string[];
}) => {
  return {
    "@type": "WebPage",
    "@id": options?.url || siteConfig.baseUrl,
    url: options?.url || siteConfig.baseUrl,
    name: options?.name || siteConfig.siteName,
    ...(options?.description && { description: options.description }),
    inLanguage: options?.inLanguage || ["en-MY", "ms-MY"],
    publisher: getLightweightOrganization(),
    isPartOf: {
      "@id": `${siteConfig.baseUrl}#website`,
    },
  };
};

/**
 * Generate breadcrumb schema
 * @param items - Array of {name: string, url: string}
 */
export const generateBreadcrumbSchema = (
  items: Array<{ name: string; url: string }>
) => {
  return {
    "@type": "BreadcrumbList",
    "@id": `${items[items.length - 1].url}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};
