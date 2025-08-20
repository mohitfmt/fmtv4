// pages/videos/index.tsx (Updated to use Channel Info API)
import { GetServerSideProps } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Eye,
  ThumbsUp,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdSlot from "@/components/common/AdSlot";
import siteConfig from "@/constants/site-config";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";
import { youTubePlaylists } from "@/constants/youtube-playlists";
import { formatViewCount, formatDuration, getTimeAgo } from "@/lib/utils";
import { LogoSVG } from "@/components/ui/icons/LogoSVG";

import VideoSkeleton from "@/components/skeletons/VideoCardSkeleton";
import type { Video, VideoHubData } from "@/types/video";

// Channel Info Type
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

// YouTube Subscribe Section Component
const YouTubeSubscribeSection = ({
  channelInfo,
}: {
  channelInfo: ChannelInfo | null;
}) => {
  // Format subscriber count
  const formatSubscribers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${Math.floor(count / 1000)}K`;
    }
    return count.toString();
  };

  const info = channelInfo || {
    title: "Free Malaysia Today",
    description:
      "FMT brings you the latest news, from the halls of power to the city streets!",
    subscriberCount: 639000,
    thumbnailUrl: "",
  };

  return (
    <div className="bg-gray-900 text-white py-8 px-4 rounded-lg mb-8">
      <div className="container mx-auto">
        <div className="flex flex-col items-center text-center">
          {/* Channel Logo */}
          <div className="mb-4">
            {info.thumbnailUrl ? (
              <div className="w-24 h-24 rounded-full overflow-hidden bg-white">
                <Image
                  src={info.thumbnailUrl}
                  alt={info.title}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                <LogoSVG className="w-16 h-16" />
              </div>
            )}
          </div>

          {/* Channel Title */}
          <h1 className="text-3xl font-bold mb-2">{info.title}</h1>

          {/* Subscriber Count */}
          <p className="text-gray-400 mb-4">
            {formatSubscribers(info.subscriberCount)} Subscribers
          </p>

          {/* Channel Description */}
          <p className="text-gray-300 max-w-2xl mb-6">
            {info.description.split("\n")[0]}
            <br />
            <span className="text-sm text-gray-400 mt-2 block">
              FMT Media Sdn Bhd (1235453-U)
            </span>
          </p>

          {/* Subscribe Button */}
          <Link
            href="https://www.youtube.com/channel/UC2CzLwbhTiI8pTKNVyrOnJQ?sub_confirmation=1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-semibold transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            YouTube
            <span className="text-sm bg-white/20 px-2 py-0.5 rounded">
              {formatSubscribers(info.subscriberCount)}
            </span>
          </Link>

          {/* Additional Stats */}
          {channelInfo && (
            <div className="mt-6 flex gap-8 text-sm text-gray-400">
              <div>
                <span className="font-bold text-white">
                  {channelInfo.videoCount.toLocaleString()}
                </span>{" "}
                videos
              </div>
              <div>
                <span className="font-bold text-white">
                  {formatViewCount(channelInfo.viewCount)}
                </span>{" "}
                views
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Hero Carousel Component (keep as is)
const HeroCarousel = ({ videos }: { videos: Video[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % videos.length);
    }, 8000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [videos.length]);

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
      video.thumbnails?.medium?.url ||
      video.thumbnails?.default?.url ||
      `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`
    );
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group">
      <Link href={`/videos/${currentVideo.videoId}`}>
        <Image
          src={getThumbnailUrl(currentVideo)}
          alt={currentVideo.title}
          fill
          className="object-cover"
          priority
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://i.ytimg.com/vi/${currentVideo.videoId}/hqdefault.jpg`;
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/90 rounded-full p-6 transform transition-transform group-hover:scale-110">
            <Play className="w-12 h-12 text-black fill-black" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-red-600 px-2 py-1 rounded text-xs font-bold">
              {currentVideo.tier === "hot" ? "TRENDING" : "FEATURED"}
            </span>
            <span className="bg-black/50 px-2 py-1 rounded text-xs">
              {formatDuration(currentVideo.duration)}
            </span>
          </div>
          <h2 className="text-2xl md:text-4xl font-bold mb-2 line-clamp-2">
            {currentVideo.title}
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {formatViewCount(currentVideo.statistics?.viewCount || 0)} views
            </span>
            <span className="text-sm text-muted-foreground">
              {getTimeAgo(currentVideo.publishedAt)}
            </span>
          </div>
        </div>
      </Link>

      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Previous video"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Next video"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

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
    </div>
  );
};

// Keep all other components (ShortsRail, PlaylistSection) the same...
// [Rest of the components remain unchanged]

const ShortsRail = ({ shorts }: { shorts: Video[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const getThumbnailUrl = (video: Video) => {
    return (
      video.thumbnails?.high?.url ||
      video.thumbnails?.medium?.url ||
      video.thumbnails?.default?.url ||
      `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`
    );
  };

  return (
    <section className="my-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-red-600" />
          <h2 className="text-2xl font-bold">Shorts</h2>
          <span className="text-sm text-muted-foreground">
            Quick videos under 60s
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {shorts.map((short) => (
          <Link
            key={short.videoId}
            href={`/videos/${short.videoId}`}
            className="flex-shrink-0 w-[180px] group"
          >
            <div className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden">
              <Image
                src={getThumbnailUrl(short)}
                alt={short.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://i.ytimg.com/vi/${short.videoId}/hqdefault.jpg`;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <h3 className="text-sm font-semibold line-clamp-2">
                  {short.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <Eye className="w-3 h-3" />
                  <span>
                    {formatViewCount(short.statistics?.viewCount || 0)}
                  </span>
                </div>
              </div>
              <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded text-white text-xs">
                {short.durationSeconds}s
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

const PlaylistSection = ({
  playlist,
  playlistId,
}: {
  playlist: { name: string; videos: Video[] };
  playlistId: string;
}) => {
  const getThumbnailUrl = (video: Video) => {
    return (
      video.thumbnails?.high?.url ||
      video.thumbnails?.medium?.url ||
      video.thumbnails?.default?.url ||
      `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`
    );
  };

  return (
    <section className="my-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{playlist.name}</h2>
        <Link href={`/videos/playlist/${playlistId}`}>
          <Button variant="outline" size="sm">
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {playlist.videos.map((video) => (
          <Link
            key={video.videoId}
            href={`/videos/${video.videoId}`}
            className="group"
          >
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <Image
                src={getThumbnailUrl(video)}
                alt={video.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/90 rounded-full p-3">
                  <Play className="w-6 h-6 text-black fill-black" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-white text-xs">
                {formatDuration(video.duration)}
              </div>
            </div>

            <div className="mt-3">
              <h3 className="font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors">
                {video.title}
              </h3>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {formatViewCount(video.statistics?.viewCount || 0)}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-4 h-4" />
                  {video.statistics?.likeCount || 0}
                </span>
                <span className="text-sm text-muted-foreground">
                  {getTimeAgo(video.publishedAt)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

// Main Component
const VideosPage = ({
  data,
  channelInfo,
  error,
}: {
  data: VideoHubData | null;
  channelInfo: ChannelInfo | null;
  error?: string;
}) => {
  const dfpTargetingParams = {
    pos: "listing",
    section: ["videos"],
    key: ["Videos", "Fmt-videos", ...gerneralTargetingKeys],
  };

  // Loading state
  if (!data && !error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => (
            <VideoSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Unable to load videos</h2>
          <p className="text-muted-foreground mb-6">
            {error || "Please try again later"}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const metaTitle = "Videos - Free Malaysia Today";
  const metaDescription =
    "Watch the latest news videos, exclusive interviews, special reports, and more from Free Malaysia Today.";

  return (
    <>
      <Head>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={`${siteConfig.baseUrl}/videos`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={siteConfig.iconPath} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={siteConfig.iconPath} />
      </Head>

      {/* Top Mobile Ad */}
      <div className="ads-small-mobile">
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

      <div className="container mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-2">Videos</h1>
          <p className="text-muted-foreground">
            Latest news, interviews, and special reports
          </p>
        </div>

        {/* YouTube Subscribe Section with Channel Info from API */}
        <YouTubeSubscribeSection channelInfo={channelInfo} />

        {/* Hero Carousel */}
        {data.hero.length > 0 && <HeroCarousel videos={data.hero} />}

        {/* Shorts Rail */}
        {data.shorts.length > 0 && <ShortsRail shorts={data.shorts} />}

        {/* Playlist Sections */}
        {youTubePlaylists.map((playlist) => {
          const playlistData = data.playlists[playlist.playlistId];
          if (!playlistData || playlistData.videos.length === 0) return null;

          return (
            <PlaylistSection
              key={playlist.playlistId}
              playlist={playlistData}
              playlistId={playlist.playlistId}
            />
          );
        })}

        {/* Bottom Desktop Ad */}
        <div className="ads-medium-desktop my-8">
          <AdSlot
            id="div-gpt-ad-1661333336129-0"
            name="ROS_Midrec"
            sizes={[300, 250]}
            visibleOnDevices="onlyDesktop"
            targetingParams={dfpTargetingParams}
          />
        </div>

        {/* Bottom Mobile Ad */}
        <div className="ads-medium-mobile">
          <AdSlot
            id="div-gpt-ad-1661355704641-0"
            name="ROS_Midrec_b"
            sizes={[300, 250]}
            visibleOnDevices="onlyMobile"
            targetingParams={dfpTargetingParams}
          />
        </div>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Set cache headers for CDN
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800"
  );
  res.setHeader("CDN-Cache-Control", "max-age=86400");
  res.setHeader("Cache-Tag", "video:gallery,video:all");

  try {
    // Fetch video data and channel info in parallel
    const [videoResponse, channelResponse] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/videos/gallery`),
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/videos/channel-info`),
    ]);

    if (!videoResponse.ok) {
      throw new Error("Failed to fetch video data");
    }

    const data: VideoHubData = await videoResponse.json();

    // Channel info is optional - if it fails, we'll use defaults
    let channelInfo: ChannelInfo | null = null;
    if (channelResponse.ok) {
      channelInfo = await channelResponse.json();
    }

    return {
      props: {
        data,
        channelInfo,
        error: null,
      },
    };
  } catch (error) {
    console.error("[Videos Page] Error:", error);

    // Return error state
    return {
      props: {
        data: null,
        channelInfo: null,
        error: "Unable to load videos. Please try again later.",
      },
    };
  }
};

export default VideosPage;
