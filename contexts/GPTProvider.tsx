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
  const initializationTimer = useRef<number>();

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
          customDfpTargetingParams,
          displayNow = false,
        } = params;
        const slotName = `/${networkId}/${prefix}_${name}`;

        const slot = window.googletag
          ?.defineSlot(slotName, sizes, id)
          ?.addService(window.googletag.pubads());

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
    const initGPT = () => {
      if (!window.googletag) {
        window.googletag = { cmd: [] } as unknown as typeof googletag;
      }
      window.googletag.cmd.push(() => {
        const pubAdsService = window.googletag.pubads();
        pubAdsService.enableSingleRequest();
        // Enable lazy loading for below-fold ads
        pubAdsService.enableLazyLoad({
          fetchMarginPercent: 100, // Fetch ads within 1 viewport away
          renderMarginPercent: 50, // Render ads within 0.5 viewports away
          mobileScaling: 2.0, // Double the fetch margin on mobile
        });
        setIsGPTInitialized(true);
      });
    };

    // Initialize after first paint
    initializationTimer.current = window.requestAnimationFrame(() => {
      if (!window.googletag) {
        const script = document.createElement("script");
        script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
        script.async = true;
        script.onload = initGPT;
        document.head.appendChild(script);
      } else {
        initGPT();
      }
    });

    return () => {
      if (initializationTimer.current) {
        window.cancelAnimationFrame(initializationTimer.current);
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
