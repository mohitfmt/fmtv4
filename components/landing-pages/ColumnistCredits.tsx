import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import SectionHeading from "../common/SectionHeading";
import FullDateDisplay from "../common/display-date-formats/FullDateDisplay";

interface ColumnistCreditsProps {
  columnists: {
    id: string;
    name: string;
    uri: string;
    avatar: {
      url: string;
    };
    description: string;
    posts: {
      nodes: {
        title: string;
        uri: string;
        dateGmt: string;
      }[];
    };
  }[];
}

const ColumnistCredits: React.FC<ColumnistCreditsProps> = ({ columnists }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!isHovering) {
      const interval = setInterval(() => {
        handleNext();
      }, 10000); // 10 seconds
      return () => clearInterval(interval);
    }
  }, [currentIndex, isHovering]);

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === columnists?.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? columnists.length - 1 : prevIndex - 1
    );
  };

  const truncateDescription = (
    description: string | undefined,
    wordLimit: number = 50
  ) => {
    if (!description) return "";
    const words = description.split(" ");
    if (words.length <= wordLimit) return description;
    return words.slice(0, wordLimit).join(" ") + "...";
  };

  return (
    <div
      className="text-foreground overflow-hidden relative flex h-full max-h-screen items-center justify-center bg-stone-100 text-stone-100 dark:bg-stone-800"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Progress Bar */}
      <div className="absolute left-0 top-0 h-1.5 w-full bg-yellow-400 ">
        <div
          className="h-full bg-green-500"
          style={{
            width: `${((currentIndex + 1) / columnists?.length) * 100}%`,
            transition: "width 0.3s linear",
          }}
        />
      </div>

      {/* Previous Button */}
      <button
        onClick={handlePrevious}
        className="absolute left-2 top-1/2 z-20 -translate-y-1/2 transform rounded-full bg-blue-600 p-3 text-white"
      >
        &#10094;
      </button>

      {/* Columnist Profile */}
      <div className="text-foreground flex h-full flex-col items-center justify-around px-5">
        <Link
          href={columnists[currentIndex]?.uri}
          prefetch={false}
          title={columnists[currentIndex]?.name}
        >
          <Image
            src={columnists[currentIndex]?.avatar.url}
            alt={`columnist-${columnists[currentIndex]?.name}`}
            height={256}
            width={256}
            className="border-accent-yellow my-10 h-60 w-60 rounded-full border-4 lg:my-4"
          />
          <div className="pointer-events-none  absolute inset-0 flex items-center justify-center">
            <h3 className="z-10 max-w-[75%] text-center  text-2xl font-semibold tracking-wider">
              {columnists[currentIndex]?.name}
            </h3>
          </div>
        </Link>
        <p className="font-bitter mt-[40px] sm:mt-[170px] text-lg font-extralight">
          {truncateDescription(columnists[currentIndex]?.description)}
        </p>

        {columnists[currentIndex].posts.nodes.length > 0 && (
          <div className="flex w-full flex-col">
            <div className="mt-4">
              <SectionHeading sectionName="Latest article" />
            </div>
            <Link
              href={columnists[currentIndex]?.posts.nodes[0]?.uri}
              className="font-bitter text-pretty text-lg font-normal text-yellow-500 dark:text-yellow-300"
            >
              {columnists[currentIndex]?.posts.nodes[0]?.title}
            </Link>
          </div>
        )}
      </div>

      {/* Next Button */}
      <button
        onClick={handleNext}
        className="absolute right-2 top-1/2 z-20 -translate-y-1/2 transform rounded-full bg-blue-600 p-3 text-white"
      >
        &#10095;
      </button>
      <div className="text-foreground absolute right-3 top-3">
        <FullDateDisplay
          dateString={columnists[currentIndex]?.posts?.nodes[0]?.dateGmt ?? ""}
        />
      </div>
    </div>
  );
};

export default ColumnistCredits;
