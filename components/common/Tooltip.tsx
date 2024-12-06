import React, { ReactNode } from "react";

interface TooltipProps {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  children: ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({
  text,
  position = "bottom",
  children,
}) => {
  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 transform -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 transform -translate-x-1/2",
    left: "right-full mr-2 top-1/2 transform -translate-y-1/2",
    right: "left-full ml-2 top-1/2 transform -translate-y-1/2",
  };

  return (
    <div className="relative group inline-block">
      {children}
      <div
        className={`absolute  z-50 hidden group-hover:block opacity-0 md:opacity-90 bg-black text-white text-xs px-2 py-1 rounded ${positionClasses[position]}`}
      >
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
