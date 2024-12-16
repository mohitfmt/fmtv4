import AdSlot from "@/components/common/AdSlot";
import LTRNewsPreview from "@/components/common/LTRNewsPreview";
import MostViewed from "@/components/common/most-viewed/MostViewed";
import SectionHeading from "@/components/common/SectionHeading";
import TTBNewsPreview from "@/components/common/TTBNewsPreview";
import ColumnistCredits from "@/components/landing-pages/ColumnistCredits";
import LatestVideosOnHomePage from "@/components/landing-pages/LatestVideosOnHomePage";
import SecondarySuperNewsPreview from "@/components/landing-pages/SecondarySuperNewsPreview";
import SuperNewsPreview from "@/components/landing-pages/SuperNewsPreview";
import TrendingTags from "@/components/TrendingTags";
import { websiteJSONLD } from "@/constants/jsonlds/org";
import siteConfig from "@/constants/site-config";
import { getCategoryNews } from "@/lib/gql-queries/get-category-news";
import { getColumnists } from "@/lib/gql-queries/get-columnists";
import { generateCollectionPageJsonLD } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";
import { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import Script from "next/script";

const prisma = new PrismaClient();
const playlistId = "PLKe9JQ8opkEAErOOqs4tB87iWhuh_-osl";
const dfpTargetingParams = {
  pos: "listing",
  section: ["homepage", "business", "opinion", "world", "lifestyle", "sports"],
  key: [
    "Free Malaysia Today",
    "Malaysia News",
    "Latest Malaysia News",
    "Breaking News Malaysia",
    "Malaysia Politics News",
    "gambling",
    "religion",
    "alcohol",
    "lgbt",
    "sex",
    "drug abuse",
    "get rich",
    "match-making",
    "dating",
    "lottery",
  ],
};

export default function Home({
  heroPosts,
  highlightPosts,
  topNewsPosts,
  businessPosts,
  opinionPosts,
  worldPosts,
  leisurePosts,
  sportsPosts,
  beritaPosts,
  videoPosts,
  columnists,
  trendingTags,
}: any) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
        <title>{`${siteConfig.siteName} | ${siteConfig.tagline}`}</title>
        <meta name="description" content={siteConfig.siteDescription} />
        <meta
          name="keywords"
          content="Free Malaysia Today, Malaysia News, Latest Malaysia News, Breaking News Malaysia, Malaysia Politics News, Malaysia Economic News, Malaysia International News, Free News Malaysia, 24/7 News Malaysia, Malaysian Cultural News, English Malay News Online, Comprehensive Malaysian News."
        />

        <link rel="canonical" href={siteConfig.baseUrl} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteConfig.baseUrl} />
        <meta
          property="og:title"
          content={`${siteConfig.siteName} | ${siteConfig.tagline}`}
        />
        <meta property="og:description" content={siteConfig.siteDescription} />
        <meta
          property="og:image"
          content={`${siteConfig.baseUrl}/default-og-image.jpg`}
        />

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={siteConfig.baseUrl} />
        <meta
          property="twitter:title"
          content={`${siteConfig.siteName} | ${siteConfig.tagline}`}
        />
        <meta
          property="twitter:description"
          content={siteConfig.siteDescription}
        />
        <meta
          property="twitter:image"
          content={`${siteConfig.baseUrl}/default-og-image.jpg`}
        />
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJSONLD) }}
          type="application/ld+json"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              generateCollectionPageJsonLD({
                heroPosts,
                highlightPosts,
                topNewsPosts,
                businessPosts,
                opinionPosts,
                worldPosts,
                leisurePosts,
                sportsPosts,
                beritaPosts,
                videoPosts,
                columnists,
              })
            ),
          }}
          type="application/ld+json"
        />
        <meta
          name="google-signin-client_id"
          content={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
        ></meta>
      </Head>
      <TrendingTags tags={trendingTags} />
      <main>
        <section
          id="TopSection"
          className="my-4 grid grid-cols-1 md:grid-cols-12 gap-4"
        >
          <div className="order-3 xl:order-1 xl:col-span-3 md:col-span-12">
            <Link href="/business">
              <SectionHeading sectionName="Business" />
            </Link>
            <div className="xl:block md:grid md:grid-cols-2 sm:block md:gap-8 gap-2">
              {businessPosts?.map((bizPost: any) => (
                <LTRNewsPreview key={bizPost?.slug} {...bizPost} />
              ))}
            </div>
          </div>
          <div className="order-1 xl:order-2 xl:col-span-5 md:col-span-7">
            <SuperNewsPreview {...heroPosts[0]} />
          </div>
          <div className="order-2 xl:order-3 xl:col-span-4 md:col-span-5">
            <Link href="/news">
              <SectionHeading sectionName="Breaking" />
            </Link>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {highlightPosts?.map((highlightPost: any) => (
                <TTBNewsPreview key={highlightPost?.slug} {...highlightPost} />
              ))}
            </div>
          </div>
        </section>
        <div className="h-28 lg:h-64 min-h-24 flex justify-center items-center bg-background">
          <AdSlot
            sizes={[
              [970, 90],
              [970, 250],
              [728, 90],
            ]}
            id="div-gpt-ad-1661333181124-0"
            name="ROS_Billboard"
            visibleOnDevices="onlyDesktop"
            targetingParams={dfpTargetingParams}
          />
          <AdSlot
            sizes={[
              [320, 50],
              [320, 100],
            ]}
            id="div-gpt-ad-1661362470988-0"
            name="ROS_Mobile_Leaderboard"
            visibleOnDevices="onlyMobile"
            targetingParams={dfpTargetingParams}
          />
        </div>
        <section id="TopNews-MostViewed" className="my-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="md:col-span-8 col-span-12">
              <Link href="/news">
                <SectionHeading sectionName="Top News" />
              </Link>
              <div className="grid lg:grid-cols-2 grid-cols-1 gap-4">
                {topNewsPosts
                  ?.slice(0, 2)
                  ?.map((post: any) => (
                    <TTBNewsPreview {...post} key={post.slug} />
                  ))}
              </div>
              <div className="mt-8 grid lg:grid-cols-2 gap-4">
                {topNewsPosts
                  ?.slice(2)
                  ?.map((post: any) => (
                    <LTRNewsPreview {...post} key={post?.slug} />
                  ))}
              </div>
            </div>
            <div className="flex flex-col mb-3 md:col-span-4 col-span-12">
              <div className="flex justify-center items-center h-72 -mt-1">
                <AdSlot
                  sizes={[300, 250]}
                  id="div-gpt-ad-1661333336129-0"
                  name="ROS_Midrec"
                  targetingParams={dfpTargetingParams}
                />
              </div>
              <MostViewed />
            </div>
          </div>
        </section>
        <section id="Berita-Utama" className="my-20">
          <Link href="/berita">
            <SectionHeading sectionName="Berita Utama" />
          </Link>
          <div className="grid grid-cols-12 gap-4">
            <div className="grid col-span-12 lg:col-span-7 grid-cols-1 gap-4">
              {beritaPosts
                ?.slice(0, 1)
                ?.map((post: any) => (
                  <SecondarySuperNewsPreview {...post} key={post.slug} />
                ))}
            </div>
            <div className="grid col-span-12 lg:col-span-5 grid-cols-2 gap-4">
              {beritaPosts
                ?.slice(1)
                ?.map((post: any) => (
                  <TTBNewsPreview {...post} key={post?.slug} />
                ))}
            </div>
          </div>
        </section>
        <LatestVideosOnHomePage videos={videoPosts} />
        <div className="flex justify-center">
          <AdSlot
            id="div-gpt-ad-1661355926077-0"
            name="ROS_Halfpage"
            sizes={[300, 600]}
            visibleOnDevices="onlyMobile"
            targetingParams={dfpTargetingParams}
          />
        </div>
        <section id="Opinion-Columnist" className="my-4">
          <div className="grid grid-cols-12 gap-8">
            <div className="md:col-span-8 col-span-12">
              <Link href="/opinion">
                <SectionHeading sectionName="Opinion" />
              </Link>
              <div className="grid lg:grid-cols-2 grid-cols-1 gap-4">
                {opinionPosts
                  ?.slice(0, 2)
                  ?.map((post: any) => (
                    <TTBNewsPreview {...post} key={post.slug} />
                  ))}
              </div>
              <div className="mt-8 grid lg:grid-cols-2 gap-4">
                {opinionPosts
                  ?.slice(2)
                  ?.map((post: any) => (
                    <LTRNewsPreview {...post} key={post?.slug} />
                  ))}
              </div>
            </div>
            <div className="flex flex-col md:col-span-4 md:h-auto col-span-12 h-screen">
              <Link href="/authors">
                <SectionHeading sectionName="Columnist" />
              </Link>
              <ColumnistCredits columnists={columnists} />
            </div>
          </div>
        </section>
        <section id="World-News" className="my-20">
          <Link href="/world">
            <SectionHeading sectionName="World News" />
          </Link>
          <div className="grid grid-cols-12 gap-4">
            <div className="grid col-span-12 lg:col-span-7 grid-cols-1 gap-4">
              {worldPosts
                ?.slice(0, 1)
                ?.map((post: any) => (
                  <SecondarySuperNewsPreview {...post} key={post.slug} />
                ))}
            </div>
            <div className="grid col-span-12 lg:col-span-5 grid-cols-2 gap-4">
              {worldPosts
                ?.slice(1)
                ?.map((post: any) => (
                  <TTBNewsPreview {...post} key={post?.slug} />
                ))}
            </div>
          </div>
        </section>
        <div className="hidden h-24 md:flex justify-center items-center">
          <AdSlot
            sizes={[
              [728, 90],
              [970, 90],
            ]}
            id="div-gpt-ad-1661418008040-0"
            name="ROS_Multisize_Leaderboard_b"
            visibleOnDevices="onlyDesktop"
            targetingParams={dfpTargetingParams}
          />
        </div>
        <section id="Lifestyle-News" className="my-4">
          <Link href="/lifestyle">
            <SectionHeading sectionName="Lifestyle" />
          </Link>
          <div className="grid grid-cols-12 gap-4">
            <div className="grid col-span-12 lg:col-span-7 grid-cols-1 gap-4">
              {leisurePosts
                ?.slice(0, 1)
                ?.map((post: any) => (
                  <SecondarySuperNewsPreview {...post} key={post.slug} />
                ))}
            </div>
            <div className="grid col-span-12 lg:col-span-5 grid-cols-2 gap-4">
              {leisurePosts
                ?.slice(1)
                ?.map((post: any) => (
                  <TTBNewsPreview {...post} key={post?.slug} />
                ))}
            </div>
          </div>
        </section>
        <section id="Sports-News" className="my-20 mb-32">
          <Link href="/sports">
            <SectionHeading sectionName="Sports News" />
          </Link>
          <div className="grid grid-cols-12 gap-4">
            <div className="grid col-span-12 lg:col-span-7 grid-cols-1 gap-4">
              {sportsPosts
                ?.slice(0, 1)
                ?.map((post: any) => (
                  <SecondarySuperNewsPreview {...post} key={post.slug} />
                ))}
            </div>
            <div className="grid col-span-12 lg:col-span-5 grid-cols-2 gap-4">
              {sportsPosts
                ?.slice(1)
                ?.map((post: any) => (
                  <TTBNewsPreview {...post} key={post?.slug} />
                ))}
            </div>
          </div>
        </section>
      </main>
      <Script
        src="https://apis.google.com/js/platform.js"
        strategy="lazyOnload"
      />
      <Script
        src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"
        strategy="lazyOnload"
      />
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ preview = false }) => {
  try {
    // Fetch hero (super-highlight) posts first
    const heroPosts = await getCategoryNews("super-highlight", 1, preview);

    // Collect slugs from super-highlight to exclude from highlight posts
    const excludeSlugs = Array.isArray(heroPosts)
      ? heroPosts.map((post) => post?.slug).filter(Boolean)
      : [];

    // Modify the getCategoryNews function to accept an excludeSlugs parameter
    const getFilteredCategoryNews = async (
      categoryName: string,
      limit: number,
      additionalExcludes: string[] = []
    ) => {
      const allPosts = await getCategoryNews(
        categoryName,
        limit + excludeSlugs?.length + additionalExcludes?.length,
        preview
      );
      return allPosts
        ?.filter(
          (post: { slug: string }) =>
            !excludeSlugs?.includes(post?.slug) &&
            !additionalExcludes?.includes(post?.slug)
        )
        ?.slice(0, limit);
    };

    // Fetch highlight posts, excluding super-highlight posts
    const highlightPosts = await getFilteredCategoryNews(
      "highlight",
      4,
      excludeSlugs
    );

    // Update excludeSlugs to include highlight posts as well
    if (Array.isArray(highlightPosts)) {
      excludeSlugs.push(
        ...highlightPosts.map((post) => post?.slug).filter(Boolean)
      );
    }

    // Fetch other categories in parallel
    const [
      topNewsPosts,
      businessPosts,
      opinionPosts,
      worldPosts,
      leisurePosts,
      sportsPosts,
      superBmPosts, // Fetch superBmPosts before topBmPosts
    ] = await Promise.all([
      getFilteredCategoryNews("top-news", 6),
      getFilteredCategoryNews("business", 3),
      getFilteredCategoryNews("opinion", 6),
      getFilteredCategoryNews("world", 5),
      getFilteredCategoryNews("leisure", 5),
      getFilteredCategoryNews("sports", 5),
      getFilteredCategoryNews("super-bm", 1), // Fetch superBmPosts here
    ]);

    // Fetch topBmPosts after superBmPosts to exclude superBm slugs
    const topBmPosts = await getFilteredCategoryNews(
      "top-bm",
      4,
      superBmPosts?.map((post: { slug: string }) => post?.slug)
    );

    // Combine superBmPosts and topBmPosts for Berita section
    const beritaPosts = [...superBmPosts, ...topBmPosts]?.slice(0, 5);

    // Fetch video posts
    const jsonUrl = `https://storage.googleapis.com/origin-s3feed.freemalaysiatoday.com/json/youtube-playlist/${playlistId}.json`;
    let videoPosts = [];
    try {
      const res = await fetch(jsonUrl);
      if (!res?.ok) {
        throw new Error(`Failed to fetch data: ${res?.statusText}`);
      }
      const data = await res?.json();
      videoPosts = data ?? [];
      videoPosts = videoPosts?.slice(0, 5);
    } catch (error) {
      console.error("Failed to fetch videos:", error);
    }

    const columnistsIds = await prisma.columnist.findMany({
      select: { userId: true },
    });
    const columnistIds = columnistsIds?.map((id: any) => id?.userId);
    const columnists = await getColumnists(columnistIds, preview);
    const trendingTags = await prisma.trendingTag.findMany();

    return {
      props: {
        heroPosts,
        highlightPosts,
        topNewsPosts,
        businessPosts,
        opinionPosts,
        worldPosts,
        leisurePosts,
        sportsPosts,
        beritaPosts,
        videoPosts,
        columnists,
        trendingTags,
        _lastUpdate: Date.now(),
      },
      revalidate: 1500, // Re-generate every 5 minutes
    };
  } catch (error) {
    console.error("[HomePage] Error fetching data:", error);
    return {
      notFound: true,
      revalidate: 10, // Try again sooner if there was an error
    };
  }
};
