// components/common/CategoryMetaData.tsx
import Head from "next/head";
// import { generatedJsonLd } from "@/constants/jsonlds/json-ld-generator";
import { generateCategoryJsonLD } from "@/constants/jsonlds/category-json-ld";
import { WebPageJsonLD } from "@/constants/jsonlds/org";
import siteConfig from "@/constants/site-config";
import { fbPageIds } from "@/constants/social";
import {
  BeritaAlternateLocale,
  defaultAlternateLocale,
} from "@/constants/alternate-locales";
import {
  getCanonicalUrl,
  getAlternateUrls,
} from "@/constants/canonical-url-mappings";

interface MetadataConfig {
  title: string;
  description: string;
  keywords: string[];
  category: string;
  pathName: string;
  imageAlt: string;
  fullPathName?: string;
  articleCount?: number;
  lastModified?: string;
}

interface CategoryMetadataProps {
  config: MetadataConfig;
}

// Helper function to optimize keywords - remove duplicates and limit count
const optimizeKeywords = (keywords: string[]): string[] => {
  // Remove duplicates and empty strings
  const uniqueKeywords = [...new Set(keywords.filter((k) => k && k.trim()))];

  // Limit to 12 most relevant keywords
  return uniqueKeywords.slice(0, 12);
};

// Helper function to generate category-specific Open Graph image
const getCategoryOgImage = (category: string): string => {
  // Use default image for all categories as requested
  return (
    siteConfig.iconPath ||
    "https://www.freemalaysiatoday.com/PreviewLinkImage.png"
  );
};

export const CategoryMetadata = ({ config }: CategoryMetadataProps) => {
  const {
    title,
    description,
    keywords,
    category,
    pathName,
    fullPathName = pathName,
    imageAlt,
    articleCount = 0,
    lastModified,
  } = config;

  // Get canonical URL using the mapping
  const canonicalUrl = getCanonicalUrl(fullPathName);
  const alternateUrls = getAlternateUrls(fullPathName);

  // Determine locale
  const locale =
    pathName === "/berita" || category === "bahasa" ? "ms_MY" : "en_MY";

  const alternateLocale =
    pathName === "/berita" || category === "bahasa"
      ? BeritaAlternateLocale
      : defaultAlternateLocale;

  // Determine feed path
  const feedPath =
    pathName === "/news" ? "headlines" : pathName.replace("/", "");

  // Determine Facebook page ID
  let fbPageId: string;
  switch (pathName) {
    case "/berita":
      fbPageId = fbPageIds[2]; // Berita FMT
      break;
    case "/lifestyle":
      fbPageId = fbPageIds[1]; // Lifestyle FMT
      break;
    default:
      fbPageId = fbPageIds[0]; // Main FMT
      break;
  }

  if (category === "bahasa" || category === "leisure") {
    switch (category) {
      case "bahasa":
        fbPageId = fbPageIds[2]; // Berita FMT
        break;
      case "leisure":
        fbPageId = fbPageIds[1]; // Lifestyle FMT
        break;
      default:
        fbPageId = fbPageIds[0]; // Main FMT
        break;
    }
  }

  // Optimize keywords
  const optimizedKeywords = optimizeKeywords(keywords);

  // Get category OG image
  const ogImage = getCategoryOgImage(category);

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {/* Keep keywords tag but optimized */}
      <meta name="keywords" content={optimizedKeywords.join(", ")} />
      <meta name="author" content={siteConfig.siteName} />
      <meta name="category" content={category} />
      <meta
        name="news_keywords"
        content={optimizedKeywords.slice(0, 10).join(", ")}
      />

      {/* Enhanced Robots Meta Tags */}
      <meta
        name="robots"
        content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      />
      <meta
        name="googlebot"
        content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      />
      <meta name="googlebot-news" content="index, follow, snippet" />
      <meta
        name="bingbot"
        content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      />

      {/* Additional Search Engine Directives */}
      <meta name="slurp" content="index, follow" />
      <meta name="msnbot" content="index, follow" />
      <meta name="revisit-after" content="1 day" />
      <meta name="rating" content="general" />
      <meta name="distribution" content="global" />

      {/* Open Graph Tags - Enhanced */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:secure_url" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:site_name" content={siteConfig.siteName} />
      <meta property="og:locale" content={locale} />
      <meta property="fb:pages" content={fbPageId} />
      <meta property="fb:app_id" content="1234567890" />

      {/* Alternate locales */}
      {alternateLocale?.map((locale: any) => (
        <meta key={locale} property="og:locale:alternate" content={locale} />
      ))}
      <meta property="og:url" content={canonicalUrl} />

      {/* Twitter Card Tags - Enhanced */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:site" content="@fmtoday" />
      <meta name="twitter:creator" content="@fmtoday" />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:src" content={ogImage} />
      <meta name="twitter:image:alt" content={imageAlt} />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:domain" content="freemalaysiatoday.com" />

      {/* Publisher Information */}
      <meta name="publisher" content={siteConfig.siteName} />
      <meta
        name="copyright"
        content={`© ${new Date().getFullYear()} ${siteConfig.siteName}`}
      />

      {/* Article Count and Last Modified (for category pages) */}
      {articleCount > 0 && (
        <meta name="article_count" content={articleCount.toString()} />
      )}
      {lastModified && (
        <meta property="article:modified_time" content={lastModified} />
      )}

      {/* Canonical URL - Most Important for SEO */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Alternate URLs for duplicate content */}
      {alternateUrls.map((altUrl: string) => (
        <link
          key={altUrl}
          rel="alternate"
          href={`${siteConfig.baseUrl}${altUrl}`}
        />
      ))}

      {/* hreflang tags */}
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
      <link
        rel="alternate"
        hrefLang={locale.toLowerCase().replace("_", "-")}
        href={canonicalUrl}
      />

      {/* RSS/Atom/JSON Feed Links */}
      <link
        rel="alternate"
        type="application/atom+xml"
        title={`${title} - Atom Feed`}
        href={`${siteConfig.baseUrl}/feeds/atom/${feedPath}`}
      />
      <link
        rel="alternate"
        type="application/rss+xml"
        title={`${title} - RSS Feed`}
        href={`${siteConfig.baseUrl}/feeds/rss/${feedPath}`}
      />
      <link
        rel="alternate"
        type="application/feed+json"
        title={`${title} - JSON Feed`}
        href={`${siteConfig.baseUrl}/feeds/json/${feedPath}`}
      />

      {/* Prefetch and DNS Prefetch for Performance */}
      <link rel="dns-prefetch" href="https://media.freemalaysiatoday.com" />
      <link rel="preconnect" href="https://media.freemalaysiatoday.com" />
      <link rel="dns-prefetch" href="https://securepubads.g.doubleclick.net" />
      <link rel="preconnect" href="https://securepubads.g.doubleclick.net" />
    </Head>
  );
};

// Enhanced CategoryJsonLD component with better structured data
interface JsonLDProps {
  posts: any;
  pathName: string;
  title: string;
  description?: string;
  category?: string;
  articleCount?: number;
}

export const CategoryJsonLD = ({
  posts,
  pathName,
  title,
  description,
  category,
  articleCount,
}: JsonLDProps) => {
  const canonicalUrl = getCanonicalUrl(pathName);
  const enhancedJsonLD = generateCategoryJsonLD({
    posts: posts?.edges || [],
    url: canonicalUrl,
    title,
    description,
    category,
    articleCount,
  });

  return (
    <section>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WebPageJsonLD) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(enhancedJsonLD),
        }}
        type="application/ld+json"
      />
    </section>
  );
};
