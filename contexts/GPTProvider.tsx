import React, {
  createContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

interface GPTContextType {
  addPageAdSlot: (id: string, params: any) => void;
  removeAdSlots: (slots?: any[]) => Promise<boolean>;
  definePageAdSlot: (params: any, callback?: (slot: any) => void) => void;
  softRemovePageAdSlot: (id: string) => void;
}

const defaultContext: GPTContextType = {
  addPageAdSlot: () => console.warn("addPageAdSlot not implemented"),
  removeAdSlots: () => Promise.resolve(false),
  definePageAdSlot: () => console.warn("definePageAdSlot not implemented"),
  softRemovePageAdSlot: () =>
    console.warn("softRemovePageAdSlot not implemented"),
};

export const GPTContext = createContext<GPTContextType>(defaultContext);

const GPTProvider: React.FC<{
  children: React.ReactNode;
  prefix: string;
  networkId: string;
  bodyAdSlots: Record<string, any>;
  dfpTargetingParams: Record<string, any>;
  asPath: string;
}> = ({
  children,
  prefix,
  networkId,
  bodyAdSlots,
  dfpTargetingParams,
  asPath,
}) => {
  const pageAdSlotsRef = useRef<Record<string, any>>({});
  const [isGPTInitialized, setIsGPTInitialized] = useState(false);
  const initializationTimer = useRef<NodeJS.Timeout>();
  const scriptLoadedRef = useRef(false);

  const addPageAdSlot = useCallback(
    (id: string, params = {}) => {
      const pageAdSlots = pageAdSlotsRef.current;

      if (pageAdSlots && pageAdSlots[id]) {
        return;
      }

      pageAdSlotsRef.current = {
        ...pageAdSlots,
        [id]: {
          slot: null,
          params: {
            ...params,
            dfpTargetingParams,
          },
        },
      };
    },
    [dfpTargetingParams]
  );

  const softRemovePageAdSlot = useCallback((id: string) => {
    const pageAdSlots = pageAdSlotsRef.current;
    if (pageAdSlots && !pageAdSlots[id]) {
      return;
    }
    const { [id]: pageAdSlot, ...otherPageAdSlots } = pageAdSlots as Record<
      string,
      any
    >;
    pageAdSlotsRef.current = otherPageAdSlots;
  }, []);

  const removeAdSlots = useCallback((slots: any[] = []): Promise<boolean> => {
    return new Promise((resolve) => {
      window.googletag?.cmd.push(() => {
        if (slots.length) {
          resolve(!!window.googletag.destroySlots(slots));
        } else {
          resolve(!!window.googletag.destroySlots());
        }
      });
    });
  }, []);

  const definePageAdSlot = useCallback(
    (params: any, cb: any = null) => {
      if (!window.googletag) {
        // Queue for later if GPT not loaded yet
        const retryDefine = () => definePageAdSlot(params, cb);
        initializationTimer.current = setTimeout(retryDefine, 200);
        return;
      }

      window.googletag?.cmd.push(() => {
        const existingSlot = window.googletag
          ?.pubads()
          .getSlots()
          .find((slot: any) => slot.getSlotElementId() === params.id);

        if (existingSlot && cb) {
          cb({ id: params.id, slot: existingSlot });
          return;
        }

        const {
          name,
          id,
          sizes,
          outOfPage,
          customDfpTargetingParams,
          displayNow = false,
        } = params;
        const slotName = `/${networkId}/${prefix}_${name}`;

        let slot;

        if (outOfPage) {
          slot = window.googletag
            .defineOutOfPageSlot(slotName, id)
            ?.addService(window.googletag.pubads());
        } else {
          slot = window.googletag
            .defineSlot(slotName, sizes, id)
            ?.addService(window.googletag.pubads());
        }
        if (slot) {
          Object.entries({
            ...dfpTargetingParams,
            ...customDfpTargetingParams,
          }).forEach(([key, value]) => {
            if (typeof value === "string" || Array.isArray(value)) {
              slot.setTargeting(key, value);
            } else if (value !== null && value !== undefined) {
              slot.setTargeting(key, String(value));
            }
          });
          if (displayNow) {
            window.googletag.display(id);
          }
        }
        if (cb) {
          cb({ id, slot });
        }
      });
    },
    [dfpTargetingParams, networkId, prefix]
  );

  useEffect(() => {
    if (isGPTInitialized || scriptLoadedRef.current) return;

    const initGPT = () => {
      if (scriptLoadedRef.current) return;
      scriptLoadedRef.current = true;

      if (!window.googletag) {
        window.googletag = { cmd: [] } as unknown as typeof googletag;
      }

      window.googletag.cmd.push(() => {
        try {
          const pubAdsService = window.googletag.pubads();
          pubAdsService.enableSingleRequest();
          pubAdsService.enableLazyLoad({
            fetchMarginPercent: 100,
            renderMarginPercent: 50,
            mobileScaling: 2.0,
          });
          setIsGPTInitialized(true);
        } catch (error) {
          console.error("GPT Initialization Error:", error);
          scriptLoadedRef.current = false;
        }
      });
    };

    const loadScript = () => {
      const script = document.createElement("script");
      script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
      script.async = true;
      script.onload = initGPT;
      script.onerror = () => {
        console.error("Failed to load GPT script");
        scriptLoadedRef.current = false;
      };
      document.head.appendChild(script);
    };

    // Use setTimeout to ensure this runs after initial render
    initializationTimer.current = setTimeout(() => {
      if (!window.googletag) {
        loadScript();
      } else {
        initGPT();
      }
    }, 0);

    return () => {
      if (initializationTimer.current) {
        clearTimeout(initializationTimer.current);
      }
    };
  }, []);

  return (
    <GPTContext.Provider
      value={{
        addPageAdSlot,
        softRemovePageAdSlot,
        definePageAdSlot,
        removeAdSlots,
      }}
    >
      {children}
    </GPTContext.Provider>
  );
};

export { GPTProvider };
export default GPTProvider;
