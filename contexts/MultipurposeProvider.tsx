import React, {
  createContext,
  useCallback,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { Toaster } from "@/components/ui/sonner";
import { useMounted } from "@/hooks/useMounted";

// Define proper types for third-party libraries
interface ChartbeatInstance {
  virtualPage: (
    config: VirtualPageConfig | string,
    title?: string,
    options?: {
      sections?: string;
      authors?: string;
      referrer?: string;
      [key: string]: any;
    }
  ) => void;
  [key: string]: any;
}

interface VirtualPageConfig {
  sections?: string;
  authors?: string;
  title?: string;
  path?: string;
  fullPath?: string;
}

// Define the shape of our provider state
interface ProviderState {
  isGPTInitialized: boolean;
  isComscoreInitialized: boolean;
  isLotameInitialized: boolean;
}

interface ChartbeatContextType {
  pSUPERFLY: ChartbeatInstance | null;
}

const initialProviderState: ProviderState = {
  isGPTInitialized: false,
  isComscoreInitialized: false,
  isLotameInitialized: false,
};

const initialChartbeatState: ChartbeatContextType = {
  pSUPERFLY: null,
};

export const MultipurposeContext =
  createContext<ProviderState>(initialProviderState);
export const ChartbeatContext = createContext<ChartbeatContextType>(
  initialChartbeatState
);

// Helper: load script with a duplicate check
const loadScript = (
  src: string,
  onLoad: () => void,
  onError: (err: Event | string) => void
) => {
  if (document.querySelector(`script[src="${src}"]`)) {
    onLoad();
    return;
  }
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.onload = onLoad;
  script.onerror = onError;
  document.head.appendChild(script);
};

const handleMissingEnvVariable = (variableName: string) => {
  console.error(`Environment variable ${variableName} is missing.`);
};

// A utility to build a canonical URL; when includeOrigin is false,
// we only return the pathname and query, which is later adjusted.
const getCanonicalUrl = (
  pathname: string,
  searchParams?: URLSearchParams,
  options?: { includeOrigin?: boolean }
) => {
  const includeOrigin = options?.includeOrigin ?? true;
  if (typeof window !== "undefined") {
    try {
      // Build the full path including query parameters
      let path = pathname;
      if (searchParams && searchParams.toString()) {
        path = `${pathname}?${searchParams.toString()}`;
      }

      const url = includeOrigin
        ? new URL(path, window.location.origin)
        : new URL(path, "http://dummy.com");
      return includeOrigin ? url.href : url.pathname + url.search;
    } catch (err) {
      console.error("Error constructing canonical URL", err);
      return pathname;
    }
  }
  return pathname;
};

interface PageMetadata {
  fullPath: string;
  sections: string;
  authors: string;
  title: string;
  referrer?: string;
}

// Separate Chartbeat Provider that won't cause re-renders on parent components
export const ChartbeatProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pSUPERFLY, setPSUPERFLY] = useState<ChartbeatInstance | null>(null);
  const initialMount = useRef(true);
  const chartbeatDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastNavigationTimeRef = useRef(0);
  const previousPathRef = useRef("");

  const getPageTitle = (path: string): string => {
    // Special case for home page
    if (path === "/" || path === "/index" || path === "/home") {
      return "Free Malaysia Today";
    }

    // Check if DOM is at least interactive (not just complete)
    if (typeof document !== "undefined" && document.readyState !== "loading") {
      // First try: document.title (usually fastest and most reliable)
      try {
        const docTitle = document.title;
        if (
          docTitle &&
          docTitle.trim() !== "" &&
          docTitle !== "Free Malaysia Today"
        ) {
          // Clean up common title formats
          if (docTitle.includes("|")) {
            const cleanTitle = docTitle.split("|")[0].trim();
            if (cleanTitle) return cleanTitle;
          }
          if (docTitle.includes(" - ")) {
            const cleanTitle = docTitle.split(" - ")[0].trim();
            if (cleanTitle) return cleanTitle;
          }
          if (docTitle.includes(" — ")) {
            // Em dash variant
            const cleanTitle = docTitle.split(" — ")[0].trim();
            if (cleanTitle) return cleanTitle;
          }
          return docTitle.trim();
        }
      } catch (e) {
        console.warn("Error accessing document.title:", e);
      }

      // Second try: h1 elements (often most accurate for articles)
      try {
        const h1Elements = document.querySelectorAll("h1");
        if (h1Elements && h1Elements.length > 0) {
          // Try to find the most relevant h1 (not site header)
          for (const h1 of h1Elements) {
            const h1Text = h1?.textContent?.trim();
            if (
              h1Text &&
              h1Text !== "" &&
              h1Text !== "Free Malaysia Today" &&
              !h1.closest("header") && // Exclude header h1s
              !h1.closest("nav") // Exclude navigation h1s
            ) {
              return h1Text;
            }
          }
        }
      } catch (e) {
        console.warn("Error accessing h1 elements:", e);
      }

      // Third try: Open Graph meta title (good for social/SEO)
      try {
        const metaTitle = document.querySelector('meta[property="og:title"]');
        if (metaTitle) {
          const content = metaTitle.getAttribute("content");
          if (
            content &&
            content.trim() !== "" &&
            content !== "Free Malaysia Today"
          ) {
            return content.trim();
          }
        }
      } catch (e) {
        console.warn("Error accessing og:title:", e);
      }

      // Fourth try: Structured data (JSON-LD)
      try {
        const jsonLdScripts = document.querySelectorAll(
          'script[type="application/ld+json"]'
        );
        for (const script of jsonLdScripts) {
          try {
            const data = JSON.parse(script.textContent || "{}");

            // Check for NewsArticle schema
            if (data["@type"] === "NewsArticle" && data.headline) {
              return data.headline;
            }

            // Check for Article schema
            if (data["@type"] === "Article" && data.headline) {
              return data.headline;
            }

            // Check for WebPage schema
            if (data["@type"] === "WebPage" && data.name) {
              return data.name;
            }

            // Check for graph format (often used by SEO plugins)
            if (data["@graph"] && Array.isArray(data["@graph"])) {
              for (const item of data["@graph"]) {
                if (
                  (item["@type"] === "NewsArticle" ||
                    item["@type"] === "Article") &&
                  item.headline
                ) {
                  return item.headline;
                }
                if (item["@type"] === "WebPage" && item.name) {
                  return item.name;
                }
              }
            }
          } catch (parseError) {
            // Skip this script if JSON is invalid
            continue;
          }
        }
      } catch (e) {
        console.warn("Error accessing structured data:", e);
      }

      // Fifth try: Twitter meta title
      try {
        const twitterTitle = document.querySelector(
          'meta[name="twitter:title"]'
        );
        if (twitterTitle) {
          const content = twitterTitle.getAttribute("content");
          if (
            content &&
            content.trim() !== "" &&
            content !== "Free Malaysia Today"
          ) {
            return content.trim();
          }
        }
      } catch (e) {
        console.warn("Error accessing twitter:title:", e);
      }

      // Sixth try (bonus): Alternative meta titles
      try {
        // Try DC.title (Dublin Core)
        const dcTitle = document.querySelector(
          'meta[name="DC.title"], meta[name="dc.title"]'
        );
        if (dcTitle) {
          const content = dcTitle.getAttribute("content");
          if (
            content &&
            content.trim() !== "" &&
            content !== "Free Malaysia Today"
          ) {
            return content.trim();
          }
        }

        // Try title meta tag
        const titleMeta = document.querySelector('meta[name="title"]');
        if (titleMeta) {
          const content = titleMeta.getAttribute("content");
          if (
            content &&
            content.trim() !== "" &&
            content !== "Free Malaysia Today"
          ) {
            return content.trim();
          }
        }
      } catch (e) {
        console.warn("Error accessing alternative meta titles:", e);
      }
    }

    // Default fallback
    return "Free Malaysia Today";
  };

  const getPageMetadata = useCallback(
    (path: string, prevPath?: string): PageMetadata => {
      // Get the full path
      const fullPath = getCanonicalUrl(path, searchParams, {
        includeOrigin: false,
      }).replace(/\/\//, "/");

      // Get the title using our robust function
      const title = getPageTitle(path);

      // Initialize defaults
      let sections = "homepage";
      let authors = "FMT Reporters";

      // Only try to access DOM if it's ready
      if (
        typeof document !== "undefined" &&
        document.readyState !== "loading"
      ) {
        try {
          // Get all meta tags once for efficiency
          const metaTags = Array.from(document.head.querySelectorAll("meta"));

          // Extract category/section
          const categoryMeta = metaTags.find(
            (meta) =>
              meta.getAttribute("name") === "category" ||
              meta.getAttribute("property") === "article:section"
          );
          if (categoryMeta) {
            const content = categoryMeta.getAttribute("content");
            if (content && content.trim() !== "") {
              sections = content.trim();
            }
          }

          // Extract author with multiple fallbacks
          const authorMeta = metaTags.find(
            (meta) =>
              meta.getAttribute("name") === "author" ||
              meta.getAttribute("property") === "article:author" ||
              meta.getAttribute("name") === "DC.creator" ||
              meta.getAttribute("name") === "dc.creator"
          );
          if (authorMeta) {
            const content = authorMeta.getAttribute("content");
            if (content && content.trim() !== "") {
              authors = content.trim();
            }
          }

          // Try to get author from structured data as fallback
          if (authors === "FMT Reporters") {
            try {
              const jsonLdScripts = document.querySelectorAll(
                'script[type="application/ld+json"]'
              );
              for (const script of jsonLdScripts) {
                try {
                  const data = JSON.parse(script.textContent || "{}");

                  // Direct author property
                  if (data.author) {
                    if (typeof data.author === "string") {
                      authors = data.author;
                      break;
                    } else if (data.author.name) {
                      authors = data.author.name;
                      break;
                    }
                  }

                  // Check in @graph format
                  if (data["@graph"] && Array.isArray(data["@graph"])) {
                    for (const item of data["@graph"]) {
                      if (item.author) {
                        if (typeof item.author === "string") {
                          authors = item.author;
                          break;
                        } else if (item.author.name) {
                          authors = item.author.name;
                          break;
                        }
                      }
                    }
                  }
                } catch (parseError) {
                  // Skip invalid JSON
                  continue;
                }
              }
            } catch (e) {
              // Keep default author
            }
          }
        } catch (e) {
          console.warn("Error extracting metadata:", e);
          // Use defaults on any error
        }
      }

      // Get referrer safely
      let referrer = "";
      if (prevPath) {
        referrer = getCanonicalUrl(prevPath, undefined, {
          includeOrigin: true,
        });
      } else if (typeof document !== "undefined") {
        referrer = document.referrer || "";
      }

      return {
        fullPath,
        sections,
        authors,
        title,
        referrer,
      };
    },
    [searchParams]
  );

  // Initialize Chartbeat only once
  useEffect(() => {
    // Don't re-initialize if already initialized
    if (window.pSUPERFLY || pSUPERFLY) {
      if (window.pSUPERFLY && !pSUPERFLY) {
        setPSUPERFLY(window.pSUPERFLY);
      }
      return;
    }

    const cbUid = process.env.NEXT_PUBLIC_CB_UID;
    if (!cbUid) {
      handleMissingEnvVariable("NEXT_PUBLIC_CB_UID");
      return;
    }

    // Initial page metadata
    const metadata = getPageMetadata(pathname);
    previousPathRef.current = pathname;

    // Configure Chartbeat
    window._sf_async_config = window._sf_async_config || {};
    window._sf_async_config.uid = cbUid;
    window._sf_async_config.domain = "freemalaysiatoday.com";
    window._sf_async_config.useCanonical = true;
    window._sf_async_config.path = metadata.fullPath || pathname;
    window._sf_async_config.title = metadata.title || "Free Malaysia Today";
    window._sf_async_config.sections = metadata.sections || "homepage";
    window._sf_async_config.authors = metadata.authors || "FMT Reporters";

    // Load Chartbeat script in a non-blocking way
    loadScript(
      "https://static.chartbeat.com/js/chartbeat.js",
      () => {
        if (window.pSUPERFLY) {
          setPSUPERFLY(window.pSUPERFLY);
        }
      },
      (err) => console.error("Failed to load Chartbeat script:", err)
    );
  }, [pathname, getPageMetadata]);

  // Handle page changes with debounce for Chartbeat
  useEffect(() => {
    if (!pSUPERFLY) return;

    // Skip first mount
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }

    // Don't track if path hasn't changed
    if (pathname === previousPathRef.current) {
      return;
    }

    // Clear any existing timeout
    if (chartbeatDebounceTimerRef.current) {
      clearTimeout(chartbeatDebounceTimerRef.current);
    }

    // Determine how long to wait based on time since last navigation
    const now = Date.now();
    const timeSinceLastNav = now - lastNavigationTimeRef.current;
    const debounceTime = timeSinceLastNav < 300 ? 600 : 300;

    lastNavigationTimeRef.current = now;

    // Schedule virtualPage call with debounce
    chartbeatDebounceTimerRef.current = setTimeout(() => {
      try {
        const metadata = getPageMetadata(pathname, previousPathRef.current);

        // The exact API call depends on what version of Chartbeat you're using
        // Both formats are supported here
        if (typeof pSUPERFLY.virtualPage === "function") {
          // Try the object format first (newer API)
          try {
            pSUPERFLY.virtualPage({
              path: metadata.fullPath,
              title: metadata.title,
              sections: metadata.sections,
              authors: metadata.authors,
            });
          } catch (e) {
            // Fall back to the string/options format (older API)
            pSUPERFLY.virtualPage(metadata.fullPath, metadata.title, {
              sections: metadata.sections,
              authors: metadata.authors,
              referrer: metadata.referrer,
            });
          }
        }

        // Update previous path
        previousPathRef.current = pathname;
      } catch (error) {
        console.error("Error in Chartbeat tracking:", error);
      }
    }, debounceTime);

    // Clean up on unmount or re-run
    return () => {
      if (chartbeatDebounceTimerRef.current) {
        clearTimeout(chartbeatDebounceTimerRef.current);
      }
    };
  }, [pathname, pSUPERFLY, getPageMetadata]);

  return (
    <ChartbeatContext.Provider value={{ pSUPERFLY }}>
      {children}
    </ChartbeatContext.Provider>
  );
};

export const MultipurposeProvider = ({ children }: { children: ReactNode }) => {
  const { mounted } = useMounted();
  const [state, setState] = useState<ProviderState>(initialProviderState);

  /* --- GPT Initialization --- */
  useEffect(() => {
    if (!mounted) return;

    const initializeGPT = () => {
      // Proper initialization of googletag - don't try to set cmd directly
      if (!window.googletag) {
        window.googletag = { cmd: [] } as unknown as typeof googletag;
      }

      // The cmd property is already defined by GPT, just push to it
      window.googletag.cmd.push(() => {
        try {
          const pubAds = window.googletag.pubads();
          pubAds.enableSingleRequest();
          window.googletag.enableServices();
          setState((prevState) => ({ ...prevState, isGPTInitialized: true }));
        } catch (error) {
          console.error("Error initializing GPT:", error);
        }
      });
    };

    if (!window.googletag) {
      loadScript(
        "https://securepubads.g.doubleclick.net/tag/js/gpt.js",
        initializeGPT,
        (err) => console.error("Failed to load GPT script:", err)
      );
    } else {
      initializeGPT();
    }
  }, [mounted]);

  /* --- Comscore Initialization --- */
  useEffect(() => {
    if (!mounted) return;

    const comscoreId = process.env.NEXT_PUBLIC_COMSCORE_ID;
    if (!comscoreId) {
      handleMissingEnvVariable("NEXT_PUBLIC_COMSCORE_ID");
      return;
    }

    const trackComscore = () => {
      window._comscore = window._comscore || [];
      window._comscore.push({
        c1: "2",
        c2: comscoreId,
      });
    };

    // Initial tracking call
    trackComscore();

    loadScript(
      `https://sb.scorecardresearch.com/cs/${comscoreId}/beacon.js`,
      () => {
        setState((prevState) => ({
          ...prevState,
          isComscoreInitialized: true,
        }));
      },
      (err) => console.error("Failed to load Comscore script:", err)
    );
  }, [mounted]);

  // Comscore: Track page view on route changes.
  useEffect(() => {
    if (!mounted || !state.isComscoreInitialized) return;

    const comscoreId = process.env.NEXT_PUBLIC_COMSCORE_ID;
    if (!comscoreId) return;

    try {
      window._comscore = window._comscore || [];
      window._comscore.push({
        c1: "2",
        c2: comscoreId,
      });
      if (window.COMSCORE) {
        window.COMSCORE.beacon({
          c1: "2",
          c2: comscoreId,
        });
      }
    } catch (error) {
      console.error("Error tracking Comscore pageview:", error);
    }
  }, [mounted, state.isComscoreInitialized]);

  /* --- Lotame Initialization --- */
  useEffect(() => {
    if (!mounted) return;

    const lotameClientId = process.env.NEXT_PUBLIC_LOTAME_CLIENT_ID;
    if (!lotameClientId) {
      handleMissingEnvVariable("NEXT_PUBLIC_LOTAME_CLIENT_ID");
      return;
    }

    try {
      const lotameScript = `
        !function() {
          window.googletag = window.googletag || {};
          window.googletag.cmd = window.googletag.cmd || [];
          var targetingKey = 'lotame';
          var lotameClientId = '${lotameClientId}';
          var audLocalStorageKey = 'lotame_${lotameClientId}_auds';
          try {
            var storedAuds = window.localStorage.getItem(audLocalStorageKey) || '';
            if (storedAuds) {
              googletag.cmd.push(function() {
                window.googletag.pubads().setTargeting(targetingKey, storedAuds.split(','));
              });
            }
          } catch(e) {}
          var audienceReadyCallback = function (profile) {
            var lotameAudiences = profile.getAudiences() || [];
            googletag.cmd.push(function() {
              window.googletag.pubads().setTargeting(targetingKey, lotameAudiences);
            });
          };
          var lotameTagInput = {
            data: {},
            config: {
              clientId: Number(lotameClientId),
              audienceLocalStorage: audLocalStorageKey,
              onProfileReady: audienceReadyCallback
            }
          };
          var lotameConfig = lotameTagInput.config || {};
          var namespace = window['lotame_' + lotameConfig.clientId] = {};
          namespace.config = lotameConfig;
          namespace.data = lotameTagInput.data || {};
          namespace.cmd = namespace.cmd || [];
        }();
      `;

      loadScript(
        `data:text/javascript,${encodeURIComponent(lotameScript)}`,
        () => {
          loadScript(
            `https://tags.crwdcntrl.net/lt/c/${lotameClientId}/lt.min.js`,
            () => {
              setState((prevState) => ({
                ...prevState,
                isLotameInitialized: true,
              }));
            },
            (err) => console.error("Failed to load Lotame script:", err)
          );
        },
        (err) => console.error("Failed to initialize Lotame script:", err)
      );
    } catch (error) {
      console.error("Error initializing Lotame:", error);
    }
  }, [mounted]);

  return (
    <MultipurposeContext.Provider value={state}>
      <ChartbeatProvider>
        <GoogleTagManager gtmId="GTM-M848LK5" />
        <GoogleAnalytics gaId="G-1BXSGEDPNV" />
        <Toaster />
        {children}
      </ChartbeatProvider>
    </MultipurposeContext.Provider>
  );
};

export default MultipurposeProvider;
