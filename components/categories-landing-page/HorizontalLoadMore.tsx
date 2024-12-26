"use client";
import { useState } from "react";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
import { PostCardProps } from "@/types/global";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";

interface Posts {
  edges: Array<{
    node: PostCardProps;
  }>;
}

export interface HorizontalLoadMoreProps {
  posts: Posts;
}

const HorizontalLoadMore = ({ posts }: HorizontalLoadMoreProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [animationDirection, setAnimationDirection] = useState<"next" | "prev">(
    "next"
  );
  const postsPerPage = 4;
  const totalPages = Math.ceil(posts.edges.length / postsPerPage);

  // Get current posts
  const currentPosts = posts.edges.slice(
    currentPage * postsPerPage,
    (currentPage + 1) * postsPerPage
  );

  const handleNext = () => {
    setAnimationDirection("next");
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const handlePrevious = () => {
    setAnimationDirection("prev");
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  return (
    <section className="relative z-0 overflow-hidden">
      <div className="flex items-center">
        {/* Previous Button */}
        <button
          className={`
            group absolute left-11 bg-background top-[29%] z-10 -translate-x-full -translate-y-1/2 transform 
            rounded-l-xl border border-gray-200 p-2 
            transition-all duration-300 ease-in-out
            ${
              currentPage === 0
                ? "cursor-not-allowed opacity-50"
                : "hover:border-accent-yellow hover:bg-accent-yellow/10"
            }
          `}
          disabled={currentPage === 0}
          title="Previous"
          onClick={handlePrevious}
        >
          <HiOutlineChevronLeft
            className={`
              h-6 w-6 
              ${
                currentPage === 0
                  ? "text-gray-400"
                  : "text-accent-yellow group-hover:bg-accent-yellow"
              }
            `}
          />
        </button>

        {/* Posts Container */}
        <div
          key={currentPage}
          className={`
            w-full mx-2 grid grid-cols-2 gap-4 sm:mt-4 md:grid-cols-4
            horizontal-load-more-animation
            ${
              animationDirection === "next" ? "slide-in-right" : "slide-in-left"
            }
          `}
        >
          {currentPosts.map(({ node }) => (
            <TTBNewsPreview {...node} key={node.id} />
          ))}
        </div>

        {/* Next Button */}
        <button
          className={`
            group absolute  right-11 bg-background top-[29%] z-10 translate-x-full -translate-y-1/2 transform 
            rounded-r-xl border border-yellow-200 p-2 
            transition-all duration-300 ease-in-out
            ${
              currentPage === totalPages - 1
                ? "cursor-not-allowed opacity-50"
                : "hover:border-accent-yellow hover:bg-accent-yellow/10"
            }
          `}
          disabled={currentPage === totalPages - 1}
          title="Next"
          onClick={handleNext}
        >
          <HiOutlineChevronRight
            className={`
              h-6 w-6 
              ${
                currentPage === totalPages - 1
                  ? "text-gray-400"
                  : "text-accent-yellow group-hover:text-accent-yellow"
              }
            `}
          />
        </button>
      </div>
    </section>
  );
};

export default HorizontalLoadMore;
