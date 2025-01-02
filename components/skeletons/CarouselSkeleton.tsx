import React from "react";

interface CarouselSkeletonProps {
  imageHeight?: number;
}

const CarouselSkeleton: React.FC<CarouselSkeletonProps> = ({
  imageHeight = 250,
}) => {
  return (
    <div className="animate-pulse min-h-[50vh]">
      <div
        className="w-full rounded-lg mb-2 bg-stone-100"
        style={{
          height: `${imageHeight}px`,
        }}
      />
      <div className="space-y-2">
        <div className="h-4 bg-stone-100 rounded w-[85%] mx-auto"></div>
        <div className="h-4 bg-stone-100 rounded w-[85%] mx-auto"></div>
      </div>
    </div>
  );
};

export default CarouselSkeleton;
