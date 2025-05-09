import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import SectionHeading from "../common/SectionHeading";
import SecondarySuperNewsPreview from "./SecondarySuperNewsPreview";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import { CommonSectionSkeleton } from "../skeletons/HomePageSkeletons";
import { HomePost } from "@/types/global";

interface HomeCommonSectionsProps {
  posts: HomePost[];
  loading?: boolean;
  categoryRoute: string;
  categoryName: string;
  sectionTitle: string;
  sectionId: string;
}

const POSTS_PER_PAGE = 4;

const HomeCommonSections = ({
  posts: initialPosts,
  loading = false,
  categoryRoute,
  categoryName,
  sectionTitle,
  sectionId,
}: HomeCommonSectionsProps) => {
  // Move all hooks to the top level
  const [currentPage, setCurrentPage] = useState(0);
  const [allPosts, setAllPosts] = useState<HomePost[]>([]);
  const [heroPost, setHeroPost] = useState<HomePost | null>(null);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isLoadingPrev, setIsLoadingPrev] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [animationDirection, setAnimationDirection] = useState<"next" | "prev">(
    "next"
  );

  // Add cache and prefetching refs
  const pageCache = useRef<Record<number, HomePost[]>>({});
  const prefetchingPages = useRef<Set<number>>(new Set());

  // Effect to handle post updates
  useEffect(() => {
    if (initialPosts?.length > 0) {
      setHeroPost(initialPosts[0]);
      setAllPosts(initialPosts.slice(1));
      setCurrentPage(0);
    }
  }, [initialPosts]);


 
 

  const getCurrentPosts = useCallback(() => {
    const startIndex = currentPage * POSTS_PER_PAGE;
    return allPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [allPosts, currentPage]);


  const currentPosts = getCurrentPosts();
  const canGoNext =
    hasMore || currentPage < Math.ceil(allPosts.length / POSTS_PER_PAGE) - 1;
  const canGoPrevious = currentPage > 0;

  if (loading || !initialPosts || initialPosts.length === 0) {
    return (
      <section id={sectionId} className="my-20 mb-32">
        <Link href={`/${categoryRoute}`}>
          <SectionHeading sectionName={sectionTitle} />
        </Link>
        <CommonSectionSkeleton />
      </section>
    );
  }

  return (
    <section id={sectionId} className="my-20">
      <Link href={`/${categoryRoute}`}>
        <SectionHeading sectionName={sectionTitle} />
      </Link>
      <div className="grid grid-cols-12 gap-4">
        <div className="grid col-span-12 lg:col-span-7 grid-cols-1 gap-4">
          {heroPost && (
            <SecondarySuperNewsPreview {...heroPost} key={heroPost.slug} />
          )}
        </div>

        <div className="grid overflow-hidden col-span-12 lg:col-span-5 relative">
          <div
            key={currentPage}
            className={`grid grid-cols-2 gap-4 horizontal-load-more-animation ${
              animationDirection === "next" ? "slide-in-right" : "slide-in-left"
            }`}
          >
            {currentPosts?.map((post) => (
              <TTBNewsPreview {...post} key={post.slug} />
            ))}
          </div>

          <div className="flex items-center gap-4 justify-between mt-4">
            {/* <Button
              variant="outline"
              className="flex-1 transition-colors dark:border-[0.5px] duration-200 hover:bg-stone-200 hover:text-gray-900 dark:border-stone-300 dark:text-gray-200 dark:hover:bg-stone-100 dark:hover:text-gray-800"
              disabled={!canGoPrevious || isLoadingPrev}
              onClick={handlePrevious}
            >
              <span className="flex items-center justify-center">
                <FaArrowLeftLong className="mr-2" />
                Previous
              </span>
            </Button> */}

            {/* <Button
              variant="outline"
              className="flex-1 transition-colors dark:border-[0.5px] duration-200 hover:bg-stone-200 hover:text-gray-900 dark:border-stone-300 dark:text-gray-200 dark:hover:bg-stone-100 dark:hover:text-gray-800"
              disabled={!canGoNext || isLoadingNext}
              onClick={handleNext}
            >
              <span className="flex items-center justify-center">
                Next
                <FaArrowRightLong className="ml-2" />
              </span>
            </Button> */}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeCommonSections;
