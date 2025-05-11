import { useState, useCallback } from "react";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";
import { PostCardProps } from "@/types/global";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import { Button } from "../ui/button";

interface Posts {
  edges: Array<{
    node: PostCardProps;
  }>;
}

export interface HorizontalLoadMoreProps {
  posts: Posts;
  categoryName: string;
}

const HorizontalLoadMore = ({
  posts,
  categoryName,
}: HorizontalLoadMoreProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [allPosts, setAllPosts] = useState(posts.edges);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isLoadingPrev, setIsLoadingPrev] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [animationDirection, setAnimationDirection] = useState<"next" | "prev">(
    "next"
  );

  const POSTS_PER_PAGE = 4;

  // Function to load more posts
  const loadMorePosts = async () => {
    if (isLoadingNext || !hasMore) return false;

    try {
      const nextPage = Math.floor(allPosts.length / POSTS_PER_PAGE);
      const response = await fetch(
        `/api/more-horizontal-posts?page=${nextPage}&category=${categoryName}`
      );

      if (!response.ok) throw new Error("Failed to fetch posts");

      const data = await response.json();

      if (data.posts?.length > 0) {
        setAllPosts((prev) => [...prev, ...data.posts]);
        setHasMore(data.posts.length === POSTS_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more posts:", error);
    }
  };

  // Handle Next Page Click
  const handleNext = async () => {
    if (isLoadingNext || !canGoNext) return;

    setIsLoadingNext(true);
    setAnimationDirection("next");

    const nextPage = currentPage + 1;
    const needsMorePosts = nextPage * POSTS_PER_PAGE >= allPosts.length;

    if (needsMorePosts && hasMore) {
      await loadMorePosts();
    }

    setCurrentPage(nextPage);
    setTimeout(() => setIsLoadingNext(false), 300);
  };

  // Handle Previous Page Click
  const handlePrevious = () => {
    if (!canGoPrevious || isLoadingPrev) return;

    setIsLoadingPrev(true);
    setAnimationDirection("prev");
    setCurrentPage((prev) => prev - 1);
    setTimeout(() => setIsLoadingPrev(false), 300);
  };

  // Get current posts for display
  const getCurrentPosts = useCallback(() => {
    const startIndex = currentPage * POSTS_PER_PAGE;
    return allPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [allPosts, currentPage]);

  const currentPosts = getCurrentPosts();
  const canGoNext =
    hasMore || currentPage < Math.ceil(allPosts.length / POSTS_PER_PAGE) - 1;
  const canGoPrevious = currentPage > 0;

  return (
    <section className="relative z-0 overflow-hidden px-0 md:px-2">
      <div className="flex items-center">
        {/* Desktop Previous Button */}
        <button
          className={`
            hidden md:flex absolute left-7 bg-foreground top-[48%] sm:top-[30%] z-10 
            -translate-x-full -translate-y-1/2 transform rounded-l-xl border border-gray-200 py-6
            transition-all duration-300 ease-in-out
            ${!canGoPrevious || isLoadingPrev ? "cursor-not-allowed opacity-50 border-gray-200" : "hover:border-accent-yellow"}
          `}
          disabled={!canGoPrevious || isLoadingPrev}
          onClick={handlePrevious}
          aria-label="Previous page"
        >
          <HiOutlineChevronLeft
            className={`
              h-6 w-6 
              ${!canGoPrevious || isLoadingPrev ? "text-gray-400" : "text-background group-hover:text-accent-yellow"}
            `}
          />
        </button>

        {/* Posts Grid */}
        <div
          key={currentPage}
          className={`
            w-full md:mx-2 grid grid-cols-2 gap-4 sm:mt-4 md:grid-cols-4
            horizontal-load-more-animation
            ${animationDirection === "next" ? "slide-in-right" : "slide-in-left"}
          `}
        >
          {currentPosts.map(({ node }) => (
            <TTBNewsPreview {...node} key={`ttb-${node.id || node.slug}`} />
          ))}
        </div>

        {/* Desktop Next Button */}
        <button
          className={`
            hidden md:flex absolute right-7 bg-foreground top-[48%] sm:top-[30%] z-10 
            translate-x-full -translate-y-1/2 transform rounded-r-xl border border-gray-200 py-6
            transition-all duration-300 ease-in-out
            ${!canGoNext || isLoadingNext ? "cursor-not-allowed opacity-50 border-gray-200" : "hover:border-accent-yellow"}
          `}
          disabled={!canGoNext || isLoadingNext}
          onClick={handleNext}
          aria-label="Next page"
        >
          <HiOutlineChevronRight
            className={`
              h-6 w-6 
              ${!canGoNext || isLoadingNext ? "text-gray-400" : "text-background group-hover:text-accent-yellow"}
            `}
          />
        </button>
      </div>

      {/* Mobile Buttons */}
      <div className="flex items-center gap-4 justify-between mt-4 md:hidden">
        <Button
          variant="outline"
          className="w-full transition-colors dark:border-[0.5px] duration-200 hover:bg-stone-200 hover:text-gray-900 dark:border-stone-300 dark:text-gray-200 dark:hover:bg-stone-100 dark:hover:text-gray-800"
          disabled={!canGoPrevious || isLoadingPrev}
          onClick={handlePrevious}
          aria-label="Previous page"
        >
          <span className="flex items-center justify-center">
            <FaArrowLeftLong className="mr-2" aria-hidden="true" />
            Previous
          </span>
        </Button>

        <Button
          variant="outline"
          className="w-full transition-colors dark:border-[0.5px] duration-200 hover:bg-stone-200 hover:text-gray-900 dark:border-stone-300 dark:text-gray-200 dark:hover:bg-stone-100 dark:hover:text-gray-800"
          disabled={!canGoNext || isLoadingNext}
          onClick={handleNext}
          aria-label="Next page"
        >
          <span className="flex items-center justify-center">
            Next
            <FaArrowRightLong className="ml-2" aria-hidden="true" />
          </span>
        </Button>
      </div>
    </section>
  );
};

export default HorizontalLoadMore;
