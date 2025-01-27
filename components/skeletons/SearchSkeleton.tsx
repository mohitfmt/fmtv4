import { Skeleton } from "@/components/ui/skeleton"

const SearchCardSkeleton = () => {
  return (
    <article className="rounded-lg border dark:border-stone-600">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Image skeleton */}
        <div className="md:w-2/5 rounded-lg overflow-hidden">
          <Skeleton className="aspect-video w-full" />
        </div>
        
        {/* Content skeleton */}
        <div className="md:w-3/5 p-2">
          <div className="flex flex-col justify-around h-full">
            {/* Header skeleton */}
            <header className="flex items-center justify-between mb-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </header>
            
            {/* Title skeleton */}
            <div className="mb-4 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
            
            {/* Excerpt skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default SearchCardSkeleton;