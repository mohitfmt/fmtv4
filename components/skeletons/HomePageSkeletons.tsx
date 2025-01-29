import { Skeleton } from "@/components/ui/skeleton";

// Business Section Skeleton Loader
export const BusinessSectionSkeleton = () => (
  <div className="xl:block md:grid md:grid-cols-2 sm:block md:gap-8 gap-2">
    {[1, 2, 3].map((item) => (
      <article
        key={item}
        className="mb-4 px-1 rounded border-b border-stone-200 dark:border-stone-600 hover:shadow-xl dark:hover:shadow-stone-600 dark:hover:shadow-md transition-shadow"
      >
        <div className="flex">
          <figure className="w-2/5 mr-2 mt-1 rounded-lg overflow-hidden">
            <Skeleton className="w-full h-24 rounded-lg" />
          </figure>
          <div className="flex-1">
            <div className="text-xs text-accent-category flex gap-2 items-center justify-between mb-2">
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-3/4 mb-2" />
          </div>
        </div>
        <div className="flex justify-between items-center mt-1 mb-3">
          <Skeleton className="h-3 w-full" />
        </div>
      </article>
    ))}
  </div>
);




export function CommonSectionSkeleton() {
  return (
    <>
      {/* Large Featured Article */}
      <div className="grid col-span-12 lg:col-span-7 grid-cols-1 gap-4">
        <div className="relative">
          {/* Image skeleton */}
          <Skeleton className="w-full aspect-video rounded-lg" />

          {/* Content overlay skeleton */}
          <div className="absolute bottom-0 w-full p-8 space-y-4">
            <Skeleton className="h-8 w-3/4 bg-white/20" />
            <Skeleton className="h-4 w-full bg-white/20" />
            <Skeleton className="h-4 w-2/3 bg-white/20" />
          </div>
        </div>
        {/* Author and date skeleton */}
        <div className="flex justify-between items-center px-2 -mt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Smaller Articles Grid */}
      <div className="grid col-span-12 lg:col-span-5 grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col border-b border-stone-200 dark:border-stone-600">
            {/* Image skeleton */}
            <Skeleton className="w-full aspect-video rounded-lg" />

            {/* Content skeleton */}
            <div className="my-2 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}



