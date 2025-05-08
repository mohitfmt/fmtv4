import { GPTContext } from "@/contexts/GPTProvider";
import React, { useEffect, useRef, useContext, useState } from "react";
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
  const finalTargetingParams = {
    site: "fmt",
    ...targetingParams,
  };

  const adRef = useRef<HTMLDivElement>(null);
  const { definePageAdSlot, softRemovePageAdSlot, removeAdSlots } =
    useContext(GPTContext);
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isFirstRefresh, setIsFirstRefresh] = useState(true);

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateVisibility = () => {
      const width = window.innerWidth;
      if (
        (visibleOnDevices === "onlyMobile" && width <= 768) ||
        (visibleOnDevices === "onlyDesktop" && width > 768)
      ) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
      if (visibleOnDevices === "both") {
        setIsVisible(true);
      }
    };

    updateVisibility();
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("resize", updateVisibility);
    };
  }, [visibleOnDevices]);

  const refreshAd = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const delay = isFirstRefresh ? 1000 : 45000;

    refreshTimeoutRef.current = setTimeout(() => {
      window.googletag.cmd.push(() => {
        const foundSlot = window.googletag
          .pubads()
          .getSlots()
          .find((slot: any) => slot.getSlotElementId() === id);

        if (foundSlot) {
          window.googletag.pubads().refresh([foundSlot]);
        }
      });
      setIsFirstRefresh(false);
    }, delay);
  };

  useEffect(() => {
    if (!isVisible) return;

    const slotParams = {
      name,
      id,
      sizes,
      outOfPage,
      isInterstitial,
      customDfpTargetingParams: finalTargetingParams,
      displayNow: false,
    };

    const handleSlotRenderEnded = (
      event: googletag.events.SlotRenderEndedEvent
    ) => {
      if (event.slot.getSlotElementId() === id) {
        setIsAdLoaded(true);
      }
    };

    definePageAdSlot(slotParams, ({ slot }) => {
      if (slot) {
        window.googletag.cmd.push(() => {
          const pubads = window.googletag.pubads();
          // Clear old targeting
          slot.clearTargeting();
          // Set targeting parameters
          Object.entries(finalTargetingParams).forEach(([key, value]) => {
            slot.setTargeting(key, value);
          });

          pubads.addEventListener("slotRenderEnded", handleSlotRenderEnded);

          // Enable SRA if not already enabled
          pubads.enableSingleRequest();

          // Enable lazy loading
          pubads.enableLazyLoad({
            fetchMarginPercent: 500,
            renderMarginPercent: 200,
            mobileScaling: 2.0,
          });

          // Display the ad
          window.googletag.display(id);

          // Initial refresh
          refreshAd();
        });

        // Set up a periodic refresh (e.g., every 60 seconds)
        const refreshInterval = setInterval(refreshAd, 60000);

        return () => {
          clearInterval(refreshInterval);
          window.googletag.cmd.push(() => {
            const pubads = window.googletag.pubads();
            pubads.removeEventListener(
              "slotRenderEnded",
              handleSlotRenderEnded
            );
          });
        };
      }
    });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      softRemovePageAdSlot(id);
      removeAdSlots([{ ...slotParams }]);
    };
  }, [
    isVisible,
    name,
    sizes,
    id,
    finalTargetingParams,
    outOfPage,
    isInterstitial,
    definePageAdSlot,
    softRemovePageAdSlot,
    removeAdSlots,
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
