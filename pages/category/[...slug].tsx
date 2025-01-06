import { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import siteConfig from "@/constants/site-config";
import { websiteJSONLD } from "@/constants/jsonlds/org";
import AdSlot from "@/components/common/AdSlot";
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
// import CategorySidebar from "@/components/common/CategorySidebar";

const CategorySidebar = dynamic(
  () => import("@/components/common/CategorySidebar"),
  {
    loading: () => <MostViewedSkeleton />,
    ssr: true,
  }
);

// const AdSlot = dynamic(() => import("@/components/common/AdSlot"), {
//   ssr: false,
// });

// Default tags for articles without tags
const DEFAULT_TAGS = [
  "Malaysia News",
  "Current Events",
  "Breaking News",
  "Malaysian Updates",
];

// Default categories if none are provided
const DEFAULT_CATEGORIES = ["General"];
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

  // Helper function to extract caption from content using regex
  const extractCaptionFromContent = (content: string): string | null => {
    if (!content) return null;

    // Match the first figcaption content
    const figcaptionMatch = content.match(
      /<figcaption[^>]*>(.*?)<\/figcaption>/
    );
    return figcaptionMatch ? figcaptionMatch[1].trim() : null;
  };

  // Helper function to get the most appropriate caption
  const getImageCaption = (post: any): string => {
    // First try to get from featured image
    if (post?.featuredImage?.node?.caption) {
      return post.featuredImage.node.caption;
    }

    // Then try to extract from content
    const contentCaption = extractCaptionFromContent(post?.content);
    if (contentCaption) {
      return contentCaption;
    }

    // Default fallback
    return "Free Malaysia Today";
  };

  // console.log("post", post);

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
      <div className="h-24 md:h-64 min-h-24 flex justify-center items-center">
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
      <main className="px-2 md:px-0">
        <div className="flex flex-col my-5 gap-10 lg:flex-row">
          <article className="lg:w-2/3">
            <header>
              <h1
                className="headline text-4xl md:text-6xl font-bold my-3 md:w-[80vw]"
                dangerouslySetInnerHTML={{ __html: safeTitle }}
              />
              <div className="flex justify-between items-center my-1">
                <div>
                  {post.date && (
                    <span className="font-bitter font-semibold text-stone-700 dark:text-stone-300 tracking-wider">
                      <FullDateDisplay
                        dateString={post.date}
                        tooltipPosition="right"
                      />
                    </span>
                  )}
                  {post.author && <NewsAuthor author={post.author} />}
                </div>
                <div>
                  <ShareButtons
                    url={safeUri}
                    title={safeTitle}
                    mediaUrl={safeFeaturedImage}
                    hashs={safeTags}
                  />
                </div>
              </div>

              <h2
                className="excerpt text-xl my-3"
                dangerouslySetInnerHTML={{ __html: safeExcerpt }}
              />
              <figure className="my-4">
                <CoverImage
                  title={safeTitle}
                  coverImage={post.featuredImage}
                  url={safeUri}
                  isPriority
                />
                <figcaption
                  className="text-center text-stone-500 dark:text-stone-400 -mt-1 px-4 border-b border-x rounded-sm py-1.5 border-stone-300 dark:border-stone-700"
                  dangerouslySetInnerHTML={{ __html: getImageCaption(post) }}
                />
              </figure>
            </header>

            <PostBody
              content={cleanedContent}
              fullArticleUrl={safeUri}
              additionalFields={post}
            />
          </article>
          <aside className="lg:w-1/3 lg:mt-[200px] overflow-hidden">
            <CategorySidebar
              pageName="article"
              adsTargetingParams={dfpTargetingParams}
            />
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

    // console.log("allPosts.edges", allPosts.edges);

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

    // console.log("data", data);
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
