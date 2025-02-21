import { Skeleton } from "@/components/ui/skeleton";

const HeadlineSkeleton = () => {
  return (
    <div
      className="w-full h-8 flex items-center px-4 overflow-hidden"
      style={{
        willChange: "transform",
        animation: `marquee 60s linear infinite`,
      }}
    >
      {/* Breaking News Button */}
      <div className="flex items-center gap-2 ml-2 bg-accent-yellow rounded-lg">
        <Skeleton className="h-5 w-28" />
      </div>

      {/* Headline Text */}
      <div className="flex-1 mx-2 bg-white rounded-lg ml-2">
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Just In Button */}
      <div className="flex items-center gap-2 bg-accent-yellow rounded-lg">
        <Skeleton className="h-5 w-24" />
      </div>

      {/* Additional Headline Text */}
      <div className="flex-1 mx-2 bg-white rounded-lg">
        <Skeleton className="h-4 w-56" />
      </div>
    </div>
  );
};

export default HeadlineSkeleton;
