"use client";
import { useState } from "react";
import Link from "next/link";
import { PostCardProps } from "@/types/global";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import LTRNewsPreview from "../common/news-preview-cards/LTRNewsPreview";
import SectionHeading from "../common/SectionHeading";
import { generatedJsonLd } from "@/constants/jsonlds/json-ld-generator";
import { Button } from "../ui/button";
import { FaArrowLeftLong, FaArrowRightLong } from "react-icons/fa6";

interface SubCategoriesWithLoadMoreProps {
  slug: string;
  title: string;
  href: string;
  path?: string;
  posts: {
    edges: Array<{
      node: PostCardProps;
    }>;
  };
  bigImage: boolean;
}

const SubCategoriesWithLoadMore = ({
  title,
  href,
  posts,
  bigImage,
}: SubCategoriesWithLoadMoreProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [animationDirection, setAnimationDirection] = useState<"next" | "prev">(
    "next"
  );
  const postsPerPage = 6;

  const allPosts = posts?.edges || [];
  const totalPages = Math.ceil(allPosts.length / postsPerPage);

  // Get current page posts
  const currentPosts = allPosts.slice(
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

  const homeCategoryJsonLD = generatedJsonLd(
    allPosts,
    `https://www.freemalaysiatoday.com${href}`,
    title
  );

  if (!allPosts.length) {
    return null;
  }

  return (
    <div className="py-5 overflow-hidden">
      <Link href={href}>
        <SectionHeading sectionName={title} />
      </Link>

      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeCategoryJsonLD) }}
        type="application/ld+json"
        defer
      />

      <section
        key={currentPage}
        className={`
          grid grid-cols-1 gap-4 md:grid-cols-2
          horizontal-load-more-animation
          ${animationDirection === "next" ? "slide-in-right" : "slide-in-left"}
        `}
      >
        {currentPosts
          ?.slice(0, 2)
          ?.map(({ node }) => (
            <TTBNewsPreview {...node} key={node?.id} isBig={bigImage} />
          ))}
        {currentPosts
          ?.slice(2, 6)
          ?.map(({ node }) => <LTRNewsPreview {...node} key={node?.id} />)}
      </section>

      {totalPages > 1 && (
        <div
          className="flex items-center gap-5"
          role="navigation"
          aria-label={`${title} pagination`}
        >
          <Button
            variant="outline"
            className="w-full transition-colors dark:border-[0.5px] duration-200 hover:bg-stone-200 hover:text-gray-900 dark:border-stone-300 dark:text-gray-200 dark:hover:bg-stone-100 dark:hover:text-gray-800"
            disabled={currentPage === 0}
            title="Previous"
            onClick={handlePrevious}
            aria-label={`Previous page of ${title}`}
            aria-disabled={currentPage <= 1 || false}
          >
            <span className="flex items-center justify-center">
              <FaArrowLeftLong className="mr-2" aria-hidden="true" />
              Previous
            </span>
          </Button>
          <Button
            variant="outline"
            className="w-full transition-colors dark:border-[0.5px] duration-200 hover:bg-stone-200 hover:text-gray-900 dark:border-stone-300 dark:text-gray-200 dark:hover:bg-stone-100 dark:hover:text-gray-800"
            disabled={currentPage === totalPages - 1}
            title="Next"
            onClick={handleNext}
            aria-label={`Next page of ${title}`}
            aria-disabled={currentPage === totalPages - 1 || false}
          >
            <span className="flex items-center justify-center">
              Next
              <FaArrowRightLong className="ml-2" aria-hidden="true" />
            </span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default SubCategoriesWithLoadMore;
