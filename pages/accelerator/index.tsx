import AdSlot from "@/components/common/AdSlot";
import Meta from "@/components/common/Meta";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const dfpTargetingParams = {
  key: ["Accelerator"],
  section: ["Accelerator"],
  pos: "accelerator",
};

const AcceleratorPage = () => {
  return (
    <>
      <Meta
        title="Accelerator | Free Malaysia Today (FMT)"
        description="Calling for start-up and SME: Check out how Free Malaysia Today (FMT) can accelerate and scale up your business to a whole new level."
        canonical="accelerator"
      />

      <div className="py-4">
        {/* AdSlot for Desktop */}
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

        {/* AdSlot for Mobile */}
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

        {/* Page Content */}
        <div className="flex flex-col items-center justify-evenly gap-4 md:flex-row">
          <Image
            alt="Free Malaysia Today"
            className="h-24 w-80"
            src="https://stg-origin-s3media.freemalaysiatoday.com/wp-content/uploads/2021/02/desktop_544x180-new-logo-2021.png"
            width={320}
            height={96}
          />
          <Image
            alt="Winacore"
            className="h-24 w-80"
            src="https://stg-origin-s3media.freemalaysiatoday.com/wp-content/uploads/2022/06/winacore.png"
            width={320}
            height={96}
          />
        </div>
        <h1 className="mt-4 py-2 text-4xl font-extrabold">
          Accelerate Your Business With FMT
        </h1>
        <p className="py-2">In collaboration with Winacore Capital</p>
        <h2 className="py-2 text-3xl font-extrabold">
          FMT is investing in high potential Ventures/Startups
        </h2>
        <p className="py-2">
          Are you a high-growth start-up or SME that needs marketing firepower
          to scale up?
        </p>
        <p className="py-2">
          Tap into the English news platform with the largest readership in
          Malaysia*.
        </p>
        <h3 className="py-2 text-3xl font-extrabold">Talk to us</h3>
        <p className="py-2 font-roboto">Criteria:</p>
        <ul className="list-disc space-y-2 px-6 font-roboto">
          <li>SME</li>
          <li>Already have a product and revenue</li>
          <li>Have a full-time dedicated team</li>
        </ul>
        <p className="py-2 font-roboto">
          Drop us a message with your company profile to:{" "}
          <a
            href="mailto:accelerator@freemalaysiatoday.com"
            className="text-accent-blue hover:underline"
          >
            accelerator@freemalaysiatoday.com
          </a>
        </p>
        <p className="py-2">
          *According to Similar Web independent traffic analysis
        </p>
        <div className="flex justify-center">
          <a href="mailto:accelerator@freemalaysiatoday.com">
            <Button className="rounded-full font-bold uppercase" size="lg">
              Email Us
            </Button>
          </a>
        </div>
        <h2 className="mt-8 text-center text-4xl font-extrabold">Partners</h2>
        <p className="mt-4 text-center text-xl">Products2U</p>
        <div className="flex flex-col items-center justify-center">
          <Image
            alt="Products2U"
            className="h-80 w-80"
            src="https://stg-origin-s3media.freemalaysiatoday.com/wp-content/uploads/2022/08/NEW-LOGO-TRANS.png"
            width={320}
            height={320}
          />
          <a
            href="https://products2u.my/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="rounded-full font-bold uppercase" size="lg">
              Go to Website
            </Button>
          </a>
        </div>
        <h2 className="mt-8 text-2xl font-extrabold">Latest News</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 
        
          {data?.posts?.edges?.map(({ node }) => (
            <VerticalImagePost
              key={node?.id}
              imageClassNames="h-32 md:h-48 lg:h-52"
              post={node}
            />
          ))} 
          */}
        </div>
        <h2 className="mt-8 text-2xl font-extrabold">Latest Videos</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* 
         
          <YouTubeEmbed
            params="controls=1&showinfo=1"
            videoid="y0-9U833K2k"
          /> 
          */}
        </div>
      </div>
    </>
  );
};

export default AcceleratorPage;
