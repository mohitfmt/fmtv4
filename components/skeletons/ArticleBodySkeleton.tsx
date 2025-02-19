// components/skeletons/NewsletterFormSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

export const NewsletterSkeleton = () => {
  return (
    <div className="flex flex-col justify-center gap-2 lg:flex-row lg:gap-8 my-16">
      <Skeleton className="h-20 md:h-24 w-40" /> {/* Logo */}
      <div>
        <Skeleton className="h-6 w-[500px] mb-4" /> {/* Heading */}
        <div className="flex gap-4 py-4">
          <Skeleton className="h-10 w-[250px]" /> {/* Input */}
          <Skeleton className="h-10 w-24" /> {/* Button */}
        </div>
      </div>
    </div>
  )
}

// components/skeletons/MoreStoriesSkeleton.tsx
export const MoreStoriesSkeleton = () => {
  return (
    <section className="space-y-4 py-2">
      {[1, 2, 3, 4].map((index) => (
        <div key={index} className="relative grid grid-cols-12 gap-4">
          <div className="col-span-4">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          </div>
          <div className="col-span-8">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-20" /> {/* Category */}
              <Skeleton className="h-4 w-32" /> {/* Date */}
            </div>
            <Skeleton className="h-5 w-full" /> {/* Title */}
            <Skeleton className="h-5 w-3/4 mt-2" /> {/* Additional line */}
          </div>
        </div>
      ))}
    </section>
  )
}

// components/skeletons/FollowPlatformsSkeleton.tsx
export const FollowPlatformsSkeleton = () => {
  return (
    <section className="flex w-full items-center justify-center my-8">
      <div className="my-2 flex flex-col items-center justify-center rounded-lg bg-blue-100/50 px-4 py-2.5">
        <Skeleton className="h-5 w-[400px] mb-4" /> {/* Text */}
        <div className="mt-4 flex w-full items-center justify-center gap-8 px-4 md:gap-12">
          {[1, 2, 3].map((index) => (
            <Skeleton 
              key={index} 
              className="h-14 w-14 md:w-32 md:h-10 rounded-lg" 
            />
          ))}
        </div>
      </div>
    </section>
  )
}

// components/skeletons/RelatedNewsSkeleton.tsx
export const RelatedNewsSkeleton = () => {
  return (
    <section className="mt-8">
      <Skeleton className="h-8 w-48 mb-4" /> {/* Heading */}
      <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3,4,5,6].map((index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <div className="p-2">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-4 w-20" /> {/* Category */}
                <Skeleton className="h-4 w-24" /> {/* Date */}
              </div>
              <Skeleton className="h-5 w-full mb-1" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// components/skeletons/OutbrainWidgetSkeleton.tsx
export const OutbrainWidgetSkeleton = () => {
  return (
    <div className="grid grid-cols-2  md:grid-cols-3 lg:grid-cols-4 gap-4 my-8">
      {[1, 2, 3, 4].map((index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}

export const TagsSkeleton = () => {
    return (
      <div className="flex flex-wrap gap-2 my-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
    )
  }