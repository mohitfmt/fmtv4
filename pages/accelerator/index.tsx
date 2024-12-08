/* eslint-disable @next/next/no-img-element */
// import { YouTubeEmbed } from "@next/third-parties/google";
import { Button } from "@/components/ui/button";
import { Metadata } from "next";
// import VerticalImagePost from "@/components/post/vertical-image-post";
// import AdSlot from "@/components/ui/ad-slot";
// import { Button } from "@/components/ui/button";
// import { GET_POSTS } from "@/lib/queries/get-posts";
// import { getClient } from "@/lib/urql-client";
// import { PostCardProps } from "@/types";

export const metadata: Metadata = {
  title: "Accelerator | Free Malaysia Today (FMT)",
  description:
    "Calling for start-up and SME: Check out how would Free Malaysia Today (FMT) accelerate and scale up your business to a whole new level.",
};

const dfpTargetingParams = {
  key: ["Accelerator"],
  section: ["Accelerator"],
  pos: "accelerator",
};

const page = async () => {
//   const { data } = await getClient().query(GET_POSTS, {
//     where: {
//       taxQuery: {
//         taxArray: [
//           {
//             terms: ["accelerator"],
//             taxonomy: "TAG",
//             field: "SLUG",
//           },
//         ],
//         relation: "AND",
//       },
//     },
//     first: 9,
//   });

  return (
    <div className="container p-4">
      <div className="mb-4 hidden justify-center md:flex">
        {/* <AdSlot
          sizes={[
            [970, 90],
            [970, 250],
            [728, 90],
          ]}
          className="mx-auto overflow-hidden text-center"
          customStyle={{ minWidth: "728px", minHeight: "90px" }}
          dfpTargetingParams={dfpTargetingParams}
          id="div-gpt-ad-1661333181124-0"
          name="ROS_Billboard"
          onlyDesktop={true}
        /> */}
      </div>
      <div className="mb-4 flex justify-center md:hidden">
        {/* <AdSlot
          sizes={[
            [320, 50],
            [320, 100],
          ]}
          className="mx-auto overflow-hidden text-center"
          customStyle={{ minWidth: "320px", minHeight: "50px" }}
          dfpTargetingParams={dfpTargetingParams}
          id="div-gpt-ad-1661362470988-0"
          name="ROS_Mobile_Leaderboard"
          onlyMobile={true}
        /> */}
      </div>
      <div className="flex flex-col items-center justify-evenly gap-4 md:flex-row">
        <img
          alt="Free Malaysia Today"
          className="h-24 w-80"
          src="https://stg-origin-s3media.freemalaysiatoday.com/wp-content/uploads/2021/02/desktop_544x180-new-logo-2021.png"
        />
        <img
          alt="winacore"
          className="h-24 w-80"
          src="https://stg-origin-s3media.freemalaysiatoday.com/wp-content/uploads/2022/06/winacore.png"
        />
      </div>
      <h1 className="mt-4 py-2 text-4xl font-extrabold">
        Accelerate Your Business With FMT
      </h1>
      <p className="py-2 font-roboto">In collaboration with Winacore Capital</p>
      <h2 className="py-2 text-3xl font-extrabold">
        FMT is investing in high potential Ventures/Startups
      </h2>
      <p className="py-2 font-roboto">
        Are you a high growth start-up or SME that needs marketing firepower to
        scale up?
      </p>
      <p className="py-2 font-roboto">
        Tap on the English news platform with the largest readership in
        Malaysia*.
      </p>
      <h3 className="py-2 text-3xl font-extrabold">Talk to us</h3>
      <p className="py-2 font-roboto">Criteria:</p>
      <ul className="list-disc space-y-2 px-6 font-roboto">
        <li>SME</li>
        <li>Already have a product and revenue</li>
        <li>Have a full time dedicated team</li>
      </ul>
      <p className="py-2 font-roboto">
        Drop us a message with your company profile to :{" "}
        <a href="mailto:accelerator@freemalaysiatoday.com">
          accelerator@freemalaysiatoday.com
        </a>
      </p>
      <p className="py-2 font-roboto">
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
      <p className="mt-4 text-center font-roboto text-xl">Products2U</p>
      <div className="flex flex-col items-center justify-center">
        <img
          alt="winacore"
          className="h-80 w-80"
          src="https://stg-origin-s3media.freemalaysiatoday.com/wp-content/uploads/2022/08/NEW-LOGO-TRANS.png"
        />
        <a href="https://products2u.my/" target="_blank">
          <Button className="rounded-full font-bold uppercase" size="lg">
            Go to Website
          </Button>
        </a>
      </div>
      <div className="py-8">
        {/* <YouTubeEmbed
          params="controls=1&showinfo=1"
          style="max-width: 100%; rounded: 50px"
          videoid="y0-9U833K2k"
        /> */}
      </div>
      <h2 className="text-2xl font-extrabold">Latest News</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* {data?.posts?.edges?.map(({ node }: { node: PostCardProps }) => (
          <VerticalImagePost
            key={node?.id}
            imageClassNames="h-32 md:h-48 lg:h-52"
            post={node}
          />
        ))} */}
      </div>
      <h2 className="text-2xl font-extrabold">Latest Videos</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* <YouTubeEmbed
          params="controls=1&showinfo=1"
          style="max-width: 100%; rounded: 50px"
          videoid="y0-9U833K2k"
        /> */}
      </div>
    </div>
  );
};

export default page;
