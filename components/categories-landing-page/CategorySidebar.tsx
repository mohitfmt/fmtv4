import { Suspense, lazy } from "react";
import SectionHeading from "../common/SectionHeading";
import { formattedDisplayDate } from "../common/display-date-formats/DateFormates";
import { useSharedData } from "@/hooks/useSharedData";

// Lazy load components
const MostViewedLast2Days = lazy(
  () => import("@/components/common/most-viewed/MostViewed")
);

const CarouselSlider = lazy(() => import("../common/CarouselSlider"));

// Skeleton components for lazy-loaded sections
const MostViewedSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-40 bg-gray-200 rounded-lg mb-4"></div>
  </div>
);

const CarouselSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-64 bg-gray-200 rounded-lg"></div>
  </div>
);

const CategorySidebar = () => {
  const { specialFeaturesPosts, galleryPosts, isLoading } = useSharedData();

  return (
    <div>
      <Suspense fallback={<MostViewedSkeleton />}>
        <MostViewedLast2Days />
      </Suspense>

      <SectionHeading sectionName="Special Features" />
      <div>
        <Suspense fallback={<CarouselSkeleton />}>
          <CarouselSlider
            posts={specialFeaturesPosts || []}
            isLoading={isLoading}
            emptyMessage="No special features available"
            renderDescription={(post) =>
              post.excerpt ? post.excerpt.replace(/<[^>]*>?/gm, "") : ""
            }
          />
        </Suspense>
      </div>

      <div className="mt-8"></div>

      <SectionHeading sectionName="Gallery" />
      <Suspense fallback={<CarouselSkeleton />}>
        <CarouselSlider
          posts={galleryPosts || []}
          isLoading={isLoading}
          emptyMessage="No gallery images available"
          renderAdditionalContent={(post) => (
            <time dateTime={post.date}>{formattedDisplayDate(post.date)}</time>
          )}
        />
      </Suspense>
    </div>
  );
};

export default CategorySidebar;
