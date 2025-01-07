import { YouTubeEmbed } from "@next/third-parties/google";
import Image from "next/image";
import { GetStaticProps } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { Button } from "@/components/ui/button";
import AdSlot from "@/components/common/AdSlot";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";
import TTBNewsPreview from "@/components/common/news-preview-cards/TTBNewsPreview";
import { PostsResponse } from "@/types/global";
import Meta from "@/components/common/Meta";

interface AcceleratorPageProps {
  posts: PostsResponse["posts"];
}

const dfpTargetingParams = {
  key: ["Accelerator"],
  section: ["Accelerator"],
  pos: "accelerator",
};

// Constants for cache and revalidation times
const CACHE_MAXAGE = 3600; // 1 hour
const STALE_REVALIDATE = 60; // 1 minute
const ISR_REVALIDATE = 300; // 5 minutes
const ERROR_REVALIDATE = 60; // 1 minute

async function fetchAcceleratorData() {
  const variables = {
    first: 9,
    where: {
      taxQuery: {
        taxArray: [
          {
            terms: ["accelerator"],
            taxonomy: "TAG",
            field: "SLUG",
          },
        ],
        relation: "AND",
      },
    },
  };

  // Add cache headers to the request
  const requestHeaders = {
    "Cache-Control": `s-maxage=${CACHE_MAXAGE}, stale-while-revalidate=${STALE_REVALIDATE}`,
  };

  try {
    const data = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables,
      headers: requestHeaders,
    });

    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}

export const getStaticProps: GetStaticProps = async () => {
  try {
    const data = await fetchAcceleratorData();

    return {
      props: {
        posts: data?.posts || null,
      },
      revalidate: ISR_REVALIDATE,
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    return {
      props: {
        posts: null,
      },
      revalidate: ERROR_REVALIDATE,
    };
  }
};

const AcceleratorPage: React.FC<AcceleratorPageProps> = ({ posts }) => {
  return (
    <>
      <Meta
        title="Accelerator | Free Malaysia Today (FMT)"
        description="Calling for start-up and SME: Check out how Free Malaysia Today (FMT) can accelerate and scale up your business to a whole new level."
        canonical="accelerator"
      />

      {/* AdSlot for Desktop */}
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

      {/* AdSlot for Mobile */}
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
      <div className="py-4">
        <div className="flex flex-col items-center justify-evenly gap-4 md:flex-row">
          <Image
            alt="Free Malaysia Today"
            className="h-24 w-80"
            src="https://stg-origin-s3media.freemalaysiatoday.com/wp-content/uploads/2021/02/desktop_544x180-new-logo-2021.png"
            width={320}
            height={96}
            priority
          />
          <Image
            alt="Winacore"
            className="h-24 w-80"
            src="https://stg-origin-s3media.freemalaysiatoday.com/wp-content/uploads/2022/06/winacore.png"
            width={320}
            height={96}
            priority
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
        <p className="py-2">Criteria:</p>
        <ul className="list-disc space-y-2 px-6">
          <li>SME</li>
          <li>Already have a product and revenue</li>
          <li>Have a full-time dedicated team</li>
        </ul>

        <p className="py-2">
          Drop us a message with your company profile to:{" "}
          <a
            href="mailto:accelerator@freemalaysiatoday.com"
            className="text-blue-800 dark:text-blue-500 hover:underline"
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

        <div className="py-8">
          <YouTubeEmbed
            params="controls=1&showinfo=1"
            style="max-width: 100%; rounded: 50px"
            videoid="y0-9U833K2k"
          />
        </div>

        <h2 className="text-2xl font-extrabold">Latest News</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {posts?.edges?.map(({ node }) => (
            <TTBNewsPreview key={node?.slug} {...node} />
          ))}
        </div>

        <h2 className="mt-5 text-2xl font-extrabold">Latest Videos</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <YouTubeEmbed
            params="controls=1&showinfo=1"
            style="max-width: 100%; rounded: 50px"
            videoid="y0-9U833K2k"
          />
        </div>
      </div>
    </>
  );
};

export default AcceleratorPage;
