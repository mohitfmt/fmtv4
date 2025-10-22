// pages/video-admin/article-management.tsx
import { useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { useVideoAdminAuth } from "@/hooks/useVideoAdminAuth";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
  FiTrash2,
  FiInfo,
  FiLink,
} from "react-icons/fi";
import { cn } from "@/lib/utils";

interface ClearResult {
  success: boolean;
  article: {
    url: string;
    path: string;
    categories: string[];
  };
  cleared: {
    lruCache: boolean;
    smartCache: boolean;
    cloudflare: boolean;
    isr: boolean;
  };
  revalidated: {
    articlePage: boolean;
    homepage: boolean;
    categoryPages: string[];
    sectionPages: string[];
  };
  message: string;
  traceId: string;
  timestamp: string;
}

export default function ArticleManagement() {
  const { user, isAuthorized, isChecking } = useVideoAdminAuth();
  const [articleUrl, setArticleUrl] = useState("");
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<ClearResult | null>(null);

  const handleClearArticle = async () => {
    // Reset states
    setError("");
    setSuccess(null);

    // Validate URL
    if (!articleUrl.trim()) {
      setError("Please enter an article URL");
      return;
    }

    setIsClearing(true);

    try {
      const response = await fetch("/api/video-admin/clear-article", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ articleUrl: articleUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Failed to clear article"
        );
      }

      setSuccess(data);
      setArticleUrl(""); // Clear input on success
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsClearing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isClearing) {
      handleClearArticle();
    }
  };

  if (isChecking) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <FiLoader className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Article Management - Admin</title>
        <meta
          name="description"
          content="Hide articles from frontend cache and listings"
        />
      </Head>

      <AdminLayout title="Article Management">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Card */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 dark:bg-red-950/30 rounded-lg">
                <FiTrash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Hide Article from Site
                </h2>
                <p className="text-sm text-muted-foreground">
                  Remove deleted or unpublished articles from all frontend
                  caches
                </p>
              </div>
            </div>

            {/* URL Input */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="articleUrl"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Article URL
                </label>
                <div className="relative">
                  <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="articleUrl"
                    type="text"
                    value={articleUrl}
                    onChange={(e) => setArticleUrl(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="https://www.freemalaysiatoday.com/category/nation/2025/01/15/article-slug"
                    className={cn(
                      "w-full pl-10 pr-4 py-3 rounded-lg border bg-background text-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                      "placeholder:text-muted-foreground",
                      error
                        ? "border-red-500 dark:border-red-400"
                        : "border-border"
                    )}
                    disabled={isClearing}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Paste the full article URL from any domain (www/non-www,
                  http/https)
                </p>
              </div>

              {/* Action Button */}
              <Button
                onClick={handleClearArticle}
                disabled={isClearing || !articleUrl.trim()}
                className="w-full sm:w-auto"
                variant="destructive"
              >
                {isClearing ? (
                  <>
                    <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <FiTrash2 className="w-4 h-4 mr-2" />
                    Hide from Site
                  </>
                )}
              </Button>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex gap-3">
                <FiInfo className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-2">What this does:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Clears article from LRU cache</li>
                    <li>Removes from Smart Cache dependencies</li>
                    <li>Purges Cloudflare CDN</li>
                    <li>Rebuilds all category pages (full rebuild)</li>
                    <li>Updates homepage if needed</li>
                  </ul>
                  <p className="mt-3 text-blue-600 dark:text-blue-400">
                    ✓ Article will disappear from all listings in ~30 seconds
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {error}
                  </p>
                  <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                    Please check the URL format and try again
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-3">
                    {success.message}
                  </p>

                  {/* Article Info */}
                  <div className="mb-3 p-3 bg-white dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                      Article Path:
                    </p>
                    <p className="text-xs font-mono text-green-600 dark:text-green-400 break-all">
                      {success.article.path}
                    </p>
                    {success.article.categories.length > 0 && (
                      <>
                        <p className="text-xs font-medium text-green-700 dark:text-green-300 mt-2 mb-1">
                          Categories:
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {success.article.categories.join(", ")}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Cleared Items */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-green-700 dark:text-green-300">
                      Cache Cleared:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {success.cleared.lruCache && (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <FiCheckCircle className="w-3 h-3" />
                          <span>LRU Cache</span>
                        </div>
                      )}
                      {success.cleared.smartCache && (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <FiCheckCircle className="w-3 h-3" />
                          <span>Smart Cache</span>
                        </div>
                      )}
                      {success.cleared.cloudflare && (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <FiCheckCircle className="w-3 h-3" />
                          <span>Cloudflare CDN</span>
                        </div>
                      )}
                      {success.cleared.isr && (
                        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <FiCheckCircle className="w-3 h-3" />
                          <span>ISR Cache</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Revalidated Pages */}
                  {(success.revalidated.categoryPages.length > 0 ||
                    success.revalidated.sectionPages.length > 0 ||
                    success.revalidated.homepage) && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-green-700 dark:text-green-300">
                        Pages Rebuilt:
                      </p>
                      <div className="space-y-1">
                        {success.revalidated.homepage && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            • Homepage
                          </p>
                        )}
                        {success.revalidated.sectionPages.map((page) => (
                          <p
                            key={page}
                            className="text-xs text-green-600 dark:text-green-400"
                          >
                            • {page}
                          </p>
                        ))}
                        {success.revalidated.categoryPages.map((page) => (
                          <p
                            key={page}
                            className="text-xs text-green-600 dark:text-green-400"
                          >
                            • {page}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trace ID */}
                  <p className="mt-3 text-xs text-green-600 dark:text-green-400">
                    Trace ID: {success.traceId}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning Box */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex gap-3">
              <FiAlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <p className="font-medium mb-2">Important Notes:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>This does NOT delete the article from WordPress CMS</li>
                  <li>If Cloudflare/ISR fails, wait 1 minute and try again</li>
                  <li>Article URL will return 404 after clearing</li>
                  <li>Use this for deleted or unpublished articles only</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
