// pages/videos/index.tsx
import { GetServerSideProps } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Play, Eye, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdSlot from "@/components/common/AdSlot";
import siteConfig from "@/constants/site-config";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";
import { formatViewCount, formatDuration, getTimeAgo } from "@/lib/utils";
import VideoSkeleton from "@/components/skeletons/VideoCardSkeleton";
import type { Video, VideoHubData } from "@/types/video";

// Lazy load heavy components
const ShortsRail = dynamic(() => import("@/components/videos/ShortsRail"), {
  loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded-lg" />,
  ssr: false,
});

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

// YouTube Lite Component with Facade Pattern for Performance
const YouTubeLite = ({
  videoId,
  title,
  thumbnail,
  duration,
}: {
  videoId: string;
  title: string;
  thumbnail: string;
  duration: string;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleLoad = useCallback(() => {
    // Track engagement for analytics
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "video_play_clicked", {
        video_id: videoId,
        video_title: title,
      });
    }
    setIsLoaded(true);
  }, [videoId, title]);

  if (!isLoaded) {
    return (
      <button
        onClick={handleLoad}
        className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group"
        aria-label={`Play video: ${title}`}
      >
        <Image
          src={
            imageError
              ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
              : thumbnail
          }
          alt={title}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          loading="lazy"
          unoptimized
          onError={() => setImageError(true)}
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/90 rounded-full p-4 transform transition-transform group-hover:scale-110">
            <Play className="w-8 h-8 text-black fill-black" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-white text-xs">
          {formatDuration(duration)}
        </div>
      </button>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
        loading="lazy"
      />
    </div>
  );
};

// Hero Carousel Component with Optimized Images
const HeroCarousel = ({ videos }: { videos: Video[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!isPaused) {
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
    // Use maxres for hero, with fallback chain
    return (
      video.thumbnails?.maxres?.url ||
      video.thumbnails?.high?.url ||
      `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`
    );
  };

  return (
    <div
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Link href={`/videos/${currentVideo.videoId}`} prefetch={false}>
        <Image
          src={getThumbnailUrl(currentVideo)}
          alt={currentVideo.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          className="object-cover"
          priority={currentIndex === 0}
          unoptimized
          quality={90}
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
            <span>{getTimeAgo(currentVideo.publishedAt)}</span>
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

// YouTube Subscribe Section
const YouTubeSubscribeSection = ({
  channelInfo,
}: {
  channelInfo: ChannelInfo | null;
}) => {
  const formatSubscribers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${Math.floor(count / 1000)}K`;
    }
    return count.toString();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const info = channelInfo || {
    subscriberCount: 641000,
    videoCount: 30623,
    viewCount: 431000000,
    description:
      "FMT brings you the latest news, from the halls of power to the city streets!",
  };

  const mainDescription = info.description
    .split("\n")
    .filter((line) => line.trim() !== "");

  return (
    <div className="bg-gradient-to-br dark:from-lime-700 dark:to-lime-800 from-cyan-50 to-cyan-100 rounded-lg p-4 border dark:border-lime-300 border-cyan-200 mb-6">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex-1 text-center lg:text-left">
          <h3 className="font-bold text-lg mb-1">
            Never miss an update! {mainDescription[0]}
          </h3>
          <p className="text-xs opacity-80">
            {mainDescription[1] ||
              `Subscribe to our YouTube channel for instant notifications`}
          </p>
        </div>
        <div>
          <Link
            href="https://www.youtube.com/channel/UC2CzLwbhTiI8pTKNVyrOnJQ?sub_confirmation=1"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-red-600 hover:bg-gray-100 px-8 py-3 rounded-md font-bold text-sm transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            Subscribe Now
          </Link>
        </div>
      </div>
    </div>
  );
};

// Optimized Playlist Section with Lazy Loading
const PlaylistSection = ({
  playlist,
  playlistId,
}: {
  playlist: { name: string; videos: Video[] };
  playlistId: string;
}) => {
  const [visibleVideos, setVisibleVideos] = useState(6);
  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loadMoreRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            visibleVideos < playlist.videos.length
          ) {
            setVisibleVideos((prev) =>
              Math.min(prev + 3, playlist.videos.length)
            );
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [visibleVideos, playlist.videos.length]);

  const getThumbnailUrl = (video: Video) => {
    return (
      video.thumbnails?.high?.url ||
      video.thumbnails?.medium?.url ||
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
        {playlist.videos.slice(0, visibleVideos).map((video, index) => (
          <article key={video.videoId} className="group">
            <Link href={`/videos/${video.videoId}`} prefetch={false}>
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <Image
                  src={getThumbnailUrl(video)}
                  alt={video.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform"
                  unoptimized
                  loading={index < 3 ? "eager" : "lazy"}
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
                  <time dateTime={video.publishedAt.toString()}>
                    {getTimeAgo(video.publishedAt)}
                  </time>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>

      {visibleVideos < playlist.videos.length && (
        <div ref={loadMoreRef} className="h-10 mt-4" />
      )}
    </section>
  );
};

const generateEnhancedStructuredData = (
  data: VideoHubData,
  channelInfo: ChannelInfo | null
) => {
  // Use a Map to track unique videos and prevent duplicates
  const uniqueVideos = new Map<string, { video: Video; section: string }>();

  // Add hero videos (featured/trending) - they get priority
  data.hero.forEach((video) => {
    if (!uniqueVideos.has(video.videoId)) {
      uniqueVideos.set(video.videoId, {
        video,
        section: "Featured",
      });
    }
  });

  // Add shorts (quick videos) - only if not already added
  const validShorts = data.shorts
    .filter((video) => {
      const duration = video.durationSeconds || parseInt(video.duration) || 0;
      return duration > 5 && duration < 60;
    })
    .slice(0, 5); // Take top 5 shorts

  validShorts.forEach((video) => {
    if (!uniqueVideos.has(video.videoId)) {
      uniqueVideos.set(video.videoId, {
        video,
        section: "Shorts",
      });
    }
  });

  // Add videos from each playlist - only if not already added
  Object.entries(data.playlists).forEach(([playlistId, playlist]) => {
    if (playlist && playlist.videos && playlist.videos.length > 0) {
      playlist.videos.slice(0, 6).forEach((video) => {
        // Only add if this video hasn't been added yet
        if (!uniqueVideos.has(video.videoId)) {
          uniqueVideos.set(video.videoId, {
            video,
            section: playlist.name || playlistId,
          });
        }
      });
    }
  });

  // Helper function to calculate rating based on likes/views ratio
  const calculateRating = (stats: any) => {
    if (!stats.viewCount || stats.viewCount === 0) return 4.0;
    const ratio = (stats.likeCount || 0) / stats.viewCount;
    // Convert ratio to 1-5 scale with more realistic scaling
    // 0.001 ratio (0.1%) = 3.5 rating
    // 0.01 ratio (1%) = 4.0 rating
    // 0.05 ratio (5%) = 4.5 rating
    // 0.1 ratio (10%) = 5.0 rating
    let rating = 3.0 + ratio * 200;
    rating = Math.min(5.0, Math.max(1.0, rating));
    return rating.toFixed(1);
  };

  // Generate rich VideoObject for each unique video
  const createRichVideoObject = (
    video: Video,
    section: string,
    position: number
  ) => {
    const videoUrl = `https://www.freemalaysiatoday.com/videos/${video.videoId}`;
    const embedUrl = `https://www.youtube.com/embed/${video.videoId}`;
    const thumbnailUrl =
      video.thumbnails?.maxres?.url ||
      video.thumbnails?.high?.url ||
      `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`;

    const videoObject: any = {
      "@type": "VideoObject",
      "@id": videoUrl,
      position: position,
      name: video.title,
      description:
        video.description ||
        `${video.title} - Watch the latest news and updates from Free Malaysia Today`,
      thumbnailUrl: [
        thumbnailUrl,
        video.thumbnails?.high?.url ||
          `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        video.thumbnails?.medium?.url ||
          `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
      ],
      uploadDate: video.publishedAt,
      duration: video.duration,
      contentUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      embedUrl: embedUrl,
      potentialAction: {
        "@type": "WatchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: embedUrl,
          actionPlatform: [
            "http://schema.org/DesktopWebPlatform",
            "http://schema.org/MobileWebPlatform",
            "http://schema.org/IOSPlatform",
            "http://schema.org/AndroidPlatform",
          ],
        },
        expectsAcceptanceOf: {
          "@type": "Offer",
          category: "free",
          availability: "http://schema.org/InStock",
        },
      },
      interactionStatistic: [
        {
          "@type": "InteractionCounter",
          interactionType: { "@type": "WatchAction" },
          userInteractionCount: video.statistics?.viewCount || 0,
        },
        {
          "@type": "InteractionCounter",
          interactionType: { "@type": "LikeAction" },
          userInteractionCount: video.statistics?.likeCount || 0,
        },
        {
          "@type": "InteractionCounter",
          interactionType: { "@type": "CommentAction" },
          userInteractionCount: video.statistics?.commentCount || 0,
        },
      ],
      publisher: {
        "@type": "Organization",
        name: "Free Malaysia Today",
        logo: {
          "@type": "ImageObject",
          url: "https://www.freemalaysiatoday.com/logo.png",
          width: 600,
          height: 60,
        },
      },
      creator: {
        "@type": "Organization",
        name: "Free Malaysia Today",
        url: "https://www.youtube.com/channel/UC2CzLwbhTiI8pTKNVyrOnJQ",
      },
      genre: section,
      keywords: [
        "Malaysia news",
        "FMT",
        section,
        ...(video.tags || []).slice(0, 5),
      ].join(", "),
      inLanguage: "en-MY",
      isAccessibleForFree: true,
      isFamilyFriendly: true,
      copyrightHolder: {
        "@type": "Organization",
        name: "FMT Media Sdn Bhd",
      },
      copyrightYear: new Date(video.publishedAt).getFullYear(),
      encodingFormat: "video/mp4",
      width: "1920",
      height: "1080",
      regionsAllowed: "MY,SG,TH,ID,PH,BN",
      publication: {
        "@type": "BroadcastEvent",
        isLiveBroadcast: false,
        startDate: video.publishedAt,
        endDate: video.publishedAt,
      },
      // Add transcript information
      transcript: {
        "@type": "CreativeWork",
        text: "Transcript available on video page",
        inLanguage: "en-MY",
        url: `${videoUrl}#transcript`,
      },
    };

    // CRITICAL FIX: Only add aggregateRating if conditions are met
    const hasValidStats =
      video.statistics?.likeCount &&
      Number(video.statistics.likeCount) > 0 &&
      video.statistics?.viewCount &&
      Number(video.statistics.viewCount) > 0;

    const hasReviews =
      video.statistics?.commentCount &&
      Number(video.statistics.commentCount) > 0;

    // Only add aggregateRating if we have valid statistics
    if (hasValidStats) {
      const aggregateRating: any = {
        "@type": "AggregateRating",
        ratingValue: calculateRating(video.statistics),
        bestRating: 5,
        worstRating: 1,
        ratingCount: video.statistics.likeCount,
      };

      // IMPORTANT: Only add reviewCount if it's greater than 0
      // If it's 0, we completely omit the reviewCount property
      if (hasReviews) {
        aggregateRating.reviewCount = video.statistics.commentCount;
      }
      // If no reviews (commentCount is 0), reviewCount is NOT added at all

      videoObject.aggregateRating = aggregateRating;
    }
    // If no valid stats, aggregateRating is not added at all

    return videoObject;
  };

  // Convert Map to array and create VideoObjects with sequential positioning
  const videoObjectsArray = Array.from(uniqueVideos.values()).map(
    ({ video, section }, index) =>
      createRichVideoObject(video, section, index + 1)
  );

  // Log statistics for debugging (optional - remove in production)
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.log(`Structured Data Statistics:
      - Total unique videos: ${uniqueVideos.size}
      - Videos with ratings: ${videoObjectsArray.filter((v) => v.aggregateRating).length}
      - Videos without ratings: ${videoObjectsArray.filter((v) => !v.aggregateRating).length}
      - Videos with reviews: ${videoObjectsArray.filter((v) => v.aggregateRating?.reviewCount).length}
    `);
  }

  // Main VideoGallery Schema
  const videoGallerySchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://www.freemalaysiatoday.com/videos",
    name: "FMT Videos - Latest News, Interviews & Special Reports",
    description: `Watch ${uniqueVideos.size} unique Malaysian news videos, exclusive interviews, special reports, shorts, and in-depth analysis from Free Malaysia Today.`,
    url: "https://www.freemalaysiatoday.com/videos",
    isPartOf: {
      "@type": "WebSite",
      name: "Free Malaysia Today",
      url: "https://www.freemalaysiatoday.com",
    },
    about: {
      "@type": "Thing",
      name: "Malaysian News and Current Affairs",
    },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: "Free Malaysia Today",
      logo: {
        "@type": "ImageObject",
        url: "https://www.freemalaysiatoday.com/logo.png",
        width: 600,
        height: 60,
      },
      sameAs: [
        "https://www.youtube.com/channel/UC2CzLwbhTiI8pTKNVyrOnJQ",
        "https://www.facebook.com/FreeMalaysiaToday",
        "https://twitter.com/FMTNews",
        "https://www.instagram.com/freemalaysiatoday",
      ],
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: videoObjectsArray.length,
      itemListElement: videoObjectsArray,
    },
    // Add channel statistics if available
    ...(channelInfo && {
      creator: {
        "@type": "Organization",
        name: channelInfo.title,
        url: `https://www.youtube.com/channel/${channelInfo.id}`,
        interactionStatistic: [
          {
            "@type": "InteractionCounter",
            interactionType: "http://schema.org/SubscribeAction",
            userInteractionCount: channelInfo.subscriberCount,
          },
          {
            "@type": "InteractionCounter",
            interactionType: "http://schema.org/WatchAction",
            userInteractionCount: channelInfo.viewCount,
          },
        ],
      },
    }),
  };

  // Carousel Schema for Featured Videos (Google specific)
  const carouselSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Featured Videos",
    itemListElement: data.hero.slice(0, 10).map((video, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://www.freemalaysiatoday.com/videos/${video.videoId}`,
    })),
  };

  // VideoChannel Schema
  const videoChannelSchema = {
    "@context": "https://schema.org",
    "@type": "BroadcastChannel",
    name: "Free Malaysia Today YouTube Channel",
    url: "https://www.youtube.com/channel/UC2CzLwbhTiI8pTKNVyrOnJQ",
    inLanguage: "en-MY",
    providesBroadcastService: {
      "@type": "BroadcastService",
      name: "FMT Video Service",
      broadcastDisplayName: "FMT",
      broadcaster: {
        "@type": "Organization",
        name: "Free Malaysia Today",
      },
    },
  };

  // BreadcrumbList Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
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
    ],
  };

  return {
    videoGallerySchema,
    carouselSchema,
    videoChannelSchema,
    breadcrumbSchema,
  };
};

// Main Component with SEO Enhancements
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
    "Watch the latest news videos, exclusive interviews, special reports, and more from Free Malaysia Today. Get breaking news coverage and in-depth analysis on Malaysian politics, business, and current affairs.";

  // Generate VideoGallery structured data
  const structuredData = data
    ? generateEnhancedStructuredData(data, channelInfo)
    : null;

  return (
    <>
      <Head>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta
          name="keywords"
          content="Malaysia news videos, FMT videos, Malaysian politics, breaking news Malaysia, exclusive interviews, special reports"
        />

        {/* Open Graph */}
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={`${siteConfig.baseUrl}/videos`} />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content={data.hero[0]?.thumbnails?.maxres?.url || siteConfig.iconPath}
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Free Malaysia Today" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta
          name="twitter:image"
          content={data.hero[0]?.thumbnails?.maxres?.url || siteConfig.iconPath}
        />
        <meta name="twitter:site" content="@fmtoday" />

        {/* Additional SEO */}
        <link rel="canonical" href={`${siteConfig.baseUrl}/videos`} />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta name="googlebot" content="index, follow" />
        <meta name="google" content="notranslate" />

        {/* Preconnect to YouTube for performance */}
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />

        {structuredData && (
          <>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(structuredData.videoGallerySchema),
              }}
            />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(structuredData.carouselSchema),
              }}
            />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(structuredData.videoChannelSchema),
              }}
            />
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(structuredData.breadcrumbSchema),
              }}
            />
          </>
        )}
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
        {/* Page Title with Schema.org microdata */}
        <header className="text-center mb-8 sr-only">
          <h1 className="text-4xl font-extrabold mb-2" itemProp="name">
            Videos
          </h1>
          <p className="text-muted-foreground" itemProp="description">
            Latest news, interviews, and special reports
          </p>
          {/* Last updated for freshness signals */}
          <time
            className="text-xs text-muted-foreground block mt-2"
            dateTime={new Date().toISOString()}
          >
            Updated: {new Date().toLocaleString()}
          </time>
        </header>

        {/* YouTube Subscribe Section */}
        <YouTubeSubscribeSection channelInfo={channelInfo} />

        {/* Hero Carousel with optimized images */}
        {data.hero.length > 0 && (
          <section aria-label="Featured Videos">
            <HeroCarousel videos={data.hero} />
          </section>
        )}

        {/* Shorts Rail - Lazy loaded */}
        {data.shorts.length > 0 && <ShortsRail shorts={data.shorts} />}

        {/* Playlist Sections with progressive loading */}
        {Object.entries(data.playlists)
          .sort(([, a], [, b]) => {
            // Sort by position if available in future, for now maintain order from API
            return 0;
          })
          .map(([playlistId, playlistData]) => {
            if (!playlistData || playlistData.videos.length === 0) return null;

            return (
              <PlaylistSection
                key={playlistId}
                playlist={playlistData}
                playlistId={playlistId}
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
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/videos/gallery?fresh=true`),
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/videos/channel-info`),
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
