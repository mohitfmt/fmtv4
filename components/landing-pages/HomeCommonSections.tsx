import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";
import SectionHeading from "../common/SectionHeading";
import SecondarySuperNewsPreview from "./SecondarySuperNewsPreview";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import { CommonSectionSkeleton } from "../skeletons/HomePageSkeletons";
import { Button } from "../ui/button";
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
      // Reset cache when posts change
      pageCache.current = {};
      prefetchingPages.current.clear();
    }
  }, [initialPosts]);

  const prefetchNextPage = useCallback(
    async (pageNumber: number) => {
      // Skip if already cached or currently fetching
      if (
        pageCache.current[pageNumber] ||
        prefetchingPages.current.has(pageNumber) ||
        pageNumber < 1 // Don't prefetch page 0 or negative pages
      ) {
        return;
      }

      prefetchingPages.current.add(pageNumber);
      try {
        // console.log(
        //   `[Prefetch] Fetching page ${pageNumber} for category ${categoryName}`
        // );

        const response = await fetch(
          `/api/more-home-posts?page=${pageNumber}&category=${categoryName}`
        );

        // Log response details for debugging
        if (!response.ok) {
          console.error(`[Prefetch] Response not OK:`, {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
          });

          // Try to get error details
          try {
            const errorData = await response.json();
            console.error(`[Prefetch] Error response:`, errorData);
          } catch (e) {
            // Response might not be JSON
            const errorText = await response.text();
            console.error(`[Prefetch] Error text:`, errorText);
          }

          // Don't throw here - just log and return
          return;
        }

        const data = await response.json();
        // console.log(`[Prefetch] Success for page ${pageNumber}:`, {
        //   postsCount: data.posts?.edges?.length || 0,
        //   hasMore: data.hasMore,
        // });

        if (data.posts?.edges?.length > 0) {
          const processedPosts = data.posts.edges.map((edge: any) => edge.node);
          pageCache.current[pageNumber] = processedPosts;
        }
      } catch (error) {
        console.error(`[Prefetch] Error for page ${pageNumber}:`, error);
        // Don't throw - prefetch failures shouldn't break the UI
      } finally {
        prefetchingPages.current.delete(pageNumber);
      }
    },
    [categoryName]
  );

  const loadMorePosts = async () => {
    if (isLoadingNext || !hasMore) return false;

    try {
      // Calculate the next page number
      // Page 1 = first batch after initial posts
      const nextPage = Math.floor(allPosts.length / POSTS_PER_PAGE);

      // console.log(
      //   `[LoadMore] Loading page ${nextPage} for category ${categoryName}`
      // );

      // Check cache first
      if (pageCache.current[nextPage]) {
        // console.log(`[LoadMore] Using cached data for page ${nextPage}`);
        setAllPosts((prev) => [...prev, ...pageCache.current[nextPage]]);
        setHasMore(pageCache.current[nextPage].length === POSTS_PER_PAGE);
        return true;
      }

      const response = await fetch(
        `/api/more-home-posts?page=${nextPage}&category=${categoryName}`
      );

      if (!response.ok) {
        console.error(`[LoadMore] Response not OK:`, {
          status: response.status,
          statusText: response.statusText,
        });

        // Try to get error details
        try {
          const errorData = await response.json();
          console.error(`[LoadMore] Error response:`, errorData);
          throw new Error(errorData.message || "Failed to fetch posts");
        } catch (e) {
          if (e instanceof Error && e.message !== "Failed to fetch posts") {
            // JSON parse failed
            const errorText = await response.text();
            console.error(`[LoadMore] Error text:`, errorText);
          }
          throw new Error(
            `Failed to fetch posts: ${response.status} ${response.statusText}`
          );
        }
      }

      const data = await response.json();
      // console.log(`[LoadMore] Success:`, {
      //   postsCount: data.posts?.edges?.length || 0,
      //   hasMore: data.hasMore,
      // });

      if (data.posts?.edges?.length > 0) {
        const processedPosts = data.posts.edges.map((edge: any) => edge.node);
        setAllPosts((prev) => [...prev, ...processedPosts]);
        setHasMore(data.hasMore);
        return true;
      }

      setHasMore(false);
      return false;
    } catch (error) {
      console.error(
        `[LoadMore] Error loading more ${categoryName} posts:`,
        error
      );
      // Show user-friendly error
      if (error instanceof Error) {
        // You might want to show a toast or error message here
        console.error(`User-facing error: ${error.message}`);
      }
      return false;
    }
  };

  const handleNext = async () => {
    if (isLoadingNext || !canGoNext) return;

    setIsLoadingNext(true);
    setAnimationDirection("next");

    const nextPage = currentPage + 1;
    const needsMorePosts = nextPage * POSTS_PER_PAGE >= allPosts.length;

    if (needsMorePosts && hasMore) {
      const success = await loadMorePosts();
      if (!success) {
        // If loading failed, don't advance the page
        setIsLoadingNext(false);
        return;
      }
    }

    setCurrentPage(nextPage);
    setTimeout(() => setIsLoadingNext(false), 300);

    // Prefetch the next page after current load
    const pageToFetch =
      Math.floor((allPosts.length + POSTS_PER_PAGE) / POSTS_PER_PAGE) + 1;
    if (hasMore) {
      prefetchNextPage(pageToFetch);
    }
  };

  const handlePrevious = () => {
    if (!canGoPrevious || isLoadingPrev) return;

    setIsLoadingPrev(true);
    setAnimationDirection("prev");
    setCurrentPage((prev) => prev - 1);
    setTimeout(() => setIsLoadingPrev(false), 300);
  };

  const getCurrentPosts = useCallback(() => {
    const startIndex = currentPage * POSTS_PER_PAGE;
    return allPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [allPosts, currentPage]);

  // Prefetch logic with better page calculation
  useEffect(() => {
    // Only prefetch if we're close to the end
    const totalLoadedPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
    const isNearEnd = currentPage >= totalLoadedPages - 2;

    if (hasMore && isNearEnd) {
      const nextPageToFetch = Math.floor(allPosts.length / POSTS_PER_PAGE) + 1;
      // console.log(
      //   `[Effect] Prefetching page ${nextPageToFetch} (current: ${currentPage}, total loaded: ${totalLoadedPages})`
      // );
      prefetchNextPage(nextPageToFetch);
    }
  }, [currentPage, allPosts.length, hasMore, prefetchNextPage]);

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
            <Button
              variant="outline"
              className="flex-1 transition-colors dark:border-[0.5px] duration-200 hover:bg-stone-200 hover:text-gray-900 dark:border-stone-300 dark:text-gray-200 dark:hover:bg-stone-100 dark:hover:text-gray-800"
              disabled={!canGoPrevious || isLoadingPrev}
              onClick={handlePrevious}
              rel="prev"
            >
              <span className="flex items-center justify-center">
                <FaArrowLeftLong className="mr-2" />
                Previous
              </span>
            </Button>

            <Button
              variant="outline"
              className="flex-1 transition-colors dark:border-[0.5px] duration-200 hover:bg-stone-200 hover:text-gray-900 dark:border-stone-300 dark:text-gray-200 dark:hover:bg-stone-100 dark:hover:text-gray-800"
              disabled={!canGoNext || isLoadingNext}
              onClick={handleNext}
              rel="next"
            >
              <span className="flex items-center justify-center">
                Next
                <FaArrowRightLong className="ml-2" />
              </span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeCommonSections;
