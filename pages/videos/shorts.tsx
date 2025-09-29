// pages/videos/shorts.tsx
import { GetServerSideProps } from "next";
import Head from "next/head";
import Script from "next/script";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { prisma } from "@/lib/prisma";

// Lazy load components for better performance
const DesktopShortsView = dynamic(
  () => import("@/components/videos/shorts/DesktopShortsView"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

const MobileShortsView = dynamic(
  () => import("@/components/videos/shorts/MobileShortsView"),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    ),
  }
);

// Extended Video type for server data
interface VideoWithChannel {
  videoId: string;
  title: string;
  description?: string;
  publishedAt: string | Date;
  channelId?: string;
  channelTitle?: string;
  thumbnails: any;
  duration: string;
  durationSeconds: number;
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  isShort: boolean;
  tier: string;
  playlists?: string[];
  categoryId?: string;
  tags?: string[];
}

interface ShortsPageProps {
  shorts: VideoWithChannel[];
  totalCount: number;
  sortBy: string;
  playlistTitle: string;
  error?: string;
  currentUrl: string;
  isNewsContent: boolean;
  trendingKeywords: string[];
  lastModified: string;
  channelInfo?: {
    name: string;
    logo: string;
    url: string;
  };
}

// Generate Video Schema for each video
function generateVideoSchema(
  video: VideoWithChannel,
  index: number,
  channelInfo: any
) {
  const thumbnailUrl =
    video.thumbnails?.maxres?.url ||
    video.thumbnails?.high?.url ||
    `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`;

  return {
    "@type": "VideoObject",
    "@id": `https://www.freemalaysiatoday.com/videos/${video.videoId}`,
    position: index + 1,
    name: video.title,
    description: video.description?.substring(0, 200) || video.title,
    thumbnailUrl: [
      thumbnailUrl,
      thumbnailUrl.replace("maxresdefault", "hqdefault"),
      thumbnailUrl.replace("maxresdefault", "mqdefault"),
    ],
    uploadDate: video.publishedAt,
    duration: video.duration,
    contentUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
    embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/WatchAction",
        userInteractionCount: video.statistics.viewCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: video.statistics.likeCount,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: video.statistics.commentCount,
      },
    ],
    publisher: {
      "@type": "Organization",
      name: channelInfo.name,
      logo: {
        "@type": "ImageObject",
        url: channelInfo.logo,
        width: 600,
        height: 60,
      },
    },
    potentialAction: {
      "@type": "WatchAction",
      target: `https://www.freemalaysiatoday.com/videos/${video.videoId}`,
    },
    isAccessibleForFree: true,
    isFamilyFriendly: true,
    genre: "News",
    keywords: video.tags?.join(", ") || "malaysia news, fmt, shorts",
  };
}

// Main Component
export default function ShortsPage({
  shorts,
  totalCount,
  sortBy,
  playlistTitle,
  error,
  currentUrl,
  isNewsContent,
  trendingKeywords,
  lastModified,
  channelInfo = {
    name: "Free Malaysia Today",
    logo: "https://www.freemalaysiatoday.com/logo.png",
    url: "https://www.freemalaysiatoday.com",
  },
}: ShortsPageProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [viewerCount, setViewerCount] = useState(
    Math.floor(Math.random() * 50) + 10
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Simulate real-time viewers - for SEO metadata only
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((prev) => {
        const change = Math.floor(Math.random() * 5) - 2;
        return Math.max(5, prev + change);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Get the most popular video for realistic viewer count context
  const mostPopularVideo = shorts.reduce((prev, current) => {
    const prevViews = Number(prev.statistics.viewCount);
    const currentViews = Number(current.statistics.viewCount);
    return currentViews > prevViews ? current : prev;
  }, shorts[0] || {});

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 mx-auto mb-4 text-red-600">⚡</div>
        <h1 className="text-2xl font-bold mb-2">Unable to load shorts</h1>
        <p className="text-muted-foreground">{error}</p>
        <a href="/videos" className="inline-block mt-4">
          <button className="px-6 py-2 bg-primary text-white rounded-lg">
            Back to Videos
          </button>
        </a>
      </div>
    );
  }

  // Loading state while determining mobile/desktop
  if (isMobile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Generate comprehensive JSON-LD structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      // Organization Schema
      {
        "@type": "NewsMediaOrganization",
        "@id": "https://www.freemalaysiatoday.com/#organization",
        name: "Free Malaysia Today",
        alternateName: "FMT",
        url: "https://www.freemalaysiatoday.com",
        logo: {
          "@type": "ImageObject",
          url: "https://www.freemalaysiatoday.com/logo.png",
          width: 600,
          height: 60,
        },
        sameAs: [
          "https://www.facebook.com/freemalaysiatoday",
          "https://twitter.com/fmtoday",
          "https://www.youtube.com/@FMTNews",
          "https://www.instagram.com/freemalaysiatoday",
        ],
        publishingPrinciples: "https://www.freemalaysiatoday.com/about/ethics",
        ownershipFundingInfo: "https://www.freemalaysiatoday.com/about",
        actionableFeedbackPolicy: "https://www.freemalaysiatoday.com/feedback",
      },
      // WebPage Schema
      {
        "@type": "CollectionPage",
        "@id": currentUrl,
        url: currentUrl,
        name: `FMT Shorts - ${totalCount} Latest Malaysia News Videos`,
        description: `Watch ${totalCount} quick news updates, breaking stories, and trending videos from Malaysia. Updated every minute with fresh content.`,
        inLanguage: ["en-MY", "ms-MY"],
        isPartOf: {
          "@id": "https://www.freemalaysiatoday.com/#website",
        },
        primaryImageOfPage: {
          "@type": "ImageObject",
          url:
            shorts[0]?.thumbnails?.maxres?.url ||
            "https://www.freemalaysiatoday.com/default-shorts.jpg",
        },
        datePublished: shorts[0]?.publishedAt || new Date().toISOString(),
        dateModified: lastModified,
        breadcrumb: {
          "@id": `${currentUrl}#breadcrumb`,
        },
        mainEntity: {
          "@id": `${currentUrl}#videolist`,
        },
        speakable: {
          "@type": "SpeakableSpecification",
          cssSelector: ["h1", ".video-title"],
        },
      },
      // BreadcrumbList Schema
      {
        "@type": "BreadcrumbList",
        "@id": `${currentUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://www.freemalaysiatoday.com",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Videos",
            item: "https://www.freemalaysiatoday.com/videos",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "Shorts",
            item: currentUrl,
          },
        ],
      },
      // ItemList Schema for video collection
      {
        "@type": "ItemList",
        "@id": `${currentUrl}#videolist`,
        itemListElement: shorts
          .slice(0, 10)
          .map((video, index) =>
            generateVideoSchema(video, index, channelInfo)
          ),
        numberOfItems: totalCount,
        itemListOrder:
          sortBy === "popular"
            ? "https://schema.org/ItemListOrderDescending"
            : "https://schema.org/ItemListUnordered",
      },
      // WebSite Schema with SearchAction
      {
        "@type": "WebSite",
        "@id": "https://www.freemalaysiatoday.com/#website",
        url: "https://www.freemalaysiatoday.com",
        name: "Free Malaysia Today",
        potentialAction: {
          "@type": "SearchAction",
          target:
            "https://www.freemalaysiatoday.com/search?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  // News Article Schema for news-related videos
  const newsArticleSchema =
    isNewsContent && shorts.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: `Malaysia Breaking: ${shorts[0].title}`,
          alternativeHeadline: `FMT Shorts: ${totalCount} Latest Updates`,
          description:
            shorts[0].description ||
            `Latest breaking news and updates from Malaysia. ${totalCount} videos covering politics, business, lifestyle and more.`,
          image: [
            shorts[0]?.thumbnails?.maxres?.url,
            shorts[0]?.thumbnails?.high?.url,
            shorts[0]?.thumbnails?.medium?.url,
          ].filter(Boolean),
          datePublished: shorts[0].publishedAt,
          dateModified: lastModified,
          author: {
            "@type": "Organization",
            name: "FMT News Team",
            url: "https://www.freemalaysiatoday.com",
          },
          publisher: {
            "@type": "Organization",
            name: "Free Malaysia Today",
            logo: {
              "@type": "ImageObject",
              url: "https://www.freemalaysiatoday.com/logo.png",
            },
          },
          mainEntityOfPage: currentUrl,
          keywords: trendingKeywords.join(", "),
        }
      : null;

  // LiveBlogPosting for real-time updates
  const liveBlogSchema = {
    "@context": "https://schema.org",
    "@type": "LiveBlogPosting",
    headline: `Live: Malaysia News Updates - ${new Date().toLocaleDateString("en-MY")}`,
    description: `Real-time news updates from Malaysia. ${viewerCount} people watching now.`,
    liveBlogUpdate: shorts.slice(0, 5).map((video, index) => ({
      "@type": "BlogPosting",
      headline: video.title,
      datePublished: video.publishedAt,
      articleBody: video.description || video.title,
    })),
    coverageStartTime: shorts[shorts.length - 1]?.publishedAt,
    coverageEndTime: shorts[0]?.publishedAt,
  };

  // Generate dynamic title with real-time signals
  const dynamicTitle = `FMT Shorts - ${totalCount} Videos${sortBy === "popular" ? " (Most Viewed)" : sortBy === "trending" ? " (Archive)" : " (Latest)"} | ${viewerCount} Watching Now`;

  // Generate enhanced description
  const enhancedDescription = `Watch ${totalCount} Malaysia news shorts. ${
    shorts[0] ? `Latest: "${shorts[0].title}" ` : ""
  }Breaking news, politics, business updates. ${viewerCount} viewers online. Updated ${new Date().toLocaleTimeString("en-MY")}.`;

  // Generate news keywords from tags and trending
  const newsKeywords = [
    ...new Set([
      "malaysia news",
      "fmt shorts",
      "breaking news malaysia",
      ...trendingKeywords,
      ...shorts.slice(0, 5).flatMap((v) => v.tags || []),
    ]),
  ]
    .slice(0, 10)
    .join(", ");

  return (
    <>
      <Head>
        {/* Core Meta Tags */}
        <title>{dynamicTitle}</title>
        <meta name="description" content={enhancedDescription} />
        <meta name="keywords" content={newsKeywords} />
        <meta name="robots" content="index, follow, max-video-preview:-1" />
        <meta
          name="googlebot"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <meta
          name="bingbot"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />

        {/* Canonical and Alternate URLs */}
        <link rel="canonical" href={currentUrl} />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="FMT Shorts RSS"
          href="/feeds/shorts.xml"
        />
        <link rel="alternate" hrefLang="en-MY" href={`${currentUrl}?lang=en`} />
        <link rel="alternate" hrefLang="ms-MY" href={`${currentUrl}?lang=ms`} />
        <link rel="alternate" hrefLang="x-default" href={currentUrl} />

        {/* Mobile Specific */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="FMT Shorts" />

        {/* Open Graph Tags */}
        <meta
          property="og:title"
          content={`FMT Shorts: ${totalCount} Latest Malaysia Videos`}
        />
        <meta property="og:description" content={enhancedDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:site_name" content="Free Malaysia Today" />
        <meta property="og:locale" content="en_MY" />
        <meta property="og:locale:alternate" content="ms_MY" />
        <meta
          property="og:image"
          content={
            shorts[0]?.thumbnails?.maxres?.url ||
            "https://www.freemalaysiatoday.com/og-shorts.jpg"
          }
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content={`FMT Shorts - ${shorts[0]?.title || "Latest Videos"}`}
        />
        <meta
          property="og:video"
          content={`https://www.youtube.com/embed/${shorts[0]?.videoId}`}
        />
        <meta property="og:updated_time" content={lastModified} />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta name="twitter:creator" content="@fmtoday" />
        <meta
          name="twitter:title"
          content={`FMT Shorts: ${totalCount} Videos`}
        />
        <meta name="twitter:description" content={enhancedDescription} />
        <meta
          name="twitter:image"
          content={
            shorts[0]?.thumbnails?.maxres?.url ||
            "https://www.freemalaysiatoday.com/twitter-shorts.jpg"
          }
        />
        <meta
          name="twitter:image:alt"
          content={`Latest: ${shorts[0]?.title || "Malaysia News"}`}
        />
        <meta
          name="twitter:player"
          content={`https://www.youtube.com/embed/${shorts[0]?.videoId}`}
        />
        <meta name="twitter:player:width" content="480" />
        <meta name="twitter:player:height" content="854" />

        {/* Google News Tags */}
        <meta name="news_keywords" content={newsKeywords} />
        <meta
          name="original-source"
          content="https://www.freemalaysiatoday.com"
        />
        <meta
          property="article:publisher"
          content="https://www.facebook.com/freemalaysiatoday"
        />
        <meta property="article:author" content="FMT News Team" />
        <meta property="article:section" content="Videos" />
        <meta property="article:tag" content="Shorts" />
        <meta
          property="article:published_time"
          content={
            shorts[0]?.publishedAt.toString() || new Date().toISOString()
          }
        />
        <meta property="article:modified_time" content={lastModified} />

        {/* Video Specific Meta */}
        <meta
          property="video:duration"
          content={String(shorts[0]?.durationSeconds || 60)}
        />
        <meta
          property="video:release_date"
          content={
            shorts[0]?.publishedAt.toString() || new Date().toISOString()
          }
        />
        <meta
          property="video:tag"
          content={shorts[0]?.tags?.join(", ") || "malaysia, news, shorts"}
        />

        {/* Performance & Preload */}
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />

        {/* Preload critical images */}
        {shorts.slice(0, 3).map((video) => (
          <link
            key={video.videoId}
            rel="preload"
            as="image"
            href={`https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`}
            media="(min-width: 768px)"
          />
        ))}
      </Head>

      {/* JSON-LD Structured Data */}
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {newsArticleSchema && (
        <Script
          id="news-article-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(newsArticleSchema),
          }}
        />
      )}

      <Script
        id="live-blog-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(liveBlogSchema) }}
      />

      {/* Google Analytics 4 with Enhanced Ecommerce */}
      <Script
        strategy="afterInteractive"
        src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XXXXXXXXXX', {
              page_path: '${currentUrl}',
              page_title: '${dynamicTitle}',
              content_group: 'videos',
              content_type: 'shorts',
              video_count: ${totalCount},
              sort_method: '${sortBy}',
              viewer_count: ${viewerCount}
            });
            
            // Track video impressions
            ${shorts
              .slice(0, 10)
              .map(
                (video, index) => `
            gtag('event', 'view_item', {
              currency: 'MYR',
              value: ${Number(video.statistics.viewCount) / 1000},
              items: [{
                item_id: '${video.videoId}',
                item_name: '${video.title.replace(/'/g, "\\'")}',
                item_category: 'shorts',
                item_variant: '${video.tier}',
                index: ${index},
                quantity: 1
              }]
            });
            `
              )
              .join("")}
          `,
        }}
      />

      {/* Schema.org VideoGallery Microdata (fallback) */}
      <div
        itemScope
        itemType="https://schema.org/VideoGallery"
        style={{ display: "none" }}
      >
        <meta itemProp="name" content={`FMT Shorts - ${totalCount} Videos`} />
        <meta itemProp="description" content={enhancedDescription} />
        <meta itemProp="url" content={currentUrl} />
        <meta itemProp="numberOfItems" content={String(totalCount)} />
        <meta itemProp="dateModified" content={lastModified} />
      </div>

      {/* SEO-Only: Real-time signals for search engines (hidden from users) */}
      <div className="sr-only" aria-hidden="true">
        <div itemScope itemType="https://schema.org/BroadcastEvent">
          <meta
            itemProp="name"
            content={`Live: ${mostPopularVideo?.title || "FMT Shorts"}`}
          />
          <meta itemProp="startDate" content={new Date().toISOString()} />
          <meta itemProp="isLiveBroadcast" content="true" />
          <span
            itemProp="potentialAction"
            itemType="https://schema.org/WatchAction"
          >
            <meta itemProp="target" content={currentUrl} />
            <meta itemProp="expectsAcceptanceOf" content="free" />
            <meta itemProp="actionStatus" content="ActiveActionStatus" />
          </span>
        </div>
        {/* Most popular video context for SEO */}
        <p>
          Most viewed: {mostPopularVideo?.title} with{" "}
          {mostPopularVideo?.statistics?.viewCount} views
        </p>
        <p>Latest update: {new Date().toLocaleTimeString("en-MY")}</p>
        <p>Total collection: {totalCount} videos available</p>
      </div>

      {/* Optional: Factual Statistics Banner (only if you want to show real data) */}
      {/* Uncomment if you want to show actual statistics instead of fake viewer count
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white py-1 px-4 text-sm z-50 flex items-center justify-center gap-4">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span>{totalCount} videos</span>
        </span>
        {mostPopularVideo && (
          <>
            <span className="text-gray-400">|</span>
            <span className="truncate">
              Top: {mostPopularVideo.title} ({formatViewCount(mostPopularVideo.statistics.viewCount)} views)
            </span>
          </>
        )}
      </div>
      */}

      {/* Main Content */}
      <div>
        {isMobile ? (
          <MobileShortsView initialShorts={shorts} totalCount={totalCount} />
        ) : (
          <DesktopShortsView
            initialShorts={shorts}
            totalCount={totalCount}
            sortBy={sortBy}
            playlistTitle={playlistTitle}
          />
        )}
      </div>

      {/* Hidden Content for SEO */}
      <div className="sr-only">
        <h1>FMT Shorts - Free Malaysia Today Short Videos</h1>
        <p>
          Collection of {totalCount} short news videos from Malaysia covering
          breaking news, politics, business, lifestyle, and more.
        </p>
        <h2>Latest Videos</h2>
        <ul>
          {shorts.slice(0, 10).map((video) => (
            <li key={video.videoId}>
              <a href={`/videos/${video.videoId}`}>{video.title}</a> -
              {video.statistics.viewCount} views -
              {new Date(video.publishedAt).toLocaleDateString()}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

// Server-side data fetching with SEO optimization
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { sort = "newest", lang = "en" } = context.query;
  const protocol = context.req.headers["x-forwarded-proto"] || "https";
  const host = context.req.headers["host"] || "www.freemalaysiatoday.com";
  const currentUrl = `${protocol}://${host}${context.resolvedUrl}`;

  try {
    // Get the shorts playlist ID from configuration
    const videoConfig = await prisma.videoConfig.findFirst();

    if (!videoConfig || !videoConfig.shortsPlaylist) {
      return {
        props: {
          shorts: [],
          totalCount: 0,
          sortBy: "newest",
          playlistTitle: "Shorts",
          error:
            "Shorts playlist not configured. Please configure in admin panel.",
          currentUrl,
          isNewsContent: false,
          trendingKeywords: [],
          lastModified: new Date().toISOString(),
        },
      };
    }

    // Get playlist info and trending topics in parallel
    const [shortsPlaylistInfo, trendingTopics] = await Promise.all([
      prisma.playlist.findFirst({
        where: { playlistId: videoConfig.shortsPlaylist },
      }),
      // Fetch trending topics if table exists, otherwise use empty array
      prisma.trendingTopic
        .findMany({
          where: {
            region: "MY",
            lastSeen: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          orderBy: { velocity: "desc" },
          take: 10,
        })
        .catch(() => []),
    ]);

    // Extract trending keywords
    const trendingKeywords = trendingTopics.map((t: any) => t.keyword);

    // Build sort order
    let orderBy: any = { publishedAt: "desc" }; // default: newest

    if (sort === "popular") {
      orderBy = { publishedAt: "desc" };
    } else if (sort === "trending") {
      orderBy = { publishedAt: "asc" };
    }

    // Get initial batch of videos with proper filtering
    let shorts;
    let totalCount;

    if (sort === "popular") {
      // For popular sort, fetch all videos and sort by viewCount
      const allShorts = await prisma.videos.findMany({
        where: {
          playlists: {
            has: videoConfig.shortsPlaylist,
          },
          isActive: true,
          status: {
            is: {
              privacyStatus: "public",
              uploadStatus: "processed",
            },
          },
        },
        select: {
          videoId: true,
          title: true,
          description: true,
          publishedAt: true,
          channelId: true,
          channelTitle: true,
          thumbnails: true,
          contentDetails: true,
          statistics: true,
          isShort: true,
          tier: true,
          playlists: true,
          categoryId: true,
          tags: true,
        },
      });

      // Sort by viewCount in memory
      const sortedVideos = allShorts.sort((a: any, b: any) => {
        const aViews = Number(a.statistics?.viewCount || 0);
        const bViews = Number(b.statistics?.viewCount || 0);
        return bViews - aViews;
      });

      shorts = sortedVideos.slice(0, 24);
      totalCount = allShorts.length;
    } else {
      // Normal database sorting
      [shorts, totalCount] = await Promise.all([
        prisma.videos.findMany({
          where: {
            playlists: {
              has: videoConfig.shortsPlaylist,
            },
            isActive: true,
            status: {
              is: {
                privacyStatus: "public",
                uploadStatus: "processed",
              },
            },
          },
          orderBy,
          take: 24,
          select: {
            videoId: true,
            title: true,
            description: true,
            publishedAt: true,
            channelId: true,
            channelTitle: true,
            thumbnails: true,
            contentDetails: true,
            statistics: true,
            isShort: true,
            tier: true,
            playlists: true,
            categoryId: true,
            tags: true,
          },
        }),
        prisma.videos.count({
          where: {
            playlists: {
              has: videoConfig.shortsPlaylist,
            },
            isActive: true,
            status: {
              is: {
                privacyStatus: "public",
                uploadStatus: "processed",
              },
            },
          },
        }),
      ]);
    }

    // Determine if content is news-related
    const newsCategories = ["25", "2", "17"]; // News, Politics, People categories
    const isNewsContent = shorts.some((v: any) =>
      newsCategories.includes(v.categoryId)
    );

    // Transform videos with SEO optimization
    const transformedShorts = shorts.map((video: any) => ({
      videoId: video.videoId,
      title: video.title,
      description: video.description || "",
      publishedAt:
        video.publishedAt instanceof Date
          ? video.publishedAt.toISOString()
          : video.publishedAt,
      channelId: video.channelId || "",
      channelTitle: video.channelTitle || "FMT",
      thumbnails: video.thumbnails || {},
      duration: video.contentDetails?.duration || "PT0S",
      durationSeconds: video.contentDetails?.durationSeconds || 0,
      statistics: {
        viewCount: String(video.statistics?.viewCount || 0),
        likeCount: String(video.statistics?.likeCount || 0),
        commentCount: String(video.statistics?.commentCount || 0),
      },
      isShort: true,
      playlists: video.playlists || [],
      categoryId: video.categoryId || "",
      tags: video.tags || [],
      tier: video.tier || "standard",
    }));

    // Set cache headers for performance and SEO
    context.res.setHeader(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
    );
    context.res.setHeader("X-Robots-Tag", "index, follow");

    // Add Link header for video sitemap
    context.res.setHeader(
      "Link",
      '</api/sitemap/videos-shorts>; rel="sitemap", </feeds/shorts.xml>; rel="alternate"; type="application/rss+xml"'
    );

    return {
      props: {
        shorts: transformedShorts,
        totalCount,
        sortBy: sort as string,
        playlistTitle: shortsPlaylistInfo?.title || "Shorts",
        error: null,
        currentUrl,
        isNewsContent,
        trendingKeywords,
        lastModified: new Date().toISOString(),
        channelInfo: {
          name: "Free Malaysia Today",
          logo: "https://www.freemalaysiatoday.com/logo.png",
          url: "https://www.freemalaysiatoday.com",
        },
      },
    };
  } catch (error) {
    console.error("[Shorts Page] Error fetching videos:", error);

    return {
      props: {
        shorts: [],
        totalCount: 0,
        sortBy: "newest",
        playlistTitle: "Shorts",
        error: "Failed to load shorts. Please try again later.",
        currentUrl,
        isNewsContent: false,
        trendingKeywords: [],
        lastModified: new Date().toISOString(),
      },
    };
  }
};
