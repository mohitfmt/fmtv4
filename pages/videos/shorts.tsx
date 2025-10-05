// pages/videos/shorts.tsx
// ENHANCED: Rich SEO, VideoFacade for desktop, preserved mobile swipe experience
// PRESERVED: Dual view functionality, ISR, frame0 thumbnails for vertical format

import { GetStaticProps } from "next";
import Head from "next/head";
import Script from "next/script";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FaHome, FaChevronRight } from "react-icons/fa";
import siteConfig from "@/constants/site-config";

// Lazy load components for better performance (preserved)
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

// Extended Video type for server data (preserved)
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
  lastModified: string;
}

// Breadcrumb Component
const Breadcrumb = () => {
  return (
    <nav aria-label="Breadcrumb" className="container mx-auto px-4 py-4">
      <ol className="flex items-center space-x-2 text-sm">
        <li>
          <Link
            href="/"
            className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            <FaHome className="w-3 h-3" />
            Home
          </Link>
        </li>
        <li>
          <FaChevronRight className="w-3 h-3 text-muted-foreground" />
        </li>
        <li>
          <Link
            href="/videos"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            Videos
          </Link>
        </li>
        <li>
          <FaChevronRight className="w-3 h-3 text-muted-foreground" />
        </li>
        <li>
          <span className="text-foreground font-medium">Shorts</span>
        </li>
      </ol>
    </nav>
  );
};

export default function ShortsPage({
  shorts,
  totalCount,
  sortBy,
  playlistTitle,
  error,
  currentUrl,
  lastModified,
}: ShortsPageProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile vs desktop (preserved logic)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Enhanced SEO metadata
  const pageTitle = `Shorts | ${siteConfig.siteName} - Quick Video Updates`;
  const pageDescription = `Watch ${totalCount} short-form news videos from Free Malaysia Today. Breaking news, trending topics, and quick updates in under 60 seconds.`;
  const ogImage =
    shorts[0]?.thumbnails?.high?.url ||
    `https://i.ytimg.com/vi/${shorts[0]?.videoId}/frame0.jpg` ||
    `${siteConfig.baseUrl}/images/fmt-shorts-default.jpg`;

  // Generate comprehensive structured data
  const generateStructuredData = () => {
    const schemas: any[] = [];

    // VideoGallery Schema
    schemas.push({
      "@context": "https://schema.org",
      "@type": "VideoGallery",
      "@id": `${currentUrl}#shorts-gallery`,
      name: "FMT Shorts",
      description: pageDescription,
      url: currentUrl,
      numberOfItems: totalCount,
    });

    // ItemList Schema for shorts
    schemas.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${currentUrl}#shorts-list`,
      name: "Latest Shorts",
      description: "Collection of short-form video content",
      numberOfItems: Math.min(shorts.length, 30),
      itemListElement: shorts.slice(0, 30).map((video, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.baseUrl}/videos/${video.videoId}`,
        item: {
          "@type": "VideoObject",
          "@id": `${siteConfig.baseUrl}/videos/${video.videoId}`,
          name: video.title,
          description: video.description?.substring(0, 200) || video.title,
          thumbnailUrl: [
            `https://i.ytimg.com/vi/${video.videoId}/frame0.jpg`,
            `https://i.ytimg.com/vi/${video.videoId}/oar2.jpg`,
            `https://i.ytimg.com/vi/${video.videoId}/hq1.jpg`,
          ],
          uploadDate: video.publishedAt,
          duration: video.duration,
          contentUrl: `https://www.youtube.com/shorts/${video.videoId}`,
          embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/WatchAction",
            userInteractionCount: parseInt(video.statistics.viewCount || "0"),
          },
          publisher: {
            "@type": "NewsMediaOrganization",
            name: siteConfig.siteName,
            url: siteConfig.baseUrl,
            logo: {
              "@type": "ImageObject",
              url: `${siteConfig.baseUrl}/images/logo.png`,
            },
          },
          isShortForm: true,
          videoFormat: "vertical",
        },
      })),
    });

    // BreadcrumbList Schema
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "@id": `${currentUrl}#breadcrumb`,
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
          name: "Videos",
          item: `${siteConfig.baseUrl}/videos`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Shorts",
          item: currentUrl,
        },
      ],
    });

    // WebPage Schema
    schemas.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${currentUrl}#webpage`,
      url: currentUrl,
      name: pageTitle,
      description: pageDescription,
      isPartOf: {
        "@type": "WebSite",
        "@id": `${siteConfig.baseUrl}#website`,
        name: siteConfig.siteName,
        url: siteConfig.baseUrl,
      },
      about: {
        "@type": "Thing",
        name: "Short-form video content",
      },
      inLanguage: "en-MY",
      lastReviewed: lastModified,
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: ogImage,
      },
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: ["h1", ".video-title"],
      },
    });

    return { "@graph": schemas };
  };

  // Handle error state
  if (error) {
    return (
      <>
        <Head>
          <title>Error Loading Shorts | {siteConfig.siteName}</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Unable to Load Shorts</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link href="/videos" className="text-primary hover:underline">
            Back to Videos
          </Link>
        </div>
      </>
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
          content="FMT shorts, Malaysia news shorts, quick videos, breaking news, short-form content, vertical videos"
        />
        <link rel="canonical" href={currentUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="720" />
        <meta property="og:image:height" content="1280" />
        <meta property="og:site_name" content={siteConfig.siteName} />
        <meta property="og:locale" content="en_MY" />
        <meta property="og:video:type" content="short" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="player" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
        <meta
          name="twitter:player"
          content={`https://www.youtube.com/embed/${shorts[0]?.videoId}`}
        />
        <meta name="twitter:player:width" content="720" />
        <meta name="twitter:player:height" content="1280" />

        {/* Additional SEO Meta Tags */}
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <meta name="googlebot" content="index, follow" />
        <meta name="googlebot-video" content="index" />
        <meta httpEquiv="content-language" content="en-MY" />
        <meta name="geo.region" content="MY" />
        <meta name="geo.placename" content="Malaysia" />
        <meta name="format-detection" content="telephone=no" />
        {lastModified && (
          <meta property="article:modified_time" content={lastModified} />
        )}

        {/* Mobile Web App Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />

        {/* Performance & Resource Hints */}
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <link
          rel="preconnect"
          href="https://i.ytimg.com"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link
          rel="preconnect"
          href="https://www.youtube.com"
          crossOrigin="anonymous"
        />

        {/* Prefetch first few thumbnails for performance */}
        {shorts.slice(0, 3).map((video) => (
          <link
            key={video.videoId}
            rel="prefetch"
            as="image"
            href={`https://i.ytimg.com/vi/${video.videoId}/frame0.jpg`}
          />
        ))}
      </Head>

      {/* Structured Data */}
      <Script
        id="shorts-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateStructuredData()),
        }}
      />

      <div className={isMobile ? "" : "min-h-screen bg-background"}>
        {/* Breadcrumb - Only show on desktop */}
        {!isMobile && <Breadcrumb />}

        {/* Conditional rendering based on device (preserved) */}
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
    </>
  );
}

// getStaticProps - preserved with minimal changes
export const getStaticProps: GetStaticProps = async () => {
  const currentUrl = `${siteConfig.baseUrl}/videos/shorts`;

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
          error: "Shorts playlist not configured",
          currentUrl,
          lastModified: new Date().toISOString(),
        },
        revalidate: 300,
      };
    }

    const shortsPlaylistId = videoConfig.shortsPlaylist;

    // Fetch shorts from the designated playlist
    const [videos, totalCount] = await Promise.all([
      prisma.videos.findMany({
        where: {
          playlists: {
            has: shortsPlaylistId,
          },
          isActive: true,
          status: {
            is: {
              privacyStatus: "public",
              uploadStatus: "processed",
            },
          },
        },
        orderBy: { publishedAt: "desc" },
        take: 30, // Initial load
      }),
      prisma.videos.count({
        where: {
          playlists: {
            has: shortsPlaylistId,
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

    // Transform videos for client
    const transformedShorts = videos.map((video: any) => ({
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
      tier: video.tier || "standard",
      playlists: video.playlists || [],
      categoryId: video.categoryId || "",
      tags: video.tags || [],
    }));

    return {
      props: {
        shorts: transformedShorts,
        totalCount,
        sortBy: "newest",
        playlistTitle: "Shorts",
        error: null,
        currentUrl,
        lastModified: new Date().toISOString(),
      },
      revalidate: 300, // 5 minutes
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
        lastModified: new Date().toISOString(),
      },
      revalidate: 60, // Retry faster on error
    };
  }
};
