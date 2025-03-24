import { useEffect, useState } from "react";

interface OutBrainWidgetProps {
  fullUrl: string;
}

const OutBrainWidget = ({ fullUrl }: OutBrainWidgetProps) => {
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const enhanceWidgetAccessibility = () => {
      // Fix the "What is" link accessibility
      const whatIsLink = document.querySelector(".ob_what a");
      if (whatIsLink instanceof HTMLElement) {
        whatIsLink.setAttribute(
          "aria-label",
          "Learn more about Outbrain recommendations"
        );
        whatIsLink.setAttribute("role", "link");
        whatIsLink.setAttribute("tabindex", "0");

        // Add visible text for screen readers while maintaining original design
        const spanElement = document.createElement("span");
        spanElement.className = "sr-only";
        spanElement.textContent = "Learn more about Outbrain recommendations";
        whatIsLink.appendChild(spanElement);
      }

      // Enhance widget header accessibility
      const widgetHeader = document.querySelector(".ob-widget-header");
      if (widgetHeader instanceof HTMLElement) {
        widgetHeader.setAttribute("role", "banner");
        widgetHeader.setAttribute("aria-label", "Recommended content header");
      }
    };

    // Create and load Outbrain script
    const script = document.createElement("script");
    script.src = "//widgets.outbrain.com/outbrain.js";
    script.defer = true;

    // Set up observer to watch for Outbrain content
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        // Check for specific Outbrain content elements that indicate actual content loaded
        const hasActualContent =
          document.querySelector(".ob-rec-image") ||
          document.querySelector(".ob-rec-text") ||
          (document.querySelector(".ob-widget") &&
            document.querySelector(".ob-widget")?.children.length);

        if (hasActualContent) {
          enhanceWidgetAccessibility();
          setHasContent(true);
          observer.disconnect();
        }
      });
    });

    script.onload = () => {
      const outbrainContainer = document.querySelector(".OUTBRAIN");
      if (outbrainContainer) {
        observer.observe(outbrainContainer, {
          childList: true,
          subtree: true,
          attributes: true,
        });
      }
    };

    document.body.appendChild(script);

    // Set a timeout to check if content loaded after a reasonable time
    const timeout = setTimeout(() => {
      const hasVisibleContent =
        document.querySelector(".ob-widget") &&
        document.querySelector(".ob-widget")?.children.length;

      if (hasVisibleContent) {
        setHasContent(true);
      }
    }, 3000); // 3 seconds should be enough for content to load

    // Cleanup function
    return () => {
      clearTimeout(timeout);
      observer.disconnect();
      const scriptElement = document.querySelector(
        'script[src*="outbrain.js"]'
      );
      const styleElement = document.querySelector("style");
      if (scriptElement?.parentNode) {
        scriptElement.parentNode.removeChild(scriptElement);
      }
      if (styleElement?.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

  return (
    <div className={hasContent ? "bg-white rounded-md pb-2 px-4" : ""}>
      <div
        className="OUTBRAIN"
        data-src={fullUrl}
        data-widget-id="AR_1"
        role="complementary"
        aria-label="Recommended articles from around the web"
      />
    </div>
  );
};

export default OutBrainWidget;
