import { useState, useCallback } from "react";
// import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
// import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";
import { PostCardProps } from "@/types/global";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
// import { Button } from "../ui/button";

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

  // Handle Next Page Click

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
      </div>
    </section>
  );
};

export default HorizontalLoadMore;
