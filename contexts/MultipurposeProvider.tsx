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

const loadScript = (
  src: string,
  onLoad: () => void,
  onError: (err: Event | string) => void
) => {
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.onload = onLoad;
  script.onerror = (event: Event | string) => {
    onError(event);
  };
  document.head.appendChild(script);
};

const handleMissingEnvVariable = (variableName: string) => {
  console.error(`Environment variable ${variableName} is missing.`);
};

const getCanonicalUrl = (pathname: string) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  let url = `${origin}${pathname}`;
  url = url.replace(/(https?:\/\/)|(\/\/)+/g, (match, protocol) => {
    return protocol || "/";
  });

  if (!url.startsWith("http")) {
    url = `https://${url}`;
  }

  return url;
};

const getPageMetadata = (pathname: string) => {
  const fullPath = getCanonicalUrl(pathname);

  const defaults = {
    title: "Free Malaysia Today",
    sections: "homepage",
    authors: "FMT Reporters",
  };

  const f_title = document?.title?.split("|")[0]?.trim() || defaults.title;
  let f_sections = defaults.sections;
  let f_authors = defaults.authors;

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

  // GPT Initialization
  useEffect(() => {
    if (!mounted) return;

    const initializeGPT = () => {
      if (!window.googletag) {
        window.googletag = {} as typeof googletag;
      }
      window?.googletag?.cmd?.push(() => {
        const pubAds = window?.googletag?.pubads();
        pubAds?.enableSingleRequest();
        window?.googletag?.enableServices();
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
    if (!mounted || !process.env.NEXT_PUBLIC_COMSCORE_ID) {
      handleMissingEnvVariable("NEXT_PUBLIC_COMSCORE_ID");
      return;
    }

    const initializeComscore = () => {
      if (!window.COMSCORE) {
        window.COMSCORE = [];
      }
      window.COMSCORE.push({
        c1: "2",
        c2: process.env.NEXT_PUBLIC_COMSCORE_ID,
      });
    };

    initializeComscore(); // Initial page load

    loadScript(
      `https://sb.scorecardresearch.com/cs/${process.env.NEXT_PUBLIC_COMSCORE_ID}/beacon.js`,
      () => {
        setState((prevState) => ({
          ...prevState,
          isComscoreInitialized: true,
        }));
      },
      (err) => console.error("Failed to load Comscore script:", err)
    );
  }, [mounted]);

  // Track Comscore page views
  useEffect(() => {
    if (!mounted || !state.isComscoreInitialized || !window.COMSCORE) return;

    window.COMSCORE.push({
      c1: "2",
      c2: process.env.NEXT_PUBLIC_COMSCORE_ID,
    });
  }, [pathname, mounted, state.isComscoreInitialized]);

  // Chartbeat Initialization
  useEffect(() => {
    if (!mounted || !process.env.NEXT_PUBLIC_CB_UID) {
      handleMissingEnvVariable("NEXT_PUBLIC_CB_UID");
      return;
    }

    const metaData = getPageMetadata(pathname);
    if (!window._sf_async_config) {
      window._sf_async_config = {} as Window["_sf_async_config"];
    }

    window._sf_async_config = {
      uid: process.env.NEXT_PUBLIC_CB_UID,
      domain: "freemalaysiatoday.com",
      useCanonical: true,
      path: metaData?.fullPath?.trim(),
      title: metaData?.f_title?.trim(),
      sections: metaData?.f_sections?.trim() || "homepage",
      authors: metaData?.f_authors?.trim() || "FMT Reporters",
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
    if (!mounted || !process.env.NEXT_PUBLIC_LOTAME_CLIENT_ID) {
      handleMissingEnvVariable("NEXT_PUBLIC_LOTAME_CLIENT_ID");
      return;
    }

    const lotameScript = `
      !function() {
        window.googletag = window?.googletag || {};
        window.googletag.cmd = window?.googletag.cmd || [];
        var targetingKey = 'lotame';
        var lotameClientId = '${process.env.NEXT_PUBLIC_LOTAME_CLIENT_ID}';
        var audLocalStorageKey = 'lotame_${process.env.NEXT_PUBLIC_LOTAME_CLIENT_ID}_auds';
        try {
          var storedAuds = window?.localStorage.getItem(audLocalStorageKey) || '';
          if (storedAuds) {
            googletag.cmd.push(function() {
              window?.googletag.pubads().setTargeting(targetingKey, storedAuds.split(','));
            });
          }
        } catch(e) {}
        var audienceReadyCallback = function (profile) {
          var lotameAudiences = profile.getAudiences() || [];
          googletag.cmd.push(function() {
            window?.googletag.pubads().setTargeting(targetingKey, lotameAudiences);
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
          `https://tags.crwdcntrl.net/lt/c/${process.env.NEXT_PUBLIC_LOTAME_CLIENT_ID}/lt.min.js`,
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

  // Chartbeat virtual page views
  useEffect(() => {
    if (!state.pSUPERFLY) return;

    const metaData = getPageMetadata(pathname);
    state.pSUPERFLY.virtualPage({
      sections: metaData.f_sections,
      authors: metaData.f_authors,
      title: metaData.f_title,
      path: metaData.fullPath,
    });
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
