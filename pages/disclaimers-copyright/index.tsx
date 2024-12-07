import AdSlot from "@/components/common/AdSlot";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimers / Copyright | Free Malaysia Today (FMT)",
  description:
    "Our site is also hooked up to other websites. However, we are not responsible for the content, accuracy, and opinions carried in these sites. If you access any of these websites, you do so at your own risk. Some or all of the material on our website are protected under copyright laws.",
};

const dfpTargetingParams = {
  pos: 'listing',
  section: ['disclaimers or copyright page'],
}

const DisclaimersPage = () => {
  return (
    <div className="text-left p-4">
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
        Disclaimers / Copyright
      </h1>
      <p className="py-2">
        Our site is also hooked up to other websites. However, we are not
        responsible for the content, accuracy, and opinions carried in these
        sites. If you access any of these websites, you do so at your own risk.
      </p>
      <p className="py-2">
        Some or all of the material on our website are protected under copyright
        laws. No portion may be copied, reproduced, or redistributed in any
        manner whatsoever without the consent of the copyright owners.
      </p>
    </div>
  );
};

export default DisclaimersPage;
