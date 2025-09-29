// components/videos/shorts/DesktopShortsView.tsx
import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaPlay, FaEye } from "react-icons/fa";
import { BsLightningChargeFill } from "react-icons/bs";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatViewCount, formatDuration } from "@/lib/utils";

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

interface DesktopShortsViewProps {
  initialShorts: VideoWithChannel[];
  totalCount: number;
  sortBy: string;
  playlistTitle: string;
}

export default function DesktopShortsView({
  initialShorts,
  totalCount,
  sortBy: initialSortBy,
  playlistTitle,
}: DesktopShortsViewProps) {
  const [shorts, setShorts] = useState<VideoWithChannel[]>(initialShorts);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(shorts.length < totalCount);
  const [page, setPage] = useState(1);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Load more videos
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    try {
      const nextPage = page + 1;
      const response = await fetch(
        `/api/videos/shorts?page=${nextPage}&sort=${sortBy}&limit=12`
      );
      const data = await response.json();

      if (data.videos && data.videos.length > 0) {
        setShorts((prev) => [...prev, ...data.videos]);
        setPage(nextPage);
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more videos:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, sortBy, hasMore, isLoading]);

  // Handle sort change
  const handleSortChange = async (newSort: string) => {
    if (newSort === sortBy) return;

    setSortBy(newSort);
    setIsLoading(true);
    setPage(1);

    try {
      const response = await fetch(
        `/api/videos/shorts?page=1&sort=${newSort}&limit=24`
      );
      const data = await response.json();

      if (data.videos) {
        setShorts(data.videos);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Failed to change sort:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get thumbnail for vertical shorts display
  const getShortsThumbnail = (video: VideoWithChannel) => {
    if (imageErrors[video.videoId]) {
      return `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
    }
    // Try vertical thumbnail first
    return `https://i.ytimg.com/vi/${video.videoId}/oar2.jpg`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BsLightningChargeFill className="w-7 h-7 text-red-600" />
            <h1 className="text-2xl font-bold">FMT Shorts</h1>
            <span className="text-muted-foreground text-sm">
              {totalCount} videos
            </span>
          </div>

          {/* Sort Tabs */}
          <Tabs value={sortBy} onValueChange={handleSortChange}>
            <TabsList>
              <TabsTrigger value="newest">Latest</TabsTrigger>
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="trending">Oldest</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Grid Gallery - YouTube Shorts Style */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {shorts.map((video) => (
            <Link
              key={video.videoId}
              href={`/videos/${video.videoId}`}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[9/16] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                {/* Thumbnail */}
                <Image
                  src={getShortsThumbnail(video)}
                  alt={video.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={() =>
                    setImageErrors((prev) => ({
                      ...prev,
                      [video.videoId]: true,
                    }))
                  }
                  unoptimized
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
                      <FaPlay className="w-6 h-6 text-black ml-1" />
                    </div>
                  </div>
                </div>

                {/* Duration Badge */}
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  {formatDuration(video.duration)}
                </div>

                {/* Bottom Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                  <h3 className="text-white text-sm font-medium line-clamp-2 mb-1">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-2 text-white/80 text-xs">
                    <span className="flex items-center gap-1">
                      <FaEye className="w-3 h-3" />
                      {formatViewCount(video.statistics.viewCount)} views
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-12 flex justify-center">
            <Button
              onClick={loadMore}
              disabled={isLoading}
              size="lg"
              variant="outline"
              className="px-8"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}

        {!hasMore && shorts.length > 0 && (
          <div className="mt-8 text-center text-muted-foreground">
            You have reached the end
          </div>
        )}
      </div>
    </div>
  );
}
