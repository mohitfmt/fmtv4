// pages/videos/shorts.tsx
// MODIFIED: Converted from SSR to ISR for better performance

import { GetStaticProps } from "next";
import Head from "next/head";
import Script from "next/script";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

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
  const thumbnailUrl = `https://i.ytimg.com/vi/${video.videoId}/frame0.jpg` ||
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
        userInteractionCount: parseInt(video.statistics.viewCount) || 0,
      },
    ],
    publisher: {
      "@type": "Organization",
      name: channelInfo?.name || "Free Malaysia Today",
      logo: {
        "@type": "ImageObject",
        url: channelInfo?.logo || "https://www.freemalaysiatoday.com/logo.png",
      },
    },
  };
}

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
  channelInfo,
}: ShortsPageProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Generate JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        "@id": `${currentUrl}#itemlist`,
        name: `${playlistTitle} - Free Malaysia Today`,
        description: `Collection of ${totalCount} short news videos from Malaysia`,
        numberOfItems: totalCount,
        itemListElement: shorts
          .slice(0, 20)
          .map((video, index) =>
            generateVideoSchema(video, index, channelInfo)
          ),
      },
      {
        "@type": "CollectionPage",
        "@id": currentUrl,
        name: playlistTitle,
        description: `Browse ${totalCount} short videos from Free Malaysia Today`,
        url: currentUrl,
        isPartOf: {
          "@type": "WebSite",
          name: "Free Malaysia Today",
          url: "https://www.freemalaysiatoday.com",
        },
        mainEntity: {
          "@id": `${currentUrl}#itemlist`,
        },
      },
      {
        "@type": "BreadcrumbList",
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
            name: playlistTitle,
            item: currentUrl,
          },
        ],
      },
    ],
  };

  const pageTitle = `${playlistTitle} - ${totalCount} Videos | Free Malaysia Today`;
  const pageDescription = `Watch ${totalCount} latest short videos from Malaysia. Breaking news, politics, business, lifestyle, and more from Free Malaysia Today.`;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Error Loading Shorts</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Link href="/videos">
          <button className="px-6 py-2 bg-primary text-white rounded-lg">
            Back to Videos
          </button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content={`FMT Shorts, Malaysia news videos, breaking news, short videos, ${trendingKeywords.join(", ")}`}
        />
        <link rel="canonical" href={currentUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta
          property="og:image"
          content={
            shorts[0]?.thumbnails?.maxres ||
            "https://www.freemalaysiatoday.com/images/fmt-video-default.jpg"
          }
        />
        <meta property="og:site_name" content="Free Malaysia Today" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta
          name="twitter:image"
          content={
            shorts[0]?.thumbnails?.maxres ||
            "https://www.freemalaysiatoday.com/images/fmt-video-default.jpg"
          }
        />

        {/* Additional SEO */}
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <meta name="googlebot" content="index, follow" />
        <meta httpEquiv="content-language" content="en-MY" />
        <meta name="geo.region" content="MY" />
        <meta name="article:publisher" content="Free Malaysia Today" />
        <meta name="article:modified_time" content={lastModified} />

        {isNewsContent && (
          <>
            <meta name="news_keywords" content={trendingKeywords.join(", ")} />
            <meta property="article:section" content="Video News" />
          </>
        )}
      </Head>

      {/* JSON-LD Structured Data */}
      <Script
        id="shorts-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <div className="min-h-screen">
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

// 🆕 ISR: Static generation with 5-minute revalidation
export const getStaticProps: GetStaticProps = async (context) => {
  const { sort = "newest", lang = "en" } = context.params || {};
  const currentUrl = `https://www.freemalaysiatoday.com/videos/shorts`;

  // Determine if content is news-related
  const isNewsContent = true; // Shorts are typically news content

  // Mock trending keywords (you can fetch from TrendingTopic model if needed)
  const trendingKeywords = ["Malaysia", "Breaking News", "FMT", "News Videos"];

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
        revalidate: 300, // 5 minutes
      };
    }

    // Get playlist info
    const shortsPlaylistInfo = await prisma.playlist.findFirst({
      where: { playlistId: videoConfig.shortsPlaylist },
      select: { title: true },
    });

    // Build sort order
    let orderBy: any = { publishedAt: "desc" };
    if (sort === "trending") {
      orderBy = { publishedAt: "asc" };
    }

    // Fetch initial 24 videos
    let shorts;
    let totalCount;

    if (sort === "popular") {
      // For popular sort, fetch all and sort in memory
      const allVideos = await prisma.videos.findMany({
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
      });

      const sortedVideos = allVideos.sort((a: any, b: any) => {
        const aViews = Number(a.statistics?.viewCount || 0);
        const bViews = Number(b.statistics?.viewCount || 0);
        return bViews - aViews;
      });

      shorts = sortedVideos.slice(0, 24);
      totalCount = sortedVideos.length;
    } else {
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

    // Transform videos to frontend format
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

    return {
      props: {
        shorts: transformedShorts,
        totalCount,
        sortBy: (sort as string) || "newest",
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
      revalidate: 300, // 🆕 ISR: Revalidate every 5 minutes (fallback)
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
      revalidate: 300, // Still revalidate even on error
    };
  }
};
