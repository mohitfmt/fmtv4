import { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import Script from "next/script";
import siteConfig from "@/constants/site-config";
import { websiteJSONLD } from "@/constants/jsonlds/org";
// import MostViewed from "@/components/common/most-viewed/MostViewed";
// import AdSlot from "@/components/common/AdSlot";
import ArticleJsonLD from "@/components/news-article/ArticleJsonLD";
import NewsAuthor from "@/components/common/NewsAuthor";
// import PublishingDateTime from "@/components/common/display-date-formats/PublishingDateTime";
import CoverImage from "@/components/common/CoverImage";
import PostBody from "@/components/news-article/PostBody";
import { getAllPostsWithSlug } from "@/lib/gql-queries/get-all-posts-with-slug";
import { getPostAndMorePosts } from "@/lib/gql-queries/get-post-and-more-posts";
import ShareButtons from "@/components/news-article/ShareButtons";
import FullDateDisplay from "@/components/common/display-date-formats/FullDateDisplay";
import dynamic from "next/dynamic";
import { MostViewedSkeleton } from "@/components/skeletons/MostViewedSkeleton";
import { useEffect, useState } from "react";

const MostViewed = dynamic(
  () => import("@/components/common/most-viewed/MostViewed"),
  {
    loading: () => <MostViewedSkeleton />,
    ssr: true,
  }
);

const AdSlot = dynamic(() => import("@/components/common/AdSlot"), {
  ssr: false,
});

// Default tags for articles without tags
const DEFAULT_TAGS = [
  "Malaysia News",
  "Current Events",
  "Breaking News",
  "Malaysian Updates",
];

// Default categories if none are provided
const DEFAULT_CATEGORIES = ["General"];

const AD_REFRESH_INTERVAL = 30000; // 30 seconds
const REVALIDATION_INTERVAL = 300; // 5 minutes

interface ArticleProps {
  post: any;
  posts: any[];
  preview?: boolean;
}

// Helper function to safely get tags
const getSafeTags = (post: any) => {
  if (!post?.tags?.edges || !Array.isArray(post.tags.edges)) {
    return DEFAULT_TAGS;
  }
  const tags = post.tags.edges
    .filter((edge: any) => edge?.node?.name)
    .map((edge: any) => edge.node.name);
  return tags.length > 0 ? tags : DEFAULT_TAGS;
};

// Helper function to safely get categories
const getSafeCategories = (post: any) => {
  if (!post?.categories?.edges || !Array.isArray(post.categories.edges)) {
    return DEFAULT_CATEGORIES;
  }
  const categories = post.categories.edges
    .filter((edge: any) => edge?.node?.name)
    .map((edge: any) => edge.node.name);
  return categories.length > 0 ? categories : DEFAULT_CATEGORIES;
};

const removeFeaturedImage = (content: string): string => {
  if (!content) return "";
  let isFirstFigure = true;
  return content
    .replace(/<figure[^>]*>.*?<\/figure>/g, (match) => {
      if (isFirstFigure) {
        isFirstFigure = false;
        return "";
      }
      return match;
    })
    .trim();
};

const getAdTargeting = (post: any) => {
  const safeTags = getSafeTags(post);
  const safeCategories = getSafeCategories(post);

  return {
    pos: "article",
    section: safeCategories,
    key: safeTags,
    articleId: post.id || "",
    premium: post.isPremium ? "yes" : "no",
    sponsored: post.isSponsored ? "yes" : "no",
  };
};

const NewsArticlePost = ({ preview = false, post, posts }: ArticleProps) => {
  const router = useRouter();
  const [adRefreshKey, setAdRefreshKey] = useState(0);

  // Refresh ads periodically
  useEffect(() => {
    const timer = setInterval(() => {
      setAdRefreshKey((prev) => prev + 1);
    }, AD_REFRESH_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  if (preview) {
    return <div>Loading the preview...</div>;
  }

  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl">Article not found</h1>
        <p>The article you are looking for might have been moved or deleted.</p>
      </div>
    );
  }

  // this is to show the related articles at the bottom of the page
  if (posts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl">No related articles found</h1>
        <p>There are no related articles to display at the moment.</p>
      </div>
    );
  }

  const dfpTargetingParams = getAdTargeting(post);

  const safeTags = getSafeTags(post);
  const safeCategories = getSafeCategories(post);

  const cleanedContent = removeFeaturedImage(post.content || "");

  const safeTitle = post.title || "Untitled Article";
  const safeExcerpt = post.excerpt || "No excerpt available";
  const safeUri = post.uri || "/";
  const safeFeaturedImage =
    post.featuredImage?.node?.sourceUrl ||
    `${siteConfig.baseUrl}/default-og-image.jpg`;

  //use safeCategories somewhere or remove it
  if (safeCategories.includes("Premium")) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl">Premium Article</h1>
        <p>
          This article is only available to premium subscribers. Please sign in
          to view this article.
        </p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
        <title>{`${safeTitle} | ${siteConfig.siteShortName}`}</title>
        <meta name="description" content={safeExcerpt} />
        <meta name="keywords" content={safeTags.join(", ")} />
        <meta
          name="robots"
          content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"
        />
        <meta
          name="googlebot"
          content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"
        />
        <meta
          name="googlebot-news"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <link rel="canonical" href={`${siteConfig.baseUrl}${safeUri}`} />

        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${siteConfig.baseUrl}${safeUri}`} />
        <meta property="og:title" content={safeTitle} />
        <meta property="og:description" content={safeExcerpt} />
        <meta property="og:image" content={safeFeaturedImage} />

        <meta property="twitter:card" content="summary_large_image" />
        <meta
          property="twitter:url"
          content={`${siteConfig.baseUrl}${safeUri}`}
        />
        <meta property="twitter:title" content={safeTitle} />
        <meta property="twitter:description" content={safeExcerpt} />
        <meta property="twitter:image" content={safeFeaturedImage} />

        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJSONLD) }}
          type="application/ld+json"
          defer
        />
        <meta
          name="google-signin-client_id"
          content={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
        />
        <ArticleJsonLD data={post} />
      </Head>
      <Script
        src="https://apis.google.com/js/platform.js"
        strategy="lazyOnload"
      />
      <div className="h-24 md:h-64 min-h-24 flex justify-center items-center">
        <AdSlot
          key={`ads-${adRefreshKey}`}
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
          key={`ads-${adRefreshKey}`}
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
      <main className="px-2 md:px-0">
        <div className="grid md:grid-cols-3 gap-8">
          <article className="col-span-2">
            <header>
              <h1
                className="headline text-4xl md:text-6xl font-bold my-3 md:w-[80vw]"
                dangerouslySetInnerHTML={{ __html: safeTitle }}
              />
              <div className="flex justify-between items-center my-1">
                {post.date && (
                  <span className="font-bitter font-semibold text-stone-700 dark:text-stone-300 tracking-wider">
                    <FullDateDisplay
                      dateString={post.date}
                      tooltipPosition="right"
                    />
                  </span>
                )}
                {post.author && <NewsAuthor author={post.author} />}
                <ShareButtons
                  url={safeUri}
                  title={safeTitle}
                  mediaUrl={safeFeaturedImage}
                  hashs={safeTags}
                />
              </div>

              <h2
                className="excerpt text-xl my-3"
                dangerouslySetInnerHTML={{ __html: safeExcerpt }}
              />
              <CoverImage
                title={safeTitle}
                coverImage={post.featuredImage}
                url={safeUri}
                isPriority
              />
            </header>

            <PostBody
              content={cleanedContent}
              fullArticleUrl={safeUri}
              additionalFields={post}
            />
          </article>
          <aside className="col-span-1 md:mt-32">
            <div className="my-4 md:min-h-64 flex justify-center items-center">
              <AdSlot
                key={`ads-${adRefreshKey}`}
                sizes={[300, 250]}
                id="div-gpt-ad-1661333336129-0"
                name="ROS_Midrec"
                visibleOnDevices="onlyDesktop"
                targetingParams={dfpTargetingParams}
              />
            </div>
            <MostViewed />
          </aside>
        </div>
      </main>
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const allPosts = await getAllPostsWithSlug();

    if (!allPosts?.edges) {
      console.warn("No posts found in getStaticPaths");
      return { paths: [], fallback: "blocking" };
    }

    const paths = allPosts.edges
      .filter((edge: any) => edge?.node?.uri)
      .map(({ node }: any) => ({
        params: {
          slug: node.uri.slice(1).split("/").filter(Boolean),
        },
      }));

    return {
      paths,
      fallback: "blocking",
    };
  } catch (error) {
    console.error("Error in getStaticPaths:", error);
    return { paths: [], fallback: "blocking" };
  }
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  try {
    const slug = Array.isArray(params?.slug)
      ? params.slug[params.slug.length - 1]
      : params?.slug;

    if (!slug) {
      return { notFound: true };
    }

    const data = await getPostAndMorePosts(slug, preview, previewData);

    if (!data?.post) {
      return { notFound: true };
    }

    return {
      props: {
        preview,
        post: data.post,
        posts:
          data?.posts?.edges?.map((edge: any) => edge?.node).filter(Boolean) ||
          [],
      },
      revalidate: REVALIDATION_INTERVAL,
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    return { notFound: true };
  }
};

export default NewsArticlePost;
