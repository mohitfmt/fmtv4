import React, { useEffect, useState } from "react";
import { VscChromeClose } from "react-icons/vsc";

type JumpSliderProps = {
  title?: string;
  children?: React.ReactNode;
};

const JumpSlider: React.FC<JumpSliderProps> = ({ title, children }) => {
  const [showJumpSlider, setShowJumpSlider] = useState(false);
  const [closeStories, setCloseStories] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercentage =
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) *
        100;

      // Use an if statement instead of a conditional expression
      if (!closeStories) {
        setShowJumpSlider(scrollPercentage > 40);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [closeStories]);

  const handleCloseStories = () => {
    setCloseStories(true);
    setShowJumpSlider(false);
  };

  return (
    <div className="fixed bottom-20 right-0 z-50 hidden md:block">
      {showJumpSlider && (
        <div className="mt-2.5 w-[450px] rounded-lg border border-gray-300 bg-muted p-3.5 shadow-md">
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg bg-background px-3 py-2 hover:bg-yellow-600/90 hover:text-yellow-100"
              onClick={handleCloseStories}
            >
              <VscChromeClose className="h-4 w-4" />
            </button>
            <h4 className="flex-1 text-center text-xl font-extrabold text-foreground">
              {title}
            </h4>
          </div>
          <div>{children}</div>
        </div>
      )}
    </div>
  );
};

export default JumpSlider;
