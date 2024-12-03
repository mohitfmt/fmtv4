import { Skeleton } from "@/components/ui/skeleton";

export function LTRNewsPreviewSkeleton() {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="h-40 w-full rounded-md" /> {/* Image placeholder */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" /> {/* Category placeholder */}
        <Skeleton className="h-6 w-full" /> {/* Title placeholder */}
        <Skeleton className="h-4 w-5/6" /> {/* Description placeholder */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-20" /> {/* Date placeholder */}
          <Skeleton className="h-4 w-16" /> {/* Time placeholder */}
        </div>
      </div>
    </div>
  );
}
