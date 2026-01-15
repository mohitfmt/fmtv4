// constants/jsonlds/category-json-ld.ts

import { stripHTML } from "@/lib/utils";
import siteConfig from "@/constants/site-config";
import { OrgJsonLD } from "./org";
import { getLightweightOrganization } from "./shared-schemas";
// import { PostCardProps } from "@/types/global";

interface CategoryJsonLDProps {
  posts: Array<{ node: any }>;
  url: string;
  title: string;
  description?: string;
  category?: string;
  articleCount?: number;
}

/**
 * Generate enhanced CollectionPage JSON-LD for category pages
 * Includes Speakable, mainEntity, publisher, and rich structured data
 */
export const generateCategoryJsonLD = ({
  posts,
  url,
  title,
  description,
  category,
  articleCount,
}: CategoryJsonLDProps) => {
  // Generate NewsArticle items for the collection
  const newsArticles = posts.map(({ node }, index) => {
    const articleUrl = `${siteConfig.baseUrl}${node?.uri ?? "/404/"}`;
    const authorUrl = `${siteConfig.baseUrl}${node?.author?.node?.uri ?? "/category/author/fmtreporters/"}`;

    return {
      "@type": "NewsArticle",
      "@id": `${articleUrl}#article`,
      position: index + 1,
      url: articleUrl,
      headline: node?.title ?? "News Article",
      description: stripHTML(node?.excerpt ?? ""),
      datePublished: node?.dateGmt
        ? `${node.dateGmt}Z`
        : new Date().toISOString(),
      dateModified: node?.modifiedGmt
        ? `${node.modifiedGmt}Z`
        : node?.dateGmt
          ? `${node.dateGmt}Z`
          : new Date().toISOString(),

      // Enhanced image object
      image: {
        "@type": "ImageObject",
        url: node?.featuredImage?.node?.sourceUrl || `${siteConfig.iconPath}`,
        width: node?.featuredImage?.node?.mediaDetails?.width || 1200,
        height: node?.featuredImage?.node?.mediaDetails?.height || 630,
        caption:
          node?.featuredImage?.node?.caption || node?.title || "News Image",
      },

      // Author information
      author: {
        "@type": "Person",
        name: node?.author?.node?.name ?? "FMT Reporters",
        url: authorUrl,
        sameAs: [authorUrl],
      },

      // Publisher information
      publisher: {
        "@type": "NewsMediaOrganization",
        "@id": `${siteConfig.baseUrl}#organization`,
        name: siteConfig.siteName,
        url: siteConfig.baseUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteConfig.baseUrl}/icon-512x512.png`,
          width: 512,
          height: 512,
        },
        sameAs: [
          "https://www.facebook.com/FreeMalaysiaToday",
          "https://twitter.com/fmtoday",
          "https://www.instagram.com/freemalaysiatoday",
          "https://www.youtube.com/user/FreeMalaysiaTodayFMT",
          "https://www.linkedin.com/company/free-malaysia-today",
        ],
      },

      // Article section and keywords
      articleSection: category || title,
      keywords:
        node?.tags?.edges
          ?.map(({ node }: any) => node?.name)
          .filter(Boolean)
          .join(", ") ||
        category ||
        "",

      // Language
      inLanguage:
        category === "bahasa" || category === "berita" ? "ms-MY" : "en-MY",

      // Main entity reference
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": articleUrl,
      },

      // Is part of the collection
      isPartOf: {
        "@type": "CollectionPage",
        "@id": `${url}#collection`,
      },
    };
  });

  // Generate Speakable schema for voice search optimization
  const speakableContent = {
    "@type": "SpeakableSpecification",
    cssSelector: [
      "h1",
      ".article-title",
      ".article-headline",
      ".article-description",
      "[data-speakable]",
    ],
    xpath: [
      "/html/head/title",
      "/html/head/meta[@name='description']/@content",
    ],
  };

  // Generate ItemList for better Google understanding
  const itemList = {
    "@type": "ItemList",
    "@id": `${url}#itemlist`,
    numberOfItems: posts.length,
    itemListElement: newsArticles.map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@id": article.url,
        url: article.url,
      },
    })),
  };

  // Generate BreadcrumbList
  const breadcrumbList = {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteConfig.baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: title,
        item: url,
      },
    ],
  };

  // Generate WebSite with SearchAction
  const website = {
    "@type": "WebSite",
    "@id": `${siteConfig.baseUrl}#website`,
    url: siteConfig.baseUrl,
    name: siteConfig.siteName,
    description: siteConfig.siteDescription,
    publisher: {
      "@id": `${siteConfig.baseUrl}#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.baseUrl}/search/?term={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    speakable: speakableContent,
  };

  // Generate Organization schema
  const organization = getLightweightOrganization();

  // Main CollectionPage schema with all enhancements
  const collectionPage = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#collection`,
        url: url,
        name: title,
        headline: title,
        description:
          description ||
          `Latest ${title} news and updates from ${siteConfig.siteName}`,

        // Speakable for voice search
        speakable: speakableContent,

        // Main entity (the collection of articles)
        mainEntity: itemList,

        // Has part (individual articles)
        hasPart: newsArticles,

        // About (what this collection is about)
        about: {
          "@type": "Thing",
          name: category || title,
          description: `News and updates about ${category || title}`,
        },

        // Breadcrumb
        breadcrumb: breadcrumbList,

        // Publisher
        publisher: {
          "@id": `${siteConfig.baseUrl}#organization`,
        },

        // Copyright
        copyrightHolder: {
          "@id": `${siteConfig.baseUrl}#organization`,
        },
        copyrightYear: new Date().getFullYear(),

        // Dates
        datePublished: posts[0]?.node?.dateGmt
          ? `${posts[0].node.dateGmt}Z`
          : new Date().toISOString(),
        dateModified: posts[0]?.node?.modifiedGmt
          ? `${posts[0].node.modifiedGmt}Z`
          : new Date().toISOString(),

        // Language
        inLanguage:
          category === "bahasa" || category === "berita" ? "ms-MY" : "en-MY",

        // Is part of website
        isPartOf: {
          "@id": `${siteConfig.baseUrl}#website`,
        },

        // Primary image
        primaryImageOfPage: {
          "@type": "ImageObject",
          url:
            posts[0]?.node?.featuredImage?.node?.sourceUrl ||
            siteConfig.iconPath,
          width: 1200,
          height: 630,
        },

        // Additional metadata
        numberOfItems: articleCount || posts.length,

        // Potential action (view collection)
        potentialAction: {
          "@type": "ViewAction",
          target: url,
          name: `View ${title}`,
        },
      },

      // Include the website schema
      website,

      // Include the organization schema
      organization,

      // Include the breadcrumb
      breadcrumbList,

      // Include the item list
      itemList,
    ],
  };

  return collectionPage;
};

/**
 * Generate DataFeed schema for RSS/Atom feeds
 */
export const generateDataFeedJsonLD = (
  feedUrl: string,
  title: string,
  category: string
) => {
  return {
    "@context": "https://schema.org",
    "@type": "DataFeed",
    "@id": `${feedUrl}#datafeed`,
    url: feedUrl,
    name: `${title} Feed`,
    description: `Latest ${category} updates from ${siteConfig.siteName}`,
    dateModified: new Date().toISOString(),
    provider: {
      "@id": `${siteConfig.baseUrl}#organization`,
    },
  };
};

/**
 * Generate WebPage schema for better page understanding
 */
export const generateWebPageJsonLD = (
  url: string,
  title: string,
  description: string
) => {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url: url,
    name: title,
    description: description,
    isPartOf: {
      "@id": `${siteConfig.baseUrl}#website`,
    },
    breadcrumb: {
      "@id": `${url}#breadcrumb`,
    },
    publisher: {
      "@id": `${siteConfig.baseUrl}#organization`,
    },
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    inLanguage: "en-MY",
    potentialAction: {
      "@type": "ReadAction",
      target: url,
    },
  };
};
