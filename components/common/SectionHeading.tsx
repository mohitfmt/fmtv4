import React from "react";

interface SectionHeadingProps {
  sectionName: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ sectionName }) => {
  let content: React.ReactNode = sectionName;

  // Case 1: If sectionName is too long, break it after a word boundary
  if (sectionName.length > 25) {
    const breakIndex = sectionName.lastIndexOf(" ", 18);
    if (breakIndex !== -1) {
      content = (
        <>
          <span className="block sm:inline">
            {sectionName.slice(0, breakIndex)}
          </span>
          <span className="block sm:inline">
            {sectionName.slice(breakIndex + 1)}
          </span>
        </>
      );
    }
  }
  // Case 2: If sectionName includes '&', split it into two lines on mobile
  else if (sectionName.length > 20 && sectionName.includes("&")) {
    const [before, after] = sectionName.split("&").map((s) => s.trim());

    content = (
      <>
        {/* Show as block on mobile (line break), inline on larger screens */}
        <span className="block sm:inline">{before}</span>
        <span className="block sm:inline">& {after}</span>
      </>
    );
  }

  return (
    <div className="group flex items-center pb-2 mb-2">
      {/* Left line bar */}
      <div className="w-6 border-t-4 border-stone-600 group-hover:border-stone-400 transition-all duration-2000 ease-in-out"></div>

      {/* Section Title */}
      <h2 className="text-xl uppercase mx-2 text-foreground group-hover:text-accent-category transition-colors duration-500 ease-in-out leading-tight">
        {content}
      </h2>

      {/* Right gradient line */}
      <div className="flex-grow h-1 bg-gradient-to-r from-stone-400 to-stone-600 group-hover:from-stone-600 group-hover:to-stone-400 transition-all duration-2000 ease-in-out"></div>
    </div>
  );
};

export default SectionHeading;
