// pages/videos/playlist/[slug].tsx
// ENHANCED: Uniform grid layout with VideoFacade, breadcrumb navigation, rich SEO
// PRESERVED: ISR, data fetching, load more functionality

import { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";
import Script from "next/script";
import { useState, useCallback } from "react";
import Link from "next/link";
import { FaEye, FaChevronRight, FaHome } from "react-icons/fa";
import { MdVideoLibrary } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatViewCount, formatDuration, getTimeAgo } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import siteConfig from "@/constants/site-config";
import VideoFacade from "@/components/videos/VideoFacade";
import { VideoGridSkeleton } from "@/components/videos/VideoLoadingUtils";

// Video type (preserved)
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

interface PlaylistPageProps {
  videos: VideoWithChannel[];
  totalCount: number;
  sortBy: string;
  playlistInfo: {
    title: string;
    description: string | null;
    slug: string;
    thumbnailUrl: string | null;
  };
  error?: string;
  currentUrl: string;
  lastModified: string;
}

// Breadcrumb Component
const Breadcrumb = ({ playlistTitle }: { playlistTitle: string }) => {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
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
          <span className="text-foreground font-medium">{playlistTitle}</span>
        </li>
      </ol>
    </nav>
  );
};

// Enhanced Video Card with VideoFacade and descriptions
const VideoCard = ({ video }: { video: VideoWithChannel }) => {
  const thumbnailUrl =
    video.thumbnails?.high?.url ||
    video.thumbnails?.medium?.url ||
    `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

  return (
    <Link
      href={`/videos/${video.videoId}`}
      className="group block bg-card rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      {/* VideoFacade for better performance */}
      <VideoFacade
        videoId={video.videoId}
        title={video.title}
        thumbnail={thumbnailUrl}
        aspectRatio="video"
        size="small"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />

      {/* Content with description */}
      <div className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>

        {/* Description - NEW */}
        {video.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {video.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FaEye className="w-3 h-3" />
            {formatViewCount(parseInt(video.statistics.viewCount))}
          </span>
          <span>•</span>
          <span>{getTimeAgo(video.publishedAt)}</span>
          {video.duration && (
            <>
              <span>•</span>
              <span>{formatDuration(video.duration)}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};

// Loading Skeleton (using shared component)
const VideoSkeleton = () => (
  <div className="bg-card rounded-lg overflow-hidden animate-pulse">
    <div className="aspect-video bg-muted" />
    <div className="p-4 space-y-2">
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
    </div>
  </div>
);

export default function PlaylistPage({
  videos: initialVideos,
  totalCount,
  sortBy: initialSortBy,
  playlistInfo,
  error,
  currentUrl,
  lastModified,
}: PlaylistPageProps) {
  const [videos, setVideos] = useState<VideoWithChannel[]>(initialVideos);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(videos.length < totalCount);
  const [page, setPage] = useState(1);

  // Load more videos (preserved functionality)
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    try {
      const nextPage = page + 1;
      const response = await fetch(
        `/api/videos/playlist/${playlistInfo.slug}?page=${nextPage}&sort=${sortBy}`
      );

      if (!response.ok) throw new Error("Failed to load more videos");

      const data = await response.json();

      if (data.videos && data.videos.length > 0) {
        setVideos((prev) => [...prev, ...data.videos]);
        setPage(nextPage);
        setHasMore(videos.length + data.videos.length < totalCount);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error loading more videos:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    sortBy,
    isLoading,
    hasMore,
    playlistInfo.slug,
    videos.length,
    totalCount,
  ]);

  // Handle sort change
  const handleSortChange = useCallback(
    async (newSort: string) => {
      setSortBy(newSort);
      setIsLoading(true);
      setPage(1);

      try {
        const response = await fetch(
          `/api/videos/playlist/${playlistInfo.slug}?page=1&sort=${newSort}&limit=24`
        );

        if (!response.ok) throw new Error("Failed to sort videos");

        const data = await response.json();

        if (data.videos) {
          setVideos(data.videos);
          setHasMore(data.videos.length < totalCount);
        }
      } catch (err) {
        console.error("Error sorting videos:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [playlistInfo.slug, totalCount]
  );

  // Enhanced SEO metadata
  const pageTitle = `${playlistInfo.title} | ${siteConfig.siteName} Videos`;
  const pageDescription =
    playlistInfo.description ||
    `Watch ${totalCount} videos from ${playlistInfo.title}. Latest news, analysis and exclusive content from Free Malaysia Today.`;
  const ogImage =
    playlistInfo.thumbnailUrl ||
    videos[0]?.thumbnails?.high?.url ||
    `${siteConfig.baseUrl}/images/fmt-video-default.jpg`;

  // Generate comprehensive structured data
  const generateStructuredData = () => {
    const schemas: any[] = [];

    // ItemList Schema for videos
    schemas.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${currentUrl}#playlist`,
      name: playlistInfo.title,
      description: pageDescription,
      numberOfItems: totalCount,
      itemListElement: videos.slice(0, 30).map((video, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.baseUrl}/videos/${video.videoId}`,
        item: {
          "@type": "VideoObject",
          "@id": `${siteConfig.baseUrl}/videos/${video.videoId}`,
          name: video.title,
          description: video.description?.substring(0, 200) || video.title,
          thumbnailUrl: [
            video.thumbnails?.maxres?.url ||
              `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`,
            video.thumbnails?.high?.url ||
              `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
          ],
          uploadDate: video.publishedAt,
          duration: video.duration,
          contentUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
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
          name: playlistInfo.title,
          item: currentUrl,
        },
      ],
    });

    // CollectionPage Schema
    schemas.push({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${currentUrl}#webpage`,
      url: currentUrl,
      name: playlistInfo.title,
      description: pageDescription,
      isPartOf: {
        "@type": "WebSite",
        "@id": `${siteConfig.baseUrl}#website`,
        name: siteConfig.siteName,
        url: siteConfig.baseUrl,
      },
      about: {
        "@type": "VideoGallery",
        name: playlistInfo.title,
      },
      inLanguage: "en-MY",
      lastReviewed: lastModified,
      mainEntity: {
        "@id": `${currentUrl}#playlist`,
      },
    });

    return { "@graph": schemas };
  };

  // Error state
  if (error) {
    return (
      <>
        <Head>
          <title>Error Loading Playlist | {siteConfig.siteName}</title>
          <meta name="robots" content="noindex" />
        </Head>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <MdVideoLibrary className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Unable to Load Playlist</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/videos">
              <Button>Back to Videos</Button>
            </Link>
          </div>
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
          content={`${playlistInfo.title}, FMT videos, Malaysia news videos, ${videos
            .slice(0, 5)
            .map((v) => v.title)
            .join(", ")}`}
        />
        <link rel="canonical" href={currentUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1280" />
        <meta property="og:image:height" content="720" />
        <meta property="og:site_name" content={siteConfig.siteName} />
        <meta property="og:locale" content="en_MY" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />

        {/* Additional SEO Meta Tags */}
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <meta name="googlebot" content="index, follow" />
        <meta httpEquiv="content-language" content="en-MY" />
        <meta name="geo.region" content="MY" />
        <meta name="geo.placename" content="Malaysia" />
        {lastModified && (
          <meta property="article:modified_time" content={lastModified} />
        )}

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
      </Head>

      {/* Structured Data */}
      <Script
        id="playlist-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateStructuredData()),
        }}
      />

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb playlistTitle={playlistInfo.title} />

        {/* Playlist Header - Simplified */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{playlistInfo.title}</h1>
              {playlistInfo.description && (
                <p className="text-muted-foreground max-w-3xl">
                  {playlistInfo.description}
                </p>
              )}
            </div>

            {/* Sort Tabs */}
            <Tabs
              value={sortBy}
              onValueChange={handleSortChange}
              className="w-full md:w-auto"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="newest">Newest</TabsTrigger>
                <TabsTrigger value="popular">Popular</TabsTrigger>
                <TabsTrigger value="trending">Oldest</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Uniform Video Grid - 4 cols desktop, 2 cols mobile */}
        {videos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {videos.map((video) => (
              <VideoCard key={video.videoId} video={video} />
            ))}

            {/* Loading Skeletons */}
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <VideoSkeleton key={`skeleton-${i}`} />
              ))}
          </div>
        ) : (
          !isLoading && (
            <div className="text-center py-12">
              <MdVideoLibrary className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No videos in this playlist
              </p>
              <Link href="/videos" className="mt-4 inline-block">
                <Button>Browse All Videos</Button>
              </Link>
            </div>
          )
        )}

        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="flex justify-center mt-8">
            <Button
              onClick={loadMore}
              size="lg"
              variant="outline"
              className="min-w-[200px]"
            >
              Load More Videos
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && videos.length === 0 && (
          <VideoGridSkeleton count={12} aspectRatio="video" />
        )}

        {/* End of Results */}
        {!hasMore && videos.length > 0 && (
          <div className="text-center mt-8 text-muted-foreground">
            <p>End of playlist • {totalCount} videos total</p>
          </div>
        )}
      </div>
    </>
  );
}

// getStaticPaths - preserved exactly
export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const playlists = await prisma.playlist.findMany({
      where: {
        isActive: true,
        slug: {
          not: null,
        },
      },
      select: {
        slug: true,
      },
    });

    const paths = playlists
      .filter((p) => p.slug)
      .map((playlist) => ({
        params: { slug: playlist.slug as string },
      }));

    return {
      paths,
      fallback: "blocking",
    };
  } catch (error) {
    console.error("[getStaticPaths] Error fetching playlists:", error);
    return {
      paths: [],
      fallback: "blocking",
    };
  }
};

// getStaticProps - preserved with minimal changes
export const getStaticProps: GetStaticProps = async (context) => {
  const { slug } = context.params || {};

  if (!slug || typeof slug !== "string") {
    return {
      notFound: true,
    };
  }

  try {
    // Find playlist by slug
    const playlist = await prisma.playlist.findFirst({
      where: {
        slug: slug,
        isActive: true,
      },
      select: {
        playlistId: true,
        title: true,
        description: true,
        itemCount: true,
        thumbnailUrl: true,
        slug: true,
      },
    });

    if (!playlist) {
      return {
        notFound: true,
        revalidate: 300,
      };
    }

    // Fetch initial 24 videos
    const [videos, totalCount] = await Promise.all([
      prisma.videos.findMany({
        where: {
          playlists: {
            has: playlist.playlistId,
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
        take: 24,
      }),
      prisma.videos.count({
        where: {
          playlists: {
            has: playlist.playlistId,
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

    // Transform videos
    const transformedVideos = videos.map((video: any) => ({
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
      isShort: video.isShort || false,
      playlists: video.playlists || [],
      categoryId: video.categoryId || "",
      tags: video.tags || [],
      tier: video.tier || "standard",
    }));

    const currentUrl = `${siteConfig.baseUrl}/videos/playlist/${slug}`;

    return {
      props: {
        videos: transformedVideos,
        totalCount,
        sortBy: "newest",
        playlistInfo: {
          title: playlist.title,
          description: playlist.description,
          slug: playlist.slug,
          thumbnailUrl: playlist.thumbnailUrl,
        },
        error: null,
        currentUrl,
        lastModified: new Date().toISOString(),
      },
      revalidate: 900, // 15 minutes
    };
  } catch (error) {
    console.error("[Playlist Page] Error fetching videos:", error);

    return {
      props: {
        videos: [],
        totalCount: 0,
        sortBy: "newest",
        playlistInfo: {
          title: "Playlist",
          description: null,
          slug: slug as string,
          thumbnailUrl: null,
        },
        error: "Failed to load playlist. Please try again later.",
        currentUrl: `${siteConfig.baseUrl}/videos/playlist/${slug}`,
        lastModified: new Date().toISOString(),
      },
      revalidate: 900,
    };
  }
};
