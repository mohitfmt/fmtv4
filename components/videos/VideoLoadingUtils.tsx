// components/videos/VideoLoadingUtils.tsx
// Phase 1: Enhanced loading states and skeleton components
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Enhanced Video Card Skeleton with proper aspect ratios
export const VideoCardSkeleton = ({
  aspectRatio = "video",
}: {
  aspectRatio?: "video" | "short";
}) => {
  const aspectClass =
    aspectRatio === "video" ? "aspect-video" : "aspect-[9/16]";

  return (
    <div className="rounded-lg bg-background overflow-hidden">
      {/* Thumbnail skeleton with proper aspect ratio */}
      <Skeleton className={`w-full ${aspectClass} rounded-t-lg`} />

      <div className="p-4 space-y-3">
        {/* Title skeleton */}
        <Skeleton className="h-5 w-3/4" />

        {/* Excerpt skeleton - two lines */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Stats skeleton */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
};

// Hero Video Skeleton for main video display
export const HeroVideoSkeleton = () => {
  return (
    <div className="rounded-lg bg-background overflow-hidden">
      {/* Hero video skeleton */}
      <Skeleton className="aspect-video w-full rounded-t-lg" />

      <div className="p-6 space-y-4">
        {/* Title skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>

        {/* Meta info skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>

        {/* Description skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
};

// Grid loading skeleton for playlist/category pages
export const VideoGridSkeleton = ({
  count = 12,
  aspectRatio = "video",
}: {
  count?: number;
  aspectRatio?: "video" | "short";
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <VideoCardSkeleton key={index} aspectRatio={aspectRatio} />
      ))}
    </div>
  );
};

// Shorts Rail Skeleton
export const ShortsRailSkeleton = () => {
  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex-shrink-0 w-[180px]">
            <VideoCardSkeleton aspectRatio="short" />
          </div>
        ))}
      </div>
    </section>
  );
};

// Playlist Page Header Skeleton
export const PlaylistHeaderSkeleton = () => {
  return (
    <div className="mb-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Playlist thumbnail */}
        <div className="lg:w-1/3">
          <Skeleton className="aspect-video w-full rounded-lg" />
        </div>

        {/* Playlist info */}
        <div className="lg:w-2/3 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Error boundary fallback component for videos
export const VideoErrorFallback = ({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}) => {
  return (
    <div className="aspect-video w-full bg-muted rounded-lg flex flex-col items-center justify-center p-8 text-center">
      <div className="text-muted-foreground mb-4">
        <svg
          className="w-16 h-16 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-lg font-semibold mb-2">Unable to load video</h3>
        <p className="text-sm max-w-md">
          There was an error loading this video. Please try again.
        </p>
      </div>
      <button
        onClick={resetError}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
};

// Performance monitoring hook for video loading
export const useVideoPerformanceTracking = () => {
  const trackVideoLoad = (videoId: string, loadTime: number) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "video_load_time", {
        event_category: "Performance",
        event_label: videoId,
        value: Math.round(loadTime),
      });
    }
  };

  const trackFacadeInteraction = (videoId: string) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "video_facade_click", {
        event_category: "Engagement",
        event_label: videoId,
      });
    }
  };

  return {
    trackVideoLoad,
    trackFacadeInteraction,
  };
};
