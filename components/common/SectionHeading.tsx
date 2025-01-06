import React from "react";

interface SectionHeadingProps {
  sectionName: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ sectionName }) => {
  return (
    <div className="group flex items-center pb-2 mb-2">
      <div className="w-6 border-t-4 border-stone-600 group-hover:border-stone-400 transition-all duration-2000 ease-in-out"></div>

      <h2 className="text-xl uppercase mx-2 text-foreground group-hover:text-accent-blue transition-colors duration-500 ease-in-out">
        {sectionName}
      </h2>

      <div className="flex-grow h-1 bg-gradient-to-r from-stone-400 to-stone-600 group-hover:from-stone-600 group-hover:to-stone-400 transition-all duration-2000 ease-in-out"></div>
    </div>
  );
};

export default SectionHeading;
