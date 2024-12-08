// lib/contexts/MultipurposeProvider.tsx
import React, { createContext, useEffect, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useMounted } from "@/hooks/useMounted";
import { Toaster } from "@/components/ui/sonner";

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
  onError: (err: ErrorEvent) => void
) => {
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.onload = onLoad;
  //   script.onerror = onError;
  document.head.appendChild(script);
};

const handleMissingEnvVariable = (variableName: string) => {
  console.error(`Environment variable ${variableName} is missing.`);
};

const getCanonicalUrl = (pathname: string) => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${pathname}`.replace("//", "/");
};

export const MultipurposeProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { mounted } = useMounted();
  const [state, setState] = useState<ProviderState>(initialState);

  const getPageMetadata = (pathname: string) => {
    const fullPath = getCanonicalUrl(pathname);
    const f_title = document?.title?.split("|")[0].trim() ?? "Default Title";
    let f_sections = "";
    let f_authors = "";

    document.head.querySelectorAll("meta").forEach((meta) => {
      if (meta.getAttribute("name") === "category") f_sections = meta.content;
      if (meta.getAttribute("name") === "author") f_authors = meta.content;
    });

    return { fullPath, f_sections, f_authors, f_title };
  };

  useEffect(() => {
    // GPT Initialization
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

    const loadGPTScript = () => {
      loadScript(
        "https://securepubads.g.doubleclick.net/tag/js/gpt.js",
        initializeGPT,
        (err) => console.error("Failed to load GPT script:", err)
      );
    };

    if (!window.googletag) {
      loadGPTScript();
    } else {
      initializeGPT();
    }

    // Comscore Initialization
    if (!process.env.NEXT_PUBLIC_COMSCORE_ID) {
      handleMissingEnvVariable("NEXT_PUBLIC_COMSCORE_ID");
    } else {
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
    }

    // Chartbeat Initialization
    if (!process.env.NEXT_PUBLIC_CB_UID) {
      handleMissingEnvVariable("NEXT_PUBLIC_CB_UID");
    } else {
      const metaData = getPageMetadata(pathname);
      if (!window._sf_async_config) {
        window._sf_async_config = {} as Window["_sf_async_config"];
      }

      window._sf_async_config.uid = process.env.NEXT_PUBLIC_CB_UID;
      window._sf_async_config.domain = "freemalaysiatoday.com";
      window._sf_async_config.useCanonical = true;
      window._sf_async_config.path = metaData?.fullPath;
      window._sf_async_config.title = metaData?.f_title;
      window._sf_async_config.sections = metaData?.f_sections;
      window._sf_async_config.authors = metaData?.f_authors;

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
    }

    // Lotame Initialization
    if (!process.env.NEXT_PUBLIC_LOTAME_CLIENT_ID) {
      handleMissingEnvVariable("NEXT_PUBLIC_LOTAME_CLIENT_ID");
    } else {
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
    }
  }, [pathname]);

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
      <Toaster />
      {children}
    </MultipurposeContext.Provider>
  );
};
