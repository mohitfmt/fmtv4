import { Skeleton } from "@/components/ui/skeleton";

const HorizontalLoadMoreSkeleton = () => {
  return (
    <div className="w-full mx-2 grid grid-cols-2 gap-4 sm:mt-4 md:grid-cols-4">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="flex flex-col space-y-3">
          <Skeleton className="w-full h-32 rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
          </div>
          <Skeleton className="h-5 w-2/5" />
        </div>
      ))}
    </div>
  );
};

export default HorizontalLoadMoreSkeleton;
