import { GetServerSideProps } from "next";
import Head from "next/head";
// import ErrorPage from "next/error";
import CryptoJS from "crypto-js";
import encHex from "crypto-js/enc-hex";
import { useEffect, useState } from "react";
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
  debugLogs: string[]; // Array to store logs
  tokenPreview?: string;
  environmentStatus?: any;
  apiResponse?: any;
}

export const getServerSideProps: GetServerSideProps<PreviewProps> = async ({
  query,
}) => {
  // Store logs in an array to pass to client
  const debugLogs: string[] = [];
  const addLog = (message: string) => {
    debugLogs.push(`[${new Date().toISOString()}] ${message}`);
  };
  
  addLog("Preview request received with query: " + JSON.stringify(Object.keys(query)));

  // Environment variable status to pass to client
  const envStatus = {
    CRYPTO_IV_exists: !!ENV.CRYPTO_IV,
    CRYPTO_IV_length: ENV.CRYPTO_IV?.length || 0,
    CRYPTO_KEY_exists: !!ENV.CRYPTO_KEY,
    CRYPTO_KEY_length: ENV.CRYPTO_KEY?.length || 0,
    WORDPRESS_SECRET_exists: !!ENV.WORDPRESS_SECRET,
    WORDPRESS_SECRET_length: ENV.WORDPRESS_SECRET?.length || 0,
    WP_REFRESH_TOKEN_exists: !!ENV.WP_REFRESH_TOKEN,
    WP_REFRESH_TOKEN_length: ENV.WP_REFRESH_TOKEN?.length || 0,
    CMS_URL: ENV.CMS_URL,
  };
  addLog("Environment check: " + JSON.stringify(envStatus));

  const { p } = query;
  addLog("Preview token param: " + (p ? "exists" : "missing"));

  if (!p || typeof p !== "string") {
    addLog("No preview token provided or invalid format");
    return {
      props: {
        error: "No preview token provided",
        post: null,
        isPreview: true,
        debugLogs,
        environmentStatus: envStatus,
      },
    };
  }

  addLog(`Received token (length: ${p.length})`);

  // Add sanitized token info (first/last few chars)
  const tokenPreview =
    p.length > 10
      ? `${p.substring(0, 5)}...${p.substring(p.length - 5)}`
      : "(token too short)";
  addLog(`Token preview: ${tokenPreview}`);

  try {
    // Decrypt the token
    addLog("Starting token decryption");
    let iv;
    try {
      iv = encHex.parse(ENV.CRYPTO_IV);
      addLog("IV parsed successfully");
    } catch (e:any) {
      addLog(`IV parsing failed: ${e.message}`);
      return {
        props: {
          error: "Failed to parse IV",
          post: null,
          isPreview: true,
          debugLogs,
          environmentStatus: envStatus,
          tokenPreview,
        },
      };
    }

    let keyObj;
    try {
      keyObj = CryptoJS.enc.Utf8.parse(ENV.CRYPTO_KEY);
      addLog("Key parsed successfully");
    } catch (e:any) {
      addLog(`Key parsing failed: ${e.message}`);
      return {
        props: {
          error: "Failed to parse encryption key",
          post: null,
          isPreview: true,
          debugLogs,
          environmentStatus: envStatus,
          tokenPreview,
        },
      };
    }

    // Parse and decrypt token
    let plainText;
    let cipherText;
    try {
      addLog("Converting token from Base64");
      try {
        cipherText = CryptoJS.enc.Base64.parse(p);
        addLog("Base64 parsing successful");
      } catch (e:any) {
        addLog(`Base64 parsing failed: ${e.message}`);
        return {
          props: {
            error: "Invalid Base64 in preview token",
            post: null,
            isPreview: true,
            debugLogs,
            environmentStatus: envStatus,
            tokenPreview,
          },
        };
      }

      addLog("Starting AES decryption");
      let decryptedStr;
      try {
        decryptedStr = CryptoJS.AES.decrypt(
          cipherText.toString(CryptoJS.enc.Utf8),
          keyObj,
          { iv }
        );
        addLog("AES decryption operation completed");
      } catch (e:any) {
        addLog(`AES decryption failed: ${e.message}`);
        return {
          props: {
            error: "AES decryption failed",
            post: null,
            isPreview: true,
            debugLogs,
            environmentStatus: envStatus,
            tokenPreview,
          },
        };
      }

      try {
        plainText = decryptedStr.toString(CryptoJS.enc.Utf8);
        addLog(`Decrypted plaintext length: ${plainText?.length || 0}`);
      } catch (e:any) {
        addLog(`UTF-8 conversion failed: ${e.message}`);
        return {
          props: {
            error: "Failed to convert decrypted data to UTF-8",
            post: null,
            isPreview: true,
            debugLogs,
            environmentStatus: envStatus,
            tokenPreview,
          },
        };
      }

      if (!plainText) {
        addLog("Decrypted text is empty");
        return {
          props: {
            error: "Decrypted text is empty",
            post: null,
            isPreview: true,
            debugLogs,
            environmentStatus: envStatus,
            tokenPreview,
          },
        };
      }
    } catch (error:any) {
      addLog(`Token decryption error: ${error.message}`);
      return {
        props: {
          error: "Failed to decrypt the preview token",
          post: null,
          isPreview: true,
          debugLogs,
          environmentStatus: envStatus,
          tokenPreview,
        },
      };
    }

    // Parse token parts
    addLog("Parsing token parts");
    const parts = plainText.split("|");
    addLog(`Token parts parsed, found ${parts.length} parts`);

    if (parts.length < 3) {
      addLog(`Invalid token format, only ${parts.length} parts found`);
      return {
        props: {
          error: "Invalid preview token format",
          post: null,
          isPreview: true,
          debugLogs,
          environmentStatus: envStatus,
          tokenPreview,
        },
      };
    }

    const [postId, previewFlag, secret] = parts;
    addLog(`Parsed postId: ${postId}, previewFlag: ${previewFlag}`);

    if (!postId) {
      addLog("No post ID found in token");
      return {
        props: {
          error: "No post ID found in preview token",
          post: null,
          isPreview: true,
          debugLogs,
          environmentStatus: envStatus,
          tokenPreview,
        },
      };
    }

    addLog("Verifying secret");
    if (secret !== ENV.WORDPRESS_SECRET) {
      addLog("Secret verification failed");
      return {
        props: {
          error: "Security verification failed for preview",
          post: null,
          isPreview: true,
          debugLogs,
          environmentStatus: envStatus,
          tokenPreview,
        },
      };
    }
    addLog("Secret verified successfully");

    // Fetch post data
    addLog(`Fetching WordPress post data for ID: ${postId}`);
    try {
      addLog("Sending GraphQL request to WordPress");
      let apiResponse;
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
        apiResponse = {
          hasData: !!result,
          hasPost: !!result?.post,
          // Include safe subset of response for debugging
          dataKeys: result ? Object.keys(result) : [],
          postKeys: result?.post ? Object.keys(result.post) : [],
          errors: result?.errors || null,
        };
        
        addLog("GraphQL request completed");
        addLog(`Response check: hasResult=${!!result}, hasPostData=${!!result?.post}`);

        if (!result || !result.post) {
          addLog("No post data returned from WordPress");
          return {
            props: {
              error: "Could not retrieve the preview content",
              post: null,
              isPreview: true,
              debugLogs,
              environmentStatus: envStatus,
              tokenPreview,
              apiResponse,
            },
          };
        }

        addLog("Successfully retrieved post data");
        return {
          props: {
            post: result.post,
            isPreview: true,
            debugLogs,
            environmentStatus: envStatus,
            tokenPreview,
            apiResponse,
          },
        };
      } catch (fetchError:any) {
        addLog(`WordPress API fetch error: ${fetchError.message}`);
        return {
          props: {
            error: `Error fetching post data: ${fetchError.message}`,
            post: null,
            isPreview: true,
            debugLogs,
            environmentStatus: envStatus,
            tokenPreview,
            apiResponse: {
              error: fetchError.message,
              stack: fetchError.stack,
            },
          },
        };
      }
    } catch (fetchWrapperError:any) {
      addLog(`API request wrapper error: ${fetchWrapperError.message}`);
      return {
        props: {
          error: `API request wrapper error: ${fetchWrapperError.message}`,
          post: null,
          isPreview: true,
          debugLogs,
          environmentStatus: envStatus,
          tokenPreview,
        },
      };
    }
  } catch (e:any) {
    addLog(`Unexpected preview error: ${e.message}`);
    return {
      props: {
        error: `Unexpected error: ${e.message}`,
        post: null,
        isPreview: true,
        debugLogs,
        environmentStatus: envStatus,
        tokenPreview,
      },
    };
  }
};

export default function PostPreview({
  post,
  error,
  isPreview,
  debugLogs,
  tokenPreview,
  environmentStatus,
  apiResponse,
}: PreviewProps) {
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Output debug logs to console when component mounts
  useEffect(() => {
    // Only in browser
    if (typeof window !== 'undefined') {
      console.log('🔍 CLIENT-SIDE PREVIEW DEBUG INFO');
      console.log('⚙️ Environment status:', environmentStatus);
      
      if (tokenPreview) {
        console.log('🔑 Token preview:', tokenPreview);
      }
      
      if (apiResponse) {
        console.log('📡 API response:', apiResponse);
      }
      
      console.log('📜 Server-side logs:');
      debugLogs.forEach(log => console.log(log));
      
      if (error) {
        console.error('❌ Preview error:', error);
      }
    }
  }, []);

  // Show error if preview couldn't be loaded
  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Preview Error</h1>
        <p className="mb-4">{error || "Unknown error loading preview"}</p>
        
        {/* Debug button */}
        <button 
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          {showDebugPanel ? "Hide Debug Info" : "Show Debug Info"}
        </button>
        
        {/* Debug panel - only visible when toggled */}
        {showDebugPanel && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 text-left">
            <p className="font-bold mb-2">Debug Information:</p>
            
            <div className="mb-4">
              <h3 className="font-semibold">Environment Status:</h3>
              <pre className="text-xs bg-gray-100 p-2 overflow-auto max-h-32 rounded mt-1">
                {JSON.stringify(environmentStatus, null, 2)}
              </pre>
            </div>
            
            {tokenPreview && (
              <div className="mb-4">
                <h3 className="font-semibold">Token Preview:</h3>
                <pre className="text-xs bg-gray-100 p-2 overflow-auto rounded mt-1">
                  {tokenPreview}
                </pre>
              </div>
            )}
            
            {apiResponse && (
              <div className="mb-4">
                <h3 className="font-semibold">API Response:</h3>
                <pre className="text-xs bg-gray-100 p-2 overflow-auto max-h-32 rounded mt-1">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            )}
            
            <div>
              <h3 className="font-semibold">Server Logs:</h3>
              <div className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-64">
                {debugLogs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
              </div>
            </div>
          </div>
        )}
        
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

  // Process the post data
  const tagsWithSlug = getSafeTags(post);
  const safeTags = tagsWithSlug.map((tag: any) => tag.href.split("/").pop());
  const dfpTargetingParams = getAdTargeting(post, safeTags);

  // Safe post data
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

      {/* Preview banner with debug toggle */}
      <div className="fixed top-0 left-0 w-full bg-yellow-500 text-black z-50 py-2 px-4 flex justify-between items-center">
        <p className="font-medium">
          This is a preview of an unpublished article.{" "}
          <a
            href={`${ENV.CMS_URL}/wp-admin/post.php?post=${post.databaseId}&action=edit`}
            className="underline font-bold"
            target="_blank"
            rel="noopener noreferrer"
          >
            Edit in WordPress
          </a>
        </p>
        <button 
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
        >
          {showDebugPanel ? "Hide Debug" : "Debug"}
        </button>
      </div>
      
      {/* Debug panel - only visible when toggled */}
      {showDebugPanel && (
        <div className="fixed top-12 left-0 right-0 max-w-4xl mx-auto z-40 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 text-left shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Debug Information</h3>
            <button 
              onClick={() => setShowDebugPanel(false)}
              className="px-2 py-1 bg-yellow-200 rounded hover:bg-yellow-300 text-xs"
            >
              Close
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <h4 className="font-semibold">Environment Status:</h4>
              <pre className="bg-white p-2 overflow-auto max-h-32 rounded mt-1 text-xs">
                {JSON.stringify(environmentStatus, null, 2)}
              </pre>
            </div>
            
            {tokenPreview && (
              <div>
                <h4 className="font-semibold">Token Preview:</h4>
                <pre className="bg-white p-2 overflow-auto rounded mt-1 text-xs">
                  {tokenPreview}
                </pre>
              </div>
            )}
          </div>
          
          <div className="mt-3">
            <h4 className="font-semibold">Server Logs (Most Recent):</h4>
            <div className="mt-1 p-2 bg-white rounded text-xs overflow-auto max-h-32">
              {debugLogs.slice(-10).map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))}
            </div>
            <button 
              onClick={() => {
                console.log('📜 Complete server logs:');
                debugLogs.forEach(log => console.log(log));
                alert('Full logs printed to browser console (F12)');
              }}
              className="mt-2 text-xs px-2 py-1 bg-yellow-200 rounded hover:bg-yellow-300"
            >
              Print All Logs to Console
            </button>
          </div>
        </div>
      )}

      <div className={`${showDebugPanel ? 'pt-40' : 'pt-12'}`}>
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