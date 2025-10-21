// pages/category/category/[categorySlug]/index.tsx

import { GetStaticProps, GetStaticPaths } from "next";
import { SubCategoryPostLayout } from "@/components/categories-landing-page/subcategories-landing-page/SubCategoryPageLayout";
import { PostCardProps } from "@/types/global";
import siteConfig from "@/constants/site-config";
import { getFilteredCategoryPosts } from "@/lib/gql-queries/get-filtered-category-posts";
import ErrorPage from "next/error";
import Link from "next/link";
import Head from "next/head";
import keyword_extractor from "keyword-extractor";

interface Props {
  categorySlug: string;
  posts: {
    edges: Array<{
      node: PostCardProps;
    }>;
    pageInfo?: {
      hasNextPage?: boolean;
      hasPreviousPage?: boolean;
      endCursor?: string;
      startCursor?: string;
    };
  };
  totalCount?: number;
  lastModified?: string;
  isError?: boolean;
  trendingTopics?: string[];
  relatedCategories?: Array<{
    slug: string;
    name: string;
  }>;
  currentPage?: number;
}

interface SeoConfig {
  h1Title: string;
  metaTitle: string;
  description: string;
  keywords: string[];
}

type SeoSubCategoriesType = Record<string, SeoConfig>;

// Language detection map for all Malay categories/subcategories
const MALAY_CATEGORIES = new Set([
  "bahasa",
  "berita",
  "tempatan",
  "pandangan",
  "dunia",
  "top-bm",
  "super-bm",
  "ekonomi",
  "sukan",
  "hiburan",
]);

// Category aliases that should redirect to main sections
const CATEGORY_REDIRECTS: Record<string, string> = {
  "top-news": "/news",
  "top-business": "/business",
  "top-bm": "/berita",
  "top-sports": "/sports",
  "top-lifestyle": "/lifestyle",
};

// Enhanced revalidation with content velocity tracking
const getRevalidationTime = (
  lastModified?: string,
  category?: string
): number => {
  const highVelocityCategories = [
    "nation",
    "bahasa",
    "business",
    "world",
    "breaking-news",
  ];
  const isHighVelocity = highVelocityCategories.includes(category || "");

  if (!lastModified) {
    return isHighVelocity ? 180 : 300;
  }

  const age = Date.now() - new Date(lastModified).getTime();
  const hours = age / (1000 * 60 * 60);

  if (hours < 6) return 180;
  if (hours < 24) return 300;
  if (hours < 72) return 600;
  if (hours < 168) return 900;
  return 1800;
};

// Strip HTML tags for text processing
const stripHTML = (html: string): string => {
  return (
    html
      ?.replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || ""
  );
};

// Generate clean structured data
const generateEnhancedStructuredData = (props: {
  categorySlug: string;
  posts: any;
  title: string;
  description: string;
  canonicalUrl: string;
  lastModified?: string;
  totalCount?: number;
}) => {
  const {
    categorySlug,
    posts,
    title,
    description,
    canonicalUrl,
    lastModified,
    totalCount,
  } = props;
  const isInMalay = MALAY_CATEGORIES.has(categorySlug);

  // Create ListItem wrapper for ItemList (proper schema.org pattern)
  const listItems = posts.edges
    .slice(0, 10)
    .map((edge: any, index: number) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteConfig.baseUrl}${edge.node.uri}`,
      item: {
        "@type": "NewsArticle",
        "@id": `${siteConfig.baseUrl}${edge.node.uri}#article`,
        headline: edge.node.title,
        url: `${siteConfig.baseUrl}${edge.node.uri}`,
        datePublished: edge.node.dateGmt
          ? `${edge.node.dateGmt}Z`
          : new Date().toISOString(),
        dateModified: edge.node.modifiedGmt
          ? `${edge.node.modifiedGmt}Z`
          : edge.node.dateGmt
            ? `${edge.node.dateGmt}Z`
            : new Date().toISOString(),
        author: {
          "@type": edge.node.author?.node?.isOrganization
            ? "Organization"
            : "Person",
          name: edge.node.author?.node?.name || "FMT Reporters",
          url: `${siteConfig.baseUrl}${edge.node.author?.node?.uri || "/author/fmt-reporters"}`,
        },
        publisher: {
          "@type": "Organization",
          "@id": `${siteConfig.baseUrl}#organization`,
          name: "Free Malaysia Today",
        },
        image: edge.node.featuredImage?.node
          ? {
              "@type": "ImageObject",
              url:
                edge.node.featuredImage.node.sourceUrl || siteConfig.iconPath,
              ...(edge.node.featuredImage.node.mediaDetails?.width && {
                width: edge.node.featuredImage.node.mediaDetails.width,
              }),
              ...(edge.node.featuredImage.node.mediaDetails?.height && {
                height: edge.node.featuredImage.node.mediaDetails.height,
              }),
            }
          : {
              "@type": "ImageObject",
              url: siteConfig.iconPath,
            },
        articleSection: categorySlug,
        inLanguage: isInMalay ? "ms-MY" : "en-MY",
      },
    }));

  const collectionPage = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${canonicalUrl}#collection`,
        url: canonicalUrl,
        name: title,
        description: description,
        inLanguage: isInMalay ? "ms-MY" : "en-MY",
        isPartOf: {
          "@type": "WebSite",
          "@id": `${siteConfig.baseUrl}#website`,
          name: siteConfig.siteName,
          url: siteConfig.baseUrl,
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${siteConfig.baseUrl}/search?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        },
        publisher: {
          "@type": "Organization",
          "@id": `${siteConfig.baseUrl}#organization`,
          name: "Free Malaysia Today",
          url: siteConfig.baseUrl,
          logo: {
            "@type": "ImageObject",
            url: siteConfig.iconPath,
            width: 600,
            height: 60,
          },
          sameAs: [
            "https://www.facebook.com/freemalaysiatoday",
            "https://twitter.com/fmtoday",
            "https://www.instagram.com/freemalaysiatoday",
            "https://www.youtube.com/freemalaysiatoday",
          ],
        },
        breadcrumb: {
          "@type": "BreadcrumbList",
          "@id": `${canonicalUrl}#breadcrumb`,
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
              name: "Categories",
              item: `${siteConfig.baseUrl}/category`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name:
                categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1),
              item: canonicalUrl,
            },
          ],
        },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: totalCount || posts.edges.length,
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          itemListElement: listItems,
        },
        datePublished: posts.edges[0]?.node?.dateGmt
          ? `${posts.edges[0].node.dateGmt}Z`
          : new Date().toISOString(),
        dateModified: lastModified || new Date().toISOString(),
      },
      {
        "@type": "DataFeed",
        "@id": `${siteConfig.baseUrl}/feeds/rss/${categorySlug}#feed`,
        url: `${siteConfig.baseUrl}/feeds/rss/${categorySlug}`,
        name: `${title} RSS Feed`,
        description: `Latest ${categorySlug} updates from ${siteConfig.siteName}`,
        dateModified: lastModified || new Date().toISOString(),
      },
    ],
  };

  return collectionPage;
};

// Smart trending topics with weighted scoring
async function fetchTrendingTopicsSmart(
  category: string,
  postsData?: any
): Promise<string[]> {
  // Alias normalization map (Malaysian context)
  const ALIAS_MAP: Record<string, string> = {
    kwsp: "EPF",
    epf: "EPF",
    bnm: "Bank Negara",
    pmx: "Anwar Ibrahim",
    dap: "DAP",
    pas: "PAS",
    umno: "UMNO",
    gps: "GPS",
    ma63: "MA63",
    "5g": "5G Network",
    ai: "AI",
    ev: "Electric Vehicle",
    gst: "GST",
    sst: "SST",
    mco: "MCO",
    sop: "SOP",
    jdt: "JDT",
    aff: "AFF Championship",
    ucl: "Champions League",
    epl: "Premier League",
  };

  // Noise words to filter out (English)
  const BLACKLIST_EN = new Set([
    "says",
    "amid",
    "after",
    "before",
    "during",
    "despite",
    "malaysia",
    "malaysian",
    "today",
    "news",
    "latest",
    "breaking",
    "new",
    "first",
    "last",
    "next",
    "previous",
    "current",
    "update",
    "updates",
    "report",
    "reports",
    "sources",
    "video",
    "watch",
    "click",
    "here",
    "more",
    "read",
  ]);

  // Malay stopwords
  const BLACKLIST_MS = new Set([
    "yang",
    "dan",
    "atau",
    "kepada",
    "kerana",
    "selepas",
    "sebelum",
    "serta",
    "baharu",
    "kerajaan",
    "rakyat",
    "isu",
    "kata",
    "dalam",
    "untuk",
    "dengan",
    "dari",
    "pada",
    "adalah",
    "akan",
    "telah",
    "sudah",
    "masih",
    "lagi",
    "juga",
    "tetapi",
    "namun",
    "hingga",
    "sejak",
    "berita",
    "terkini",
    "hari",
    "ini",
    "semalam",
    "esok",
  ]);

  const isInMalay = MALAY_CATEGORIES.has(category);
  const blacklist = isInMalay
    ? new Set([...BLACKLIST_EN, ...BLACKLIST_MS])
    : BLACKLIST_EN;

  // Editorial seed topics with weights (kept minimal)
  const SEED_TOPICS: Record<string, Array<{ term: string; weight: number }>> = {
    nation: [
      { term: "Budget 2025", weight: 0.5 },
      { term: "Anwar Ibrahim", weight: 0.4 },
      { term: "Parliament", weight: 0.3 },
    ],
    bahasa: [
      { term: "Belanjawan 2025", weight: 0.5 },
      { term: "Parlimen", weight: 0.3 },
    ],
    business: [
      { term: "Bursa Malaysia", weight: 0.4 },
      { term: "Ringgit", weight: 0.4 },
      { term: "Bank Negara", weight: 0.3 },
    ],
    sports: [
      { term: "Harimau Malaya", weight: 0.4 },
      { term: "Lee Zii Jia", weight: 0.3 },
    ],
    world: [
      { term: "Gaza", weight: 0.4 },
      { term: "Ukraine", weight: 0.3 },
      { term: "ASEAN", weight: 0.3 },
    ],
  };

  const topicScores = new Map<string, number>();

  // Add seed topics with base weight
  const seeds = SEED_TOPICS[category] || [];
  seeds.forEach(({ term, weight }) => {
    topicScores.set(term.toLowerCase(), weight);
  });

  // Process posts if available
  if (postsData?.edges) {
    const now = Date.now();
    const HALF_LIFE_MS = 48 * 60 * 60 * 1000; // 48 hours

    postsData.edges.forEach((edge: any, index: number) => {
      const post = edge.node;
      if (!post) return;

      // Calculate recency weight (exponential decay)
      const postDate = post.dateGmt ? new Date(post.dateGmt).getTime() : now;
      const ageMs = now - postDate;
      const recencyWeight = Math.exp((-0.693 * ageMs) / HALF_LIFE_MS); // 0.693 = ln(2)

      // Position weight (higher position = more important)
      const positionWeight = 1 / (index + 1);

      // Extract tags (high weight)
      if (post.tags?.edges) {
        post.tags.edges.forEach((tag: any) => {
          if (tag.node?.name) {
            const normalizedTag = tag.node.name.toLowerCase().trim();
            if (
              !blacklist.has(normalizedTag) &&
              normalizedTag.length > 2 &&
              normalizedTag.length < 30
            ) {
              const score = 2.0 * recencyWeight * positionWeight;
              topicScores.set(
                normalizedTag,
                (topicScores.get(normalizedTag) || 0) + score
              );
            }
          }
        });
      }

      // Extract keywords from title (medium weight)
      if (post.title) {
        const titleKeywords = keyword_extractor.extract(post.title, {
          language: "english", // Library limitation
          remove_digits: false,
          return_changed_case: true,
          remove_duplicates: true,
        });

        titleKeywords.forEach((keyword: string) => {
          const normalized = keyword.toLowerCase().trim();
          if (
            !blacklist.has(normalized) &&
            normalized.length > 2 &&
            normalized.length < 30
          ) {
            const score = 1.0 * recencyWeight * positionWeight;
            topicScores.set(
              normalized,
              (topicScores.get(normalized) || 0) + score
            );
          }
        });
      }

      // Extract from excerpt (low weight)
      if (post.excerpt) {
        const cleanExcerpt = stripHTML(post.excerpt);
        const excerptKeywords = keyword_extractor
          .extract(cleanExcerpt, {
            language: "english",
            remove_digits: false,
            return_changed_case: true,
            remove_duplicates: true,
          })
          .slice(0, 5); // Limit excerpt keywords

        excerptKeywords.forEach((keyword: string) => {
          const normalized = keyword.toLowerCase().trim();
          if (
            !blacklist.has(normalized) &&
            normalized.length > 2 &&
            normalized.length < 30
          ) {
            const score = 0.5 * recencyWeight * positionWeight;
            topicScores.set(
              normalized,
              (topicScores.get(normalized) || 0) + score
            );
          }
        });
      }
    });
  }

  // Normalize aliases and aggregate scores
  const finalScores = new Map<string, number>();
  topicScores.forEach((score, term) => {
    const normalized = ALIAS_MAP[term] || term;
    // Smart title casing: preserve acronyms, capitalize proper words
    const titleCased = normalized
      .split(" ")
      .map((word) => {
        // Keep acronyms as-is (all caps or known patterns)
        if (word === word.toUpperCase() && word.length <= 4) return word;
        // Capitalize words longer than 3 chars
        return word.length > 3
          ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          : word;
      })
      .join(" ");
    finalScores.set(titleCased, (finalScores.get(titleCased) || 0) + score);
  });

  // Sort by score and return top N
  const sortedTopics = Array.from(finalScores.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([term]) => term)
    .filter((term) => term.length > 2 && term.length < 30) // Reasonable length
    .slice(0, 15);

  return sortedTopics;
}

// Fetch related categories
async function fetchRelatedCategories(
  category: string
): Promise<Array<{ slug: string; name: string }>> {
  const categoryRelationships: Record<
    string,
    Array<{ slug: string; name: string }>
  > = {
    nation: [
      {
        slug: "nation/sabahsarawak",
        name: "Sabah & Sarawak",
      },
      { slug: "world", name: "World News" },
      { slug: "education", name: "Education" },
    ],
    bahasa: [
      { slug: "tempatan", name: "Tempatan" },
      { slug: "pandangan", name: "Pandangan" },
      { slug: "dunia", name: "Dunia" },
    ],
    business: [
      { slug: "local-business", name: "Local Business" },
      { slug: "world-business", name: "World Business" },
      { slug: "nation", name: "National News" },
    ],
    leisure: [
      { slug: "food", name: "Food" },
      { slug: "entertainment", name: "Entertainment" },
      { slug: "travel", name: "Travel" },
      { slug: "tech", name: "Technology" },
      { slug: "money", name: "Money" },
      { slug: "pets", name: "Pets" },
    ],
    lifestyle: [
      { slug: "food", name: "Food" },
      { slug: "entertainment", name: "Entertainment" },
      { slug: "travel", name: "Travel" },
      { slug: "tech", name: "Technology" },
      { slug: "money", name: "Money" },
      { slug: "pets", name: "Pets" },
    ],
    opinion: [
      { slug: "editorial", name: "Editorial" },
      { slug: "column", name: "Columns" },
      { slug: "letters", name: "Letters" },
    ],
    sports: [
      { slug: "football", name: "Football" },
      { slug: "badminton", name: "Badminton" },
      { slug: "motorsports", name: "Motorsports" },
    ],
    world: [{ slug: "south-east-asia", name: "Southeast Asia" }],
  };

  return categoryRelationships[category] || [];
}

const CategoryPage = ({
  categorySlug,
  posts,
  totalCount,
  lastModified,
  isError,
  trendingTopics = [],
  relatedCategories = [],
  currentPage = 1,
}: Props) => {
  if (isError) {
    return <ErrorPage statusCode={404} />;
  }

  // The ACTUAL canonical URL for this category page
  const canonicalUrl = `${siteConfig.baseUrl}/category/category/${categorySlug}`;
  const isInMalay = MALAY_CATEGORIES.has(categorySlug);

  // Proper title for this category (not generic)
  const categoryTitle =
    categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1);
  const pageTitle = `${categoryTitle} News | Free Malaysia Today (FMT)`;
  const pageDescription = `Latest ${categoryTitle} news, breaking stories and in-depth analysis. Stay updated with ${categoryTitle} developments from Malaysia's trusted news source.`;

  const AdsTargetingParams = {
    pos: "listing",
    section: [`${categorySlug}-landing-page`, "landing-page", "category"],
    key: [
      categorySlug,
      `${categorySlug} news`,
      "Free Malaysia Today",
      ...trendingTopics.slice(0, 5),
    ].slice(0, 10),
  };

  const structuredData = generateEnhancedStructuredData({
    categorySlug,
    posts,
    title: pageTitle,
    description: pageDescription,
    canonicalUrl,
    lastModified,
    totalCount,
  });

  // Handle image preload with Cloudflare CDN optimization
  const heroImage = posts.edges[0]?.node?.featuredImage?.node?.sourceUrl;

  const getCDNImageUrl = (url: string, width: number) => {
    if (url?.includes("media.freemalaysiatoday.com")) {
      // Ready for Cloudflare image resizing when configured
      // return `/cdn-cgi/image/width=${width},quality=85,format=auto/${url}`;
      return `${url}?w=${width}`;
    }
    return url ? `${url}?w=${width}` : "";
  };

  const heroImageSrcSet = heroImage
    ? `${getCDNImageUrl(heroImage, 400)} 400w, ${getCDNImageUrl(heroImage, 800)} 800w, ${getCDNImageUrl(heroImage, 1200)} 1200w`
    : "";

  // Pagination URLs for next/prev
  const basePaginationUrl = `${siteConfig.baseUrl}/category/category/${categorySlug}`;
  const nextPageUrl = posts.pageInfo?.hasNextPage
    ? `${basePaginationUrl}/page/${currentPage + 1}`
    : null;
  const prevPageUrl =
    currentPage > 1
      ? currentPage === 2
        ? basePaginationUrl
        : `${basePaginationUrl}/page/${currentPage - 1}`
      : null;

  return (
    <>
      <Head>
        {/* Primary SEO Meta Tags - Category Specific */}
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content={[
            categorySlug,
            `${categorySlug} news`,
            "Malaysia",
            ...trendingTopics.slice(0, 10),
          ].join(", ")}
        />

        {/* Canonical URL - THIS category page, not /news */}
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph - Category Specific */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content={siteConfig.siteName} />
        <meta property="og:locale" content={isInMalay ? "ms_MY" : "en_MY"} />
        <meta property="og:image" content={heroImage || siteConfig.iconPath} />
        {heroImage && (
          <>
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
          </>
        )}

        {/* Twitter Card - Category Specific */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:site" content="@fmtoday" />
        <meta name="twitter:image" content={heroImage || siteConfig.iconPath} />

        {/* Robots directives - single definition */}
        <meta
          name="robots"
          content="index, follow, max-image-preview:large, max-snippet:-1"
        />
        <meta
          name="googlebot"
          content="index, follow, max-image-preview:large, max-snippet:-1"
        />

        {/* News Keywords */}
        <meta
          name="news_keywords"
          content={trendingTopics.slice(0, 10).join(", ")}
        />

        {/* Freshness signals */}
        {lastModified && (
          <>
            <meta property="article:modified_time" content={lastModified} />
            <meta property="og:updated_time" content={lastModified} />
          </>
        )}

        {/* Language alternates - self-referencing only */}
        <link
          rel="alternate"
          hrefLang={isInMalay ? "ms-MY" : "en-MY"}
          href={canonicalUrl}
        />
        <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

        {/* Pagination hints */}
        {prevPageUrl && <link rel="prev" href={prevPageUrl} />}
        {nextPageUrl && <link rel="next" href={nextPageUrl} />}

        {/* Resource hints - single set */}
        <link rel="dns-prefetch" href="https://media.freemalaysiatoday.com" />
        <link
          rel="preconnect"
          href="https://media.freemalaysiatoday.com"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://securepubads.g.doubleclick.net"
        />
        <link
          rel="preconnect"
          href="https://securepubads.g.doubleclick.net"
          crossOrigin="anonymous"
        />

        {/* RSS/Atom feeds */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${categoryTitle} - RSS Feed`}
          href={`${siteConfig.baseUrl}/feeds/rss/${categorySlug}`}
        />
        <link
          rel="alternate"
          type="application/atom+xml"
          title={`${categoryTitle} - Atom Feed`}
          href={`${siteConfig.baseUrl}/feeds/atom/${categorySlug}`}
        />

        {/* Hero image preload */}
        {heroImage && (
          <link
            rel="preload"
            as="image"
            href={getCDNImageUrl(heroImage, 1200)}
            imageSrcSet={heroImageSrcSet}
            imageSizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
      </Head>

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* NewsMediaOrganization schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsMediaOrganization",
            "@id": `${siteConfig.baseUrl}#news-organization`,
            name: "Free Malaysia Today",
            url: siteConfig.baseUrl,
            logo: {
              "@type": "ImageObject",
              url: siteConfig.iconPath,
              width: 600,
              height: 60,
            },
            masthead: `${siteConfig.baseUrl}/about`,
          }),
        }}
      />

      {/* Main Content */}
      <main role="main" aria-label={`${categorySlug} news articles`}>
        {/* Breadcrumb with proper microdata */}
        <nav
          aria-label="Breadcrumb"
          className="breadcrumb-nav mb-4"
          itemScope
          itemType="https://schema.org/BreadcrumbList"
        >
          <ol className="flex items-center space-x-2 text-sm">
            <li
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              <Link href="/" itemProp="item">
                <span itemProp="name">Home</span>
              </Link>
              <meta itemProp="position" content="1" />
            </li>
            <li className="mx-2">/</li>
            <li
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              className="font-semibold"
            >
              <span itemProp="name">{categoryTitle}</span>
              <meta itemProp="position" content="3" />
            </li>
          </ol>
        </nav>

        <section aria-labelledby="category-title" className="category-content">
          <header className="sr-only">
            <h1 id="category-title" className="text-3xl font-bold mb-4">
              {categoryTitle} News
            </h1>
            {totalCount && totalCount > 0 && (
              <p className="text-gray-600 mb-4">
                Showing {posts.edges.length} of {totalCount} articles
              </p>
            )}
          </header>

          {/* Article Feed */}
          <div role="feed" aria-label={`${categorySlug} articles feed`}>
            <SubCategoryPostLayout
              title={categoryTitle}
              posts={posts}
              categorySlug={categorySlug}
              AdsTargetingParams={AdsTargetingParams}
            />
          </div>
        </section>

        {/* Related Categories */}
        {relatedCategories.length > 0 && (
          <aside className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <nav aria-label="Related categories">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Related Topics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {relatedCategories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/category/category/${cat.slug}`}
                    className="p-3 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </nav>
          </aside>
        )}

        {/* Trending Topics */}
        {trendingTopics.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
              Trending in {categoryTitle}
            </h3>
            <div className="flex flex-wrap gap-2">
              {trendingTopics.slice(0, 8).map((topic) => (
                <Link
                  key={topic}
                  href={`/search?term=${encodeURIComponent(topic)}&category=all`}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
                >
                  #{topic}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  // Only pre-render essential categories at build time
  const essentialCategories = [
    "nation",
    "bahasa",
    "business",
    "leisure",
    "opinion",
    "sports",
    "world",
  ];

  const paths = essentialCategories.map((slug) => ({
    params: { categorySlug: slug },
  }));

  return {
    paths,
    fallback: "blocking", // Generate others on-demand
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const categorySlug = params?.categorySlug as string;

  // Handle redirects for aliases (top-* categories redirect to main sections)
  if (CATEGORY_REDIRECTS[categorySlug]) {
    return {
      redirect: {
        destination: CATEGORY_REDIRECTS[categorySlug],
        permanent: true,
      },
    };
  }

  try {
    const taxQuery = {
      relation: "AND",
      taxArray: [
        {
          field: "SLUG",
          operator: "AND",
          taxonomy: "CATEGORY",
          terms: [categorySlug],
        },
      ],
    };

    const variables = {
      first: 25,
      where: {
        taxQuery,
        status: "PUBLISH",
        orderby: [{ field: "DATE", order: "DESC" }],
      },
    };

    const response = await getFilteredCategoryPosts(variables);

    if (!response?.posts?.edges || response.posts.edges.length === 0) {
      console.log(`Category ${categorySlug} has no posts yet`);
    }

    const lastModified =
      response?.posts?.edges?.[0]?.node?.modifiedGmt ||
      response?.posts?.edges?.[0]?.node?.dateGmt ||
      new Date().toISOString();

    const totalCount =
      response?.posts?.pageInfo?.offsetPagination?.total ||
      response?.posts?.edges?.length ||
      0;

    // Fetch smart trending topics from actual posts
    const trendingTopics = await fetchTrendingTopicsSmart(
      categorySlug,
      response?.posts
    );

    const relatedCategories = await fetchRelatedCategories(categorySlug);

    return {
      props: {
        categorySlug,
        posts: response?.posts || { edges: [] },
        totalCount,
        lastModified,
        trendingTopics,
        relatedCategories,
        currentPage: 1,
      },
      revalidate: getRevalidationTime(lastModified, categorySlug),
    };
  } catch (error) {
    console.error(`Error fetching category ${categorySlug}:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      return {
        notFound: true,
        revalidate: 60,
      };
    }

    return {
      props: {
        categorySlug,
        posts: { edges: [] },
        isError: true,
        totalCount: 0,
        trendingTopics: [],
        relatedCategories: [],
        currentPage: 1,
      },
      revalidate: 60,
    };
  }
};

export default CategoryPage;
