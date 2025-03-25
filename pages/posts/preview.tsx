// pages/posts/preview.tsx

import Head from "next/head";
import CryptoJS from "crypto-js";
import encHex from "crypto-js/enc-hex";
import ArticleLayout from "@/components/news-article/ArticleLayout";
import PostBody from "@/components/news-article/PostBody";

// Include getSafeTags directly to avoid import errors
const getSafeTags = (post: any) => {
  if (!post?.tags?.edges || !Array.isArray(post.tags.edges)) {
    return [];
  }

  return post.tags.edges
    .filter((edge: any) => edge?.node?.name && edge?.node?.uri)
    .map((edge: any) => ({
      name: edge.node.name,
      href: edge.node.uri,
    }));
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

// Define your GET_POST query directly here to avoid import errors
const GET_POST = `
  query GetPost($id: ID!, $idType: PostIdType, $asPreview: Boolean = false) {
    post(id: $id, idType: $idType, asPreview: $asPreview) {
      id
      databaseId
      title
      slug
      date
      modified
      excerpt
      content
      uri
      featuredImage {
        node {
          sourceUrl
          altText
          caption
        }
      }
      author {
        node {
          name
          firstName
          lastName
          uri
        }
      }
      categories {
        edges {
          node {
            name
            uri
            slug
          }
        }
      }
      tags {
        edges {
          node {
            name
            uri
            slug
          }
        }
      }
    }
  }
`;

// Server-side props to fetch data before rendering
export const getServerSideProps = async (context: any) => {
  try {
    const { p } = context.query;

    if (!p || typeof p !== "string") {
      console.error("No preview token provided");
      return {
        notFound: true,
      };
    }

    // Decrypt the token - use the App Router method that we know works
    const encryptedStr = p;
    const iv = encHex.parse(process.env.NEXT_PUBLIC_CRYPTO_IV || "");
    const key = process.env.NEXT_PUBLIC_CRYPTO_KEY || "";

    if (!key) {
      console.error("Crypto key not configured");
      return { notFound: true };
    }

    const keyObj = CryptoJS.enc.Utf8.parse(key);

    try {
      // Step 1: Parse Base64
      const cipherText = CryptoJS.enc.Base64.parse(encryptedStr);

      // Step 2: Decrypt the token - using the method that worked in test-token
      const decryptedStr = CryptoJS.AES.decrypt(
        cipherText.toString(CryptoJS.enc.Utf8),
        keyObj,
        { iv }
      );

      // Step 3: Convert to string
      const plainText = decryptedStr.toString(CryptoJS.enc.Utf8);

      if (!plainText) {
        throw new Error("Empty decryption result");
      }

      // Continue with splitting the token parts
      const parts = plainText.split("|");

      if (parts.length < 3) {
        console.error("Invalid token format: not enough parts");
        return { notFound: true };
      }

      const [postId, previewFlag, secret] = parts;

      if (!postId || secret !== process.env.NEXT_PUBLIC_WORDPRESS_SECRET) {
        console.error("Invalid or unauthorized token");
        return { notFound: true };
      }

      // Fetch post data directly from WordPress
      console.log("Fetching preview for post:", {
        postId,
        isPreview: previewFlag === "1",
      });

      const wpUrl =
        process.env.WORDPRESS_API_URL ||
        "https://cms.freemalaysiatoday.com/graphql";

      const authToken = process.env.NEXT_PUBLIC_WP_REFRESH_TOKEN;
      if (!authToken) {
        console.error("WordPress auth token not configured");
        return { notFound: true };
      }

      // Fetch post data from WordPress GraphQL API
      const response = await fetch(wpUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query: GET_POST,
          variables: {
            id: postId,
            idType: "DATABASE_ID",
            asPreview: previewFlag === "1",
          },
        }),
      });

      if (!response.ok) {
        console.error("WordPress API error:", {
          status: response.status,
          statusText: response.statusText,
        });
        return { notFound: true };
      }

      const result = await response.json();

      if (result.errors) {
        console.error("GraphQL errors:", result.errors);
        return { notFound: true };
      }

      if (!result.data || !result.data.post) {
        console.error("Post not found in API response");
        return { notFound: true };
      }

      // Return the data as props
      return {
        props: {
          post: result.data.post,
          databaseId: postId,
          siteConfig: {
            siteShortName: "FMT",
            baseUrl:
              process.env.NEXT_PUBLIC_DOMAIN ||
              "https://www.freemalaysiatoday.com",
          },
        },
      };
    } catch (error) {
      console.error("Token processing error:", error);
      return { notFound: true };
    }
  } catch (error) {
    console.error("Preview error:", error);
    return { notFound: true };
  }
};

// Client component that receives the props
export default function PostPreview({ post, databaseId, siteConfig }: any) {
  // Process the post data safely
  const tagsWithSlug = getSafeTags(post);

  const safeTags = tagsWithSlug.map(
    (tag: any) => tag.href?.split("/").pop() || ""
  );

  const dfpTargetingParams = getAdTargeting(post, safeTags);

  const safeTitle = post.title || "Untitled Article";
  const safeExcerpt = post.excerpt || "No excerpt available";
  const safeUri = post.uri || "/";
  const safeFeaturedImage =
    post.featuredImage?.node?.sourceUrl ||
    `${siteConfig.baseUrl}/default-og-image.jpg`;

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
      <div className="fixed top-0 left-0 w-full bg-yellow-500 text-black z-50 py-2 px-4 text-center">
        <p className="font-medium">
          This is a preview of an unpublished article.{" "}
          <a
            href={`${process.env.NEXT_PUBLIC_CMS_URL}/wp-admin/post.php?post=${databaseId}&action=edit`}
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
