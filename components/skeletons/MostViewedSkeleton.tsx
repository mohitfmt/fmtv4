import { Skeleton } from "@/components/ui/skeleton"

export function MostViewedSkeleton() {
  return (
    <div className="flex flex-col space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-2">
          {/* Number */}
          <Skeleton className="h-12 w-12 rounded-sm" />
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              {/* Category */}
              <Skeleton className="h-4 w-16" />
              {/* Timestamp */}
              <Skeleton className="h-4 w-24" />
            </div>
            {/* Headline - Make it two lines */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[75%]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

