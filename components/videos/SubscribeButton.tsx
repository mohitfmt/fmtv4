import { useEffect, useState, useCallback } from "react";
import Script from "next/script";

interface SubscribeButtonProps {
  channelId: string;
}

const SubscribeButton = ({ channelId }: SubscribeButtonProps) => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [scriptAttempts, setScriptAttempts] = useState(0);

  const renderYouTubeButton = useCallback(() => {
    if (typeof window === "undefined") return;

    const tryRender = () => {
      const container = document.getElementById(
        `subscribe-container-${channelId}`
      );
      if (!container) return;

      try {
        // Clear existing content
        container.innerHTML = "";

        // Check if gapi is available and render button
        if ((window as any).gapi?.ytsubscribe) {
          (window as any).gapi.ytsubscribe.render(container, {
            channelId: channelId,
            layout: "default",
            count: "default",
          });

          // Add accessibility attributes
          const iframe = container.querySelector("iframe");
          if (iframe) {
            iframe.setAttribute("title", "YouTube Channel Subscribe Button");
            iframe.setAttribute("aria-label", "Subscribe to YouTube Channel");
          }
        }
      } catch (error) {
        console.error("YouTube button render error:", error);
      }
    };

    // Try rendering immediately
    tryRender();

    // Retry after a short delay if needed
    setTimeout(tryRender, 1000);
  }, [channelId]);

  useEffect(() => {
    // Define the global callback
    (window as any).onYouTubeSubscribeLoad = () => {
      setIsScriptLoaded(true);
      renderYouTubeButton();
    };

    // Try to render if gapi is already available
    if ((window as any).gapi?.ytsubscribe) {
      renderYouTubeButton();
    }

    // Retry mechanism for script loading
    const retryInterval = setInterval(() => {
      setScriptAttempts((prev) => {
        if (prev < 5 && !(window as any).gapi?.ytsubscribe) {
          renderYouTubeButton();
          return prev + 1;
        }
        return prev;
      });
    }, 2000);

    return () => {
      clearInterval(retryInterval);
      delete (window as any).onYouTubeSubscribeLoad;
    };
  }, [renderYouTubeButton]);

  // Handle route changes
  useEffect(() => {
    if (!isScriptLoaded) return;

    const handleRouteChange = () => renderYouTubeButton();
    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, [isScriptLoaded, renderYouTubeButton]);

  return (
    <div className="relative flex items-center justify-center min-h-[24px]">
      <div
        id={`subscribe-container-${channelId}`}
        className="w-full"
      />
      <Script
        id="youtube-subscribe-script"
        src="https://apis.google.com/js/platform.js"
        strategy="afterInteractive"
        onLoad={() => {
          setIsScriptLoaded(true);
          renderYouTubeButton();
        }}
        onError={(e) => {
          console.error("YouTube script load error:", e);
          setIsScriptLoaded(false);
        }}
        async
        defer
      />
    </div>
  );
};

export default SubscribeButton;
