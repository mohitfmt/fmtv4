"use client";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import { Post } from "@/lib/gql-queries/get-filtered-category";
import CarouselSkeleton from "../skeletons/CarouselSkeleton";

interface CarouselSliderProps {
  posts: Post[];
  isLoading: boolean;
  emptyMessage?: string;
  renderAdditionalContent?: (post: Post) => React.ReactNode;
  renderDescription?: (post: Post) => React.ReactNode;
}

const CarouselSlider: React.FC<CarouselSliderProps> = ({
  posts,
  isLoading,
  emptyMessage = "No items available",
  renderAdditionalContent,
  renderDescription,
}) => {
  if (isLoading) {
    return <CarouselSkeleton imageHeight={250} />;
  }

  if (posts.length === 0) {
    return <div className="text-gray-500 text-center p-4">{emptyMessage}</div>;
  }

  return (
    <Carousel opts={{ loop: true }} plugins={[Autoplay()]} className=" px-3">
      <CarouselContent className="">
        {posts.map((node: Post) => (
          <CarouselItem
            key={node.id}
            className="relative flex flex-col items-center"
          >
            <Link
              className="absolute inset-0"
              href={node.uri}
              prefetch={false}
              title={node.title}
            />
            {node.featuredImage?.node?.sourceUrl && (
              <Image
                alt={node.title}
                className="h-auto w-full rounded-lg"
                height={250}
                loading="lazy"
                src={node.featuredImage.node.sourceUrl}
                width={400}
              />
            )}

            {renderAdditionalContent && (
              <div className="mt-2 text-sm font-semibold">
                {renderAdditionalContent(node)}
              </div>
            )}

            <h3 className="mt-1 text-center text-lg font-semibold">
              {node.title}
            </h3>

            {renderDescription && (
              <div className="mt-2 text-center text-sm font-bitter font-medium italic line-clamp-3">
                {renderDescription(node)}
              </div>
            )}
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselNext
        className="h-6 w-6 bg-foreground 
        rounded-r-xl rounded-l-none border-gray-200 py-10 
        text-background hover:text-accent-yellow hover:bg-foreground 
        hover:border-accent-yellow    
        transition-all duration-300 ease-in-out"
      />
      <CarouselPrevious
        className="h-6 w-6 bg-foreground
        rounded-l-xl rounded-r-none border-gray-200 py-10 
        text-background hover:text-accent-yellow hover:bg-foreground 
        hover:border-accent-yellow    
        transition-all duration-300 ease-in-out"
      />
    </Carousel>
  );
};

export default CarouselSlider;
