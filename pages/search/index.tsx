import Head from "next/head";
import { WebPageJsonLD } from "@/constants/jsonlds/org";
import SearchLayout from "@/components/search-page/SearchLayout";
import siteConfig from "@/constants/site-config";
import { useRouter } from "next/router";
import { defaultAlternateLocale } from "@/constants/alternate-locales";

const DEFAULT_KEYWORDS = [
  "Free Malaysia Today Search",
  "FMT Search",
  "Malaysia News Search",
  "Search Malaysian Politics",
  "Search Malaysian Economy",
  "Search Malaysian Current Affairs",
  "Find Malaysia News",
  "Malaysia News Archive",
  "Malaysian News Database",
  "Search English Malay News",
  "Malaysia News Filter",
  "Custom Malaysia News Search",
];

const Search = () => {
  const router = useRouter();
  const { term, category } = router.query;

  const fullUrl = `${siteConfig.baseUrl}/search?term=${term}&category=${category}`;
  const keywords = [term, category, ...DEFAULT_KEYWORDS].join(", ");

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      // Breadcrumbs
      {
        "@type": "BreadcrumbList",
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
            name: "Tags",
            item: fullUrl,
          },
        ],
      },
    ],
  };

  return (
    <>
      <Head>
        <title>
          Search Free Malaysia Today (FMT) | Find Latest News, Articles, and
          Analysis
        </title>
        <meta
          name="description"
          content="Search Free Malaysia Today for the latest Malaysian news, current affairs, business updates, and in-depth analysis. Find accurate and timely information on politics, economy, lifestyle, and more."
        />
        <meta name="keywords" content={keywords} />
        <meta name="author" content="Free Malaysia Today" />
        <meta name="category" content="searchpage" />

        {/* Canonical URL */}
        <link rel="canonical" href={`${fullUrl.replace("/", "")}/`} />

        <link
          rel="alternate"
          hrefLang="x-default"
          href={`${fullUrl.replace("/", "")}/`}
        />

        <link
          rel="alternate"
          type="application/atom+xml"
          title="Atom Feed"
          href={`${siteConfig.baseUrl}/feeds/atom/${category}`}
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="RSS Feed"
          href={`${siteConfig.baseUrl}/feeds/rss/${category}`}
        />
        <link
          rel="alternate"
          type="application/feed+json"
          title="JSON Feed"
          href={`${siteConfig.baseUrl}/feeds/json/${category}`}
        />

        {/* OpenGraph Tags */}

        <meta
          property="og:title"
          content="Search Free Malaysia Today (FMT) | Find Latest News and Analysis"
        />
        <meta
          property="og:description"
          content="Search FMT for the latest Malaysian news, current affairs, business updates, and in-depth analysis. Find accurate and timely information on politics, economy, lifestyle, and more."
        />
        <meta property="og:url" content={fullUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={siteConfig.iconPath} />
        <meta property="og:image:secure_url" content={siteConfig.iconPath} />
        <meta property="og:image:alt" content="News | Free Malaysia Today" />
        <meta property="og:locale" content="en_MY" />
        {defaultAlternateLocale?.map((locale: any) => (
          <meta key={locale} property="og:locale:alternate" content={locale} />
        ))}

        {/* Twitter Cards */}
        <meta
          name="twitter:title"
          content="Search Free Malaysia Today (FMT) | Find Latest News and Analysis"
        />
        <meta
          name="twitter:description"
          content="Search FMT for the latest Malaysian news, current affairs, business updates, and in-depth analysis. Find accurate and timely information on politics, economy, lifestyle, and more."
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta name="twitter:image" content={siteConfig.iconPath} />
        <meta
          name="twitter:image:alt"
          content="Latest News | Free Malaysia Today"
        />
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WebPageJsonLD) }}
          type="application/ld+json"
          // async
          // defer
        />
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          type="application/ld+json"
          // async
          // defer
        />
      </Head>

      <SearchLayout />
    </>
  );
};

export default Search;
