// components/videos/shorts/DesktopShortsView.tsx

import { useState, useCallback } from "react";
import Link from "next/link";
import { FaEye } from "react-icons/fa";
import { BsLightningChargeFill } from "react-icons/bs";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatViewCount, getTimeAgo } from "@/lib/utils";
import VideoFacade from "@/components/videos/VideoFacade";

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

// Shorts-specific thumbnail helper (frame0 for vertical format)
const getShortsThumbnail = (videoId: string): string => {
  // Priority: frame0.jpg for vertical shorts format
  return `https://i.ytimg.com/vi/${videoId}/frame0.jpg`;
};

// Video Card Component with VideoFacade
const ShortsCard = ({ video }: { video: VideoWithChannel }) => {
  return (
    <Link
      href={`/videos/${video.videoId}`}
      className="group block bg-card rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      {/* VideoFacade with 9:16 aspect ratio */}
      <VideoFacade
        videoId={video.videoId}
        title={video.title}
        thumbnail={getShortsThumbnail(video.videoId)}
        aspectRatio="short" // 9:16 aspect ratio
        size="small" // Small play button for cards
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 20vw, 16vw"
        className="w-full"
      />

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>

        {/* Description - NEW */}
        {video.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {video.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FaEye className="w-3 h-3" />
            {formatViewCount(parseInt(video.statistics.viewCount))}
          </span>
          <span>•</span>
          <span>{getTimeAgo(video.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
};

// Loading Skeleton for Shorts
const ShortsSkeleton = () => (
  <div className="bg-card rounded-lg overflow-hidden animate-pulse">
    <div className="aspect-[9/16] bg-muted" />
    <div className="p-3 space-y-2">
      <div className="h-4 bg-muted rounded w-full" />
      <div className="h-3 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/2" />
    </div>
  </div>
);

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

  // Load more videos (preserved functionality)
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

  // Handle sort change (preserved functionality)
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-[1600px]">
      {/* Enhanced Header - Cleaner design */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center gap-3">
            <BsLightningChargeFill className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold">Shorts</h1>
              <p className="text-muted-foreground">
                Quick videos under 60 seconds
              </p>
            </div>
          </div>

          {/* Actions Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Sort Tabs */}
            <Tabs value={sortBy} onValueChange={handleSortChange}>
              <TabsList>
                <TabsTrigger value="newest">Latest</TabsTrigger>
                <TabsTrigger value="popular">Popular</TabsTrigger>
                <TabsTrigger value="trending">Oldest</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Shorts Grid - 6 columns on XL, responsive down */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {shorts.map((video) => (
          <ShortsCard key={video.videoId} video={video} />
        ))}

        {/* Loading Skeletons */}
        {isLoading &&
          Array.from({ length: 12 }).map((_, i) => (
            <ShortsSkeleton key={`skeleton-${i}`} />
          ))}
      </div>

      {/* Load More Button */}
      {hasMore && !isLoading && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={loadMore}
            size="lg"
            variant="outline"
            className="min-w-[200px]"
          >
            Load More Shorts
          </Button>
        </div>
      )}

      {/* Loading State for initial load */}
      {isLoading && shorts.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <ShortsSkeleton key={`init-skeleton-${i}`} />
          ))}
        </div>
      )}

      {/* End of Results */}
      {!hasMore && shorts.length > 0 && (
        <div className="text-center mt-8 text-muted-foreground">
          <p>End of shorts • {totalCount} videos total</p>
        </div>
      )}

      {/* No Results */}
      {shorts.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <BsLightningChargeFill className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            No shorts available
          </p>
          <Link href="/videos" className="mt-4 inline-block">
            <Button>Browse All Videos</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
