import { useState,useCallback,} from "react";
import Link from "next/link";
import { PostCardProps } from "@/types/global";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import LTRNewsPreview from "../common/news-preview-cards/LTRNewsPreview";
import SectionHeading from "../common/SectionHeading";
import { generatedJsonLd } from "@/constants/jsonlds/json-ld-generator";

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




  const postsPerPage = 6;

  // Get current posts for display
  const getCurrentPosts = useCallback(() => {
    const startIndex = currentPage * postsPerPage;
    return allPosts.slice(startIndex, startIndex + postsPerPage);
  }, [allPosts, currentPage]);

  // Prefetch next page on mount and when approaching end

  const currentPosts = getCurrentPosts();


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
        {/* <Button
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
        </Button> */}
      </div>
    </div>
  );
};

export default SubCategoriesWithLoadMore;
