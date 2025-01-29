import { Skeleton } from "@/components/ui/skeleton";

export const FooterSkeleton = () => {
  return (
    <article className="mb-4 px-1 rounded border-b border-stone-200 dark:border-stone-600">
      <div className="flex">
        <div className="w-2/5 mr-2 mt-1">
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
        <div className="flex-1">
          <div className="flex gap-2 items-center justify-between mb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      </div>
      <div className="mt-2 mb-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6 mt-1" />
      </div>
    </article>
  );
};
