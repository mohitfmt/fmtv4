// pages/videos/index.tsx
import { GetServerSideProps } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  FaPlay,
  FaEye,
  FaChevronRight,
  FaChevronLeft,
  FaSearch,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdSlot from "@/components/common/AdSlot";
import siteConfig from "@/constants/site-config";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";
import { formatViewCount, formatDuration, getTimeAgo } from "@/lib/utils";
import VideoSkeleton from "@/components/skeletons/VideoCardSkeleton";
import type { Video } from "@/types/video";
import { useDebounce } from "@/hooks/useDebounce";
import ShortsRail from "@/components/videos/ShortsRail";

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
  lastFetched: Date;
}

// Hero Carousel Component
const HeroCarousel = ({ videos }: { videos: Video[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isPaused && videos.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % videos.length);
      }, 8000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [videos.length, isPaused]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  if (!videos.length) return null;

  const currentVideo = videos[currentIndex];
  const getThumbnailUrl = (video: Video) => {
    return (
      video.thumbnails?.maxres?.url ||
      video.thumbnails?.high?.url ||
      `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`
    );
  };

  return (
    <div
      className="relative w-full aspect-video bg-black rounded-lg overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Link href={`/videos/${currentVideo.videoId}`} prefetch={false}>
        <div className="relative w-full h-full group">
          <Image
            src={getThumbnailUrl(currentVideo)}
            alt={currentVideo.title}
            fill
            className="object-cover"
            priority={currentIndex === 0}
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Video Info Overlay - Hide title on mobile */}
          <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-6 text-white">
            {currentVideo.tier && (
              <span
                className={`inline-block px-2 py-1 text-xs font-bold rounded mb-2 ${
                  currentVideo.tier === "hot" ? "bg-red-600" : "bg-orange-500"
                }`}
              >
                {currentVideo.tier === "hot" ? "HOT" : "TRENDING"}
              </span>
            )}
            <h2 className="hidden lg:block text-2xl lg:text-3xl font-bold mb-2 line-clamp-2">
              {currentVideo.title}
            </h2>
            <div className="flex items-center gap-4 text-sm opacity-90">
              <span className="flex items-center gap-1">
                <FaEye className="w-4 h-4" />
                {formatViewCount(currentVideo.statistics?.viewCount || 0)}
              </span>
              <span>{formatDuration(currentVideo.duration)}</span>
              <span className="hidden sm:inline">
                {getTimeAgo(currentVideo.publishedAt)}
              </span>
            </div>
          </div>

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="bg-white/90 rounded-full p-4 transform transition-transform group-hover:scale-110">
              <FaPlay className="w-8 h-8 text-black ml-1" />
            </div>
          </div>
        </div>
      </Link>

      {/* Navigation Buttons */}
      {videos.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
            aria-label="Previous video"
          >
            <FaChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
            aria-label="Next video"
          >
            <FaChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {videos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? "bg-white w-8" : "bg-white/50"
              }`}
              aria-label={`Go to video ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// YouTube Subscribe Section with channelInfo description
const YouTubeSubscribeSection = ({
  channelInfo,
}: {
  channelInfo: ChannelInfo | null;
}) => {
  const formatSubscribers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${Math.floor(count / 1000)}K`;
    return count.toString();
  };

  // Parse description from channelInfo
  const mainDescription = channelInfo?.description
    ? channelInfo.description.split("\n").filter((line) => line.trim() !== "")
    : [
        "FMT brings you the latest news, from the halls of power to the city streets!",
      ];

  return (
    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-6 mb-8 border border-green-200 dark:border-green-800">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex-1 text-center lg:text-left">
          <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-gray-100">
            Never miss an update! {mainDescription[0]}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {mainDescription[1] ||
              "Subscribe to our YouTube channel for instant notifications"}
          </p>
        </div>
        <Link
          href="https://www.youtube.com/channel/UC2CzLwbhTiI8pTKNVyrOnJQ?sub_confirmation=1"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-md font-bold text-sm transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          Subscribe Now
        </Link>
      </div>
    </div>
  );
};

// Playlist Section Component with tier badge on top-right and play button on hover
const PlaylistSection = ({
  playlist,
  playlistId,
}: {
  playlist: { name: string; videos: Video[] };
  playlistId: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Generate slug from playlist name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const playlistSlug = generateSlug(playlist.name);

  return (
    <section ref={sectionRef} className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{playlist.name}</h2>
        <Link href={`/videos/playlist/${playlistSlug}`}>
          <Button variant="ghost" size="sm" className="group">
            View All
            <FaChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isVisible
          ? playlist.videos.slice(0, 12).map((video, index) => (
              <article key={video.videoId} className="group">
                <Link href={`/videos/${video.videoId}`} prefetch={false}>
                  <div className="space-y-2">
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                      <Image
                        src={
                          video.thumbnails?.high?.url ||
                          `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`
                        }
                        alt={video.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        loading={index < 3 ? "eager" : "lazy"}
                        unoptimized
                      />
                      {/* Tier badge on top-right */}
                      {video.tier &&
                        (video.tier === "hot" || video.tier === "trending") && (
                          <div
                            className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded ${
                              video.tier === "hot"
                                ? "bg-red-600 text-white"
                                : "bg-orange-500 text-white"
                            }`}
                          >
                            {video.tier === "hot" ? "HOT" : "TRENDING"}
                          </div>
                        )}
                      {/* Duration badge on bottom-right */}
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-white text-xs">
                        {formatDuration(video.duration)}
                      </div>
                      {/* Play button on hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
                        <div className="bg-white/90 rounded-full p-3 transform transition-transform group-hover:scale-110">
                          <FaPlay className="w-5 h-5 text-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FaEye className="w-3 h-3" />
                          {formatViewCount(video.statistics?.viewCount || 0)}
                        </span>
                        <span>{getTimeAgo(video.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))
          : Array.from({ length: 12 }).map((_, index) => (
              <VideoSkeleton key={index} />
            ))}
      </div>
    </section>
  );
};

// Main Videos Page Component
const VideosPage = ({
  data,
  channelInfo,
  error,
}: {
  data: VideoHubData | null;
  channelInfo: ChannelInfo | null;
  error?: string;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Video[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Handle search
  useEffect(() => {
    if (debouncedSearch) {
      setIsSearching(true);
      fetch(`/api/videos/search?q=${encodeURIComponent(debouncedSearch)}`)
        .then((res) => res.json())
        .then((data) => {
          setSearchResults(data.results || []);
          setIsSearching(false);
        })
        .catch(() => {
          setSearchResults([]);
          setIsSearching(false);
        });
    } else {
      setSearchResults(null);
    }
  }, [debouncedSearch]);

  // Generate structured data
  const structuredData = data
    ? {
        "@context": "https://schema.org",
        "@type": "VideoGallery",
        name: "FMT Videos",
        description:
          "Latest news, interviews, and special reports from Malaysia",
        url: `${siteConfig.baseUrl}/videos`,
        publisher: {
          "@type": "Organization",
          name: "Free Malaysia Today",
          logo: {
            "@type": "ImageObject",
            url: `${siteConfig.baseUrl}/logo.png`,
          },
        },
      }
    : null;

  const dfpTargetingParams = {
    pos: "listing",
    section: ["videos"],
    key: gerneralTargetingKeys,
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Unable to load videos</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded mb-4"></div>
          <div className="h-4 w-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Videos - Free Malaysia Today</title>
        <meta
          name="description"
          content="Watch the latest news videos, interviews, and special reports from Free Malaysia Today"
        />
        <meta
          property="og:title"
          content="FMT Videos - Latest News & Reports"
        />
        <meta
          property="og:description"
          content="Watch the latest news videos, interviews, and special reports from Free Malaysia Today"
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${siteConfig.baseUrl}/videos`} />
        <meta
          property="og:image"
          content={`${siteConfig.baseUrl}/og-image-videos.jpg`}
        />

        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />

        {structuredData && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
        )}
      </Head>

      {/* Top Mobile Ad */}
      <div className="ads-small-mobile mb-4">
        <AdSlot
          sizes={[
            [320, 50],
            [320, 100],
          ]}
          id="div-gpt-ad-1661362470988-0"
          name="ROS_Mobile_Leaderboard"
          visibleOnDevices="onlyMobile"
          targetingParams={dfpTargetingParams}
        />
      </div>

      {/* Full-width layout - no container constraints */}
      <div className="px-4 lg:px-8 py-6">
        {/* Simplified Header with Search */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100">
                Videos
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Latest news, interviews, and special reports from Malaysia
              </p>
              <time className="text-xs text-muted-foreground block mt-2">
                Updated:{" "}
                {new Date().toLocaleString("en-MY", {
                  timeZone: "Asia/Kuala_Lumpur",
                })}
              </time>
            </div>
            <div className="w-full lg:w-auto">
              <div className="relative max-w-md">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none z-10" />
                <Input
                  type="search"
                  placeholder="Search videos..."
                  className="pl-10 pr-4 w-full lg:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </header>

        {/* YouTube Subscribe Section */}
        <YouTubeSubscribeSection channelInfo={channelInfo} />

        {/* Search Results or Normal Content */}
        {searchResults !== null ? (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">
              Search Results{" "}
              {isSearching && (
                <span className="text-sm font-normal text-muted-foreground">
                  (searching...)
                </span>
              )}
            </h2>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((video) => (
                  <article key={video.videoId} className="group">
                    <Link href={`/videos/${video.videoId}`}>
                      <div className="space-y-2">
                        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                          <Image
                            src={
                              video.thumbnails?.high?.url ||
                              `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`
                            }
                            alt={video.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                            unoptimized
                          />
                        </div>
                        <h3 className="font-medium line-clamp-2 group-hover:text-primary">
                          {video.title}
                        </h3>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">
                No videos found for &quot;{searchQuery}&quot;
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Hero Carousel */}
            {data.hero.length > 0 && (
              <section aria-label="Featured Videos" className="mb-8">
                <HeroCarousel videos={data.hero} />
              </section>
            )}

            <ShortsRail
              shorts={data.shorts}
              totalCount={data.shortsTotalCount}
            />

            {/* Playlist Sections - 3-column grid */}
            {Object.entries(data.playlists)
              .filter(([_, playlist]) => playlist && playlist.videos.length > 0)
              .map(([playlistId, playlistData]) => (
                <PlaylistSection
                  key={playlistId}
                  playlist={playlistData}
                  playlistId={playlistId}
                />
              ))}
          </>
        )}

        {/* Bottom Desktop Ad */}
        <div className="ads-medium-desktop mt-8">
          <AdSlot
            id="div-gpt-ad-1661333336129-0"
            name="ROS_Midrec"
            sizes={[300, 250]}
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
    </>
  );
};

// Server-side data fetching
export const getServerSideProps: GetServerSideProps = async (context) => {
  try {
    // Fetch video data and channel info in parallel
    const [videoResponse, channelResponse] = await Promise.all([
      fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/videos/gallery`
      ),
      fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/videos/channel-info`
      ),
    ]);

    const videoData = await videoResponse.json();
    const channelInfo = await channelResponse.json();

    // Sort hero videos by publishedAt only (no tier sorting)
    if (videoData.hero) {
      videoData.hero.sort((a: Video, b: Video) => {
        return (
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      });
    }

    // Sort shorts videos by publishedAt only (no tier sorting)
    if (videoData.shorts) {
      videoData.shorts.sort((a: Video, b: Video) => {
        return (
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      });
    }

    // Sort playlist videos by publishedAt only
    if (videoData.playlists) {
      Object.values(videoData.playlists).forEach((playlist: any) => {
        if (playlist.videos) {
          playlist.videos.sort((a: Video, b: Video) => {
            return (
              new Date(b.publishedAt).getTime() -
              new Date(a.publishedAt).getTime()
            );
          });
        }
      });
    }

    return {
      props: {
        data: videoData,
        channelInfo: channelInfo.error ? null : channelInfo,
        error: videoData.error || null,
      },
    };
  } catch (error) {
    console.error("[Videos Page] Error fetching data:", error);
    return {
      props: {
        data: null,
        channelInfo: null,
        error: "Failed to load video data",
      },
    };
  }
};

export default VideosPage;
