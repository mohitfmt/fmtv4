import LTRNewsPreview from "@/components/common/LTRNewsPreview";
import SectionHeading from "@/components/common/SectionHeading";
import Footer from "@/components/footer/Footer";
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

const prisma = new PrismaClient();
const playlistId = "PLKe9JQ8opkEAErOOqs4tB87iWhuh_-osl";

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
  topNewsAllCategory,
  preview,
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
                // topNewsPosts,
                businessPosts,
                // opinionPosts,
                // worldPosts,
                // leisurePosts,
                // sportsPosts,
                // beritaPosts,
                // videoPosts,
                // columnists,
              })
            ),
          }}
          type="application/ld+json"
        />
        <script src="https://apis.google.com/js/platform.js" async defer />
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
        </section>
      </main>

      <Footer />
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ preview = false }) => {
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
    getFilteredCategoryNews("top-news", 8),
    getFilteredCategoryNews("business", 3),
    getFilteredCategoryNews("opinion", 8),
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

  const topNewsAllCategory = [
    heroPosts[0] && { ...heroPosts[0], categoryName: "super-highlight" },
    highlightPosts[0] && { ...highlightPosts[0], categoryName: "highlight" },
    topNewsPosts[0] && { ...topNewsPosts[0], categoryName: "top-news" },
    businessPosts[0] && { ...businessPosts[0], categoryName: "business" },
    opinionPosts[0] && { ...opinionPosts[0], categoryName: "opinion" },
    worldPosts[0] && { ...worldPosts[0], categoryName: "world" },
    leisurePosts[0] && { ...leisurePosts[0], categoryName: "leisure" },
    sportsPosts[0] && { ...sportsPosts[0], categoryName: "sports" },
    beritaPosts[0] && { ...beritaPosts[0], categoryName: "top-bm" },
    videoPosts[0] && { ...videoPosts[0].node, categoryName: "video" },
  ].filter(Boolean);

  const columnistsIds = await prisma?.columnist?.findMany({
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
      topNewsAllCategory,
      preview,
      videoPosts,
      columnists,
      trendingTags,
    },
    revalidate: 1500, // 25 minutes
  };
};
