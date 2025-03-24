import AdSlot from "@/components/common/AdSlot";
import LTRNewsPreview from "@/components/common/news-preview-cards/LTRNewsPreview";
import SectionHeading from "@/components/common/SectionHeading";
import TrendingNSubCategoriesList from "@/components/common/TrendingNSubCategoriesList";
import TTBNewsPreview from "@/components/common/news-preview-cards/TTBNewsPreview";
import ColumnistCredits from "@/components/landing-pages/ColumnistCredits";
import LatestVideosOnHomePage from "@/components/landing-pages/LatestVideosOnHomePage";
import SuperNewsPreview from "@/components/landing-pages/SuperNewsPreview";
import { WebPageJsonLD, websiteJSONLD } from "@/constants/jsonlds/org";
import siteConfig from "@/constants/site-config";
import { getCategoryNews } from "@/lib/gql-queries/get-category-news";
import { getColumnists } from "@/lib/gql-queries/get-columnists";
import { generateCollectionPageJsonLD } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";
import { GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import CategorySidebar from "@/components/common/CategorySidebar";
import { getPlaylist } from "@/lib/api";
import HomeFooter from "@/components/landing-pages/HomeFooter";
import { useSectionData } from "@/hooks/useSectionData";
import { BusinessSectionSkeleton } from "@/components/skeletons/HomePageSkeletons";
import HomeCommonSections from "@/components/landing-pages/HomeCommonSections";
import HomeTopNewsOpinion from "@/components/landing-pages/HomeTopNewsOpinion";
import { useVisibilityRefresh } from "@/hooks/useVisibilityRefresh";

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
  useVisibilityRefresh();
  const { posts: currentBusinessPosts, loading: businessLoading } =
    useSectionData(businessPosts, "business", 3);

  const { posts: currentWorldPosts, loading: worldLoading } = useSectionData(
    worldPosts,
    "world",
    5
  );

  const { posts: currentSportsPosts, loading: sportsLoading } = useSectionData(
    sportsPosts,
    "sports",
    5
  );

  const { posts: currentTopNewsPosts, loading: topNewsLoading } =
    useSectionData(topNewsPosts, "top-news", 6);

  const { posts: currentOpinionPosts, loading: opinionLoading } =
    useSectionData(opinionPosts, "opinion", 6);

  const { posts: currentLeisurePosts, loading: leisureLoading } =
    useSectionData(leisurePosts, "leisure", 5);

  const { posts: currentBeritaPosts, loading: beritaLoading } = useSectionData(
    beritaPosts,
    "top-bm",
    5
  );

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
        {heroPosts[0] && (
          <>
            <link
              rel="preconnect"
              href="https://media.freemalaysiatoday.com"
              crossOrigin="anonymous"
            />
            <link
              rel="preload"
              href={heroPosts[0]?.featuredImage?.node?.sourceUrl}
              as="image"
              imageSrcSet={`${heroPosts[0]?.featuredImage?.node?.sourceUrl}?w=640 640w, ${heroPosts[0]?.featuredImage?.node?.sourceUrl}?w=940 940w`}
              imageSizes="(max-width: 640px) 100vw, 940px"
            />
          </>
        )}

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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WebPageJsonLD) }}
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
      <TrendingNSubCategoriesList items={trendingTags} variant="trending" />
      <main>
        <section
          id="TopSection"
          className="my-4 grid grid-cols-1 gap-4 md:grid-cols-12"
        >
          <div className="order-3 md:col-span-12 xl:order-1 xl:col-span-3">
            <Link href="/business">
              <SectionHeading sectionName="Business" />
            </Link>
            {businessLoading ? (
              <BusinessSectionSkeleton />
            ) : (
              <div className="gap-2 sm:block md:grid md:grid-cols-2 md:gap-8 xl:block">
                {currentBusinessPosts?.map((bizPost: any) => (
                  <LTRNewsPreview key={bizPost?.slug} {...bizPost} />
                ))}
              </div>
            )}
          </div>
          <div className="order-1 md:col-span-7 xl:order-2 xl:col-span-5">
            <SuperNewsPreview {...heroPosts[0]} />
          </div>
          <div className="order-2 md:col-span-5 xl:order-3 xl:col-span-4">
            <Link href="/news">
              <SectionHeading sectionName="Breaking" />
            </Link>
            <div className="grid gap-2 grid-cols-2">
              {highlightPosts?.map((highlightPost: any) => (
                <TTBNewsPreview key={highlightPost?.slug} {...highlightPost} />
              ))}
            </div>
          </div>
        </section>
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

        <section
          id="TopNews-MostViewed"
          className="my-4 grid grid-cols-3 gap-4 gap-x-6"
        >
          <div className="col-span-3 lg:col-span-2">
            <HomeTopNewsOpinion
              posts={currentTopNewsPosts}
              loading={opinionLoading}
              categoryRoute="news"
              categoryName="top-news"
              sectionTitle="Top News"
            />
          </div>
          <div className="col-span-3 mb-3 flex flex-col lg:col-span-1">
            <CategorySidebar
              pageName="home"
              adsTargetingParams={dfpTargetingParams}
            />
          </div>
        </section>

        <HomeCommonSections
          posts={currentBeritaPosts}
          loading={beritaLoading}
          categoryRoute="berita"
          categoryName="top-bm"
          sectionTitle="Berita Utama"
          sectionId="Berita-Utama"
        />

        <LatestVideosOnHomePage videos={videoPosts} />

        <div className="ads-tall-mobile">
          <AdSlot
            id="div-gpt-ad-1661355926077-0"
            name="ROS_Halfpage"
            sizes={[300, 600]}
            visibleOnDevices="onlyMobile"
            targetingParams={dfpTargetingParams}
          />
        </div>
        <section
          id="Opinion-Columnist"
          className="my-4 grid grid-cols-3 gap-6 gap-y-10"
        >
          <div className="col-span-3 lg:col-span-2">
            <HomeTopNewsOpinion
              posts={currentOpinionPosts}
              loading={topNewsLoading}
              categoryRoute="opinion"
              categoryName="opinion"
              sectionTitle="Opinion"
            />
          </div>
          <div className="col-span-3 flex h-screen flex-col md:h-auto lg:col-span-1">
            <SectionHeading sectionName="Columnist" />
            <ColumnistCredits columnists={columnists} />
          </div>
        </section>

        <HomeCommonSections
          posts={currentWorldPosts}
          loading={worldLoading}
          categoryRoute="world"
          categoryName="world"
          sectionTitle="World News"
          sectionId="World-News"
        />
        <div className="ads-small-desktop">
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
        <HomeCommonSections
          posts={currentLeisurePosts}
          loading={leisureLoading}
          categoryRoute="lifestyle"
          categoryName="leisure"
          sectionTitle="Lifestyle"
          sectionId="Lifestyle-News"
        />
        <HomeCommonSections
          posts={currentSportsPosts}
          loading={sportsLoading}
          categoryRoute="sports"
          categoryName="sports"
          sectionTitle="Sports News"
          sectionId="Sports-News"
        />
      </main>
      <footer>
        <HomeFooter currentHighlightPosts={highlightPosts} />
      </footer>
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
      try {
        const allPosts = await getCategoryNews(
          categoryName,
          limit + excludeSlugs?.length + additionalExcludes?.length,
          preview
        );

        return allPosts
          .filter(
            (post: { slug: string }) =>
              !excludeSlugs?.includes(post?.slug) &&
              !additionalExcludes?.includes(post?.slug)
          )
          .slice(0, limit);
      } catch (error) {
        console.error(`Error fetching ${categoryName} posts:`, error);
        return []; // Return empty array on error
      }
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
      getFilteredCategoryNews("top-news", 6).catch(() => []),
      getFilteredCategoryNews("business", 3).catch(() => []),
      getFilteredCategoryNews("opinion", 6).catch(() => []),
      getFilteredCategoryNews("world", 5).catch(() => []),
      getFilteredCategoryNews("leisure", 5).catch(() => []),
      getFilteredCategoryNews("sports", 5).catch(() => []),
      getFilteredCategoryNews("super-bm", 1).catch(() => []),
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

    let videoPosts = [];
    try {
      const data = await getPlaylist(playlistId);
      if (!data) {
        throw new Error(`Failed to fetch data: ${data?.statusText}`);
      }
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
      revalidate: 1500, // Re-generate every 25 minutes
    };
  } catch (error) {
    console.error("[HomePage] Error fetching data:", error);
    return {
      notFound: true,
      revalidate: 10, // Try again sooner if there was an error
    };
  }
};
