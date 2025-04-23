import React, {
  createContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { Toaster } from "@/components/ui/sonner";
import { useMounted } from "@/hooks/useMounted";

interface ProviderState {
  isGPTInitialized: boolean;
  isComscoreInitialized: boolean;
  isLotameInitialized: boolean;
}

interface ChartbeatInstance {
  virtualPage: (
    config: any,
    title?: string,
    options?: any,
    referrer?: any
  ) => void;
  [key: string]: any;
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

const loadScript = (
  src: string,
  onLoad: () => void,
  onError: (err: Event | string) => void
): HTMLScriptElement => {
  const existing =
    typeof window !== "undefined"
      ? (document.querySelector(`script[src="${src}"]`) as HTMLScriptElement)
      : null;
  if (existing) {
    onLoad();
    return existing;
  }
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  script.onload = onLoad;
  script.onerror = onError;
  document.head.appendChild(script);
  return script;
};

const ChartbeatProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pSUPERFLY, setPSUPERFLY] = useState<ChartbeatInstance | null>(null);
  const chartbeatDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousPathRef = useRef("/");

  const getPageMetadata = (): any => {
    const fullPath = `${pathname}?${searchParams?.toString()}`.replace(
      /\/\//g,
      "/"
    );
    const title =
      typeof document !== "undefined"
        ? document.title || "Free Malaysia Today"
        : "Free Malaysia Today";
    return {
      fullPath,
      title,
      sections:
        typeof document !== "undefined"
          ? document
              .querySelector("meta[name='category']")
              ?.getAttribute("content") || "homepage"
          : "homepage",
      authors:
        typeof document !== "undefined"
          ? document
              .querySelector("meta[name='author']")
              ?.getAttribute("content") || "FMT Reporters"
          : "FMT Reporters",
    };
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const uid = process.env.NEXT_PUBLIC_CB_UID;
    if (!uid) return;
    window._sf_async_config = {
      uid,
      domain: "freemalaysiatoday.com",
      useCanonical: true,
      ...getPageMetadata(),
    };
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        loadScript(
          "https://static.chartbeat.com/js/chartbeat.js",
          () => {
            setPSUPERFLY(window.pSUPERFLY);
          },
          (err) => console.error("Chartbeat load error", err)
        );
      });
    } else {
      setTimeout(() => {
        loadScript(
          "https://static.chartbeat.com/js/chartbeat.js",
          () => {
            setPSUPERFLY(window.pSUPERFLY);
          },
          (err) => console.error("Chartbeat load error", err)
        );
      }, 2000);
    }
  }, []);

  useEffect(() => {
    if (!pSUPERFLY) return;
    if (chartbeatDebounceTimerRef.current) {
      clearTimeout(chartbeatDebounceTimerRef.current);
    }
    chartbeatDebounceTimerRef.current = setTimeout(() => {
      const metadata = getPageMetadata();
      const referrer = typeof document !== "undefined" ? document.referrer : "";
      pSUPERFLY.virtualPage({
        path: metadata.fullPath,
        title: metadata.title,
        sections: metadata.sections,
        authors: metadata.authors,
        referrer,
      });
      previousPathRef.current = pathname;
    }, 500);

    return () => {
      if (chartbeatDebounceTimerRef.current) {
        clearTimeout(chartbeatDebounceTimerRef.current);
      }
    };
  }, [pathname, pSUPERFLY]);

  return (
    <ChartbeatContext.Provider value={{ pSUPERFLY }}>
      {children}
    </ChartbeatContext.Provider>
  );
};

export const MultipurposeProvider = ({ children }: { children: ReactNode }) => {
  const { mounted } = useMounted();
  const [state, setState] = useState(initialProviderState);
  const gptScriptRef = useRef<HTMLScriptElement | null>(null);
  const comscoreScriptRef = useRef<HTMLScriptElement | null>(null);
  const lotameScriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    if (!window.googletag) {
      window.googletag = { cmd: [] } as any;
    }
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        gptScriptRef.current = loadScript(
          "https://securepubads.g.doubleclick.net/tag/js/gpt.js",
          () => {
            try {
              window.googletag.cmd.push(() => {
                const pubAds = window.googletag.pubads();
                pubAds.enableSingleRequest();
                window.googletag.enableServices();
                setState((s) => ({ ...s, isGPTInitialized: true }));
              });
            } catch (e) {
              console.error("GPT init error", e);
            }
          },
          (err) => console.error("GPT load error", err)
        );
      });
    } else {
      setTimeout(() => {
        gptScriptRef.current = loadScript(
          "https://securepubads.g.doubleclick.net/tag/js/gpt.js",
          () => {
            try {
              window.googletag.cmd.push(() => {
                const pubAds = window.googletag.pubads();
                pubAds.enableSingleRequest();
                window.googletag.enableServices();
                setState((s) => ({ ...s, isGPTInitialized: true }));
              });
            } catch (e) {
              console.error("GPT init error", e);
            }
          },
          (err) => console.error("GPT load error", err)
        );
      }, 2000);
    }

    return () => {
      if (gptScriptRef.current?.parentNode)
        gptScriptRef.current.parentNode.removeChild(gptScriptRef.current);
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const id = process.env.NEXT_PUBLIC_COMSCORE_ID;
    if (!id) return;
    window._comscore = window._comscore || [];
    window._comscore.push({ c1: "2", c2: id });

    comscoreScriptRef.current = loadScript(
      `https://sb.scorecardresearch.com/cs/${id}/beacon.js`,
      () => {
        setState((s) => ({ ...s, isComscoreInitialized: true }));
      },
      (err) => console.error("Comscore load error", err)
    );

    return () => {
      if (comscoreScriptRef.current?.parentNode)
        comscoreScriptRef.current.parentNode.removeChild(
          comscoreScriptRef.current
        );
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    const lotameId = process.env.NEXT_PUBLIC_LOTAME_CLIENT_ID;
    if (!lotameId) return;

    const lotameJs = `https://tags.crwdcntrl.net/lt/c/${lotameId}/lt.min.js`;
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        lotameScriptRef.current = loadScript(
          lotameJs,
          () => {
            setState((s) => ({ ...s, isLotameInitialized: true }));
          },
          (err) => console.error("Lotame load error", err)
        );
      });
    } else {
      setTimeout(() => {
        lotameScriptRef.current = loadScript(
          lotameJs,
          () => {
            setState((s) => ({ ...s, isLotameInitialized: true }));
          },
          (err) => console.error("Lotame load error", err)
        );
      }, 2000);
    }

    return () => {
      if (lotameScriptRef.current?.parentNode)
        lotameScriptRef.current.parentNode.removeChild(lotameScriptRef.current);
    };
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
