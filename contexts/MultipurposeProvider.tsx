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
    path: string,
    title: string,
    options?: {
      sections?: string;
      authors?: string;
      referrer?: string;
      [key: string]: any;
    }
  ) => void;
  [key: string]: any;
}

// Define the shape of our provider state
interface ProviderState {
  isGPTInitialized: boolean;
  isComscoreInitialized: boolean;
  isChartbeatInitialized: boolean;
  isLotameInitialized: boolean;
  pSUPERFLY: ChartbeatInstance | null; // Improved type for Chartbeat instance
}

const initialState: ProviderState = {
  isGPTInitialized: false,
  isComscoreInitialized: false,
  isChartbeatInitialized: false,
  isLotameInitialized: false,
  pSUPERFLY: null,
};

export const MultipurposeContext = createContext<ProviderState>(initialState);

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
  referrer?: string; // Add referrer for proper tracking
}

export const MultipurposeProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { mounted } = useMounted();
  const [state, setState] = useState<ProviderState>(initialState);
  // For Chartbeat: Track if it's the first mount to avoid triggering a virtual page view immediately.
  const initialChartbeatMount = useRef(true);
  // Track previous path to accurately set referrer
  const previousPathRef = useRef("");

  // Memoized function to extract page metadata
  const getPageMetadata = useCallback(
    (path: string, prevPath?: string): PageMetadata => {
      // Use getCanonicalUrl with includeOrigin false, then clean any accidental double slashes.
      const fullPath = getCanonicalUrl(path, searchParams, {
        includeOrigin: false,
      }).replace(/\/\//, "/");

      const title =
        document.title?.split("|")[0].trim() ?? "Free Malaysia Today";
      const metaTags = Array.from(document.head.querySelectorAll("meta"));
      const sections =
        metaTags
          .find((meta) => meta.getAttribute("name") === "category")
          ?.getAttribute("content") || "homepage";
      const authors =
        metaTags
          .find((meta) => meta.getAttribute("name") === "author")
          ?.getAttribute("content") || "FMT Reporters";

      // Include referrer information for accurate tracking
      const referrer = prevPath
        ? getCanonicalUrl(prevPath, undefined, { includeOrigin: true })
        : document.referrer || "";

      return { fullPath, sections, authors, title, referrer };
    },
    [searchParams]
  );

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

    // Clean up function for the effect
    return () => {
      // No specific cleanup needed for GPT, but good practice to include
    };
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

    // Cleanup function
    return () => {
      // No specific cleanup needed for Comscore
    };
  }, [mounted]);

  // Comscore: Track page view on route changes.
  useEffect(() => {
    if (!mounted) return;

    const comscoreId = process.env.NEXT_PUBLIC_COMSCORE_ID;
    if (!state.isComscoreInitialized || !comscoreId) return;

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

    // Cleanup function
    return () => {
      // No specific cleanup needed
    };
  }, [pathname, mounted, state.isComscoreInitialized]);

  /* --- Chartbeat Initialization --- */
  useEffect(() => {
    if (!mounted) return;

    // Don't initiate if we already have a valid Chartbeat instance
    if (window._sf_async_config && window.pSUPERFLY) {
      setState((prevState) => ({
        ...prevState,
        isChartbeatInitialized: true,
        pSUPERFLY: window.pSUPERFLY,
      }));
      return;
    }

    const cbUid = process.env.NEXT_PUBLIC_CB_UID;
    if (!cbUid) {
      handleMissingEnvVariable("NEXT_PUBLIC_CB_UID");
      return;
    }

    try {
      // Set up proper Chartbeat configuration
      const metadata = getPageMetadata(pathname);

      // STEP 1: Initialize the global Chartbeat configuration
      window._sf_async_config = window._sf_async_config || {};
      window._sf_async_config.uid = cbUid;
      window._sf_async_config.domain = "freemalaysiatoday.com";
      window._sf_async_config.useCanonical = true;
      window._sf_async_config.path = metadata.fullPath || pathname;
      window._sf_async_config.title = metadata.title || "Free Malaysia Today";
      window._sf_async_config.sections = metadata.sections || "homepage";
      window._sf_async_config.authors = metadata.authors || "FMT Reporters";

      // STEP 2: Load the Chartbeat header script first
      // This is critical - you need both scripts for Chartbeat to work properly
      const loadChartbeatMain = () => {
        loadScript(
          "https://static.chartbeat.com/js/chartbeat.js",
          () => {
            if (process.env.NODE_ENV !== "production") {
              console.log("Chartbeat main script loaded successfully");
            }
            setState((prevState) => ({
              ...prevState,
              isChartbeatInitialized: true,
              pSUPERFLY: window.pSUPERFLY,
            }));
          },
          (err) => console.error("Failed to load Chartbeat main script:", err)
        );
      };

      loadScript(
        "https://static.chartbeat.com/js/chartbeat_mab.js",
        loadChartbeatMain,
        (err) => {
          console.error("Failed to load Chartbeat header script:", err);
          // Try to load the main script anyway in case header script is cached
          loadChartbeatMain();
        }
      );
    } catch (error) {
      console.error("Error setting up Chartbeat:", error);
    }

    // Cleanup function
    return () => {
      // No specific cleanup needed for Chartbeat scripts
    };
  }, [mounted, pathname, getPageMetadata]);

  // Handle route changes for Chartbeat virtual pageviews with debounce
  useEffect(() => {
    if (!mounted || !state.isChartbeatInitialized || !state.pSUPERFLY) return;

    // First mount, just update the previous path
    if (initialChartbeatMount.current) {
      initialChartbeatMount.current = false;
      previousPathRef.current = pathname;
      return;
    }

    // Use debounce to prevent multiple rapid calls
    const debounceTimeout = 200; // ms
    const timeoutId = setTimeout(() => {
      // Only trigger virtualPage if we have a route change
      if (pathname !== previousPathRef.current) {
        try {
          const metadata = getPageMetadata(pathname, previousPathRef.current);

          // Debug what we're sending to Chartbeat (remove in production)
          if (process.env.NODE_ENV !== "production") {
            console.log("Chartbeat virtualPage called with:", {
              path: metadata.fullPath,
              title: metadata.title,
              sections: metadata.sections,
              authors: metadata.authors,
              referrer: metadata.referrer,
            });
          }

          // Call virtualPage with complete metadata including referrer
          if (
            state.pSUPERFLY &&
            typeof state.pSUPERFLY.virtualPage === "function"
          ) {
            state.pSUPERFLY.virtualPage(metadata.fullPath, metadata.title, {
              sections: metadata.sections,
              authors: metadata.authors,
              referrer: metadata.referrer,
            });
          } else {
            console.warn(
              "Chartbeat pSUPERFLY instance not properly initialized"
            );
          }

          // Update previous path for next navigation
          previousPathRef.current = pathname;
        } catch (error) {
          console.error("Error tracking Chartbeat virtualPage:", error);
        }
      }
    }, debounceTimeout);

    // Clean up timeout if component unmounts or effect re-runs
    return () => clearTimeout(timeoutId);
  }, [
    pathname,
    searchParams,
    state.pSUPERFLY,
    state.isChartbeatInitialized,
    getPageMetadata,
    mounted,
  ]);

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

    // Cleanup function
    return () => {
      // No specific cleanup needed for Lotame
    };
  }, [mounted]);

  return (
    <MultipurposeContext.Provider value={state}>
      <GoogleTagManager gtmId="GTM-M848LK5" />
      <GoogleAnalytics gaId="G-1BXSGEDPNV" />
      <Toaster />
      {children}
    </MultipurposeContext.Provider>
  );
};

export default MultipurposeProvider;
