import Meta from "@/components/common/Meta";
import AdSlot from "@/components/common/AdSlot";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";

const dfpTargetingParams = {
  pos: "listing",
  section: ["disclaimers or copyright page"],
  key: gerneralTargetingKeys,
};

const DisclaimersPage = () => {
  return (
    <>
      <Meta
        title="Disclaimers / Copyright | Free Malaysia Today (FMT)"
        description="Our site is also hooked up to other websites. However, we are not responsible for the content, accuracy, and opinions carried in these sites. If you access any of these websites, you do so at your own risk. Some or all of the material on our website are protected under copyright laws."
        canonical="disclaimers-copyright"
      />

      <div className="ads-dynamic-desktop">
        <AdSlot
          sizes={[
            [970, 90],
            [970, 250],
            [728, 90],
          ]}
          targetingParams={dfpTargetingParams}
          id="div-gpt-ad-1661333181124-0"
          name="ROS_Billboard"
          visibleOnDevices="onlyDesktop"
        />
      </div>
      <div className="ads-small-mobile">
        <AdSlot
          sizes={[
            [320, 50],
            [320, 100],
          ]}
          targetingParams={dfpTargetingParams}
          id="div-gpt-ad-1661362470988-0"
          name="ROS_Mobile_Leaderboard"
          visibleOnDevices="onlyMobile"
        />
      </div>
      <div className="text-left py-4">
        {/* Page Content */}
        <h1 className="mt-4 py-2 text-center text-4xl font-extrabold">
          Disclaimers / Copyright
        </h1>
        <p className="py-2">
          Our site is also hooked up to other websites. However, we are not
          responsible for the content, accuracy, and opinions carried in these
          sites. If you access any of these websites, you do so at your own
          risk.
        </p>
        <p className="py-2">
          Some or all of the material on our website are protected under
          copyright laws. No portion may be copied, reproduced, or redistributed
          in any manner whatsoever without the consent of the copyright owners.
        </p>
      </div>

      {/* Pixel Ad */}
      <AdSlot
        id="div-gpt-ad-1661362827551-0"
        name="Pixel"
        targetingParams={dfpTargetingParams}
        sizes={[1, 1]}
        additionalStyle={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "var(--muted)",
          height: 0,
        }}
      />

      {/* OutOfPage Ad */}
      <AdSlot
        id="div-gpt-ad-1661362765847-0"
        name="OutOfPage"
        sizes={[1, 1]}
        outOfPage={true}
        targetingParams={dfpTargetingParams}
        additionalStyle={{
          position: "absolute",
          top: 0,
          left: 0,
          backgroundColor: "var(--muted)",
          height: 0,
        }}
      />
    </>
  );
};

export default DisclaimersPage;
