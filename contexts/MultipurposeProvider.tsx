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

// Define the shape of our provider state
interface ProviderState {
  isGPTInitialized: boolean;
  isComscoreInitialized: boolean;
  isChartbeatInitialized: boolean;
  isLotameInitialized: boolean;
  pSUPERFLY: any; // Chartbeat instance type
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
  options?: { includeOrigin?: boolean }
) => {
  const includeOrigin = options?.includeOrigin ?? true;
  if (typeof window !== "undefined") {
    try {
      const url = includeOrigin
        ? new URL(pathname, window.location.origin)
        : new URL(pathname, "http://dummy.com");
      return includeOrigin ? url.href : url.pathname;
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
}

export const MultipurposeProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { mounted } = useMounted();
  const [state, setState] = useState<ProviderState>(initialState);
  // For Chartbeat: Track if it's the first mount to avoid triggering a virtual page view immediately.
  const initialChartbeatMount = useRef(true);

  // Memoized function to extract page metadata similarly to your working ChartbeatProvider.
  const getPageMetadata = useCallback((path: string): PageMetadata => {
    // Use getCanonicalUrl with includeOrigin false, then clean any accidental double slashes.
    const fullPath = getCanonicalUrl(path, { includeOrigin: false }).replace(
      /\/\//,
      "/"
    );
    const title = document.title?.split("|")[0].trim() ?? "Free Malaysia Today";
    const metaTags = Array.from(document.head.querySelectorAll("meta"));
    const sections =
      metaTags
        .find((meta) => meta.getAttribute("name") === "category")
        ?.getAttribute("content") || "homepage";
    const authors =
      metaTags
        .find((meta) => meta.getAttribute("name") === "author")
        ?.getAttribute("content") || "FMT Reporters";
    return { fullPath, sections, authors, title };
  }, []);

  /* --- GPT Initialization --- */
  useEffect(() => {
    if (!mounted) return;

    const initializeGPT = () => {
      if (!window.googletag) {
        window.googletag = {} as typeof googletag;
      }
      window.googletag.cmd.push(() => {
        const pubAds = window.googletag.pubads();
        pubAds.enableSingleRequest();
        window.googletag.enableServices();
        setState((prevState) => ({ ...prevState, isGPTInitialized: true }));
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
    const comscoreId = process.env.NEXT_PUBLIC_COMSCORE_ID;
    if (!state.isComscoreInitialized || !comscoreId) return;
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
  }, [pathname, mounted, state.isComscoreInitialized]);

  /* --- Chartbeat Initialization & Virtual Pageviews --- */
  useEffect(() => {
    // Check if Chartbeat is already initialized (from a previous mount) to avoid duplicate script injection.
    if (window.pSUPERFLY) {
      return;
    }

    const metadata = getPageMetadata(pathname);
    const cbUid = process.env.NEXT_PUBLIC_CB_UID;
    if (!cbUid) {
      handleMissingEnvVariable("NEXT_PUBLIC_CB_UID");
      return;
    }

    window._sf_async_config = {
      uid: cbUid,
      domain: "freemalaysiatoday.com",
      useCanonical: true,
      path: metadata.fullPath || pathname,
      title: metadata.title || "Free Malaysia Today",
      sections: metadata.sections || "homepage",
      authors: metadata.authors || "FMT Reporters",
    };
    loadScript(
      "https://static.chartbeat.com/js/chartbeat.js",
      () => {
        setState((prevState) => ({
          ...prevState,
          isChartbeatInitialized: true,
          pSUPERFLY: window.pSUPERFLY,
        }));
      },
      (err) => console.error("Failed to load Chartbeat script:", err)
    );
  }, [mounted, pathname, getPageMetadata]);

  // On subsequent route changes, trigger Chartbeat virtual page views.
  useEffect(() => {
    if (!state.pSUPERFLY) return;

    if (initialChartbeatMount.current) {
      initialChartbeatMount.current = false;
    } else {
      const metadata = getPageMetadata(pathname);
      state.pSUPERFLY.virtualPage(metadata);
    }
  }, [pathname, searchParams, state.pSUPERFLY, getPageMetadata]);

  /* --- Lotame Initialization --- */
  useEffect(() => {
    const lotameClientId = process.env.NEXT_PUBLIC_LOTAME_CLIENT_ID;
    if (!lotameClientId) {
      handleMissingEnvVariable("NEXT_PUBLIC_LOTAME_CLIENT_ID");
      return;
    }

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
