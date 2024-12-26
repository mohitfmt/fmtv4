"use client";
import { useState } from "react";
import Link from "next/link";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi";
import { PostCardProps } from "@/types/global";
import TTBNewsPreview from "../common/news-preview-cards/TTBNewsPreview";
import LTRNewsPreview from "../common/news-preview-cards/LTRNewsPreview";
import SectionHeading from "../common/SectionHeading";
import { generatedJsonLd } from "@/constants/jsonlds/json-ld-generator";

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
        <div className="flex font-bitter items-center justify-between mt-4">
          <button
            className="group text-lg flex disabled:opacity-30 disabled:cursor-not-allowed items-center rounded border border-gray-500 px-3 py-1 hover:border-yellow-600 hover:bg-yellow-600 hover:text-white"
            disabled={currentPage === 0}
            title="Previous"
            onClick={handlePrevious}
          >
            <HiOutlineChevronLeft className="text-foreground text-xl mr-1 group-hover:text-white" />
            Previous
          </button>
          <button
            className="group text-lg flex items-center rounded border border-gray-500 px-3 py-1 hover:border-yellow-600 hover:bg-yellow-600 hover:text-white"
            disabled={currentPage === totalPages - 1}
            title="Next"
            onClick={handleNext}
          >
            Next
            <HiOutlineChevronRight className="h-6 w-6 text-xl ml-1 text-foreground group-hover:text-white" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SubCategoriesWithLoadMore;
