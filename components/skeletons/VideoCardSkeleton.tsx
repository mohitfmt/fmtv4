// components/videos/VideoSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

const VideoSkeleton = () => {
  return (
    <div className="rounded-lg bg-background">
      {/* Thumbnail skeleton */}
      <Skeleton className="aspect-video w-full rounded-t-lg" />

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

export default VideoSkeleton;
