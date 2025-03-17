"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import LTRNewsPreview from "../common/news-preview-cards/LTRNewsPreview";
import { Button } from "../ui/button";
import SectionHeading from "../common/SectionHeading";
import { HomePost } from "@/types/global";

interface HorizontalNewsContentProps {
  posts: HomePost[];
  loading?: boolean;
  categoryRoute: string;
  categoryName: string;
  sectionTitle: string;
  className?: string;
}

const POSTS_PER_PAGE = 6;

const HorizontalNewsContent = ({
  posts: initialPosts,
  loading = false,
  categoryName,
  categoryRoute,
  sectionTitle,
  className = "",
}: HorizontalNewsContentProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [allPosts, setAllPosts] = useState<HomePost[]>([]);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [isLoadingPrev, setIsLoadingPrev] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [animationDirection, setAnimationDirection] = useState<"next" | "prev">(
    "next"
  );

  // Update posts when initialPosts changes
  useEffect(() => {
    if (initialPosts) {
      setAllPosts(initialPosts);
      setCurrentPage(0); // Reset to first page when posts change
    }
  }, [initialPosts]);

  const loadMorePosts = async () => {
    if (isLoadingNext || !hasMore) return false;

    try {
      const nextPage = Math.floor(allPosts.length / POSTS_PER_PAGE) + 1;
      const response = await fetch(
        `/api/more-home-posts?page=${nextPage}&category=${categoryName}`
      );

      if (!response.ok) throw new Error("Failed to fetch posts");

      const data = await response.json();

      if (data.posts?.edges?.length > 0) {
        const processedPosts = data.posts.edges.map((edge: any) => edge.node);
        setAllPosts((prev) => [...prev, ...processedPosts]);
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error(`Error loading more ${categoryName} posts:`, error);
    }
  };

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

  const handlePrevious = () => {
    if (!canGoPrevious || isLoadingPrev) return;

    setIsLoadingPrev(true);
    setAnimationDirection("prev");
    setCurrentPage((prev) => prev - 1);
    setTimeout(() => setIsLoadingPrev(false), 300);
  };

  const getCurrentPosts = useCallback(() => {
    const startIndex = currentPage * POSTS_PER_PAGE;
    const currentPosts = allPosts.slice(
      startIndex,
      startIndex + POSTS_PER_PAGE
    );
    return {
      topPosts: currentPosts.slice(0, 2),
      bottomPosts: currentPosts.slice(2),
    };
  }, [allPosts, currentPage]);

  const { topPosts, bottomPosts } = getCurrentPosts();
  const canGoNext =
    hasMore || currentPage < Math.ceil(allPosts.length / POSTS_PER_PAGE) - 1;
  const canGoPrevious = currentPage > 0;

  // Loading or empty state
  if (loading || !initialPosts || initialPosts.length === 0) {
    return (
      <div className={className}>
        <Link href={`/${categoryRoute}`}>
          <SectionHeading sectionName={sectionTitle} />
        </Link>
        <div className="animate-pulse">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="mt-8 grid lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} overflow-hidden`}>
      <Link href={`/${categoryRoute}`}>
        <SectionHeading sectionName={sectionTitle} />
      </Link>
      <div
        key={currentPage}
        className={`horizontal-load-more-animation ${
          animationDirection === "next" ? "slide-in-right" : "slide-in-left"
        }`}
      >
        <div className="grid grid-cols-2 gap-4">
          {topPosts.map((post) => (
            <TTBNewsPreview key={post.slug} {...post} />
          ))}
        </div>
        <div className="mt-8 grid lg:grid-cols-2 gap-4">
          {bottomPosts.map((post) => (
            <LTRNewsPreview key={post.slug} {...post} />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 justify-between mt-4">
        <Button
          variant="outline"
          className="flex-1 transition-colors duration-200 hover:bg-stone-200 hover:text-gray-900 dark:border-[0.5px] dark:border-stone-300 dark:text-gray-200 dark:hover:bg-stone-100 dark:hover:text-gray-800"
          disabled={!canGoPrevious || isLoadingPrev}
          onClick={handlePrevious}
        >
          <span className="flex items-center justify-center">
            <FaArrowLeftLong className="mr-2" />
            Previous
          </span>
        </Button>

        <Button
          variant="outline"
          className="flex-1 transition-colors duration-200 hover:bg-stone-200 hover:text-gray-900 dark:border-[0.5px] dark:border-stone-300 dark:text-gray-200 dark:hover:bg-stone-100 dark:hover:text-gray-800"
          disabled={!canGoNext || isLoadingNext}
          onClick={handleNext}
        >
          <span className="flex items-center justify-center">
            Next
            <FaArrowRightLong className="ml-2" />
          </span>
        </Button>
      </div>
    </div>
  );
};

export default HorizontalNewsContent;
