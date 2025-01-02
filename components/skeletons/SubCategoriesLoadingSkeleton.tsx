"use client";
// components/skeletons/SubCategoriesLoadingSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

const SubCategoriesLoadingSkeleton = () => {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* First Two Large Cards (TTBNewsPreview) */}
      {[...Array(2)].map((_, idx) => (
        <div
          key={`ttb-${idx}`}
          className="group relative flex flex-col overflow-hidden rounded-xl bg-white shadow-md dark:bg-gray-800"
        >
          {/* Image skeleton */}
          <Skeleton className="relative aspect-video w-full " />
          {/* Content skeleton */}
          <div className="flex flex-1 flex-col p-4 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-1/5" />
              <Skeleton className="h-3 w-1/5" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/4" />
          </div>
        </div>
      ))}

      {/* Four Smaller Cards (LTRNewsPreview) */}
      {[...Array(4)].map((_, idx) => (
        <div
          key={`ltr-${idx}`}
          className="group flex overflow-hidden rounded-xl bg-white shadow-md dark:bg-gray-800"
        >
          {/* Image skeleton */}
          <div className="relative aspect-square w-1/3 flex-shrink-0 overflow-hidden">
            <Skeleton className="h-full w-full" />
          </div>
          {/* Content skeleton */}
          <div className="flex flex-1 items-center p-4">
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
};

export default SubCategoriesLoadingSkeleton;