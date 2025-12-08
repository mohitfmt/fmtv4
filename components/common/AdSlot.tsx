import { GPTContext } from "@/contexts/GPTProvider";
import React, {
  useEffect,
  useRef,
  useContext,
  useState,
  useMemo,
  useCallback,
} from "react";

interface AdSlotProps {
  name: string;
  sizes: googletag.GeneralSize;
  id: string;
  targetingParams?: { [key: string]: any };
  visibleOnDevices?: "onlyMobile" | "onlyDesktop" | "both";
  outOfPage?: boolean;
  isInterstitial?: boolean;
  additionalStyle?: React.CSSProperties;
}

const AdSlot: React.FC<AdSlotProps> = ({
  name,
  sizes,
  id,
  targetingParams = {},
  visibleOnDevices = "both",
  outOfPage = false,
  isInterstitial = false,
  additionalStyle,
}) => {
  // Stable keys for memoization
  const sizesKey = JSON.stringify(sizes);
  const targetingParamsKey = JSON.stringify(targetingParams);

  const stableSizes = useMemo(() => sizes, [sizesKey]);
  const finalTargetingParams = useMemo(
    () => ({
      site: "fmt",
      ...targetingParams,
    }),
    [targetingParamsKey]
  );

  const adRef = useRef<HTMLDivElement>(null);
  const { definePageAdSlot, softRemovePageAdSlot } = useContext(GPTContext);

  const [isVisible, setIsVisible] = useState(false);
  const [isFirstRefresh, setIsFirstRefresh] = useState(true);

  // Store references for proper cleanup
  const slotRef = useRef<googletag.Slot | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSlotDisplayedRef = useRef(false);
  const eventListenerRef = useRef<
    ((event: googletag.events.SlotRenderEndedEvent) => void) | null
  >(null);

  // Visibility effect
  useEffect(() => {
    const updateVisibility = () => {
      const width = window.innerWidth;
      if (visibleOnDevices === "both") {
        setIsVisible(true);
      } else if (visibleOnDevices === "onlyMobile" && width <= 768) {
        setIsVisible(true);
      } else if (visibleOnDevices === "onlyDesktop" && width > 768) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    updateVisibility();
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("resize", updateVisibility);
    };
  }, [visibleOnDevices]);

  // Memoized refresh function
  const refreshAd = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const delay = isFirstRefresh ? 1000 : 45000;

    refreshTimeoutRef.current = setTimeout(() => {
      if (!slotRef.current) return;

      window.googletag?.cmd.push(() => {
        const foundSlot = window.googletag
          .pubads()
          .getSlots()
          .find((slot: googletag.Slot) => slot.getSlotElementId() === id);

        if (foundSlot && slotRef.current) {
          window.googletag.pubads().refresh([foundSlot]);
        }
      });
      setIsFirstRefresh(false);
    }, delay);
  }, [id, isFirstRefresh]);

  // Main ad slot effect
  useEffect(() => {
    if (!isVisible) return;

    const slotParams = {
      name,
      id,
      sizes: stableSizes,
      outOfPage,
      isInterstitial,
      customDfpTargetingParams: finalTargetingParams,
      displayNow: false,
    };

    definePageAdSlot(slotParams, ({ slot }) => {
      if (!slot) return;

      // Store the slot reference for cleanup
      slotRef.current = slot;

      window.googletag?.cmd.push(() => {
        const pubads = window.googletag.pubads();

        // Clear old targeting and set new
        slot.clearTargeting();
        Object.entries(finalTargetingParams).forEach(([key, value]) => {
          slot.setTargeting(key, value);
        });

        // Create and store the event listener for cleanup
        const handleSlotRenderEnded = (
          event: googletag.events.SlotRenderEndedEvent
        ) => {
          if (event.slot.getSlotElementId() === id) {
            // Ad loaded successfully
          }
        };
        eventListenerRef.current = handleSlotRenderEnded;
        pubads.addEventListener("slotRenderEnded", handleSlotRenderEnded);

        // Only call display() ONCE per slot lifecycle
        if (!isSlotDisplayedRef.current) {
          pubads.enableSingleRequest();
          pubads.enableLazyLoad({
            fetchMarginPercent: 500,
            renderMarginPercent: 200,
            mobileScaling: 2.0,
          });

          window.googletag.display(id);
          isSlotDisplayedRef.current = true;

          // Initial refresh only on first display
          refreshAd();

          // Set up periodic refresh - store reference for cleanup
          refreshIntervalRef.current = setInterval(() => {
            if (slotRef.current) {
              refreshAd();
            }
          }, 60000);
        }
      });
    });

    // Cleanup function
    return () => {
      // Clear timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      // Clear interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      // Remove event listener
      if (eventListenerRef.current) {
        window.googletag?.cmd.push(() => {
          window.googletag
            .pubads()
            .removeEventListener("slotRenderEnded", eventListenerRef.current!);
        });
        eventListenerRef.current = null;
      }

      // Destroy the actual slot
      if (slotRef.current) {
        window.googletag?.cmd.push(() => {
          if (slotRef.current) {
            window.googletag.destroySlots([slotRef.current]);
          }
        });
        slotRef.current = null;
      }

      // Reset display flag for next mount
      isSlotDisplayedRef.current = false;

      // Clean up internal tracking
      softRemovePageAdSlot(id);
    };
  }, [
    isVisible,
    name,
    stableSizes,
    sizesKey,
    id,
    finalTargetingParams,
    targetingParamsKey,
    outOfPage,
    isInterstitial,
    definePageAdSlot,
    softRemovePageAdSlot,
    refreshAd,
  ]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`${
        visibleOnDevices === "onlyMobile"
          ? "flex md:hidden"
          : visibleOnDevices === "both"
            ? "flex"
            : "hidden md:flex"
      } my-4 flex h-full flex-col items-center justify-center overflow-hidden rounded-sm`}
      style={additionalStyle}
    >
      <div
        id={id}
        ref={adRef}
        className="flex justify-center items-center overflow-hidden"
        style={{
          width:
            Array.isArray(sizes) && Array.isArray(sizes[0])
              ? sizes[0][0]
              : "auto",
          minHeight:
            Array.isArray(sizes) && Array.isArray(sizes[0])
              ? sizes[0][1]
              : "auto",
        }}
      />
    </div>
  );
};

export default AdSlot;
