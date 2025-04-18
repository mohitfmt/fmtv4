import React, { useEffect, useState } from "react";

interface SectionHeadingProps {
  sectionName: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ sectionName }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check screen size on mount and resize
    const checkScreen = () => setIsMobile(window.innerWidth <= 500);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  // Line-break logic for mobile only
  let line1 = sectionName;
  let line2 = "";

  if (isMobile) {
    if (sectionName.includes("&")) {
      const [before, after] = sectionName.split("&").map((part) => part.trim());
      const wordCountBefore = before.split(" ").length;
      if (wordCountBefore <= 3) {
        line1 = before;
        line2 = `& ${after}`;
      }
    } else if (sectionName.length > 25) {
      const breakIndex = sectionName.lastIndexOf(" ", 25);
      if (breakIndex !== -1) {
        line1 = sectionName.slice(0, breakIndex);
        line2 = sectionName.slice(breakIndex + 1);
      }
    }
  }

  return (
    <div className="group flex items-center pb-2 mb-2">
      <div className="w-6 border-t-4 border-stone-600 group-hover:border-stone-400 transition-all duration-2000 ease-in-out"></div>

      <h2 className="text-xl uppercase mx-2 text-foreground group-hover:text-accent-category transition-colors duration-500 ease-in-out leading-tight">
        {isMobile && line2 ? (
          <>
            {line1}
            <br />
            {line2}
          </>
        ) : (
          sectionName
        )}
      </h2>

      <div className="flex-grow h-1 bg-gradient-to-r from-stone-400 to-stone-600 group-hover:from-stone-600 group-hover:to-stone-400 transition-all duration-2000 ease-in-out"></div>
    </div>
  );
};

export default SectionHeading;
