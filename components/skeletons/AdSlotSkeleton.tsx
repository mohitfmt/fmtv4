// components/skeletons/AdSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

interface AdSkeletonProps {
  sizes: googletag.GeneralSize;
  visibleOnDevices?: "onlyMobile" | "onlyDesktop" | "both";
}

const AdSkeleton: React.FC<AdSkeletonProps> = ({ sizes, visibleOnDevices = "both" }) => {
  const getDimensions = () => {
    if (Array.isArray(sizes)) {
      if (Array.isArray(sizes[0])) {
        // Handle [[300, 250]] format
        return { width: sizes[0][0], height: sizes[0][1] };
      } else {
        // Handle [320, 50] format
        return { width: sizes[0], height: sizes[1] };
      }
    }
    return { width: 300, height: 250 }; // Default size
  };

  const { width, height } = getDimensions();

  const visibilityClass = 
    visibleOnDevices === "onlyMobile" ? "flex md:hidden" :
    visibleOnDevices === "onlyDesktop" ? "hidden md:flex" :
    "flex";

  return (
    <div className={`${visibilityClass} flex-col items-center justify-center`}>
      <span className="text-xs text-muted-foreground mb-1">Advertisement</span>
      <Skeleton 
        className="flex items-center justify-center"
        style={{
          width: `${width}px`,
          height: `${height}px`
        }}
      />
    </div>
  );
};

export default AdSkeleton;