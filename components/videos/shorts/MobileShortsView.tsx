// components/videos/shorts/MobileShortsView.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FaPause,
  FaEye,
  FaShare,
  FaHeart,
  FaComment,
  FaVolumeUp,
  FaVolumeMute,
} from "react-icons/fa";
import { formatViewCount, formatDuration } from "@/lib/utils";
import ShareModal from "./ShareModal";

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
}

interface MobileShortsViewProps {
  initialShorts: VideoWithChannel[];
  totalCount: number;
}

export default function MobileShortsView({
  initialShorts,
  totalCount,
}: MobileShortsViewProps) {
  const [shorts, setShorts] = useState<VideoWithChannel[]>(initialShorts);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedPages, setLoadedPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const lastTapTime = useRef(0);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentVideo = shorts[currentIndex];

  // Auto-pause when tab is hidden (save bandwidth)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPlaying(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Reset loading state when video changes
  useEffect(() => {
    setIsVideoLoading(true);
    const timer = setTimeout(() => {
      setIsVideoLoading(false);
    }, 1500); // Give iframe time to load

    return () => clearTimeout(timer);
  }, [currentIndex]);

  // Load more videos
  const loadMoreVideos = useCallback(async () => {
    if (isLoading || shorts.length >= totalCount) return;
    setIsLoading(true);

    try {
      const nextPage = loadedPages + 1;
      const response = await fetch(
        `/api/videos/shorts?page=${nextPage}&limit=12`
      );
      const data = await response.json();

      if (data.videos && data.videos.length > 0) {
        setShorts((prev) => [...prev, ...data.videos]);
        setLoadedPages(nextPage);
      }
    } catch (error) {
      console.error("Failed to load more videos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [loadedPages, isLoading, shorts.length, totalCount]);

  // Navigation functions
  const goToNext = useCallback(() => {
    if (currentIndex < shorts.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(true);
    }

    // Load more when approaching end
    if (currentIndex >= shorts.length - 3) {
      loadMoreVideos();
    }
  }, [currentIndex, shorts.length, loadMoreVideos]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(true);
    }
  }, [currentIndex]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext(); // Swipe up
      } else {
        goToPrevious(); // Swipe down
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") goToNext();
      if (e.key === "ArrowUp") goToPrevious();
      if (e.key === " ") {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }
      if (e.key === "m" || e.key === "M") {
        toggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, isPlaying]);

  // Double-tap to like handler
  const handleDoubleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime.current;

    if (timeSinceLastTap < 300) {
      // Double tap detected
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 1000);

      // Track double-tap like
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "like", {
          event_category: "shorts",
          event_label: "double_tap",
          video_id: currentVideo.videoId,
        });
      }
    } else {
      // Single tap - toggle play/pause
      togglePlayPause();
    }

    lastTapTime.current = now;
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    if (!hasInteracted) {
      setHasInteracted(true);
    }
  };

  const toggleMute = () => {
    // On first interaction, enable sound
    if (!hasInteracted) {
      setHasInteracted(true);
      setIsMuted(false);
    } else {
      setIsMuted(!isMuted);
    }
  };

  // Smart thumbnail fallback chain
  const getShortsThumbnail = (video: VideoWithChannel) => {
    // Priority order for best 9:16 thumbnail
    const thumbnailOptions = [
      `https://i.ytimg.com/vi/${video.videoId}/oar2.jpg`, // 9:16 shorts thumbnail
      `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`, // High quality
      `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`, // Medium quality
      `https://i.ytimg.com/vi/${video.videoId}/mq1.jpg`, // Frame at 1 second
    ];

    // Return first option, fallback handled by onError
    return imageErrors[video.videoId]
      ? thumbnailOptions[2] // Use hqdefault if others failed
      : thumbnailOptions[0];
  };

  // Generate YouTube embed URL with current state
  const getYouTubeEmbedUrl = (videoId: string, autoplay: boolean = true) => {
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      mute: isMuted ? "1" : "0",
      controls: "0",
      playsinline: "1",
      loop: "1",
      playlist: videoId,
      modestbranding: "1",
      rel: "0",
      showinfo: "0",
      fs: "0",
      iv_load_policy: "3",
      disablekb: "1",
    });
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  };

  if (!currentVideo) return null;

  return (
    <>
      <div
        ref={containerRef}
        className="fixed inset-0 bg-black overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Videos Stack */}
        {shorts.map((video, index) => (
          <div
            key={video.videoId}
            className={`absolute inset-0 transition-transform duration-300 ${
              index === currentIndex
                ? "translate-y-0"
                : index < currentIndex
                  ? "-translate-y-full"
                  : "translate-y-full"
            }`}
          >
            {/* Video Player with Poster */}
            <div className="relative w-full h-full">
              {/* YouTube embed or Thumbnail based on current index */}
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                {index === currentIndex ? (
                  <>
                    {/* Loading State - Show thumbnail until video loads */}
                    {isVideoLoading && (
                      <div className="absolute inset-0 z-5">
                        <Image
                          src={getShortsThumbnail(video)}
                          alt={video.title}
                          fill
                          className="object-contain"
                          unoptimized
                          priority
                        />
                        {/* Loading spinner overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                      </div>
                    )}

                    {/* Current video - iframe (no key prop to prevent reload) */}
                    <iframe
                      ref={iframeRef}
                      src={getYouTubeEmbedUrl(video.videoId, isPlaying)}
                      className="w-full h-full"
                      style={{ border: 0 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onLoad={() => setIsVideoLoading(false)}
                    />

                    {/* Overlay for tap interaction */}
                    <div
                      className="absolute inset-0 z-10"
                      onClick={handleDoubleTap}
                    />

                    {/* Double-tap like animation */}
                    {showLikeAnimation && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                        <FaHeart className="w-32 h-32 text-white opacity-80 animate-ping" />
                      </div>
                    )}
                  </>
                ) : (
                  // Show thumbnail for non-current videos
                  <Image
                    src={getShortsThumbnail(video)}
                    alt={video.title}
                    fill
                    className="object-contain"
                    onError={() =>
                      setImageErrors((prev) => ({
                        ...prev,
                        [video.videoId]: true,
                      }))
                    }
                    unoptimized
                  />
                )}
              </div>

              {/* Overlay UI */}
              {index === currentIndex && (
                <>
                  {/* Play/Pause Indicator */}
                  {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                      <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center">
                        <FaPause className="w-10 h-10 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Top Bar */}
                  <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-20">
                    <div className="flex items-center justify-between">
                      <Link href="/videos" className="text-white p-2">
                        <span className="text-xl">←</span>
                      </Link>
                      <span className="text-white text-sm font-medium">
                        {currentIndex + 1} / {shorts.length}
                      </span>
                    </div>
                  </div>

                  {/* Right Side Actions */}
                  <div className="absolute right-4 bottom-32 flex flex-col gap-6 z-20">
                    {/* Like */}
                    <button className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center">
                        <FaHeart className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-white text-xs mt-1">
                        {formatViewCount(video.statistics.likeCount)}
                      </span>
                    </button>

                    {/* Comment */}
                    <button className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center">
                        <FaComment className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-white text-xs mt-1">
                        {formatViewCount(video.statistics.commentCount)}
                      </span>
                    </button>

                    {/* Share - Opens Modal */}
                    <button
                      onClick={() => setIsShareModalOpen(true)}
                      className="flex flex-col items-center"
                    >
                      <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center">
                        <FaShare className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-white text-xs mt-1">Share</span>
                    </button>

                    {/* Volume - Enhanced with red indicator */}
                    <button
                      onClick={toggleMute}
                      className="flex flex-col items-center relative"
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          !hasInteracted && isMuted
                            ? "bg-red-500 animate-pulse shadow-lg shadow-red-500/50"
                            : isMuted
                              ? "bg-red-500/80"
                              : "bg-white/10 backdrop-blur"
                        }`}
                      >
                        {isMuted ? (
                          <FaVolumeMute className="w-6 h-6 text-white" />
                        ) : (
                          <FaVolumeUp className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <span className="text-white text-xs mt-1 font-medium">
                        {!hasInteracted
                          ? "Tap for sound"
                          : isMuted
                            ? "Unmute"
                            : "Mute"}
                      </span>
                      {/* First interaction hint - Fixed position */}
                      {!hasInteracted && isMuted && (
                        <div className="absolute -left-24 top-1/2 -translate-y-1/2">
                          <div className="bg-white text-black text-xs px-2 py-1 rounded animate-bounce whitespace-nowrap">
                            Tap for sound 👉
                          </div>
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Bottom Info - Enhanced with text shadow */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 mr-20 pb-6 z-20">
                    <div className="mb-4">
                      {video.channelTitle && (
                        <p
                          className="text-white font-semibold mb-2"
                          style={{
                            textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                          }}
                        >
                          @{video.channelTitle}
                        </p>
                      )}
                      <h2
                        className="text-white text-base font-medium line-clamp-2"
                        style={{
                          textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                        }}
                      >
                        {video.title}
                      </h2>
                      <div
                        className="flex items-center gap-3 text-white/80 text-sm mt-2"
                        style={{
                          textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                        }}
                      >
                        <span className="flex items-center gap-1">
                          <FaEye className="w-3 h-3" />
                          {formatViewCount(video.statistics.viewCount)}
                        </span>
                        <span>•</span>
                        <span>{formatDuration(video.duration)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30">
            <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-full">
              <span className="text-white text-sm">Loading more...</span>
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        videoId={currentVideo.videoId}
        title={currentVideo.title}
      />
    </>
  );
}
