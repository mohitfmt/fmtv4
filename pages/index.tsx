// pages/index.tsx

import AdSlot from "@/components/common/AdSlot";
import LTRNewsPreview from "@/components/common/news-preview-cards/LTRNewsPreview";
import SectionHeading from "@/components/common/SectionHeading";
import TrendingNSubCategoriesList from "@/components/common/TrendingNSubCategoriesList";
import TTBNewsPreview from "@/components/common/news-preview-cards/TTBNewsPreview";
import ColumnistCredits from "@/components/landing-pages/ColumnistCredits";
import LatestVideosOnHomePage from "@/components/landing-pages/LatestVideosOnHomePage";
import SuperNewsPreview from "@/components/landing-pages/SuperNewsPreview";
import siteConfig from "@/constants/site-config";
import { getCategoryNews } from "@/lib/gql-queries/get-category-news";
import { getColumnists } from "@/lib/gql-queries/get-columnists";
import { generateCollectionPageJsonLD } from "@/lib/utils";
import { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import CategorySidebar from "@/components/common/CategorySidebar";
import HomeFooter from "@/components/landing-pages/HomeFooter";
import HomeCommonSections from "@/components/landing-pages/HomeCommonSections";
import HomeTopNewsOpinion from "@/components/landing-pages/HomeTopNewsOpinion";
import { fbPageIds } from "@/constants/social";
import { defaultAlternateLocale } from "@/constants/alternate-locales";
import { prisma } from "@/lib/prisma";
import {
  getWebPageSchema,
  getWebsiteSchema,
} from "@/constants/jsonlds/shared-schemas";

const dfpTargetingParams = {
  pos: "listing",
  section: ["homepage", "business", "opinion", "world", "lifestyle", "sports"],
  key: [
    "Free Malaysia Today",
    "Malaysia News",
    "Latest Malaysia News",
    "Breaking News Malaysia",
    "Malaysia Politics News",
    "gambling",
    "religion",
    "alcohol",
    "lgbt",
    "sex",
    "drug abuse",
    "get rich",
    "match-making",
    "dating",
    "lottery",
  ],
};

function extractKeywordsFromPosts(
  posts: any[],
  maxKeywords: number = 5
): string[] {
  const keywords: string[] = [];

  for (const post of posts) {
    const actualPost = post?.node || post;

    // Handle categories with edges structure
    // if (
    //   actualPost?.categories?.edges &&
    //   Array.isArray(actualPost.categories.edges)
    // ) {
    //   actualPost.categories.edges.forEach((catEdge: any) => {
    //     if (catEdge?.node?.name) {
    //       keywords.push(catEdge.node.name);
    //     }
    //   });
    // }

    // Handle tags with edges structure
    if (actualPost?.tags?.edges && Array.isArray(actualPost.tags.edges)) {
      actualPost.tags.edges.forEach((tagEdge: any) => {
        if (tagEdge?.node?.name) {
          keywords.push(tagEdge.node.name);
        }
      });
    }
    if (keywords.length >= maxKeywords) break;
  }

  return keywords;
}

function generateHomePageKeywords(
  trendingTags: any[] = [],
  heroPosts: any[] = [],
  highlightPosts: any[] = []
): string {
  const keywords: string[] = [];

  if (trendingTags && trendingTags.length > 0) {
    trendingTags.slice(0, 5).forEach((tag) => {
      if (tag?.title) keywords.push(tag.title);
    });
  }

  if (heroPosts && heroPosts.length > 0) {
    const heroKeywords = extractKeywordsFromPosts(heroPosts, 2);
    keywords.push(...heroKeywords);
  }

  if (highlightPosts && highlightPosts.length > 0) {
    const postsToProcess = highlightPosts.slice(0, 4);
    for (const post of postsToProcess) {
      const postKeywords = extractKeywordsFromPosts([post], 3);
      keywords.push(...postKeywords);
      if (keywords.length >= 19) break;
    }
  }

  if (keywords.length < 15) {
    keywords.push(
      "Free Malaysia Today",
      "FMT",
      "Malaysia News",
      "Breaking News Malaysia",
      "Latest Malaysian News"
    );
  }

  const uniqueKeywords = [...new Set(keywords)]
    .filter((kw) => kw && kw.length > 0 && kw.length < 50)
    .slice(0, 25);

  return uniqueKeywords.join(", ");
}

function generateNewsKeywords(
  trendingTags: any[] = [],
  heroPosts: any[] = [],
  highlightPosts: any[] = []
): string {
  const keywords: string[] = [];

  if (trendingTags && trendingTags.length > 0) {
    trendingTags.slice(0, 5).forEach((tag) => {
      if (tag?.title) keywords.push(tag.title);
    });
  }

  if (heroPosts && heroPosts.length > 0) {
    const heroKeywords = extractKeywordsFromPosts(heroPosts, 1);
    keywords.push(...heroKeywords);
  }

  if (highlightPosts && highlightPosts.length > 0) {
    const postsToProcess = highlightPosts.slice(0, 4);
    for (const post of postsToProcess) {
      const postKeywords = extractKeywordsFromPosts([post], 1);
      keywords.push(...postKeywords);
      if (keywords.length >= 10) break;
    }
  }

  const uniqueKeywords = [...new Set(keywords)]
    .filter((kw) => kw && kw.length > 0 && kw.length < 50)
    .slice(0, 10);

  return uniqueKeywords.join(", ");
}

function generateHomePageDescription(
  heroPosts: any[] = [],
  trendingTags: any[] = []
): string {
  // Get hero post title
  const heroPost =
    heroPosts && heroPosts.length > 0
      ? heroPosts[0]?.node || heroPosts[0]
      : null;
  const heroTitle = heroPost?.title || "";

  if (!heroTitle) {
    return "Breaking news, latest updates, and in-depth analysis from Malaysia's independent news source. Free Malaysia Today.";
  }

  const truncatedTitle = heroTitle.substring(0, 70);

  // Get trending topics
  let trendingTopics = "Malaysian politics, business, and lifestyle";
  if (trendingTags && trendingTags.length >= 3) {
    trendingTopics = trendingTags
      .slice(0, 3)
      .map((tag) => tag?.title)
      .filter(Boolean)
      .join(", ");
  }

  const description = `Breaking: ${truncatedTitle}. Latest on ${trendingTopics} from FMT.`;
  return description.length > 160
    ? description.substring(0, 157) + "..."
    : description;
}

function generateArticleTags(trendingTags: any[] = []): string {
  if (!trendingTags || trendingTags.length === 0) return "";

  return trendingTags
    .slice(0, 15)
    .map((tag) => tag?.title)
    .filter(Boolean)
    .join(",");
}

function generateTrendingTopicsJsonLD(trendingTags: any[]) {
  if (!trendingTags || trendingTags.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Trending Topics on Free Malaysia Today",
    description: "Currently trending news topics in Malaysia",
    numberOfItems: trendingTags.length,
    itemListElement: trendingTags.map((tag, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Thing",
        name: tag?.title || tag?.slug,
        url: `${siteConfig.baseUrl}/category/tag/${tag?.slug}`,
      },
    })),
  };
}

export default function Home({
  heroPosts = [],
  highlightPosts = [],
  topNewsPosts = [],
  businessPosts = [],
  opinionPosts = [],
  worldPosts = [],
  leisurePosts = [],
  sportsPosts = [],
  beritaPosts = [],
  videoPosts = [],
  columnists = [],
  trendingTags = [],
  _buildError = false,
}: any) {
  // 🆕 Generate dynamic SEO metadata
  const dynamicKeywords = generateHomePageKeywords(
    trendingTags,
    heroPosts,
    highlightPosts
  );
  const newsKeywords = generateNewsKeywords(
    trendingTags,
    heroPosts,
    highlightPosts
  );
  const dynamicDescription = generateHomePageDescription(
    heroPosts,
    trendingTags
  );
  const articleTags = generateArticleTags(trendingTags);

  // Get last modified from hero post
  const heroPost =
    heroPosts && heroPosts.length > 0
      ? heroPosts[0]?.node || heroPosts[0]
      : null;
  const lastModified = heroPost?.modifiedGmt || new Date().toISOString();

  // 🆕 Generate structured data
  const trendingTopicsJsonLD = generateTrendingTopicsJsonLD(trendingTags);

  return (
    <>
      {/* ✅ NEW: Show build error banner if sections failed */}
      {_buildError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Some content is temporarily unavailable. We&apos;re working to
                restore it.
                <button
                  onClick={() => window.location.reload()}
                  className="ml-2 underline font-semibold"
                >
                  Refresh page
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
      {/* 🆕 ENHANCED Head section - ONLY meta tags changed */}
      <Head>
        <title>{`${siteConfig.siteName} | ${siteConfig.tagline}`}</title>

        {/* 🆕 Dynamic description instead of static */}
        <meta name="description" content={dynamicDescription} />

        {/* 🆕 NEW: Dynamic keywords */}
        <meta name="keywords" content={dynamicKeywords} />

        {/* 🆕 NEW: News keywords */}
        <meta name="news_keywords" content={newsKeywords} />

        {/* EXISTING meta tags (UNCHANGED) */}
        <link rel="alternate" hrefLang="x-default" href={siteConfig.baseUrl} />
        <meta
          name="copyright"
          content="© 2009 - 2025 FMT Media Sdn Bhd (1235453-U). All Rights Reserved. A part of Media Prima Group."
        />
        <meta name="category" content="homepage, landing"></meta>

        {/* Primary language - set this to your site's main language */}
        <meta httpEquiv="Content-Language" content="en-MY, ms-MY" />
        <meta name="language" content="en, ms" />

        <meta name="author" content={siteConfig.siteName} />
        <meta name="publisher" content={siteConfig.siteName} />
        <link rel="canonical" href={siteConfig.baseUrl} />

        {/* 🆕 NEW: Last modified */}
        <meta httpEquiv="last-modified" content={lastModified} />

        {/* EXISTING og tags (UNCHANGED) */}
        <link
          rel="alternate"
          type="application/atom+xml"
          title="Atom Feed"
          href={`${siteConfig.baseUrl}/feeds/atom/headlines`}
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="RSS Feed"
          href={`${siteConfig.baseUrl}/feeds/rss/headlines`}
        />
        <link
          rel="alternate"
          type="application/feed+json"
          title="JSON Feed"
          href={`${siteConfig.baseUrl}/feeds/json/headlines`}
        />
        {heroPosts[0] && (
          <>
            <link
              rel="preconnect"
              href="https://media.freemalaysiatoday.com"
              crossOrigin="anonymous"
            />
            <link
              rel="preload"
              href={heroPosts[0]?.featuredImage?.node?.sourceUrl}
              as="image"
              imageSrcSet={`${heroPosts[0]?.featuredImage?.node?.sourceUrl}?w=640 640w, ${heroPosts[0]?.featuredImage?.node?.sourceUrl}?w=940 940w`}
              imageSizes="(max-width: 640px) 100vw, 940px"
            />
          </>
        )}
        {fbPageIds.map((id) => (
          <meta key={id} property="fb:pages" content={id} />
        ))}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteConfig?.baseUrl} />
        <meta
          property="og:title"
          content={`${siteConfig?.siteName} | ${siteConfig?.tagline}`}
        />
        <meta property="og:site_name" content={`${siteConfig?.siteName}`} />

        {/* 🆕 Dynamic OG description */}
        <meta property="og:description" content={dynamicDescription} />

        <meta property="og:image" content={siteConfig?.iconPath} />
        <meta property="og:image:alt" content="Free Malaysia Today || FMT" />
        <meta property="og:locale" content="en_MY" />
        {Array.isArray(defaultAlternateLocale) &&
          defaultAlternateLocale.map((locale: string) => (
            <meta
              key={locale}
              property="og:locale:alternate"
              content={locale}
            />
          ))}

        {/* 🆕 NEW: Article meta tags */}
        <meta
          property="article:publisher"
          content="https://www.facebook.com/freemalaysiatoday"
        />
        <meta property="article:section" content="Homepage" />
        {articleTags && <meta property="article:tag" content={articleTags} />}
        <meta property="article:modified_time" content={lastModified} />

        {/* EXISTING Twitter tags (UNCHANGED) */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta name="twitter:url" content={siteConfig?.baseUrl} />
        <meta
          name="twitter:title"
          content={`${siteConfig?.siteName} | ${siteConfig?.tagline}`}
        />

        {/* 🆕 Dynamic Twitter description */}
        <meta name="twitter:description" content={dynamicDescription} />

        <meta name="twitter:image" content={siteConfig?.iconPath} />
        <meta name="twitter:image:alt" content="Free Malaysia Today || FMT" />
        <meta name="twitter:creator" content="@fmtoday" />
      </Head>

      {/* EXISTING structured data scripts (UNCHANGED) */}
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getWebsiteSchema()) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getWebPageSchema()) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateCollectionPageJsonLD({
              heroPosts: heroPosts || [],
              highlightPosts: highlightPosts || [],
              topNewsPosts: topNewsPosts || [],
              businessPosts: businessPosts || [],
              opinionPosts: opinionPosts || [],
              worldPosts: worldPosts || [],
              leisurePosts: leisurePosts || [],
              sportsPosts: sportsPosts || [],
              beritaPosts: beritaPosts || [],
              videoPosts: videoPosts || [],
              columnists: columnists || [],
            })
          ),
        }}
        type="application/ld+json"
      />

      {trendingTopicsJsonLD && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(trendingTopicsJsonLD),
          }}
        />
      )}

      <main>
        <TrendingNSubCategoriesList items={trendingTags} variant="trending" />
        <section
          id="TopSection"
          className="my-4 grid grid-cols-1 gap-4 md:grid-cols-12"
        >
          <div className="order-3 md:col-span-12 xl:order-1 xl:col-span-3">
            <Link href="/business">
              <SectionHeading sectionName="Business" />
            </Link>
            <div className="gap-2 sm:block md:grid md:grid-cols-2 md:gap-8 xl:block">
              {businessPosts?.map((bizPost: any) => (
                <LTRNewsPreview key={bizPost?.slug} {...bizPost} />
              ))}
            </div>
          </div>
          <div className="order-1 md:col-span-7 xl:order-2 xl:col-span-5">
            <SuperNewsPreview {...heroPosts[0]} />
          </div>
          <div className="order-2 md:col-span-5 xl:order-3 xl:col-span-4">
            <Link href="/news">
              <SectionHeading sectionName="Highlights" />
            </Link>
            <div className="grid gap-2 gap-y-4 grid-cols-2">
              {highlightPosts?.map((highlightPost: any) => (
                <TTBNewsPreview key={highlightPost?.slug} {...highlightPost} />
              ))}
            </div>
          </div>
        </section>
        <div className="ads-dynamic-desktop">
          <AdSlot
            sizes={[
              [970, 90],
              [970, 250],
              [728, 90],
            ]}
            targetingParams={dfpTargetingParams}
            id="div-gpt-ad-1661333181124-0"
            name="ROS_Billboard"
            visibleOnDevices="onlyDesktop"
          />
        </div>
        <div className="ads-small-mobile">
          <AdSlot
            sizes={[
              [320, 50],
              [320, 100],
            ]}
            targetingParams={dfpTargetingParams}
            id="div-gpt-ad-1661362470988-0"
            name="ROS_Mobile_Leaderboard"
            visibleOnDevices="onlyMobile"
          />
        </div>

        <section
          id="TopNews-MostViewed"
          className="my-4 grid grid-cols-3 gap-4 gap-x-6"
        >
          <div className="col-span-3 lg:col-span-2">
            <HomeTopNewsOpinion
              posts={topNewsPosts}
              categoryRoute="news"
              categoryName="top-news"
              sectionTitle="Top News"
            />
          </div>
          <div className="col-span-3 mb-3 flex flex-col lg:col-span-1">
            <CategorySidebar
              pageName="home"
              adsTargetingParams={dfpTargetingParams}
            />
          </div>
        </section>

        <HomeCommonSections
          posts={beritaPosts}
          categoryRoute="berita"
          categoryName="top-bm"
          sectionTitle="Berita Utama"
          sectionId="Berita-Utama"
        />

        <LatestVideosOnHomePage videos={videoPosts} />

        <div className="ads-tall-mobile">
          <AdSlot
            id="div-gpt-ad-1661355926077-0"
            name="ROS_Halfpage"
            sizes={[300, 600]}
            visibleOnDevices="onlyMobile"
            targetingParams={dfpTargetingParams}
          />
        </div>
        <section
          id="Opinion-Columnist"
          className="my-4 grid grid-cols-3 gap-6 gap-y-10"
        >
          <div className="col-span-3 lg:col-span-2">
            <HomeTopNewsOpinion
              posts={opinionPosts}
              categoryRoute="opinion"
              categoryName="opinion"
              sectionTitle="Opinion"
            />
          </div>
          <div className="col-span-3 flex h-screen flex-col md:h-auto lg:col-span-1">
            <SectionHeading sectionName="Columnist" />
            <ColumnistCredits columnists={columnists} />
          </div>
        </section>

        <HomeCommonSections
          posts={worldPosts}
          categoryRoute="world"
          categoryName="world"
          sectionTitle="World News"
          sectionId="World-News"
        />
        <div className="ads-small-desktop">
          <AdSlot
            sizes={[
              [728, 90],
              [970, 90],
            ]}
            id="div-gpt-ad-1661418008040-0"
            name="ROS_Multisize_Leaderboard_b"
            visibleOnDevices="onlyDesktop"
            targetingParams={dfpTargetingParams}
          />
        </div>
        <HomeCommonSections
          posts={leisurePosts}
          categoryRoute="lifestyle"
          categoryName="leisure"
          sectionTitle="Lifestyle"
          sectionId="Lifestyle-News"
        />
        <HomeCommonSections
          posts={sportsPosts}
          categoryRoute="sports"
          categoryName="sports"
          sectionTitle="Sports News"
          sectionId="Sports-News"
        />
      </main>
      <footer>
        <HomeFooter currentHighlightPosts={highlightPosts} />
      </footer>
      {/* Pixel Ad */}
      <AdSlot
        id="div-gpt-ad-1661362827551-0"
        name="Pixel"
        targetingParams={dfpTargetingParams}
        sizes={[1, 1]}
        additionalStyle={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "var(--muted)",
          height: 0,
        }}
      />

      {/* OutOfPage Ad */}
      <AdSlot
        id="div-gpt-ad-1661362765847-0"
        name="OutOfPage"
        sizes={[1, 1]}
        outOfPage={true}
        targetingParams={dfpTargetingParams}
        additionalStyle={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "var(--muted)",
          height: 0,
        }}
      />
    </>
  );
}

// ✅ NEW: Retry helper with exponential backoff
async function fetchWithRetry<T>(
  category: string,
  fetchFn: () => Promise<T>,
  retries = 2
): Promise<T> {
  const startTime = Date.now();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fetchFn();

      const duration = Date.now() - startTime;
      console.log(
        `[HomePage ISR] ✅ ${category}: Success (${duration}ms, attempt ${attempt + 1})`
      );

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(
        `[HomePage ISR] ❌ ${category}: Failed (${duration}ms, attempt ${attempt + 1}/${retries + 1}):`,
        error.message
      );

      if (attempt < retries) {
        const delay = 1000 * (attempt + 1); // 1s, 2s
        console.log(`[HomePage ISR] Retrying ${category} in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  throw new Error(`${category} failed after ${retries + 1} attempts`);
}

export const getStaticProps: GetStaticProps = async ({ preview = false }) => {
  try {
    const heroPosts = await getCategoryNews("super-highlight", 1, preview);

    const excludeSlugs = Array.isArray(heroPosts)
      ? heroPosts.map((post) => post?.slug).filter(Boolean)
      : [];

    const getFilteredCategoryNews = async (
      categoryName: string,
      limit: number,
      additionalExcludes: string[] = []
    ) => {
      try {
        const allPosts = await getCategoryNews(
          categoryName,
          limit + excludeSlugs?.length + additionalExcludes?.length,
          preview
        );

        return allPosts
          .filter(
            (post: { slug: string }) =>
              !excludeSlugs?.includes(post?.slug) &&
              !additionalExcludes?.includes(post?.slug)
          )
          .slice(0, limit);
      } catch (error) {
        console.error(`Error fetching ${categoryName} posts:`, error);
        return [];
      }
    };

    let highlightPosts = await getFilteredCategoryNews(
      "highlight",
      4,
      excludeSlugs
    );
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    if (!highlightPosts?.length || highlightPosts.length < 4) {
      await delay(1000);
      console.log("[Home] Retrying highlight posts fetch after 1s...");
      highlightPosts = await getFilteredCategoryNews(
        "highlight",
        4,
        excludeSlugs
      );
    }

    if (Array.isArray(highlightPosts)) {
      excludeSlugs.push(
        ...highlightPosts.map((post) => post?.slug).filter(Boolean)
      );
    }

    const [
      topNewsPosts,
      businessPosts,
      opinionPosts,
      worldPosts,
      leisurePosts,
      sportsPosts,
      superBmPosts,
    ] = await Promise.all([
      fetchWithRetry("top-news", () =>
        getFilteredCategoryNews("top-news", 6)
      ).catch((error) => {
        console.error(
          "[HomePage ISR] ❌ top-news COMPLETELY FAILED:",
          error.message
        );
        return [];
      }),
      fetchWithRetry("business", () =>
        getFilteredCategoryNews("business", 3)
      ).catch((error) => {
        console.error(
          "[HomePage ISR] ❌ business COMPLETELY FAILED:",
          error.message
        );
        return [];
      }),
      fetchWithRetry("opinion", () =>
        getFilteredCategoryNews("opinion", 6)
      ).catch((error) => {
        console.error(
          "[HomePage ISR] ❌ opinion COMPLETELY FAILED:",
          error.message
        );
        return [];
      }),
      fetchWithRetry("world", () => getFilteredCategoryNews("world", 5)).catch(
        (error) => {
          console.error(
            "[HomePage ISR] ❌ world COMPLETELY FAILED:",
            error.message
          );
          return [];
        }
      ),
      fetchWithRetry("leisure", () =>
        getFilteredCategoryNews("leisure", 5)
      ).catch((error) => {
        console.error(
          "[HomePage ISR] ❌ leisure COMPLETELY FAILED:",
          error.message
        );
        return [];
      }),
      fetchWithRetry("sports", () =>
        getFilteredCategoryNews("sports", 5)
      ).catch((error) => {
        console.error(
          "[HomePage ISR] ❌ sports COMPLETELY FAILED:",
          error.message
        );
        return [];
      }),
      fetchWithRetry("super-bm", () =>
        getFilteredCategoryNews("super-bm", 1)
      ).catch((error) => {
        console.error(
          "[HomePage ISR] ❌ super-bm COMPLETELY FAILED:",
          error.message
        );
        return [];
      }),
    ]);

    const topBmPosts = await getFilteredCategoryNews(
      "top-bm",
      4,
      superBmPosts?.map((post: { slug: string }) => post?.slug)
    );

    const beritaPosts = [...superBmPosts, ...topBmPosts]?.slice(0, 5);

    let videoPosts = [];
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/homepage`
      );
      const homepageData = await response.json();
      videoPosts = homepageData.data.videos ?? [];
      videoPosts = videoPosts?.slice(0, 5);
    } catch (error) {
      console.error("Failed to fetch videos:", error);
    }

    const columnistsIds = await prisma.columnist.findMany({
      select: { userId: true },
    });
    const columnistIds = columnistsIds?.map((id: any) => id?.userId);
    const columnists = await getColumnists(columnistIds, preview);
    const trendingTags = await prisma.trendingTag.findMany();

    // ✅ NEW: Validate sections before caching
    const criticalSections = [
      { name: "hero", data: heroPosts },
      { name: "highlight", data: highlightPosts },
      { name: "business", data: businessPosts },
      { name: "world", data: worldPosts },
      { name: "sports", data: sportsPosts },
    ];

    const failedSections = criticalSections.filter(
      (s) => !s.data || s.data.length === 0
    );

    // If too many sections failed, don't cache this page long-term
    if (failedSections.length >= 3) {
      console.error(
        `[HomePage ISR] 🔴 TOO MANY SECTIONS EMPTY (${failedSections.length}/${criticalSections.length})`
      );
      console.error(
        "[HomePage ISR] Failed sections:",
        failedSections.map((s) => s.name).join(", ")
      );

      // Return notFound so Cloudflare doesn't cache broken page
      return {
        notFound: true,
        revalidate: 60, // ✅ Retry in 1 minute, not 25 minutes
      };
    }

    // All good - return normally
    console.log(
      `[HomePage ISR] ✅ Build successful (${failedSections.length} sections empty, acceptable)`
    );

    return {
      props: {
        heroPosts,
        highlightPosts,
        topNewsPosts,
        businessPosts,
        opinionPosts,
        worldPosts,
        leisurePosts,
        sportsPosts,
        beritaPosts,
        videoPosts,
        columnists,
        trendingTags,
        _lastUpdate: Date.now(),
        _buildError: failedSections.length > 0, // ✅ NEW: Flag for UI
      },
      revalidate: 1500, // 25 minutes
    };
  } catch (error) {
    console.error("[HomePage] Error fetching data:", error);
    return {
      notFound: true,
      revalidate: 110, // Try again sooner if there was an error
    };
  }
};
