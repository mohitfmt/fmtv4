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

    // Only try to access DOM if we're in the browser and document is ready
    if (typeof document !== "undefined" && document.readyState === "complete") {
      // Try to get title from document.title
      const docTitle = document.title;
      if (docTitle && docTitle.trim() !== "") {
        if (docTitle.includes("|")) {
          return docTitle.split("|")[0].trim();
        }
        if (docTitle.includes(" - ")) {
          return docTitle.split(" - ")[0].trim();
        }
        if (docTitle !== "Free Malaysia Today") {
          return docTitle.trim();
        }
      }

      // Try looking for h1 elements as a fallback
      const h1Elements = document.querySelectorAll("h1");
      if (h1Elements && h1Elements.length > 0) {
        const h1Text = h1Elements[0]?.textContent?.trim();
        if (h1Text && h1Text !== "") {
          return h1Text;
        }
      }

      // Look for meta title - with better null checking
      try {
        const metaTitle = document.querySelector('meta[property="og:title"]');
        if (metaTitle) {
          const content = metaTitle.getAttribute("content");
          if (content) {
            return content;
          }
        }
      } catch (e) {
        // Silently fail and use default
      }
    }

    // Default fallback
    return "Free Malaysia Today";
  };
  // Get page metadata
  const getPageMetadata = useCallback(
    (path: string, prevPath?: string): PageMetadata => {
      const fullPath = getCanonicalUrl(path, searchParams, {
        includeOrigin: false,
      }).replace(/\/\//, "/");

      const title = getPageTitle(path);
      const metaTags = Array.from(document.head.querySelectorAll("meta"));
      const sections =
        metaTags
          .find((meta) => meta.getAttribute("name") === "category")
          ?.getAttribute("content") || "homepage";
      const authors =
        metaTags
          .find((meta) => meta.getAttribute("name") === "author")
          ?.getAttribute("content") || "FMT Reporters";

      const referrer = prevPath
        ? getCanonicalUrl(prevPath, undefined, { includeOrigin: true })
        : document.referrer || "";

      return { fullPath, sections, authors, title, referrer };
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
