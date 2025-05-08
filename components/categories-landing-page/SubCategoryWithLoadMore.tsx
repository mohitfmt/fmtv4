import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { PostCardProps } from "@/types/global";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import LTRNewsPreview from "../common/news-preview-cards/LTRNewsPreview";
import SectionHeading from "../common/SectionHeading";
import { generatedJsonLd } from "@/constants/jsonlds/json-ld-generator";
import { Button } from "../ui/button";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";
import SubCategoriesLoadingSkeleton from "../skeletons/SubCategoriesLoadingSkeleton";

interface Posts {
  edges: Array<{
    node: PostCardProps;
  }>;
}

export interface SubCategoriesWithLoadMoreProps {
  slug: string;
  title: string;
  href: string;
  path?: string;
  posts: Posts;
  bigImage: boolean;
}

const SubCategoriesWithLoadMore = ({
  title,
  href,
  posts,
  bigImage,
  slug,
}: SubCategoriesWithLoadMoreProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [allPosts, setAllPosts] = useState(posts.edges);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [animationDirection, setAnimationDirection] = useState<"next" | "prev">(
    "next"
  );

  const getParentCategory = useCallback(() => {
    if (typeof window === "undefined") return "";
    return window.location.pathname.split("/")[1];
  }, []);

  const pageCache = useRef<Record<number, Array<{ node: PostCardProps }>>>({});
  const prefetchingPages = useRef<Set<number>>(new Set());

  const postsPerPage = 6;

  // Prefetch function
  const prefetchNextPage = useCallback(
    async (pageNumber: number) => {
      const parentCategory = getParentCategory();

      if (
        pageCache.current[pageNumber] ||
        prefetchingPages.current.has(pageNumber)
      ) {
        return;
      }

      prefetchingPages.current.add(pageNumber);
      try {
        const response = await fetch(
          `/api/more-subcategory-posts?page=${pageNumber}&slug=${slug}&parentCategory=${parentCategory}`
        );
        const data = await response.json();

        if (data.posts?.length > 0) {
          pageCache.current[pageNumber] = data.posts;
        }
      } catch (error) {
        console.error("Error prefetching:", error);
      } finally {
        prefetchingPages.current.delete(pageNumber);
      }
    },
    [slug]
  );

  // Load more posts function
  const loadMorePosts = async () => {
    if (isLoading || !hasMore) return false;
    const parentCategory = getParentCategory();
    const nextPage = Math.floor(allPosts.length / postsPerPage);

    try {
      if (pageCache.current[nextPage]) {
        setAllPosts((prev) => [...prev, ...pageCache.current[nextPage]]);
        setHasMore(pageCache.current[nextPage].length === postsPerPage);
        return true;
      }

      const response = await fetch(
        `/api/more-subcategory-posts?page=${nextPage}&slug=${slug}&parentCategory=${parentCategory}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch posts");
      }

      const data = await response.json();

      if (data.posts?.length > 0) {
        setAllPosts((prev) => [...prev, ...data.posts]);
        setHasMore(data.posts.length === postsPerPage);
        return true;
      }

      setHasMore(false);
      return false;
    } catch (error) {
      console.error("Error loading more posts:", error);
      return false;
    }
  };

  // Handle next page
  const handleNext = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const nextPage = currentPage + 1;
    const needsMorePosts = nextPage * postsPerPage >= allPosts.length;

    if (needsMorePosts && hasMore) {
      const loaded = await loadMorePosts();
      if (!loaded) {
        setIsLoading(false);
        return;
      }
    }

    setAnimationDirection("next");
    setCurrentPage(nextPage);

    setTimeout(() => {
      setIsLoading(false);
    }, 300);

    const nextPageToFetch = Math.floor(allPosts.length / postsPerPage) + 1;
    prefetchNextPage(nextPageToFetch);
  };

  // Handle previous page
  const handlePrevious = useCallback(() => {
    if (currentPage > 0 && !isLoading) {
      setIsLoading(true);
      setAnimationDirection("prev");
      setCurrentPage((prev) => prev - 1);

      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  }, [currentPage, isLoading]);

  // Get current posts for display
  const getCurrentPosts = useCallback(() => {
    const startIndex = currentPage * postsPerPage;
    return allPosts.slice(startIndex, startIndex + postsPerPage);
  }, [allPosts, currentPage]);

  // Prefetch next page on mount and when approaching end
  useEffect(() => {
    const nextPage = Math.floor(allPosts.length / postsPerPage);
    if (hasMore && currentPage >= nextPage - 1) {
      prefetchNextPage(nextPage);
    }
  }, [currentPage, allPosts.length, hasMore, prefetchNextPage]);

  const currentPosts = getCurrentPosts();
  const canGoNext =
    hasMore || currentPage < Math.ceil(allPosts.length / postsPerPage) - 1;
  const canGoPrevious = currentPage > 0;

  const homeCategoryJsonLD = generatedJsonLd(
    allPosts,
    `https://www.freemalaysiatoday.com${href}`,
    title
  );

  // Render loading state
  if (isLoading && currentPosts.length === 0) {
    return <SubCategoriesLoadingSkeleton />;
  }

  if (!allPosts.length) return null;

  return (
    <div className="py-5 overflow-hidden min-h-[400px] my-1">
      <Link href={href}>
        <SectionHeading sectionName={title} />
      </Link>

      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeCategoryJsonLD) }}
        type="application/ld+json"
        async
        defer
      />

      <section
        key={currentPage}
        className={`
           gap-4 
          horizontal-load-more-animation
          ${animationDirection === "next" ? "slide-in-right" : "slide-in-left"}
        `}
      >
        <div className="grid grid-cols-2 gap-4 mb-2">
          {currentPosts.slice(0, 2).map(({ node }) => (
            <TTBNewsPreview
              {...node}
              key={`ttb-${node.id || node.slug}`}
              isBig={bigImage}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentPosts.slice(2, 6).map(({ node }) => (
            <LTRNewsPreview {...node} key={`ltr-${node.id || node.slug}`} />
          ))}
        </div>
      </section>

      <div
        className="flex items-center gap-5 mt-4"
        role="navigation"
        aria-label={`${title} pagination`}
      >
        <Button
          variant="outline"
          className="w-full transition-colors dark:border-[0.5px] duration-200 hover:bg-stone-200 hover:text-gray-900 dark:border-stone-300 dark:text-gray-200 dark:hover:bg-stone-100 dark:hover:text-gray-800"
          disabled={!canGoPrevious || isLoading}
          onClick={handlePrevious}
          aria-label={`Previous page of ${title}`}
          aria-disabled={!canGoPrevious || isLoading}
        >
          <span className="flex items-center justify-center">
            <FaArrowLeftLong className="mr-2" aria-hidden="true" />
            Previous
          </span>
        </Button>
        <Button
          variant="outline"
          className="w-full transition-colors  dark:border-[0.5px] duration-200 hover:bg-stone-200 hover:text-gray-900 dark:border-stone-300 dark:text-gray-200 dark:hover:bg-stone-100 dark:hover:text-gray-800"
          disabled={!canGoNext || isLoading}
          onClick={handleNext}
          aria-label={`Next page of ${title}`}
          aria-disabled={!canGoNext || isLoading}
        >
          <span className="flex items-center justify-center">
            Next
            <FaArrowRightLong className="ml-2" aria-hidden="true" />
          </span>
        </Button>
      </div>
    </div>
  );
};

export default SubCategoriesWithLoadMore;
