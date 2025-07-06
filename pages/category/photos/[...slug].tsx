import { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import siteConfig from "@/constants/site-config";
import { websiteJSONLD } from "@/constants/jsonlds/org";
import ArticleJsonLD from "@/components/news-article/ArticleJsonLD";
import { getAllPostsWithSlug } from "@/lib/gql-queries/get-all-posts-with-slug";
import { getSafeTags } from "@/lib/utils";
import { getMoreStories, getRelatedPosts } from "@/lib/api";
import PhotoDetail from "@/components/gallery/PhotoDetials";
import GalleryLayout from "@/components/gallery/GalleryLayout";
import { getPostAndMorePosts } from "@/lib/gql-queries/get-post-and-more-posts";

// Default categories if none are provided
const DEFAULT_CATEGORIES = ["General"];
const REVALIDATION_INTERVAL = 300; // 5 minutes

interface ArticleProps {
  post: any;
  posts: any[];
  preview?: boolean;
  relatedPosts?: any[];
  moreStories?: any[];
}

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

const getAdTargeting = (post: any, tagNames: any) => {
  const safeTags = tagNames;
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

const NewsArticlePost = ({
  preview = false,
  post,
  posts,
  relatedPosts = [],
  moreStories = [],
}: ArticleProps) => {
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
  const tagsWithSlug = getSafeTags(post);
  const safeTags = tagsWithSlug.map((tag: any) => tag.href.split("/").pop());

  const dfpTargetingParams = getAdTargeting(post, safeTags);

  const safeCategories = getSafeCategories(post);

  const safeTitle = post.title || "Untitled Article";
  const safeExcerpt = post.excerpt || "No excerpt available";
  const safeUri = post.uri || "/";
  const safeFeaturedImage =
    post.featuredImage?.node?.sourceUrl ||
    `${siteConfig.baseUrl}/default-og-image.jpg`;

  const keywords = post?.keywords?.keywords;

  const fullUrl = siteConfig.baseUrl + safeUri.replace(/^\/|\/$/g, "");

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
        <meta name="keywords" content={keywords || safeTags.join(", ")} />

        <link rel="canonical" href={fullUrl} />
        <link rel="alternate" hrefLang="x-default" href={fullUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${siteConfig.baseUrl}${safeUri}`} />
        <meta property="og:title" content={safeTitle} />
        <meta property="og:description" content={safeExcerpt} />
        <meta property="og:image" content={safeFeaturedImage} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={`${siteConfig.baseUrl}${safeUri}`} />
        <meta name="twitter:title" content={safeTitle} />
        <meta name="twitter:description" content={safeExcerpt} />
        <meta name="twitter:image" content={safeFeaturedImage} />

        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJSONLD) }}
          type="application/ld+json"
        />
      </Head>
      <ArticleJsonLD data={post} relatedData={relatedPosts} />
      <GalleryLayout
        post={post}
        safeTitle={safeTitle}
        safeExcerpt={safeExcerpt}
        safeUri={safeUri}
        tagWithSlug={tagsWithSlug}
        relatedPosts={relatedPosts}
        moreStories={moreStories}
        dfpTargetingParams={dfpTargetingParams}
      >
        <PhotoDetail
          content={post?.content}
          // Pass additional fields for ads targeting
          additionalFields={{
            categories: post?.categories,
            tags: post?.tags,
          }}
        />
      </GalleryLayout>
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

    // Fetch related posts
    const relatedPosts = await getRelatedPosts(slug);
    const moreStories = await getMoreStories(slug);

    return {
      props: {
        preview,
        post: data.post,
        posts:
          data?.posts?.edges?.map((edge: any) => edge?.node).filter(Boolean) ||
          [],
        relatedPosts:
          relatedPosts?.edges?.map((edge: any) => edge?.node).filter(Boolean) ||
          [],
        moreStories:
          moreStories?.edges?.map((edge: any) => edge?.node).filter(Boolean) ||
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
