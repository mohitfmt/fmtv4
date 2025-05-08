import AdSlot from "@/components/common/AdSlot";
import Meta from "@/components/common/Meta";
import { ObfuscatedEmail } from "@/components/common/ObfuscatedContacts";
import { gerneralTargetingKeys } from "@/constants/ads-targeting-params/general";

const dfpTargetingParams = {
  pos: "listing",
  section: ["advertise"],
  key: ["Adevertise", ...gerneralTargetingKeys],
};

const Advertise = () => {
  return (
    <>
      <Meta
        title="Advertise With Us | Free Malaysia Today (FMT)"
        description="Advertise with Free Malaysia Today (FMT)"
        canonical="advertise"
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

      <div className="text-center py-4">
        <h1 className="mt-4 py-2 text-center text-4xl font-extrabold">
          Advertise With Us
        </h1>
        <p className="py-4 text-center">
          For advertising rates and queries, please email us at
          <span className="ml-2">
            <ObfuscatedEmail email="advertise@freemalaysiatoday.com" />
          </span>
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

export default Advertise;
