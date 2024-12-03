import { ReactNode } from "react";

interface PopTextProps {
  children: ReactNode;
  content: string;
  position?: "top" | "left" | "right" | "bottom";
  isHtml?: boolean;
}

const PopText = ({
  children,
  content,
  position = "top",
  isHtml = false,
}: PopTextProps) => {
  const getPositionClass = () => {
    switch (position) {
      case "left":
        return "right-full top-1/2 -translate-y-1/2 mr-2";
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-2";
      case "bottom":
        return "top-full left-1/2 -translate-x-1/2 mt-2";
      default:
        return "bottom-full left-1/2 -translate-x-1/2 mb-2";
    }
  };

  const getBeadClass = () => {
    switch (position) {
      case "left":
        return "right-0 top-1/2 -translate-y-1/2 translate-x-full border-l-gray-700 border-y-transparent border-r-transparent";
      case "right":
        return "left-0 top-1/2 -translate-y-1/2 -translate-x-full border-r-gray-700 border-y-transparent border-l-transparent";
      case "bottom":
        return "top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-gray-700 border-x-transparent border-t-transparent";
      default:
        return "bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-gray-700 border-x-transparent border-b-transparent";
    }
  };

  return (
    <div className="relative inline-block group">
      {children}
      <div
        className={`absolute ${getPositionClass()} invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-300 z-30`}
      >
        <div className="relative bg-gray-700 text-white text-sm font-light font-robotoSlab rounded-md p-2 shadow-lg whitespace-nowrap">
          {isHtml ? (
            <span
              dangerouslySetInnerHTML={{ __html: content }}
              className="inline-block"
            />
          ) : (
            content
          )}
          <div className={`absolute w-0 h-0 border-4 ${getBeadClass()}`}></div>
        </div>
      </div>
    </div>
  );
};

export default PopText;
