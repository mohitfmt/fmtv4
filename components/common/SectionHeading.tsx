import React from "react";

interface SectionHeadingProps {
  sectionName: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ sectionName }) => {
  return (
    <div className="flex items-center pb-2 mb-2">
      <div className="w-6 border-t-4 border-stone-600"></div>
      <h2 className="text-xl uppercase mx-2 text-foreground">{sectionName}</h2>
      <div className="flex-grow h-1 bg-gradient-to-r from-stone-400 to-stone-600"></div>
    </div>
  );
};

export default SectionHeading;
