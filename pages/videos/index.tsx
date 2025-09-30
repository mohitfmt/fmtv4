// pages/videos/index.tsx
// MODIFIED: Converted from SSR to ISR for better performance

import { GetStaticProps } from "next";
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
}

interface VideosPageProps {
  data: VideoHubData | null;
  channelInfo: ChannelInfo | null;
  error: string | null;
}

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
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group">
      <Link href={`/videos/${currentVideo.videoId}`}>
        <Image
          src={thumbnailUrl}
          alt={currentVideo.title}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://i.ytimg.com/vi/${currentVideo.videoId}/hqdefault.jpg`;
          }}
        />
      </Link>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Play Button Overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Link href={`/videos/${currentVideo.videoId}`}>
          <div className="bg-primary rounded-full p-6 hover:scale-110 transition-transform">
            <FaPlay className="w-8 h-8 text-white" />
          </div>
        </Link>
      </div>

      {/* Video Info */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <Link href={`/videos/${currentVideo.videoId}`}>
          <h2 className="text-2xl font-bold mb-2 line-clamp-2 hover:text-primary transition-colors">
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

// Playlist Section Component
const PlaylistSection = ({
  playlist,
  playlistId,
}: {
  playlist: { name: string; videos: Video[] };
  playlistId: string;
}) => {
  if (!playlist || !playlist.videos || playlist.videos.length === 0) {
    return null;
  }

  // Generate slug from playlist name
  const playlistSlug = playlist.name.toLowerCase().replace(/\s+/g, "-");

  return (
    <section className="mb-12" aria-label={playlist.name}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{playlist.name}</h2>
        <Link href={`/videos/playlist/${playlistSlug}`} prefetch={false}>
          <Button variant="ghost" className="flex items-center gap-2">
            View All
            <FaChevronRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Video Grid - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {playlist.videos.map((video) => (
          <VideoCard key={video.videoId} video={video} />
        ))}
      </div>
    </section>
  );
};

// Video Card Component
const VideoCard = ({ video }: { video: Video }) => {
  const thumbnailUrl =
    video.thumbnails?.high?.url ||
    `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

  return (
    <Link href={`/videos/${video.videoId}`} prefetch={false}>
      <div className="group cursor-pointer">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden mb-3">
          <Image
            src={thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
            }}
          />
          {/* Duration Badge */}
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
            {formatDuration(video.duration)}
          </div>
        </div>

        {/* Video Info */}
        <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
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

// YouTube Subscribe Section
const YouTubeSubscribeSection = ({
  channelInfo,
}: {
  channelInfo: ChannelInfo | null;
}) => {
  if (!channelInfo) return null;

  return (
    <div className="bg-muted rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {channelInfo.thumbnailUrl && (
            <Image
              src={channelInfo.thumbnailUrl}
              alt={channelInfo.title}
              width={80}
              height={80}
              className="rounded-full"
            />
          )}
          <div>
            <h3 className="text-xl font-bold">{channelInfo.title}</h3>
            <p className="text-sm text-muted-foreground">
              {formatViewCount(channelInfo.subscriberCount)} subscribers
            </p>
          </div>
        </div>
        <Button
          asChild
          className="bg-red-600 hover:bg-red-700 text-white"
          size="lg"
        >
          <a
            href={`https://www.youtube.com/channel/${channelInfo.id}?sub_confirmation=1`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Subscribe
          </a>
        </Button>
      </div>
    </div>
  );
};

// Main Page Component
const VideosPage = ({ data, channelInfo, error }: VideosPageProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Video[]>([]);
  const debouncedSearch = useDebounce(searchQuery, 500);

  // DFP targeting params
  const dfpTargetingParams = {
    pos: "listing",
    section: ["videos"],
    key: gerneralTargetingKeys,
  };

  // Handle search
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        const response = await fetch(
          `/api/videos/search?q=${encodeURIComponent(debouncedSearch)}`
        );
        const results = await response.json();
        setSearchResults(results.videos || []);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearch]);

  // Show error state
  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Unable to Load Videos</h1>
          <p className="text-muted-foreground mb-6">
            {error || "Unable to load videos. Please try again later."}
          </p>
          <Button asChild>
            <Link href="/">Return to Homepage</Link>
          </Button>
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
          content="Watch the latest news videos from Malaysia. Breaking news, politics, business, lifestyle, and more from Free Malaysia Today."
        />
        <meta
          name="keywords"
          content="FMT videos, Malaysia news, video news, breaking news videos"
        />
        <link rel="canonical" href={`${siteConfig.baseUrl}/videos`} />
      </Head>

      <div className="w-full">
        {/* Header with Search */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center mb-8">
            {/* Title */}
            <div>
              <h1 className="text-4xl font-bold">FMT Videos</h1>
              {data.stats && (
                <p className="text-muted-foreground mt-2">
                  {data.stats.totalVideos.toLocaleString()} videos •{" "}
                  {data.stats.newToday} new today
                </p>
              )}
            </div>

            {/* Search Box */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Top Mobile Ad */}
          <div className="ads-small-mobile mb-6">
            <AdSlot
              sizes={[
                [320, 50],
                [320, 100],
              ]}
              id="div-gpt-ad-1661362398994-0"
              name="ROS_Mobile_Top"
              visibleOnDevices="onlyMobile"
              targetingParams={dfpTargetingParams}
            />
          </div>

          {/* Top Desktop Ad */}
          <div className="ads-medium-desktop mb-8">
            <AdSlot
              id="div-gpt-ad-1661333219776-0"
              name="ROS_Leaderboard"
              sizes={[
                [728, 90],
                [970, 90],
              ]}
              visibleOnDevices="onlyDesktop"
              targetingParams={dfpTargetingParams}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4">
          {/* Search Results */}
          {searchQuery.trim() && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6">
                Search Results for {searchQuery}
              </h2>
              {isSearching ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <VideoSkeleton key={i} />
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.map((video) => (
                    <VideoCard key={video.videoId} video={video} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No videos found matching {searchQuery}
                </p>
              )}
            </div>
          )}

          {/* Regular Content (hidden during search) */}
          {!searchQuery.trim() && (
            <>
              {/* Hero Carousel */}
              {data.hero && data.hero.length > 0 && (
                <section aria-label="Featured Videos" className="mb-8">
                  <HeroCarousel videos={data.hero} />
                </section>
              )}

              {/* YouTube Subscribe Section */}
              <YouTubeSubscribeSection channelInfo={channelInfo} />

              {/* Shorts Rail */}
              <ShortsRail
                shorts={data.shorts}
                totalCount={data.shortsTotalCount}
              />

              {/* Playlist Sections - 3-column grid */}
              {Object.entries(data.playlists)
                .filter(
                  ([_, playlist]) => playlist && playlist.videos.length > 0
                )
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
      </div>
    </>
  );
};

// 🆕 ISR: Static generation with 5-minute revalidation
export const getStaticProps: GetStaticProps = async () => {
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

    if (!videoResponse.ok) {
      throw new Error("Failed to fetch video data");
    }

    const videoData: VideoHubData = await videoResponse.json();

    // Channel info is optional - if it fails, we'll use null
    let channelInfo: ChannelInfo | null = null;
    if (channelResponse.ok) {
      channelInfo = await channelResponse.json();
    }

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
        channelInfo: channelInfo || null,
        error: null,
      },
      revalidate: 300, // 🆕 ISR: Revalidate every 5 minutes (fallback)
    };
  } catch (error) {
    console.error("[Videos Page] Error fetching data:", error);
    return {
      props: {
        data: null,
        channelInfo: null,
        error: "Failed to load video data",
      },
      revalidate: 300, // Still revalidate even on error
    };
  }
};

export default VideosPage;
