import { Skeleton } from "@/components/ui/skeleton";

const HeadlineSkeleton = () => {
  return (
    <div className="w-full h-12 flex items-center px-4 overflow-hidden">
      {/* Breaking News Button */}
      <div className="flex items-center gap-4 ml-4 bg-accent-yellow">
        <Skeleton className="h-8 w-28" />
      </div>

      {/* Headline Text */}
      <div className="flex-1 mx-4 bg-white">
        <Skeleton className="h-5 w-52" />
      </div>

      {/* Just In Button */}
      <div className="flex items-center gap-4 bg-accent-yellow">
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Additional Headline Text */}
      <div className="flex-1 mx-4 bg-white">
        <Skeleton className="h-5 w-56" />
      </div>
    </div>
  );
};

export default HeadlineSkeleton;
