import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import siteConfig from "@/constants/site-config";
import ArticleLayout from "@/components/news-article/ArticleLayout";
import PostBody from "@/components/news-article/PostBody";
import { getSafeTags } from "@/lib/utils";
import ErrorPage from "next/error";

// Default categories if none are provided
const DEFAULT_CATEGORIES = ["General"];

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

// Ad targeting helper
const getAdTargeting = (post: any, tagNames: any) => {
  const safeTags = tagNames;
  const safeCategories = getSafeCategories(post);

  return {
    pos: "article",
    section: safeCategories,
    key: safeTags,
    articleId: post.id || "",
    premium: "no",
    sponsored: "no",
  };
};

export default function PostPreview() {
  const router = useRouter();
  const { p } = router.query;
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!p || typeof p !== "string") {
      console.log("No preview token available yet");
      return;
    }

    const fetchPreview = async () => {
      try {
        setLoading(true);

        // Fetch the preview data using our server-side API
        const response = await fetch(
          `/api/get-preview-data?p=${encodeURIComponent(p)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load preview");
        }

        const data = await response.json();

        if (!data.post) {
          throw new Error("No post data returned");
        }

        console.log("Post data retrieved successfully:", {
          title: data.post.title,
          id: data.post.databaseId,
        });

        // Set the post data
        setPost(data.post);
        setLoading(false);
      } catch (error: any) {
        console.error("Error in preview fetch:", error);
        setError(true);
        setErrorMessage(error.message || "Failed to load preview");
        setLoading(false);
      }
    };

    fetchPreview();
  }, [p]);

  // Show loading state
  if (loading) {
    console.log("Rendering loading state");
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="mt-4">Loading preview...</p>
      </div>
    );
  }

  // Show error if preview couldn't be loaded
  if (error || !post) {
    console.log(
      "Rendering error state. Error:",
      error,
      "Post available:",
      !!post
    );
    console.log("Error message:", errorMessage);

    // Custom error display instead of direct 404
    if (error) {
      return (
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Preview Error</h1>
          <p className="mb-4">{errorMessage || "Failed to load the preview"}</p>
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
            <p className="font-bold">Debug Information:</p>
            <p className="text-sm my-2">
              If this error persists, try editing the post directly in
              WordPress.
            </p>
          </div>
          <div className="mt-8">
            <a
              href={process.env.NEXT_PUBLIC_CMS_URL}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Return to WordPress
            </a>
          </div>
        </div>
      );
    }

    return <ErrorPage statusCode={404} />;
  }

  console.log("Rendering preview page with post data");

  // Process the post data safely
  const tagsWithSlug = getSafeTags(post);
  console.log("Tags with slug:", tagsWithSlug);

  const safeTags = tagsWithSlug.map((tag: any) => tag.href.split("/").pop());
  console.log("Safe tags:", safeTags);

  const dfpTargetingParams = getAdTargeting(post, safeTags);
  console.log("DFP targeting params:", dfpTargetingParams);

  const safeTitle = post.title || "Untitled Article";
  const safeExcerpt = post.excerpt || "No excerpt available";
  const safeUri = post.uri || "/";
  const safeFeaturedImage =
    post.featuredImage?.node?.sourceUrl ||
    `${siteConfig.baseUrl}/default-og-image.jpg`;

  console.log("Article layout props:", {
    hasTitle: !!safeTitle,
    hasExcerpt: !!safeExcerpt,
    hasUri: !!safeUri,
    hasFeaturedImage: !!safeFeaturedImage,
    hasTagsWithSlug: tagsWithSlug.length > 0,
    hasDfpTargetingParams: !!dfpTargetingParams,
    postDatabaseId: post.databaseId,
  });

  return (
    <>
      <Head>
        <title>{`PREVIEW: ${safeTitle} | ${siteConfig.siteShortName}`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Preview banner */}
      <div className="fixed top-0 left-0 w-full bg-yellow-500 text-black z-50 py-2 px-4 text-center">
        <p className="font-medium">
          This is a preview of an unpublished article.{" "}
          <a
            href={`${process.env.NEXT_PUBLIC_CMS_URL}/wp-admin/post.php?post=${post.databaseId}&action=edit`}
            className="underline font-bold"
            target="_blank"
            rel="noopener noreferrer"
          >
            Edit in WordPress
          </a>
        </p>
      </div>

      <div className="pt-12">
        {/* Add padding to account for the preview banner */}
        <ArticleLayout
          post={post}
          safeTitle={safeTitle}
          safeExcerpt={safeExcerpt}
          safeUri={safeUri}
          safeFeaturedImage={safeFeaturedImage}
          tagWithSlug={tagsWithSlug}
          relatedPosts={[]} // Empty for preview
          moreStories={[]} // Empty for preview
          dfpTargetingParams={dfpTargetingParams}
        >
          <PostBody content={post.content} additionalFields={post} />
        </ArticleLayout>
      </div>
    </>
  );
}
