import React from "react";

interface SectionHeadingProps {
  sectionName: string;
}

// Utility to normalize section name
const normalizeSectionName = (input: string) => {
  return (
    input
      // Add space around &
      .replace(/\s*&\s*/g, " & ")
      // Add space between lowercase and uppercase letters (camel case fix)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      // Replace multiple spaces with single
      .replace(/\s+/g, " ")
      .trim()
  );
};

const SectionHeading: React.FC<SectionHeadingProps> = ({ sectionName }) => {
  const normalizedName = normalizeSectionName(sectionName);
  let content: React.ReactNode = normalizedName;

  // Case 1:If name is too long, break after a word boundary
  if (normalizedName.length > 25) {
    const breakIndex = normalizedName.lastIndexOf(" ", 18);
    if (breakIndex !== -1) {
      content = (
        <>
          <span className="block sm:inline">
            {normalizedName.slice(0, breakIndex) + " "}
          </span>
          <span className="block sm:inline">
            {" "}
            {normalizedName.slice(breakIndex + 1)}
          </span>
        </>
      );
    }
  }

  // Case 2: Handle & split across lines on mobile if still long
  else if (normalizedName.length > 20 && normalizedName.includes(" & ")) {
    const [before, after] = normalizedName.split(" & ").map((s) => s.trim());
    content = (
      <>
        <span className="block sm:inline">{before}</span>
        <span className="block sm:inline">& {after}</span>
      </>
    );
  }

  return (
    <div className="group flex items-center pb-2 mb-2">
      <div className="w-6 border-t-4 border-stone-600 group-hover:border-stone-400 transition-all duration-2000 ease-in-out"></div>
      <h2 className="text-xl uppercase mx-2 text-foreground group-hover:text-accent-category transition-colors duration-500 ease-in-out leading-tight">
        {content}
      </h2>
      <div className="flex-grow h-1 bg-gradient-to-r from-stone-400 to-stone-600 group-hover:from-stone-600 group-hover:to-stone-400 transition-all duration-2000 ease-in-out"></div>
    </div>
  );
};

export default SectionHeading;
