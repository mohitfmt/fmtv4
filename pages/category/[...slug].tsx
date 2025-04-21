import { GetStaticProps, GetStaticPaths } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import siteConfig from "@/constants/site-config";
// import ArticleJsonLD from "@/components/news-article/ArticleJsonLD";
import { getAllPostsWithSlug } from "@/lib/gql-queries/get-all-posts-with-slug";
import ArticleLayout from "@/components/news-article/ArticleLayout";
import PostBody from "@/components/news-article/PostBody";
import {
  generateLanguageAlternates,
  getFeedUrlAppend,
  getSafeTags,
  stripHTML,
} from "@/lib/utils";
import { getMoreStories, getRelatedPosts } from "@/lib/api";
import { getPostAndMorePosts } from "@/lib/gql-queries/get-post-and-more-posts";
import { fbPageIds } from "@/constants/social";
import dynamic from "next/dynamic";

const ArticleJsonLD = dynamic(
  () => import("@/components/news-article/ArticleJsonLD"),
  { ssr: false }
);

// Default categories if none are provided
const DEFAULT_CATEGORIES = ["General"];
const REVALIDATION_INTERVAL = 1500; // 25 minutes

interface ArticleProps {
  post: any;
  params: any;
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
  params,
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

  // const cleanedContent = removeFeaturedImage(post.content || "");

  const safeTitle = post?.title || `${siteConfig?.siteName}`;

  const safeExcerpt =
    stripHTML(post?.excerpt) || `${siteConfig?.siteDescription}`;

  const safeAuthor = post?.author?.node?.name || `${siteConfig?.siteShortName}`;

  const safeUri = post?.uri || "/";

  // const fullUrl = siteConfig.baseUrl + safeUri;

  const fullUrl = `${siteConfig.baseUrl}${safeUri}`.replace(
    "//category",
    "/category"
  );

  const safeFeaturedImage =
    post.featuredImage?.node?.sourceUrl || `${siteConfig.iconPath}`;

  const imageAltText =
    post.featuredImage?.node?.altText || `${siteConfig.siteName}`;
  const imageSize = post.featuredImage?.node?.mediaDetails;

  const publishedTime = post?.dateGmt;
  const modifiedTime = post?.modifiedGmt;

  const articleCategory = params?.slug[0];

  const locale = articleCategory === "bahasa" ? "ms_MY" : "en_MY";
  const alternateLocale = articleCategory === "bahasa" ? "ms" : "en";

  const isMalay = articleCategory === "bahasa";
  const feedUrlAppend = getFeedUrlAppend(articleCategory);
  const languageAlternates = generateLanguageAlternates(isMalay, fullUrl);

  // const fbPageId = articleCategory === "bahasa" ? fbPageIds[2] :

  let fbPageId: string;

  switch (articleCategory) {
    case "bahasa":
      fbPageId = fbPageIds[2]; // Berita FMT
      break;
    case "leisure":
      fbPageId = fbPageIds[1]; // Lifestyle FMT
      break;
    default:
      fbPageId = fbPageIds[0]; // Main FMT
      break;
  }

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
        <title>{`${safeTitle} | ${siteConfig.siteShortName}`}</title>
        <meta name="description" content={safeExcerpt} />
        <meta name="author" content={safeAuthor} />
        <meta name="keywords" content={safeTags} />
        <meta name="category" content={safeCategories} />
        <meta property="fb:pages" content={fbPageId} />

        <link
          rel="author"
          href={`${siteConfig.baseUrl}${post?.author?.node?.uri ?? "/category/author/fmtreporters"}`}
        />
        <link rel="canonical" href={fullUrl} />
        <link
          rel="alternate"
          type="application/atom+xml"
          title="Atom Feed"
          href={`${siteConfig.baseUrl}/feeds/atom/${feedUrlAppend}/`}
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="RSS Feed"
          href={`${siteConfig.baseUrl}/feeds/rss/${feedUrlAppend}/`}
        />
        <link
          rel="alternate"
          type="application/feed+json"
          title="JSON Feed"
          href={`${siteConfig.baseUrl}/feeds/json/${feedUrlAppend}/`}
        />

        {/* Language alternates */}
        {languageAlternates.map((lang) => (
          <link
            key={lang.hrefLang}
            rel="alternate"
            hrefLang={lang.hrefLang}
            href={lang.href}
          />
        ))}

        {/* og */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${siteConfig.baseUrl}${safeUri}`} />
        <meta
          property="og:site_name"
          content={`${siteConfig.siteName} | ${siteConfig.siteShortName}`}
        />
        <meta property="og:title" content={safeTitle} />
        <meta property="og:description" content={safeExcerpt} />
        <meta property="og:locale" content={locale} />
        <meta property="og:locale:alternate" content={alternateLocale} />
        {/* og:Images */}
        <meta property="og:image" content={safeFeaturedImage} />
        <meta property="og:image:secure_url" content={safeFeaturedImage} />
        <meta property="og:image:type" content="image/webp" />
        <meta property="og:image:width" content={imageSize?.width || "1600"} />
        <meta
          property="og:image:height"
          content={imageSize?.height || "1000"}
        />
        <meta property="og:image:alt" content={imageAltText} />

        {/* Article type */}
        <meta property="article:author" content={safeAuthor} />
        <meta property="article:section" content={safeCategories[0]} />
        <meta property="article:tag" content={safeTags} />
        {publishedTime && (
          <meta
            property="article:published_time"
            content={`${publishedTime}Z`}
          />
        )}
        {modifiedTime && (
          <meta property="article:modified_time" content={`${modifiedTime}Z`} />
        )}

        {/* twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@fmtoday" />
        <meta name="twitter:url" content={`${siteConfig.baseUrl}${safeUri}`} />
        <meta name="twitter:title" content={safeTitle} />
        <meta name="twitter:description" content={safeExcerpt} />
        <meta name="twitter:image" content={safeFeaturedImage} />
        <meta name="twitter:image:alt" content={imageAltText} />
        <meta name="twitter:creator" content={safeAuthor} />
        <meta name="twitter:label1" content="Written by" />
        <meta name="twitter:data1" content={safeAuthor} />
      </Head>

      <ArticleJsonLD data={post} relatedData={relatedPosts} />
      <ArticleLayout
        post={post}
        safeTitle={safeTitle}
        safeExcerpt={safeExcerpt}
        safeUri={safeUri}
        safeFeaturedImage={safeFeaturedImage}
        tagWithSlug={tagsWithSlug}
        relatedPosts={relatedPosts}
        moreStories={moreStories}
        dfpTargetingParams={dfpTargetingParams}
      >
        <PostBody content={post.content} additionalFields={post} />
      </ArticleLayout>
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
    const isEditMode =
      Array.isArray(params?.slug) &&
      params.slug[params.slug.length - 1] === "edit";

    // If in edit mode, get the actual slug from the previous part
    const slug = Array.isArray(params?.slug)
      ? isEditMode
        ? params.slug[params.slug.length - 2]
        : params.slug[params.slug.length - 1]
      : params?.slug;

    if (!slug) {
      return { notFound: true };
    }

    const data = await getPostAndMorePosts(slug, preview, previewData);

    if (!data?.post) {
      return { notFound: true };
    }

    // If in edit mode, redirect to CMS
    if (isEditMode) {
      return {
        redirect: {
          destination: `${process.env.NEXT_PUBLIC_CMS_URL}/wp-admin/post.php?post=${data.post.databaseId}&action=edit`,
          permanent: false,
        },
      };
    }

    if (!data?.post) {
      return { notFound: true };
    }

    // Fetch related posts
    const relatedPosts = await getRelatedPosts(slug);
    const moreStories = await getMoreStories(slug);

    return {
      props: {
        params,
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
