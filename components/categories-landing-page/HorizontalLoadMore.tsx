"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
import { PostCardProps } from "@/types/global";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import HorizontalLoadMoreSkeleton from "../skeletons/HorizontalLoadMoreSkeleton";

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
  const normalizedCategoryName = categoryName === "/news" ? "/top-news" : categoryName;

  const [currentPage, setCurrentPage] = useState(0);
  const [allPosts, setAllPosts] = useState(posts.edges);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [animationDirection, setAnimationDirection] = useState<"next" | "prev">("next");
 
  // console.log("allPosts", allPosts);
  // Cache for prefetched pages
  const pageCache = useRef<Record<number, Array<{ node: PostCardProps }>>>({});
  // Track what's being prefetched
  const prefetchingPages = useRef<Set<number>>(new Set());

  const POSTS_PER_PAGE = 4;

  // Optimized fetch with Cloudflare caching
  const fetchWithCache = async (pageNumber: number) => {
    // Check memory cache first
    if (pageCache.current[pageNumber]) {
      return {
        posts: pageCache.current[pageNumber],
        hasMore: pageCache.current[pageNumber].length === POSTS_PER_PAGE
      };
    }

    try {
      const response = await fetch(
        `/api/more-posts?page=${pageNumber}&category=${normalizedCategoryName}`,
        {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'public, max-age=3600',
            'CDN-Cache-Control': 'max-age=3600',
            'stale-while-revalidate': '86400'
          },
          next: {
            revalidate: 3600 // 1 hour
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      
      if (data.posts?.length > 0) {
        // Store in memory cache
        pageCache.current[pageNumber] = data.posts;
        return {
          posts: data.posts,
          hasMore: data.posts.length === POSTS_PER_PAGE
        };
      }

      return {
        posts: [],
        hasMore: false
      };
    } catch (error) {
      console.error('Error fetching posts:', error);
      return {
        posts: [],
        hasMore: false
      };
    }
  };

  console.log("fetchWithCache", fetchWithCache);

  // Prefetch function
  const prefetchNextPage = useCallback(async (pageNumber: number) => {
    if (prefetchingPages.current.has(pageNumber)) {
      return;
    }

    prefetchingPages.current.add(pageNumber);
    try {
      await fetchWithCache(pageNumber);
    } finally {
      prefetchingPages.current.delete(pageNumber);
    }
  }, []);

  console.log("prefetchingPages", prefetchNextPage);

  // Load more posts function
  const loadMorePosts = async () => {
    if (isLoading || !hasMore) return false;

    const nextPage = Math.floor(allPosts.length / POSTS_PER_PAGE);

    try {
      const { posts: newPosts, hasMore: moreAvailable } = await fetchWithCache(nextPage);
      
      if (newPosts.length > 0) {
        setAllPosts(prev => [...prev, ...newPosts]);
        setHasMore(moreAvailable);
        return true;
      }
      
      setHasMore(false);
      return false;
    } catch (error) {
      console.error('Error loading more posts:', error);
      return false;
    }
  };

  // Handle next page
  const handleNext = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const nextPage = currentPage + 1;
    const needsMorePosts = nextPage * POSTS_PER_PAGE >= allPosts.length;

    if (needsMorePosts && hasMore) {
      const loaded = await loadMorePosts();
      if (!loaded) {
        setIsLoading(false);
        return;
      }
    }

    setAnimationDirection("next");
    setCurrentPage(nextPage);

    // Add a small delay to ensure smooth transition
    setTimeout(() => {
      setIsLoading(false);
    }, 300);

    // Prefetch next page
    const nextPageToFetch = Math.floor(allPosts.length / POSTS_PER_PAGE) + 1;
    prefetchNextPage(nextPageToFetch);
  };

  // Handle previous page
  const handlePrevious = useCallback(() => {
    if (currentPage > 0) {
      setIsLoading(true);
      setAnimationDirection("prev");
      setCurrentPage(prev => prev - 1);

      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  }, [currentPage]);

  // Get current posts for display
  const getCurrentPosts = useCallback(() => {
    const startIndex = currentPage * POSTS_PER_PAGE;
    return allPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [allPosts, currentPage]);

  // Prefetch next page on mount and when approaching end
  useEffect(() => {
    const nextPage = Math.floor(allPosts.length / POSTS_PER_PAGE);
    if (hasMore && currentPage >= nextPage - 1) {
      prefetchNextPage(nextPage);
    }
  }, [currentPage, allPosts.length, hasMore, prefetchNextPage]);

  const currentPosts = getCurrentPosts();
  const canGoNext = hasMore || currentPage < Math.ceil(allPosts.length / POSTS_PER_PAGE) - 1;

  // Render loading state
  if (isLoading && currentPosts.length === 0) {
    return <HorizontalLoadMoreSkeleton />;
  }

  return (
    <section className="relative z-0 overflow-hidden">
      <div className="flex items-center">
        {/* Previous Button */}
        <button
          className={`
            group absolute left-7 bg-foreground top-[29%] z-10 -translate-x-full -translate-y-1/2 transform 
            rounded-l-xl border border-gray-200 py-6
            transition-all duration-300 ease-in-out
            ${currentPage === 0
              ? "cursor-not-allowed opacity-50 border-gray-200"
              : "hover:border-accent-yellow"
            }
          `}
          disabled={currentPage === 0 || isLoading}
          title="Previous"
          onClick={handlePrevious}
          aria-label="Previous page"
        >
          <HiOutlineChevronLeft
            className={`
              h-6 w-6 
              ${currentPage === 0
                ? "text-gray-400"
                : "text-background group-hover:text-accent-yellow"
              }
            `}
          />
        </button>

        {/* Posts Grid */}
        <div
          key={currentPage}
          className={`
            w-full mx-2 grid grid-cols-2 gap-4 sm:mt-4 md:grid-cols-4
            horizontal-load-more-animation
            ${animationDirection === "next" ? "slide-in-right" : "slide-in-left"}
          `}
        >
          {currentPosts.map(({ node }) => (
            <TTBNewsPreview {...node} key={node.id} />
          ))}
        </div>

        {/* Next Button */}
        <button
          className={`
            group absolute right-7 bg-foreground top-[29%] z-10 translate-x-full -translate-y-1/2 transform 
            rounded-r-xl border border-gray-200 py-6
            transition-all duration-300 ease-in-out
            ${!canGoNext || isLoading
              ? "cursor-not-allowed opacity-50"
              : "hover:border-accent-yellow"
            }
          `}
          disabled={!canGoNext || isLoading}
          onClick={handleNext}
          aria-label="Next page"
        >
          <HiOutlineChevronRight
            className={`
              h-6 w-6 
              ${!canGoNext
                ? "text-gray-400"
                : "text-background group-hover:text-accent-yellow"
              }
            `}
          />
        </button>
      </div>
    </section>
  );
};

export default HorizontalLoadMore;