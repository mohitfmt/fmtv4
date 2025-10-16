// pages/videos/index.tsx
// Enhanced version with improved header and fixed rendering issues

import { GetStaticProps } from "next";
import Head from "next/head";
import Script from "next/script";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import {
  FaPlay,
  FaEye,
  FaChevronRight,
  FaChevronLeft,
  FaSearch,
  FaSync,
  FaYoutube,
  FaBell,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdSlot from "@/components/common/AdSlot";
import siteConfig from "@/constants/site-config";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";
import { formatViewCount, formatDuration, getTimeAgo } from "@/lib/utils";
import type { Video } from "@/types/video";
import { useDebounce } from "@/hooks/useDebounce";
import ShortsRail from "@/components/videos/ShortsRail";
import VideoFacade from "@/components/videos/VideoFacade";

// Types
interface VideoHubData {
  hero: Video[];
  shorts: Video[];
  shortsTotalCount?: number;
  playlists: Record<
    string,
    {
      name: string;
      videos: Video[];
      maxVideos?: number;
    }
  >;
  stats?: {
    totalVideos: number;
    todayViews: number;
    newToday: number;
  };
}

interface ChannelInfo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  customUrl?: string;
}

interface VideosPageProps {
  data: VideoHubData | null;
  channelInfo: ChannelInfo | null;
  error: string | null;
  buildTimestamp?: string;
  lastModified?: string;
}

// DFP Targeting
const dfpTargetingParams = {
  section: ["Videos"],
  pos: "videos-hub",
  key: ["videos", "multimedia", ...gerneralTargetingKeys],
};

// Enhanced Header Component
const EnhancedVideoHeader = ({
  channelInfo,
  searchQuery,
  onSearchChange,
  isSearching,
}: {
  channelInfo: ChannelInfo | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isSearching: boolean;
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const mainDescription = channelInfo?.description
    ? channelInfo.description.split("\n").filter((line) => line.trim() !== "")
    : [
        "FMT brings you the latest news, from the halls of power to the city streets!",
        "Subscribe to our YouTube channel to watch the latest videos.",
      ];

  return (
    <div className="px-1 py-4">
      <div className="rounded-xl shadow-sm overflow-hidden">
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            {/* Left Column - Channel Info & Subscribe */}
            <div className="space-y-4 p-2 lg:col-span-2">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {channelInfo?.title || "Free Malaysia Today"}
                  </h1>
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full font-medium">
                    OFFICIAL
                  </span>
                </div>

                <h2 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="animate-pulse">🟢</span> Never miss an
                  update!
                  <span className="text-gray-600 dark:text-gray-400 text-sm lg:text-base">
                    {" - "}
                    {mainDescription[0]}
                  </span>
                </h2>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {mainDescription[1]}
                </p>
              </div>

              <Button
                asChild
                className="bg-red-600 hover:bg-red-700 text-white shadow-lg transform hover:scale-105 transition-all duration-200 inline-flex"
                size="lg"
              >
                <Link
                  href={`https://www.youtube.com/channel/${channelInfo?.id || "UC2CzLwbhTiI8pTKNVyrOnJQ"}?sub_confirmation=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <FaYoutube className="w-5 h-5" />
                  Subscribe
                  <FaBell className="w-4 h-4 animate-pulse" />
                </Link>
              </Button>
            </div>
            {/* Right Column - Search */}
            <div className="p-4">
              <div className="max-w-lg ml-auto">
                <div
                  className={`relative transition-all duration-300 ${
                    isSearchFocused ? "scale-105" : ""
                  }`}
                >
                  <FaSearch
                    className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
                      isSearchFocused
                        ? "text-primary"
                        : "text-gray-400 dark:text-gray-500"
                    } w-4 h-4`}
                  />

                  <Input
                    type="search"
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    className={`pl-12 pr-12 h-12 text-base border-2 transition-all duration-200 w-full ${
                      isSearchFocused
                        ? "border-primary shadow-lg shadow-primary/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                  />

                  {isSearching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="animate-spin h-5 w-5 border-3 border-primary border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>

                {/* Quick Search Tags */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Popular:
                  </span>
                  {[
                    "Politics",
                    "Business",
                    "Najib",
                    "Budget 2025",
                    "Sports",
                  ].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => onSearchChange(tag)}
                      className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 transition-colors duration-200 hover:text-primary"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count - Shows when searching */}
      {searchQuery && !isSearching && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 animate-fade-in">
          Searching for &quot;
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {searchQuery}
          </span>
          &quot;
        </div>
      )}
    </div>
  );
};

// Hero Carousel Component
const HeroCarousel = ({ videos }: { videos: Video[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isAutoPlaying && videos.length > 1) {
      autoPlayIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % videos.length);
      }, 5000);
    }

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [isAutoPlaying, videos.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
    setIsAutoPlaying(false);
  };

  if (!videos || videos.length === 0) return null;

  const currentVideo = videos[currentIndex];
  const thumbnailUrl =
    currentVideo.thumbnails?.maxres?.url ||
    currentVideo.thumbnails?.high?.url ||
    `https://i.ytimg.com/vi/${currentVideo.videoId}/maxresdefault.jpg`;

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
      <VideoFacade
        videoId={currentVideo.videoId}
        title={currentVideo.title}
        thumbnail={thumbnailUrl}
        aspectRatio="video"
        priority
        size="large"
        className="w-full h-full"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
      />

      {/* Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/videos/${currentVideo.videoId}`}>
          <div className="rounded-full p-6 hover:scale-110 transition-transform bg-red-600">
            <FaPlay className="w-8 h-8 text-white" />
          </div>
        </Link>
      </div>

      {/* Video Info */}
      <div className="absolute bottom-0 left-0 p-3 text-white">
        <div className="bg-black/60 rounded-lg p-3 inline-block">
          <Link href={`/videos/${currentVideo.videoId}`}>
            <h2 className="text-2xl font-bold mb-2 line-clamp-2 hover:text-primary transition-colors sr-only">
              {currentVideo.title}
            </h2>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <FaEye />
              {formatViewCount(currentVideo.statistics?.viewCount)}
            </span>
            <span>•</span>
            <span>{getTimeAgo(currentVideo.publishedAt)}</span>
            <span>•</span>
            <span>{formatDuration(currentVideo.duration)}</span>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {videos.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous video"
          >
            <FaChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next video"
          >
            <FaChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Carousel Indicators */}
      {videos.length > 1 && (
        <div className="absolute bottom-6 right-6 flex gap-2">
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-primary w-8"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Error State Component with Retry
const ErrorState = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setTimeout(() => setIsRetrying(false), 500);
    }
  }, [onRetry]);

  return (
    <div className="">
      <div className="text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Unable to Load Videos</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
        </div>

        <Button
          onClick={handleRetry}
          disabled={isRetrying}
          className="gap-2"
          size="lg"
        >
          <FaSync className={isRetrying ? "animate-spin" : ""} />
          {isRetrying ? "Retrying..." : "Retry"}
        </Button>

        <p className="text-sm text-muted-foreground mt-4">
          Or{" "}
          <Link href="/" className="text-primary hover:underline">
            return to homepage
          </Link>
        </p>
      </div>
    </div>
  );
};

// Video Card Component
const VideoCard = ({ video }: { video: Video }) => {
  const thumbnailUrl =
    video.thumbnails?.high?.url ||
    `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

  return (
    <Link
      href={`/videos/${video.videoId}`}
      className="group block bg-card rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
    >
      <VideoFacade
        videoId={video.videoId}
        title={video.title}
        thumbnail={thumbnailUrl}
        aspectRatio="video"
        size="small"
        className="w-full"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      <div className="p-1 py-2">
        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {video.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FaEye className="w-3 h-3" />
            {formatViewCount(video.statistics?.viewCount)}
          </span>
          <span>•</span>
          <span>{getTimeAgo(video.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
};

// Main Component
const VideosPage = ({
  data,
  channelInfo,
  error,
  buildTimestamp,
  lastModified,
}: VideosPageProps) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [searchResults, setSearchResults] = useState<Video[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Client-side search
  useEffect(() => {
    if (debouncedSearch && debouncedSearch.trim().length > 2) {
      setIsSearching(true);
      fetch(`/api/videos/search?q=${encodeURIComponent(debouncedSearch)}`)
        .then((res) => res.json())
        .then((data) => {
          setSearchResults(data.videos || []);
        })
        .catch((err) => {
          console.error("Search failed:", err);
          setSearchResults([]);
        })
        .finally(() => {
          setIsSearching(false);
        });
    } else {
      setSearchResults(null);
    }
  }, [debouncedSearch]);

  // Handle retry
  const handleRetry = useCallback(async () => {
    router.push(router.asPath + "?fresh=" + Date.now());
  }, [router]);

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  // Generate SEO metadata
  const pageTitle = `Videos - Latest News & Updates | ${siteConfig.siteName}`;
  const pageDescription = `Watch the latest video news coverage from Free Malaysia Today. Breaking news, politics, business, lifestyle, and exclusive video reports from Malaysia and around the world.`;
  const currentUrl = `${siteConfig.baseUrl}/videos`;
  const heroVideo = data?.hero?.[0];
  const ogImage =
    heroVideo?.thumbnails?.maxres?.url ||
    heroVideo?.thumbnails?.high?.url ||
    `${siteConfig.baseUrl}/images/fmt-video-default.jpg`;

  // Generate JSON-LD structured data
  const generateJsonLD = () => {
    const schemas: any[] = [];

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
      },
      about: {
        "@type": "VideoGallery",
        name: "FMT Video Gallery",
      },
      inLanguage: "en-MY",
      lastReviewed: lastModified || new Date().toISOString(),
    });

    // ItemList Schema for Hero Videos
    if (data?.hero && data.hero.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "ItemList",
        "@id": `${currentUrl}#hero-videos`,
        name: "Featured Videos",
        description: "Curated selection of featured video content",
        numberOfItems: data.hero.length,
        itemListElement: data.hero.slice(0, 10).map((video, index) => ({
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
              userInteractionCount: parseInt(
                video.statistics?.viewCount || "0"
              ),
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
    }

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
          item: currentUrl,
        },
      ],
    });

    return { "@graph": schemas };
  };

  // Show error state
  if (error || !data) {
    return (
      <>
        <Head>
          <title>Error Loading Videos | {siteConfig.siteName}</title>
          <meta name="robots" content="noindex" />
        </Head>
        <ErrorState
          error={error || "Failed to load video data"}
          onRetry={handleRetry}
        />
      </>
    );
  }

  // Main render
  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>{pageTitle}</title>
        <meta name="title" content={pageTitle} />
        <meta name="description" content={pageDescription} />
        <meta
          name="keywords"
          content="FMT videos, Malaysia news videos, breaking news, video gallery, news multimedia, video journalism"
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
        <meta name="article:publisher" content="Free Malaysia Today" />
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
        <link rel="preconnect" href="https://www.youtube.com" />

        {/* Alternate for Mobile */}
        <link
          rel="alternate"
          media="only screen and (max-width: 640px)"
          href={currentUrl}
        />
      </Head>

      {/* JSON-LD Structured Data */}
      <Script
        id="videos-hub-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateJsonLD()),
        }}
      />

      <div>
        {/* Enhanced Header */}
        <EnhancedVideoHeader
          channelInfo={channelInfo}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          isSearching={isSearching}
        />

        {/* Search Results */}
        {searchResults && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              Search Results ({searchResults.length})
            </h2>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((video) => (
                  <VideoCard key={video.videoId} video={video} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No videos found for {searchQuery}
              </p>
            )}
          </div>
        )}

        {/* Hero Section */}
        {!searchResults && data.hero && data.hero.length > 0 && (
          <section className="mb-8">
            <HeroCarousel videos={data.hero} />
          </section>
        )}

        {/* Shorts Rail */}
        {!searchResults && data.shorts && data.shorts.length > 0 && (
          <ShortsRail
            shorts={data.shorts}
            totalCount={data.shortsTotalCount || data.shorts.length}
          />
        )}

        {/* Playlists */}
        {!searchResults &&
          data.playlists &&
          Object.entries(data.playlists).map(([playlistId, playlist]) => (
            <section key={playlistId} className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{playlist.name}</h2>
                <Link
                  href={`/videos/playlist/${playlistId}`}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  View All
                  <FaChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlist.videos
                  .slice(0, playlist.maxVideos || 6)
                  .map((video) => (
                    <VideoCard key={video.videoId} video={video} />
                  ))}
              </div>
            </section>
          ))}

        {/* Bottom Desktop Ad */}
        <div className="ads-medium-desktop mt-8">
          <AdSlot
            id="div-gpt-ad-1661333336129-0"
            name="ROS_Midrec"
            sizes={[
              [300, 250],
              [336, 280],
            ]}
            visibleOnDevices="onlyDesktop"
            targetingParams={dfpTargetingParams}
          />
        </div>
      </div>

      {/* Bottom Mobile Ad */}
      <div className="ads-small-mobile mt-4">
        <AdSlot
          sizes={[
            [320, 50],
            [320, 100],
          ]}
          id="div-gpt-ad-1661362470989-0"
          name="ROS_Mobile_Footer"
          visibleOnDevices="onlyMobile"
          targetingParams={dfpTargetingParams}
        />
      </div>

      {/* Build Timestamp (only visible in dev console) */}
      {buildTimestamp && (
        <div className="sr-only" data-build-timestamp={buildTimestamp} />
      )}

      {/* Add fade-in animation styles */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

// Retry helper with exponential backoff
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    label?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 500,
    maxDelay = 5000,
    label = "API call",
  } = options;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[Video Hub ISR] ${label} - Attempt ${attempt + 1}/${maxRetries + 1}`
      );
      const result = await fn();

      if (attempt > 0) {
        console.log(
          `[Video Hub ISR] ${label} - Success after ${attempt} retries`
        );
      }

      return result;
    } catch (error: any) {
      lastError = error;

      console.error(
        `[Video Hub ISR] ${label} - Attempt ${attempt + 1} failed:`,
        error.message
      );

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        console.error(`[Video Hub ISR] ${label} - All retries exhausted`);
        break;
      }

      // Check if error is retriable
      const isRetriable =
        error.name === "FetchError" ||
        error.message?.includes("ECONNRESET") ||
        error.message?.includes("ETIMEDOUT") ||
        error.message?.includes("503") ||
        error.message?.includes("500");

      if (!isRetriable) {
        console.warn(
          `[Video Hub ISR] ${label} - Non-retriable error, stopping retries`
        );
        break;
      }

      // Exponential backoff with jitter
      const jitter = Math.random() * 200;
      const waitTime = Math.min(delay + jitter, maxDelay);

      console.log(
        `[Video Hub ISR] ${label} - Retrying in ${Math.round(waitTime)}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      delay *= 2; // Exponential backoff
    }
  }

  throw lastError || new Error(`${label} failed after ${maxRetries} retries`);
}

// Production-ready getStaticProps with retry mechanism
export const getStaticProps: GetStaticProps<VideosPageProps> = async () => {
  const buildTimestamp = new Date().toISOString();
  console.log(`[Video Hub ISR] Starting build at ${buildTimestamp}`);

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Fetch video data with retry
    const videoData = await fetchWithRetry<VideoHubData>(
      async () => {
        const response = await fetch(`${baseUrl}/api/videos/gallery`, {
          headers: {
            "User-Agent": "Next.js ISR Build",
            "Cache-Control": "no-cache",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Video gallery API returned ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();

        // Validate response
        if (!data || typeof data !== "object") {
          throw new Error("Invalid response format from video gallery API");
        }

        return data;
      },
      {
        maxRetries: 4,
        initialDelay: 500,
        maxDelay: 5000,
        label: "Video Gallery API",
      }
    );

    // Fetch channel info with retry (optional - don't fail build if this fails)
    let channelInfo: ChannelInfo | null = null;
    try {
      channelInfo = await fetchWithRetry<ChannelInfo>(
        async () => {
          const response = await fetch(`${baseUrl}/api/videos/channel-info`, {
            headers: {
              "User-Agent": "Next.js ISR Build",
              "Cache-Control": "no-cache",
            },
          });

          if (!response.ok) {
            throw new Error(`Channel info API returned ${response.status}`);
          }

          return await response.json();
        },
        {
          maxRetries: 2,
          initialDelay: 300,
          maxDelay: 2000,
          label: "Channel Info API",
        }
      );
    } catch (error: any) {
      console.warn(
        "[Video Hub ISR] Channel info fetch failed, using null:",
        error.message
      );
      // Continue without channel info - it's not critical
    }

    // Sort videos by publishedAt (newest first)
    if (videoData.hero && Array.isArray(videoData.hero)) {
      videoData.hero.sort((a: Video, b: Video) => {
        return (
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      });
    }

    if (videoData.shorts && Array.isArray(videoData.shorts)) {
      videoData.shorts.sort((a: Video, b: Video) => {
        return (
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      });
    }

    if (videoData.playlists && typeof videoData.playlists === "object") {
      Object.values(videoData.playlists).forEach((playlist: any) => {
        if (playlist.videos && Array.isArray(playlist.videos)) {
          playlist.videos.sort((a: Video, b: Video) => {
            return (
              new Date(b.publishedAt).getTime() -
              new Date(a.publishedAt).getTime()
            );
          });
        }
      });
    }

    const buildDuration = Date.now() - new Date(buildTimestamp).getTime();
    console.log(`[Video Hub ISR] Build successful in ${buildDuration}ms`);

    return {
      props: {
        data: videoData,
        channelInfo,
        error: null,
        buildTimestamp,
        lastModified: new Date().toISOString(),
      },
      revalidate: 300, // 5 minutes fallback revalidation
    };
  } catch (error: any) {
    console.error("[Video Hub ISR] Build failed:", error);

    // Log detailed error for debugging
    console.error("[Video Hub ISR] Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack?.split("\n").slice(0, 5).join("\n"),
    });

    // Return error state (page will still build, showing error UI)
    return {
      props: {
        data: null,
        channelInfo: null,
        error: `Failed to load video data: ${error.message}`,
        buildTimestamp,
        lastModified: new Date().toISOString(),
      },
      revalidate: 60, // Retry faster on error (1 minute)
    };
  }
};

export default VideosPage;
