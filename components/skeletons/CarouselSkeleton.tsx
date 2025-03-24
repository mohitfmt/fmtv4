import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";

interface CarouselSkeletonProps {
  imageHeight?: number;
  numberOfItems?: number;
}

const CarouselSkeleton: React.FC<CarouselSkeletonProps> = ({
  imageHeight = 250,
  numberOfItems = 5,
}) => {
  return (
    <Carousel className="w-full">
      <CarouselContent>
        {Array.from({ length: numberOfItems }).map((_, index) => (
          <CarouselItem
            key={`skeleton-${index}`}
            className="relative flex flex-col items-center"
          >
            {/* Image skeleton */}
            <div
              className="w-full rounded-lg bg-gray-200 animate-pulse"
              style={{ height: `${imageHeight}px` }}
            />

            {/* Additional content skeleton */}
            <div className="mt-2 w-20 h-4 bg-gray-200 rounded animate-pulse" />

            {/* Title skeleton */}
            <div className="mt-1 w-48 h-6 bg-gray-200 rounded animate-pulse" />

            {/* Description skeleton */}
            <div className="mt-2 space-y-1 flex justify-center items-center flex-col">
              <div className="w-64 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-56 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-48 h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {/* Navigation buttons skeleton */}
      <CarouselNext className="h-6 w-6 bg-gray-200 rounded-r-xl rounded-l-none py-10 animate-pulse" />
      <CarouselPrevious className="h-6 w-6 bg-gray-200 rounded-l-xl rounded-r-none py-10 animate-pulse" />
    </Carousel>
  );
};

export default CarouselSkeleton;
