// components/videos/shorts/MobileShortsView.tsx
// OPTION A FIX: Dynamic mute parameter with iframe re-mount for actual unmute functionality

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
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
    viewCount: string | number;
    likeCount: string | number;
    commentCount: string | number;
  };
  isShort: boolean;
  tier: string;
}

interface MobileShortsViewProps {
  initialShorts: VideoWithChannel[];
  totalCount: number;
}

// ✅ CHANGE #1: Accept muted parameter to dynamically set mute state
const getYouTubeEmbedUrl = (videoId: string, muted: boolean = true): string => {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: muted ? "1" : "0", // ← DYNAMIC instead of hardcoded "1"
    controls: "0",
    playsinline: "1",
    loop: "1",
    playlist: videoId,
    modestbranding: "1",
    rel: "0",
    iv_load_policy: "3",
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};

const getShortsThumbnail = (video: VideoWithChannel): string => {
  if (!video?.thumbnails) {
    return `https://i.ytimg.com/vi/${video.videoId}/frame0.jpg`;
  }
  const thumbs = video.thumbnails;
  if (thumbs.maxres) return thumbs.maxres;
  if (thumbs.high) return thumbs.high;
  if (thumbs.medium) return thumbs.medium;
  if (thumbs.standard) return thumbs.standard;
  if (thumbs.default) return thumbs.default;
  return `https://i.ytimg.com/vi/${video.videoId}/frame0.jpg`;
};

const isIOS = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(ad|hone|od)/.test(navigator.platform) ||
    (/MacIntel/.test(navigator.platform) &&
      (navigator as any).maxTouchPoints > 1)
  );
};

export default function MobileShortsView({
  initialShorts,
  totalCount,
}: MobileShortsViewProps) {
  const [shorts, setShorts] = useState<VideoWithChannel[]>(initialShorts);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedPages, setLoadedPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showTapHint, setShowTapHint] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const currentVideo = shorts[currentIndex];
  const isiOS = isIOS();

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

  const goToNext = useCallback(() => {
    if (currentIndex < shorts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (currentIndex >= shorts.length - 3) {
      loadMoreVideos();
    }
  }, [currentIndex, shorts.length, loadMoreVideos]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY.current - touchEndY;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }
  };

  const onVolumeClick = useCallback(() => {
    setHasInteracted(true);
    setIsMuted((m) => !m);

    if (isiOS) {
      setShowTapHint(true);
      setTimeout(() => setShowTapHint(false), 3000);
    }
  }, [isiOS]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (isShareModalOpen) return;
      if (target && target.closest("input, textarea, [contenteditable='true']"))
        return;

      if (e.key === "ArrowDown") goToNext();
      if (e.key === "ArrowUp") goToPrevious();
      if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        onVolumeClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, onVolumeClick, isShareModalOpen]);

  if (!currentVideo) return null;

  return (
    <>
      <div
        ref={containerRef}
        className="fixed inset-0 bg-black overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {shorts.map((video, index) => {
          const distance = Math.abs(index - currentIndex);
          if (distance > 1) return null;

          const isCurrent = index === currentIndex;

          return (
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
              <div className="relative w-full h-full">
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  {isCurrent ? (
                    <>
                      {/* ✅ CHANGE #2: Include isMuted in key to force re-mount, pass isMuted to URL function */}
                      <iframe
                        ref={iframeRef}
                        key={`iframe-${video.videoId}-${isMuted ? "muted" : "unmuted"}`}
                        src={getYouTubeEmbedUrl(video.videoId, isMuted)}
                        className="w-full h-full"
                        style={{ border: 0, pointerEvents: "none" }}
                        allow="autoplay; encrypted-media; picture-in-picture; accelerometer; gyroscope"
                        allowFullScreen
                        title={video.title}
                      />
                      {/* Transparent overlay to capture swipes without blocking buttons */}
                      <div
                        className="absolute inset-0 z-10"
                        style={{ pointerEvents: "auto" }}
                        onClick={(e) => {
                          // Allow tap-through to iframe for iOS sound if needed
                          if (isiOS && !isMuted && iframeRef.current) {
                            e.stopPropagation();
                          }
                        }}
                      />
                    </>
                  ) : (
                    <Image
                      src={getShortsThumbnail(video)}
                      alt={video.title}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  )}
                </div>

                {isCurrent && (
                  <>
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

                    <div
                      className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20"
                      style={{
                        paddingBottom: "80px",
                      }}
                    >
                      <button
                        className="flex flex-col items-center"
                        aria-label="Views"
                      >
                        <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center">
                          <FaEye className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white text-xs mt-1">
                          {formatViewCount(video.statistics.viewCount)}
                        </span>
                      </button>

                      <button
                        className="flex flex-col items-center"
                        aria-label="Like"
                      >
                        <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center">
                          <FaHeart className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white text-xs mt-1">
                          {formatViewCount(video.statistics.likeCount)}
                        </span>
                      </button>

                      <button
                        className="flex flex-col items-center"
                        aria-label="Comment"
                      >
                        <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center">
                          <FaComment className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white text-xs mt-1">
                          {formatViewCount(video.statistics.commentCount)}
                        </span>
                      </button>

                      <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="flex flex-col items-center"
                        aria-label="Share"
                      >
                        <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center">
                          <FaShare className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white text-xs mt-1">Share</span>
                      </button>

                      <button
                        onClick={onVolumeClick}
                        className="flex flex-col items-center relative"
                        aria-label={isMuted ? "Unmute" : "Mute"}
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
                              : "Sound"}
                        </span>

                        {showTapHint && isiOS && (
                          <div className="absolute -left-32 top-1/2 -translate-y-1/2">
                            <div className="bg-white text-black text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap animate-bounce">
                              Tap video to hear audio
                            </div>
                          </div>
                        )}

                        {!hasInteracted && isMuted && !showTapHint && (
                          <div className="absolute -left-24 top-1/2 -translate-y-1/2">
                            <div className="bg-white text-black text-xs px-2 py-1 rounded animate-bounce whitespace-nowrap">
                              Tap for sound 👉
                            </div>
                          </div>
                        )}
                      </button>
                    </div>

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
          );
        })}

        {isLoading && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30">
            <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-full">
              <span className="text-white text-sm">Loading more...</span>
            </div>
          </div>
        )}
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        videoId={currentVideo.videoId}
        title={currentVideo.title}
      />
    </>
  );
}
