// components/videos/VideoFacade.tsx
// ENHANCED: Auto-play support when clicked, responsive play button sizes

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { FaPlay, FaExclamationTriangle } from "react-icons/fa";
import { cn } from "@/lib/utils";

interface VideoFacadeProps {
  videoId: string;
  title: string;
  thumbnail?: string;
  aspectRatio?: "video" | "short"; // 16:9 or 9:16
  autoplay?: boolean; // Auto-play when iframe loads
  className?: string;
  onLoad?: () => void; // Called when iframe actually loads
  onError?: (error: Error) => void;
  priority?: boolean; // For hero videos
  sizes?: string;
  size?: "small" | "medium" | "large"; // Play button size
}

interface FacadeState {
  isLoaded: boolean;
  hasError: boolean;
  isIframeLoading: boolean;
}

const VideoFacade: React.FC<VideoFacadeProps> = ({
  videoId,
  title,
  thumbnail,
  aspectRatio = "video",
  autoplay = false,
  className,
  onLoad,
  onError,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px",
  size = "medium",
}) => {
  const [state, setState] = useState<FacadeState>({
    isLoaded: false,
    hasError: false,
    isIframeLoading: false,
  });

  const [thumbnailError, setThumbnailError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate thumbnail URL with fallbacks
  const getThumbnailUrl = () => {
    if (thumbnail && !thumbnailError) {
      return thumbnail;
    }

    // Fallback chain for YouTube thumbnails
    if (thumbnailError) {
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    return thumbnail || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  };

  // Generate YouTube embed URL with performance optimizations
  const getEmbedUrl = () => {
    const params = new URLSearchParams({
      rel: "0", // No related videos
      modestbranding: "1", // Minimal branding
      playsinline: "1", // Inline playback on mobile
      controls: "1", // Show controls
      // Auto-play when clicked (iframe is loaded via user interaction)
      ...(autoplay && {
        autoplay: "1",
        mute: "1", // Required for autoplay to work
      }),
    });

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  };

  // Handle click to load iframe
  const handleLoadVideo = () => {
    if (state.isLoaded || state.isIframeLoading) return;

    setState((prev) => ({ ...prev, isIframeLoading: true }));

    // Small delay to show loading state, then load iframe
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isLoaded: true,
        isIframeLoading: false,
      }));

      // Call onLoad after iframe is inserted into DOM
      // The actual playback tracking should happen when iframe loads
      setTimeout(() => {
        onLoad?.();
      }, 100);
    }, 100);
  };

  // Handle thumbnail load error
  const handleThumbnailError = () => {
    if (!thumbnailError) {
      setThumbnailError(true);
    } else {
      // Final fallback failed
      setState((prev) => ({ ...prev, hasError: true }));
      onError?.(new Error(`Failed to load thumbnail for video ${videoId}`));
    }
  };

  // Handle iframe load error
  const handleIframeError = () => {
    setState((prev) => ({ ...prev, hasError: true }));
    onError?.(new Error(`Failed to load YouTube iframe for video ${videoId}`));
  };

  // Intersection Observer for performance hints
  useEffect(() => {
    const container = containerRef.current;
    if (!container || state.isLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Preconnect to YouTube when video comes into view
            const preconnectLink = document.createElement("link");
            preconnectLink.rel = "preconnect";
            preconnectLink.href = "https://www.youtube.com";
            document.head.appendChild(preconnectLink);

            const preconnectLink2 = document.createElement("link");
            preconnectLink2.rel = "preconnect";
            preconnectLink2.href = "https://i.ytimg.com";
            document.head.appendChild(preconnectLink2);

            observer.unobserve(container);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [state.isLoaded]);

  // Aspect ratio classes
  const aspectClasses = {
    video: "aspect-video", // 16:9
    short: "aspect-[9/16]", // 9:16
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full bg-muted overflow-hidden",
        aspectClasses[aspectRatio],
        className
      )}
    >
      {!state.isLoaded ? (
        <>
          {/* Thumbnail Image */}
          {!state.hasError ? (
            <Image
              src={getThumbnailUrl()}
              alt={title}
              fill
              className="object-cover"
              priority={priority}
              sizes={sizes}
              onError={handleThumbnailError}
              onLoad={() => {
                // Ensure stable layout after image loads
                if (containerRef.current) {
                  containerRef.current.style.minHeight =
                    containerRef.current.offsetHeight + "px";
                }
              }}
            />
          ) : (
            /* Error State */
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center text-muted-foreground">
                <FaExclamationTriangle className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Unable to load video</p>
              </div>
            </div>
          )}

          {/* Play Button Overlay */}
          {!state.hasError && (
            <button
              onClick={handleLoadVideo}
              disabled={state.isIframeLoading}
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors"
              aria-label={`Play video: ${title}`}
            >
              <div
                className={cn(
                  "bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors",
                  // Responsive sizing based on prop
                  size === "small" && "p-3", // 48px button
                  size === "medium" && "p-4", // 64px button
                  size === "large" && "p-5", // 80px button
                  state.isIframeLoading && "animate-pulse"
                )}
              >
                {state.isIframeLoading ? (
                  <div
                    className={cn(
                      "border-2 border-white border-t-transparent rounded-full animate-spin",
                      size === "small" && "w-5 h-5",
                      size === "medium" && "w-6 h-6",
                      size === "large" && "w-8 h-8"
                    )}
                  />
                ) : (
                  <FaPlay
                    className={cn(
                      "text-white ml-0.5",
                      size === "small" && "w-4 h-4",
                      size === "medium" && "w-5 h-5",
                      size === "large" && "w-6 h-6"
                    )}
                  />
                )}
              </div>
            </button>
          )}

          {/* Gradient Overlay for better play button visibility */}
          {!state.hasError && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20 pointer-events-none" />
          )}
        </>
      ) : (
        /* YouTube Iframe */
        <iframe
          ref={iframeRef}
          src={getEmbedUrl()}
          title={title}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onError={handleIframeError}
          style={{ border: 0 }}
        />
      )}

      {/* Loading indicator during iframe load */}
      {state.isIframeLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-lg p-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoFacade;
