import { useEffect, useState, useCallback } from "react";

import Script from "next/script";

interface SubscribeButtonProps {
  channelId: string;
}

const SubscribeButton = ({ channelId }: SubscribeButtonProps) => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isButtonRendered, setIsButtonRendered] = useState(false);

  const renderYouTubeButton = useCallback(() => {
    // Ensure we're in browser environment
    if (typeof window === "undefined") return;

    // Check if gapi is available
    if ((window as any).gapi && (window as any).gapi.ytsubscribe) {
      const container = document.getElementById(
        `subscribe-container-${channelId}`
      );

      // Clear any existing buttons first
      if (container) {
        container.innerHTML = "";

        try {
          (window as any).gapi.ytsubscribe.render(container, {
            channelId: channelId,
            layout: "default",
            count: "default",
          });
          setIsButtonRendered(true);

          // Add title to the iframe after rendering
          const iframe = container.querySelector("iframe");
          if (iframe) {
            iframe.setAttribute("title", "YouTube Channel Subscribe Button");
            iframe.setAttribute("aria-label", "Subscribe to YouTube Channel");
          }
        } catch (error) {
          console.error("Button rendering error:", error);
          setIsButtonRendered(false);
        }
      }
    }
  }, [channelId]);

  useEffect(() => {
    // Global function to be called when the YouTube script loads
    (window as any).onYouTubeSubscribeLoad = () => {
      try {
        if ((window as any).gapi && (window as any).gapi.ytsubscribe) {
          setIsScriptLoaded(true);
          renderYouTubeButton();
        }
      } catch (error) {
        console.error("YouTube subscribe script load error:", error);
      }
    };

    // Attempt to render button if script is already loaded
    if ((window as any).gapi && (window as any).gapi.ytsubscribe) {
      renderYouTubeButton();
    }

    // Cleanup function
    return () => {
      delete (window as any).onYouTubeSubscribeLoad;
    };
  }, [renderYouTubeButton]);

  // Re-render button on route changes
  useEffect(() => {
    const handleRouteChange = () => {
      if (isScriptLoaded) {
        renderYouTubeButton();
      }
    };

    // Add event listener for route changes
    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, [isScriptLoaded, renderYouTubeButton]);

  return (
    <div
      className="relative flex items-center justify-center min-h-[20px]"
      aria-label="YouTube Subscribe Button"
    >
      {/* YouTube Subscribe Button Container */}
      <div
        id={`subscribe-container-${channelId}`}
        className="w-full"
        aria-live="polite"
      /> 

      {/* YouTube Platform Script with custom onload handler */}
      <Script
        id="youtube-platform-script"
        src="https://apis.google.com/js/platform.js?onload=onYouTubeSubscribeLoad"
        strategy="lazyOnload"
        onError={(e) => {
          console.error("Script load error", e);
        }}
      />
    </div>
  );
};

// Use dynamic import with no SSR
export default SubscribeButton;
