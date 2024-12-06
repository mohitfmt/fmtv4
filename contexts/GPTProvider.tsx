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

export const GPTProvider: React.FC<{
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
  useEffect(() => {
    if (!isGPTInitialized) {
      // Initialize GPT here
      setIsGPTInitialized(true);
    }
  }, []);

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

        if (existingSlot) {
          cb && cb({ id: params.id, slot: existingSlot });
          return;
        }

        let slot;
        const {
          name,
          id,
          sizes,
          customDfpTargetingParams,
          displayNow = false,
        } = params;
        const slotName = `/${networkId}/${prefix}_${name}`;

        slot = window.googletag
          ?.defineSlot(slotName, sizes, id)
          ?.addService(window.googletag.pubads());

        if (slot) {
          Object.entries({
            ...dfpTargetingParams,
            ...customDfpTargetingParams,
          }).forEach(([key, value]) => {
            slot.setTargeting(key, value);
          });
          displayNow && window.googletag.display(id);
        }
        cb && cb({ id, slot });
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
        setIsGPTInitialized(true);
      });
    };

    if (!window.googletag) {
      const script = document.createElement("script");
      script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
      script.async = true;
      script.onload = initGPT;
      document.head.appendChild(script);
    } else {
      initGPT();
    }

    // Remove the manual refresh logic
  }, [isGPTInitialized]);

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
