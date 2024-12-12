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
      }, 15000); // 15 seconds
      return () => clearInterval(interval);
    }
  }, [currentIndex, isHovering]);

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === columnists.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? columnists.length - 1 : prevIndex - 1
    );
  };

  return (
    <div
      className="relative max-h-screen h-full flex items-center justify-center bg-stone-800 text-stone-100 md:mx-0 mx-2"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-400">
        <div
          className="bg-green-500 h-full"
          style={{
            width: `${((currentIndex + 1) / columnists.length) * 100}%`,
            transition: "width 15s linear",
          }}
        />
      </div>

      {/* Previous Button */}
      <button
        onClick={handlePrevious}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-3 rounded-full"
      >
        &#10094;
      </button>

      {/* Columnist Profile */}
      <div className="flex flex-col items-center justify-around h-full">
        <div>
          <Image
            src={columnists[currentIndex].avatar.url}
            alt={columnists[currentIndex].name}
            height={256}
            width={256}
            className="rounded-full w-64 h-64 my-4 border-4 border-white"
          />
          <h2 className="text-2xl text-center font-semibold tracking-wider mb-4">
            {columnists[currentIndex].name}
          </h2>
        </div>

        <p className="px-5 font-bitter font-extralight text-lg">
          {columnists[currentIndex].description}
        </p>

        {columnists[currentIndex].posts.nodes.length > 0 && (
          <div className="flex flex-col items-center w-full">
            <div className="w-[90%] mt-4">
              <SectionHeading sectionName="Latest article" />
            </div>
            <Link
              href={columnists[currentIndex].posts.nodes[0].uri}
              className="px-5 font-bitter font-normal text-pretty text-lg text-yellow-300"
            >
              {columnists[currentIndex].posts.nodes[0].title}
            </Link>
          </div>
        )}
      </div>

      {/* Next Button */}
      <button
        onClick={handleNext}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-3 rounded-full"
      >
        &#10095;
      </button>
      <div className="absolute top-3 right-3">
        <FullDateDisplay
          dateString={columnists[currentIndex].posts.nodes[0].dateGmt}
        />
      </div>
    </div>
  );
};

export default ColumnistCredits;
