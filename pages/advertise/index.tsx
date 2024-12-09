import AdSlot from "@/components/common/AdSlot";
import Meta from "@/components/common/Meta";

const dfpTargetingParams = {
  pos: "listing",
  section: ["advertise with us page"],
};

const Advertise = () => {
  return (
    <>
      <Meta
        title="Advertise With Us | Free Malaysia Today (FMT)"
        description="Advertise with Free Malaysia Today (FMT)"
        canonical="advertise"
      />

      <div className="text-center p-4">
        <div className="mb-4 hidden justify-center md:flex">
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
        <div className="mb-4 flex justify-center md:hidden">
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
        <h1 className="mt-4 py-2 text-center text-4xl font-extrabold">
          Advertise With Us
        </h1>
        <p className="py-4 text-center">
          For advertising rates and queries, please email us at{" "}
          <a
            className="text-accent-blue"
            href="mailto:advertise@freemalaysiatoday.com"
            rel="noopener noreferrer"
          >
            advertise@freemalaysiatoday.com
          </a>
        </p>
      </div>
    </>
  );
};

export default Advertise;
