import { Suspense, lazy } from "react";
import SectionHeading from "./SectionHeading";
import { formattedDisplayDate } from "./display-date-formats/DateFormates";
import AdSlot from "./AdSlot";
import { AdsTargetingParams } from "@/types/global";
import { useSideBarCarouselData } from "@/hooks/useSideBarCarouselData";

// Lazy load components
const MostViewedLast2Days = lazy(
  () => import("@/components/common/most-viewed/MostViewed")
);
const CarouselSlider = lazy(() => import("./CarouselSlider"));

// Skeleton components
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

interface CategorySidebarProps {
  pageName: string;
  adsTargetingParams?: AdsTargetingParams;
}

const CategorySidebar = ({
  pageName,
  adsTargetingParams,
}: CategorySidebarProps) => {
  const { specialFeaturesPosts, galleryPosts, isLoading } =
    useSideBarCarouselData();

  const shouldShowAds = pageName === "home" || pageName === "article";
  const shouldShowSliders =
    pageName === "categoryHome" || pageName === "article";
  const isArticlePage = pageName === "article";

  return (
    <section className="space-y-6">
      {/* First Ad Slot */}
      {shouldShowAds && (
        <div className="ads-medium-desktop">
          <AdSlot
            targetingParams={adsTargetingParams}
            id="div-gpt-ad-1661333336129-0"
            name="ROS_Midrec"
            sizes={[300, 250]}
            visibleOnDevices="onlyDesktop"
          />
        </div>
      )}

      {/* Most Viewed Section - Always Show */}

      <Suspense fallback={<MostViewedSkeleton />}>
        <MostViewedLast2Days />
      </Suspense>

      {/* Special Features Section */}
      {shouldShowSliders && (
        <div className="">
          <SectionHeading sectionName="Special Features" />
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
      )}

      {/* Halfpage Ad - Only on Article */}
      {isArticlePage && (
        <div className="ads-tall-desktop">
          <AdSlot
            targetingParams={adsTargetingParams}
            id="div-gpt-ad-1661355926077-0"
            name="ROS_Halfpage"
            sizes={[300, 600]}
            visibleOnDevices="onlyDesktop"
          />
        </div>
      )}

      {/* Gallery Section */}
      {shouldShowSliders && (
        <>
          <SectionHeading sectionName="Gallery" />
          <Suspense fallback={<CarouselSkeleton />}>
            <CarouselSlider
              posts={galleryPosts || []}
              isLoading={isLoading}
              emptyMessage="No gallery images available"
              renderAdditionalContent={(post) => (
                <time dateTime={post.date}>
                  {formattedDisplayDate(post.date)}
                </time>
              )}
            />
          </Suspense>
        </>
      )}

      {/* Final Ad Slot - Only on Article */}
      {isArticlePage && (
        <div className="ads-medium-desktop">
          <AdSlot
            targetingParams={adsTargetingParams}
            id="div-gpt-ad-1661355704641-0"
            name="ROS_Midrec_b"
            sizes={[300, 250]}
            visibleOnDevices="onlyDesktop"
          />
        </div>
      )}
    </section>
  );
};

export default CategorySidebar;
