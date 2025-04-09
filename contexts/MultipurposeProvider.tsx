import React, { createContext, useEffect, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { Toaster } from "@/components/ui/sonner";
import { useMounted } from "@/hooks/useMounted";

interface ProviderState {
  isGPTInitialized: boolean;
  isComscoreInitialized: boolean;
  isChartbeatInitialized: boolean;
  isLotameInitialized: boolean;
  pSUPERFLY: any;
}

const initialState: ProviderState = {
  isGPTInitialized: false,
  isComscoreInitialized: false,
  isChartbeatInitialized: false,
  isLotameInitialized: false,
  pSUPERFLY: null,
};

export const MultipurposeContext = createContext<ProviderState>(initialState);

// Improved loadScript function with duplicate check.
const loadScript = (
  src: string,
  onLoad: () => void,
  onError: (err: Event | string) => void
) => {
  if (document.querySelector(`script[src="${src}"]`)) {
    // Script already exists; run onLoad immediately.
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

// Use URL constructor for reliable canonical URL generation.
const getCanonicalUrl = (pathname: string) => {
  if (typeof window !== "undefined") {
    try {
      const url = new URL(pathname, window.location.origin);
      return url.href;
    } catch (err) {
      console.error("Error constructing canonical URL", err);
      return `${window.location.origin}${pathname}`;
    }
  }
  return pathname;
};

const getPageMetadata = (pathname: string) => {
  const fullPath = getCanonicalUrl(pathname);

  const defaults = {
    title: "Free Malaysia Today",
    sections: "homepage",
    authors: "FMT Reporters",
  };

  const f_title =
    typeof document !== "undefined" && document.title
      ? document.title.split("|")[0].trim()
      : defaults.title;
  let f_sections = defaults.sections;
  let f_authors = defaults.authors;

  if (typeof document !== "undefined") {
    document.head.querySelectorAll("meta").forEach((meta) => {
      const name = meta.getAttribute("name");
      const content = meta.getAttribute("content");

      if (name === "category" && content) {
        f_sections = content;
      }
      if (name === "author" && content) {
        f_authors = content;
      }
    });
  }

  return {
    fullPath,
    f_sections,
    f_authors,
    f_title,
  };
};

export const MultipurposeProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { mounted } = useMounted();
  const [state, setState] = useState<ProviderState>(initialState);
  // Track the previous path to optionally use as the referrer for Chartbeat.
  const [previousPath, setPreviousPath] = useState<string | null>(null);

  // GPT Initialization
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

  // Comscore Initialization
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

  // Track Comscore page views on route changes
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

  // Chartbeat Initialization
  useEffect(() => {
    const cbUid = process.env.NEXT_PUBLIC_CB_UID;
    if (!cbUid) {
      handleMissingEnvVariable("NEXT_PUBLIC_CB_UID");
      return;
    }

    const metaData = getPageMetadata(pathname);
    if (!window._sf_async_config) {
      window._sf_async_config = {} as Window["_sf_async_config"];
    }

    window._sf_async_config = {
      uid: cbUid,
      domain: "freemalaysiatoday.com",
      useCanonical: true,
      path: metaData.fullPath,
      title: metaData.f_title,
      sections: metaData.f_sections || "homepage",
      authors: metaData.f_authors || "FMT Reporters",
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
  }, [mounted, pathname]);

  // Lotame Initialization
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

  // Chartbeat virtual pageviews on route changes.
  useEffect(() => {
    if (!state.pSUPERFLY) return;
    const metaData = getPageMetadata(pathname);

    // If your Chartbeat integration supports including a referrer,
    // you could add it here. For example:
    // metaData.referrer = previousPath;
    state.pSUPERFLY.virtualPage({
      sections: metaData.f_sections,
      authors: metaData.f_authors,
      title: metaData.f_title,
      path: metaData.fullPath,
      // Optionally pass a referrer if supported:
      // referrer: previousPath,
    });

    // Update previousPath for the next page view.
    setPreviousPath(pathname);
  }, [pathname, state.pSUPERFLY]);

  return (
    <MultipurposeContext.Provider value={state}>
      <GoogleTagManager gtmId="GTM-M848LK5" />
      <GoogleAnalytics gaId="G-1BXSGEDPNV" />
      <Toaster />
      {children}
    </MultipurposeContext.Provider>
  );
};
