import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import CryptoJS from "crypto-js";
import encHex from "crypto-js/enc-hex";
import siteConfig from "@/constants/site-config";
import ArticleLayout from "@/components/news-article/ArticleLayout";
import PostBody from "@/components/news-article/PostBody";
import { getSafeTags } from "@/lib/utils";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_POST } from "@/lib/gql-queries/get-preview-post";
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
    premium: "no", // Not checking premium status for previews
    sponsored: "no", // Not checking sponsored status for previews
  };
};

export default function PostPreview() {
  const router = useRouter();
  const { p } = router.query; // The encrypted preview token
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    console.log("Preview page loaded, router query:", router.query);

    // Only fetch when we have the preview token
    if (!p || typeof p !== "string") {
      console.log("No preview token available yet");
      return;
    }

    const fetchPreview = async () => {
      console.log("Starting fetchPreview function");
      try {
        setLoading(true);

        // Log environment variables (without actual values for security)
        console.log("Environment variables available:", {
          CRYPTO_IV: !!process.env.NEXT_PUBLIC_CRYPTO_IV,
          CRYPTO_KEY: !!process.env.NEXT_PUBLIC_CRYPTO_KEY,
          WORDPRESS_PREVIEW_SECRET: !!process.env.NEXT_PUBLIC_WORDPRESS_SECRET,
          CMS_URL: !!process.env.NEXT_PUBLIC_CMS_URL,
          WP_REFRESH_TOKEN: !!process.env.NEXT_PUBLIC_WP_REFRESH_TOKEN,
        });

        // Decrypt the token
        const iv = encHex.parse(process.env.NEXT_PUBLIC_CRYPTO_IV || "");
        const key = process.env.NEXT_PUBLIC_CRYPTO_KEY || "";
        const keyObj = CryptoJS.enc.Utf8.parse(key);

        console.log("Parsing Base64 preview token");
        let cipherText;
        try {
          cipherText = CryptoJS.enc.Base64.parse(p);
          console.log("Successfully parsed Base64 token");
        } catch (parseError) {
          console.error("Error parsing Base64 token:", parseError);
          setError(true);
          setErrorMessage("Failed to parse the preview token (Base64 error)");
          setLoading(false);
          return;
        }

        let decryptedStr;
        try {
          console.log("Attempting to decrypt token");
          decryptedStr = CryptoJS.AES.decrypt(
            cipherText.toString(CryptoJS.enc.Utf8),
            keyObj,
            { iv }
          );
          console.log("Token decrypted successfully");
        } catch (decryptError) {
          console.error("Error decrypting token:", decryptError);
          setError(true);
          setErrorMessage("Failed to decrypt the preview token");
          setLoading(false);
          return;
        }

        console.log("Converting decrypted data to UTF-8 string");
        let plainText;
        try {
          plainText = decryptedStr.toString(CryptoJS.enc.Utf8);
          console.log("Decrypted plaintext:", plainText);

          if (!plainText) {
            throw new Error("Decrypted text is empty");
          }
        } catch (stringError) {
          console.error(
            "Error converting decrypted data to string:",
            stringError
          );
          setError(true);
          setErrorMessage("Failed to read the decrypted preview data");
          setLoading(false);
          return;
        }

        const parts = plainText.split("|");
        console.log("Token parts:", parts);

        if (parts.length < 3) {
          console.error("Invalid token format: not enough parts");
          setError(true);
          setErrorMessage("Invalid preview token format");
          setLoading(false);
          return;
        }

        const [postId, previewFlag, secret] = parts;

        if (!postId) {
          console.error("No post ID found in token");
          setError(true);
          setErrorMessage("No post ID found in preview token");
          setLoading(false);
          return;
        }

        console.log("Post ID from token:", postId);
        console.log("Preview flag from token:", previewFlag);
        console.log(
          "Secret matches expected value:",
          secret === process.env.NEXT_PUBLIC_WORDPRESS_SECRET
        );

        if (secret !== process.env.NEXT_PUBLIC_WORDPRESS_SECRET) {
          console.error("Secret mismatch");
          setError(true);
          setErrorMessage("Security verification failed for preview");
          setLoading(false);
          return;
        }

        // Use GET_POST query with proper parameters
        console.log("Calling gqlFetchAPI with GET_POST query:", {
          id: postId,
          idType: "DATABASE_ID",
          asPreview: previewFlag === "1",
        });

        try {

          const result = await gqlFetchAPI(GET_POST, {
            variables: {
              id: postId,
              idType: "DATABASE_ID",
              asPreview: previewFlag === "1",
            },
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_WP_REFRESH_TOKEN}`,
            },
          });

          console.log(
            "GraphQL response received:",
            result ? "data received" : "no data"
          );

          if (!result || !result.post) {
            console.error("No post data returned from GraphQL query");
            setError(true);
            setErrorMessage("Could not retrieve the preview content");
            setLoading(false);
            return;
          }

          console.log("Post data retrieved successfully:", {
            title: result.post.title,
            id: result.post.databaseId,
          });

          setPost(result.post);
          setLoading(false);
        } catch (fetchError: any) {
          console.error("Error in GraphQL fetch:", fetchError);
          setError(true);
          setErrorMessage(`Error fetching post data: ${fetchError.message}`);
          setLoading(false);

          // If we get an error, try a simpler approach - just redirect to edit page
          if (typeof window !== "undefined") {
            const editUrl = `${process.env.NEXT_PUBLIC_CMS_URL}/wp-admin/post.php?post=${postId}&action=edit`;
            console.log("Redirecting to WordPress editor:", editUrl);
            window.location.href = editUrl;
          }
        }
      } catch (e: any) {
        console.error("Unexpected error in preview fetch:", e);
        setError(true);
        setErrorMessage(`Unexpected error: ${e.message}`);
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

  // Process the post data similarly to your article page
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
