// pages/videos/playlist/[slug].tsx
// MODIFIED: Converted from SSR to ISR with hero layout

import { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";
import Script from "next/script";
import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaPlay, FaEye, FaChevronLeft } from "react-icons/fa";
import { MdVideoLibrary } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatViewCount, formatDuration, getTimeAgo } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import siteConfig from "@/constants/site-config";

// Video type
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

// Hero Video Card (Large - Left Side)
const HeroVideoCard = ({ video }: { video: VideoWithChannel }) => {
  const [imageError, setImageError] = useState(false);

  const getThumbnail = () => {
    if (imageError) {
      return `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
    }
    return (
      video.thumbnails?.maxres ||
      video.thumbnails?.high ||
      `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`
    );
  };

  return (
    <Link
      href={`/videos/${video.videoId}`}
      className="group block bg-card rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      {/* 16:9 Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        <Image
          src={getThumbnail()}
          alt={video.title}
          fill
          sizes="(max-width: 768px) 100vw, 60vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => setImageError(true)}
          priority
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-red-600 rounded-full p-6 transform scale-90 group-hover:scale-100 transition-transform">
            <FaPlay className="text-white w-8 h-8 ml-1" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-3 right-3 bg-black/90 text-white text-sm px-3 py-1.5 rounded font-medium">
          {formatDuration(video.duration)}
        </div>

        {/* Tier Badge */}
        {(video.tier === "hot" || video.tier === "trending") && (
          <div className="absolute top-3 left-3 bg-red-600 text-white text-sm px-3 py-1.5 rounded font-bold uppercase">
            {video.tier}
          </div>
        )}

        {/* Video Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h3 className="font-bold text-xl mb-2 line-clamp-2">{video.title}</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <FaEye className="w-4 h-4" />
              {formatViewCount(parseInt(video.statistics.viewCount))}
            </span>
            <span>•</span>
            <span>{getTimeAgo(video.publishedAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

// Sidebar Video Card (Smaller - Right Side Stack)
const SidebarVideoCard = ({ video }: { video: VideoWithChannel }) => {
  const [imageError, setImageError] = useState(false);

  const getThumbnail = () => {
    if (imageError) {
      return `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
    }
    return (
      video.thumbnails?.high ||
      video.thumbnails?.medium ||
      `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`
    );
  };

  return (
    <Link
      href={`/videos/${video.videoId}`}
      className="group flex gap-3 bg-card rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:bg-accent/5"
    >
      {/* Thumbnail - Fixed width */}
      <div className="relative w-40 aspect-video bg-muted overflow-hidden flex-shrink-0">
        <Image
          src={getThumbnail()}
          alt={video.title}
          fill
          sizes="160px"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => setImageError(true)}
        />

        {/* Duration Badge */}
        <div className="absolute bottom-1.5 right-1.5 bg-black/90 text-white text-xs px-2 py-0.5 rounded font-medium">
          {formatDuration(video.duration)}
        </div>

        {/* Tier Badge */}
        {(video.tier === "hot" || video.tier === "trending") && (
          <div className="absolute top-1.5 left-1.5 bg-red-600 text-white text-xs px-2 py-0.5 rounded font-bold uppercase">
            {video.tier}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 py-2 pr-2 min-w-0">
        <h4 className="font-semibold text-sm line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
          {video.title}
        </h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FaEye className="w-3 h-3" />
            {formatViewCount(parseInt(video.statistics.viewCount))}
          </span>
          <span>•</span>
          <span className="truncate">{video.channelTitle}</span>
        </div>
      </div>
    </Link>
  );
};

// Standard Video Card (Grid - 16:9)
const VideoCard = ({ video }: { video: VideoWithChannel }) => {
  const [imageError, setImageError] = useState(false);

  const getThumbnail = () => {
    if (imageError) {
      return `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
    }
    return (
      video.thumbnails?.high ||
      video.thumbnails?.medium ||
      `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`
    );
  };

  return (
    <Link
      href={`/videos/${video.videoId}`}
      className="group block bg-card rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      {/* 16:9 Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        <Image
          src={getThumbnail()}
          alt={video.title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          onError={() => setImageError(true)}
          loading="lazy"
        />

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="bg-red-600 rounded-full p-3 opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300">
            <FaPlay className="text-white w-5 h-5 ml-0.5" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 bg-black/90 text-white text-xs px-2 py-1 rounded font-medium">
          {formatDuration(video.duration)}
        </div>

        {/* Tier Badge */}
        {(video.tier === "hot" || video.tier === "trending") && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded font-bold uppercase">
            {video.tier}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FaEye className="w-3 h-3" />
            {formatViewCount(parseInt(video.statistics.viewCount))}
          </span>
          <span>•</span>
          <span className="truncate">{video.channelTitle}</span>
        </div>
      </div>
    </Link>
  );
};

// Loading Skeleton
const VideoSkeleton = () => (
  <div className="bg-card rounded-lg overflow-hidden animate-pulse">
    <div className="aspect-video bg-muted" />
    <div className="p-3 space-y-2">
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

  // Load more videos
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    try {
      const nextPage = page + 1;
      const response = await fetch(
        `/api/videos/playlist/${playlistInfo.slug}?page=${nextPage}&sort=${sortBy}&limit=12`
      );
      const data = await response.json();

      if (data.videos && data.videos.length > 0) {
        setVideos((prev) => [...prev, ...data.videos]);
        setPage(nextPage);
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more videos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page, sortBy, playlistInfo.slug]);

  // Handle sort change
  const handleSortChange = async (newSort: string) => {
    if (newSort === sortBy) return;

    setSortBy(newSort);
    setIsLoading(true);
    setPage(1);

    try {
      const response = await fetch(
        `/api/videos/playlist/${playlistInfo.slug}?page=1&sort=${newSort}&limit=24`
      );
      const data = await response.json();

      if (data.videos) {
        setVideos(data.videos);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Failed to change sort:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate JSON-LD for SEO
  const generateJsonLD = () => {
    const itemListSchema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${currentUrl}#itemlist`,
      name: playlistInfo.title,
      description:
        playlistInfo.description ||
        `Watch ${totalCount} videos from ${playlistInfo.title}`,
      numberOfItems: totalCount,
      itemListElement: videos.slice(0, 20).map((video, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteConfig.baseUrl}/videos/${video.videoId}`,
        item: {
          "@type": "VideoObject",
          "@id": `${siteConfig.baseUrl}/videos/${video.videoId}`,
          name: video.title,
          description: video.description?.substring(0, 200) || video.title,
          thumbnailUrl: [
            video.thumbnails?.maxres ||
              `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`,
            video.thumbnails?.high ||
              `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
          ],
          uploadDate: video.publishedAt,
          duration: video.duration,
          contentUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
          embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: "https://schema.org/WatchAction",
            userInteractionCount: parseInt(video.statistics.viewCount) || 0,
          },
          publisher: {
            "@type": "Organization",
            name: "Free Malaysia Today",
            logo: {
              "@type": "ImageObject",
              url: `${siteConfig.baseUrl}/logo.png`,
            },
          },
        },
      })),
    };

    const breadcrumbSchema = {
      "@context": "https://schema.org",
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
    };

    const collectionPageSchema = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": currentUrl,
      name: playlistInfo.title,
      description:
        playlistInfo.description ||
        `Browse ${totalCount} videos from ${playlistInfo.title}`,
      url: currentUrl,
      isPartOf: {
        "@type": "WebSite",
        name: "Free Malaysia Today",
        url: siteConfig.baseUrl,
      },
      mainEntity: {
        "@id": `${currentUrl}#itemlist`,
      },
    };

    return {
      "@context": "https://schema.org",
      "@graph": [itemListSchema, breadcrumbSchema, collectionPageSchema],
    };
  };

  const pageTitle = `${playlistInfo.title} - ${totalCount} Videos | FMT`;
  const pageDescription =
    playlistInfo.description ||
    `Watch ${totalCount} latest videos from ${playlistInfo.title}. Stay updated with Free Malaysia Today's video content.`;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Error Loading Playlist</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Link href="/videos">
          <Button>Back to Videos</Button>
        </Link>
      </div>
    );
  }

  // Split videos for layout: first 4 for hero section, rest for grid
  const heroVideo = videos[0];
  const sidebarVideos = videos.slice(1, 4);
  const gridVideos = videos.slice(4);

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content={`${playlistInfo.title}, FMT Videos, Malaysia News, Free Malaysia Today`}
        />
        <link rel="canonical" href={currentUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={currentUrl} />
        <meta property="og:title" content={playlistInfo.title} />
        <meta property="og:description" content={pageDescription} />
        <meta
          property="og:image"
          content={
            playlistInfo.thumbnailUrl ||
            heroVideo?.thumbnails?.maxres ||
            `${siteConfig.baseUrl}/images/fmt-video-default.jpg`
          }
        />
        <meta property="og:site_name" content="Free Malaysia Today" />
        <meta property="og:locale" content="en_MY" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta name="twitter:title" content={playlistInfo.title} />
        <meta name="twitter:description" content={pageDescription} />
        <meta
          name="twitter:image"
          content={
            playlistInfo.thumbnailUrl ||
            heroVideo?.thumbnails?.maxres ||
            `${siteConfig.baseUrl}/images/fmt-video-default.jpg`
          }
        />

        {/* Additional Meta Tags for SEO */}
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <meta name="googlebot" content="index, follow" />
        <meta httpEquiv="content-language" content="en-MY" />
        <meta name="geo.region" content="MY" />
        <meta name="geo.placename" content="Malaysia" />
        <meta name="article:publisher" content="Free Malaysia Today" />
        <meta name="article:modified_time" content={lastModified} />

        {/* Alternate for Mobile */}
        <link
          rel="alternate"
          media="only screen and (max-width: 640px)"
          href={currentUrl}
        />
      </Head>

      {/* JSON-LD Structured Data */}
      <Script
        id="playlist-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateJsonLD()),
        }}
      />

      <div className="container mx-auto px-4 py-6 max-w-[1400px]">
        {/* Header */}
        <div className="mb-6">
          {/* Back Button */}
          <Link
            href="/videos"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4"
          >
            <FaChevronLeft className="w-3 h-3" />
            Back to Videos
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <MdVideoLibrary className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {playlistInfo.title}
                </h1>
                {playlistInfo.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {playlistInfo.description}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {totalCount} videos
                </p>
              </div>
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
                <TabsTrigger value="trending">Trending</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Hero Section - Homepage Style Layout */}
        {videos.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Large Hero Video - Left (7 columns on desktop) */}
              <div className="lg:col-span-7">
                <HeroVideoCard video={heroVideo} />
              </div>

              {/* Sidebar Videos - Right (5 columns on desktop) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {sidebarVideos.map((video) => (
                  <SidebarVideoCard key={video.videoId} video={video} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Remaining Videos Grid - 4 columns desktop, 2 columns mobile */}
        {gridVideos.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {gridVideos.map((video) => (
              <VideoCard key={video.videoId} video={video} />
            ))}

            {/* Loading Skeletons */}
            {isLoading &&
              Array.from({ length: 12 }).map((_, i) => (
                <VideoSkeleton key={`skeleton-${i}`} />
              ))}
          </div>
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
        {isLoading && (
          <div className="flex justify-center mt-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {/* End of Results */}
        {!hasMore && videos.length > 0 && (
          <div className="text-center mt-8 text-muted-foreground">
            <p>You have reached the end of this playlist</p>
          </div>
        )}

        {/* No Videos State */}
        {videos.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <MdVideoLibrary className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No videos in this playlist
            </p>
            <Link href="/videos" className="mt-4 inline-block">
              <Button>Browse All Videos</Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

// 🆕 ISR: Generate static paths for all active playlists
export const getStaticPaths: GetStaticPaths = async () => {
  try {
    // Get all active playlists with slugs
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
      fallback: "blocking", // Generate new playlists on-demand
    };
  } catch (error) {
    console.error("[getStaticPaths] Error fetching playlists:", error);
    return {
      paths: [],
      fallback: "blocking",
    };
  }
};

// 🆕 ISR: Static generation with 15-minute revalidation
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
        revalidate: 300, // Recheck in 5 minutes if playlist was added
      };
    }

    // Default to newest sort for static generation
    const orderBy: any = { publishedAt: "desc" };

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
        orderBy,
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
      revalidate: 900, // 🆕 ISR: Revalidate every 15 minutes (fallback)
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
      revalidate: 900, // Still revalidate on error
    };
  }
};
