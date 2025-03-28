import { GetServerSideProps } from "next";
import Head from "next/head";
import ErrorPage from "next/error";
import CryptoJS from "crypto-js";
import encHex from "crypto-js/enc-hex";
import siteConfig from "@/constants/site-config";
import ArticleLayout from "@/components/news-article/ArticleLayout";
import PostBody from "@/components/news-article/PostBody";
import { getSafeTags } from "@/lib/utils";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_POST } from "@/lib/gql-queries/get-preview-post";

// Environment variables
const ENV = {
  CRYPTO_IV: process.env.NEXT_PUBLIC_CRYPTO_IV || "",
  CRYPTO_KEY: process.env.NEXT_PUBLIC_CRYPTO_KEY || "",
  WORDPRESS_SECRET: process.env.NEXT_PUBLIC_WORDPRESS_SECRET || "",
  WP_REFRESH_TOKEN: process.env.NEXT_PUBLIC_WP_REFRESH_TOKEN || "",
  CMS_URL:
    process.env.NEXT_PUBLIC_CMS_URL || "https://cms.freemalaysiatoday.com",
};

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
  const safeCategories = getSafeCategories(post);

  return {
    pos: "article",
    section: safeCategories,
    key: tagNames,
    articleId: post.id || "",
    premium: "no",
    sponsored: "no",
  };
};

interface PreviewProps {
  post: any;
  error?: string;
  isPreview: boolean;
}

export const getServerSideProps: GetServerSideProps<PreviewProps> = async ({
  query,
}) => {
  const { p } = query;

  if (!p || typeof p !== "string") {
    return {
      props: {
        error: "No preview token provided",
        post: null,
        isPreview: true,
      },
    };
  }

  try {
    // Decrypt the token
    const iv = encHex.parse(ENV.CRYPTO_IV);
    const keyObj = CryptoJS.enc.Utf8.parse(ENV.CRYPTO_KEY);

    // Parse and decrypt token
    let plainText;
    try {
      const cipherText = CryptoJS.enc.Base64.parse(p);
      const decryptedStr = CryptoJS.AES.decrypt(
        cipherText.toString(CryptoJS.enc.Utf8),
        keyObj,
        { iv }
      );

      plainText = decryptedStr.toString(CryptoJS.enc.Utf8);

      if (!plainText) {
        throw new Error("Decrypted text is empty");
      }
    } catch (error) {
      console.error("Token decryption error:", error);
      return {
        props: {
          error: "Failed to decrypt the preview token",
          post: null,
          isPreview: true,
        },
      };
    }

    // Parse token parts
    const parts = plainText.split("|");

    if (parts.length < 3) {
      return {
        props: {
          error: "Invalid preview token format",
          post: null,
          isPreview: true,
        },
      };
    }

    const [postId, previewFlag, secret] = parts;

    if (!postId) {
      return {
        props: {
          error: "No post ID found in preview token",
          post: null,
          isPreview: true,
        },
      };
    }

    if (secret !== ENV.WORDPRESS_SECRET) {
      return {
        props: {
          error: "Security verification failed for preview",
          post: null,
          isPreview: true,
        },
      };
    }

    // Fetch post data
    try {
      const result = await gqlFetchAPI(GET_POST, {
        variables: {
          id: postId,
          idType: "DATABASE_ID",
          asPreview: previewFlag === "1",
        },
        headers: {
          Authorization: `Bearer ${ENV.WP_REFRESH_TOKEN}`,
        },
      });

      if (!result || !result.post) {
        return {
          props: {
            error: "Could not retrieve the preview content",
            post: null,
            isPreview: true,
          },
        };
      }

      return {
        props: {
          post: result.post,
          isPreview: true,
        },
      };
    } catch (fetchError: any) {
      return {
        props: {
          error: `Error fetching post data: ${fetchError.message}`,
          post: null,
          isPreview: true,
        },
      };
    }
  } catch (e: any) {
    return {
      props: {
        error: `Unexpected error: ${e.message}`,
        post: null,
        isPreview: true,
      },
    };
  }
};

export default function PostPreview({ post, error, isPreview }: PreviewProps) {
  // Show error if preview couldn't be loaded
  if (error || !post) {
    if (error) {
      return (
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Preview Error</h1>
          <p className="mb-4">{error || "Error undefined"}</p>
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
            <p className="font-bold">Debug Information:</p>
            <p className="text-sm my-2">
              If this error persists, try editing the post directly in
              WordPress.
            </p>
          </div>
          <div className="mt-8">
            <a
              href={ENV.CMS_URL}
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

  // Process the post data
  const tagsWithSlug = getSafeTags(post);
  const safeTags = tagsWithSlug.map((tag: any) => tag.href.split("/").pop());
  const dfpTargetingParams = getAdTargeting(post, safeTags);

  // Safe post data
  const safeTitle = post.title || "Untitled Article";
  const safeExcerpt = post.excerpt || "No excerpt available";
  const safeUri = post.uri || "/";
  const safeFeaturedImage =
    post.featuredImage?.node?.sourceUrl || `${siteConfig.iconPath}`;

  return (
    <>
      <Head>
        <title>{`PREVIEW: ${safeTitle} | ${siteConfig.siteShortName}`}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          httpEquiv="Cache-Control"
          content="no-cache, no-store, must-revalidate"
        />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </Head>

      {/* Preview banner */}

      <div className="">
        <div className="sticky top-10 md:top-14 bg-yellow-500 text-black z-50 md:py-[12px] py-1 px-4 text-center">
          <p className="font-medium">
            This is a preview of an unpublished article.{" "}
            <a
              href={`${ENV.CMS_URL}/wp-admin/post.php?post=${post.databaseId}&action=edit`}
              className="underline font-bold text-red-500"
              target="_blank"
              rel="noopener noreferrer"
            >
              Edit in WordPress
            </a>
          </p>
        </div>
        <ArticleLayout
          post={post}
          safeTitle={safeTitle}
          safeExcerpt={safeExcerpt}
          safeUri={safeUri}
          safeFeaturedImage={safeFeaturedImage}
          tagWithSlug={tagsWithSlug}
          relatedPosts={[]}
          moreStories={[]}
          dfpTargetingParams={dfpTargetingParams}
        >
          <PostBody content={post.content} additionalFields={post} />
        </ArticleLayout>
      </div>
    </>
  );
}
