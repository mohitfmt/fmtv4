// components/admin/dashboard/cards/TrendingVideosCard.tsx
import React from "react";
import { LazyMotion, m, AnimatePresence } from "framer-motion";
import {
  FiTrendingUp,
  FiEye,
  FiZap,
  FiVideo,
  FiExternalLink,
} from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { TrendingVideo } from "@/lib/dashboard/queries/trending";
import Image from "next/image";

const loadFeatures = () =>
  import("@/lib/framer-features").then((res) => res.default);

interface TrendingVideosCardProps {
  videos: TrendingVideo[];
  loading?: boolean;
}

export function TrendingVideosCard({
  videos,
  loading,
}: TrendingVideosCardProps) {
  const [selectedVideo, setSelectedVideo] = React.useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Trending Now</h3>
          <FiTrendingUp className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex gap-3 p-3 bg-muted/50 rounded-lg animate-pulse"
            >
              <div className="w-24 h-14 bg-muted rounded-md" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded-md w-3/4" />
                <div className="h-3 bg-muted rounded-md w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Trending Now</h3>
          <FiTrendingUp className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <FiTrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No trending videos found</p>
          <p className="text-xs mt-1">
            Videos will appear here as they gain traction
          </p>
        </div>
      </div>
    );
  }

  return (
    <LazyMotion features={loadFeatures}>
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Trending Now</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Top {videos.length} videos
            </span>
            <FiTrendingUp className="w-5 h-5 text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {videos.map((video, index) => (
              <m.div
                key={video.videoId}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex gap-3 p-3 rounded-lg transition-all cursor-pointer",
                  selectedVideo === video.videoId
                    ? "bg-primary/10 ring-1 ring-primary/20"
                    : "bg-muted/30 hover:bg-muted/50"
                )}
                onClick={() =>
                  setSelectedVideo(
                    selectedVideo === video.videoId ? null : video.videoId
                  )
                }
              >
                {/* Rank Badge */}
                <div className="flex-shrink-0">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0
                        ? "bg-yellow-500/20 text-yellow-500"
                        : index === 1
                          ? "bg-gray-300/20 text-gray-300"
                          : index === 2
                            ? "bg-orange-500/20 text-orange-500"
                            : "bg-muted text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="relative w-24 h-14 bg-muted rounded-md overflow-hidden flex-shrink-0 group">
                  {video.thumbnail ? (
                    <>
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        width={96}
                        height={56}
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <FiExternalLink className="w-5 h-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FiVideo className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  {video.isShort && (
                    <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                      SHORT
                    </div>
                  )}
                  {/* Duration badge */}
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                    {video.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <FiEye className="w-3 h-3" />
                      {formatNumber(video.viewCount)}
                    </span>
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <FiZap className="w-3 h-3" />
                      {formatNumber(video.velocity)}/hr
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(video.publishedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {selectedVideo === video.videoId && (
                      <m.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-2 pt-2 border-t"
                      >
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Likes</p>
                            <p className="font-semibold">
                              {formatNumber(video.likeCount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Comments</p>
                            <p className="font-semibold">
                              {formatNumber(video.commentCount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Engagement</p>
                            <p className="font-semibold">{video.engagement}%</p>
                          </div>
                        </div>
                        <a
                          href={`https://youtube.com/watch?v=${video.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Watch on YouTube
                          <FiExternalLink className="w-3 h-3" />
                        </a>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              </m.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Avg Velocity</p>
            <p className="text-lg font-semibold">
              {Math.round(
                videos.reduce((sum, v) => sum + v.velocity, 0) / videos.length
              )}
              /hr
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Views</p>
            <p className="text-lg font-semibold">
              {formatNumber(videos.reduce((sum, v) => sum + v.viewCount, 0))}
            </p>
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}

// Helper functions
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDuration(duration: string): string {
  // Convert ISO 8601 duration to readable format
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
