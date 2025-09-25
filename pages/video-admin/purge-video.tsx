// pages/video-admin/purge-video.tsx
import { GetServerSideProps } from "next";
import { useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { withAdminPageSSR } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import {
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2,
  AlertCircle,
  Link,
  Hash,
} from "lucide-react";
import { videoApiJson } from "@/lib/videoApi";

interface PageProps {
  requiresAuth?: boolean;
  unauthorized?: boolean;
  userEmail?: string;
  traceId?: string;
  enableOneTap?: boolean;
  session?: any;
}

interface PurgeResult {
  videoId: string;
  removedFromPlaylists: number;
  clearedFromCache: boolean;
  purgedFromCDN: boolean;
  deletedFromDB: boolean;
}

export default function PurgeVideoPage({
  requiresAuth,
  unauthorized,
  userEmail,
  session: serverSession,
}: PageProps) {
  const { data: session } = useSession();
  const currentSession = session || serverSession;

  const [videoInput, setVideoInput] = useState("");
  const [purging, setPurging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PurgeResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handlePurge = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoInput.trim()) {
      setError("Please enter a video URL or ID");
      return;
    }

    setPurging(true);
    setError(null);
    setSuccess(null);
    setLastResult(null);

    try {
      const response = await videoApiJson<{
        success: boolean;
        message: string;
        results: PurgeResult;
      }>("/api/video-admin/purge-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoInput }),
      });

      if (response?.success) {
        setSuccess(response.message);
        setLastResult(response.results);
        setVideoInput(""); // Clear input on success
      } else {
        throw new Error(response?.message || "Failed to purge video");
      }
    } catch (error) {
      console.error("Purge failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to purge video. Please try again."
      );
    } finally {
      setPurging(false);
    }
  };

  const exampleFormats = [
    { type: "Video ID", example: "dQw4w9WgXcQ", icon: Hash },
    {
      type: "Watch URL",
      example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      icon: Link,
    },
    {
      type: "Short URL",
      example: "https://youtu.be/dQw4w9WgXcQ",
      icon: Link,
    },
  ];

  if (requiresAuth && !currentSession) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Purge Deleted Video - Video Admin</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <AdminLayout
        title="Purge Deleted Video"
        description="Remove deleted videos from cache and database"
      >
        <div className="max-w-2xl mx-auto">
          {/* Main Card */}
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-100 dark:bg-red-950 rounded-lg">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Purge Video</h2>
                  <p className="text-sm text-muted-foreground">
                    Completely remove a video from the system
                  </p>
                </div>
              </div>

              {/* Warning */}
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      This action cannot be undone
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      This will permanently remove the video from:
                    </p>
                    <ul className="mt-2 space-y-1 text-yellow-700 dark:text-yellow-300">
                      <li>• All playlists in the database</li>
                      <li>• CDN cache (Cloudflare)</li>
                      <li>• Local LRU caches</li>
                      <li>• Video collection in MongoDB</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handlePurge} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Video URL or ID
                  </label>
                  <input
                    type="text"
                    value={videoInput}
                    onChange={(e) => setVideoInput(e.target.value)}
                    placeholder="Enter YouTube video URL or video ID"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    disabled={purging}
                  />
                  <button
                    type="button"
                    onClick={() => setShowHelp(!showHelp)}
                    className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Info className="w-3 h-3" />
                    {showHelp ? "Hide" : "Show"} supported formats
                  </button>
                </div>

                {/* Help Section */}
                {showHelp && (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Accepted formats:
                    </p>
                    {exampleFormats.map((format) => (
                      <div
                        key={format.type}
                        className="flex items-center gap-2 text-xs"
                      >
                        <format.icon className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">{format.type}:</span>
                        <code className="px-1 py-0.5 bg-background rounded text-xs">
                          {format.example}
                        </code>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={purging || !videoInput.trim()}
                    variant="destructive"
                    className="min-w-[120px]"
                  >
                    {purging ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Purging...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Purge Video
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      {success}
                    </p>
                  </div>

                  {lastResult && (
                    <div className="space-y-2 text-xs text-green-700 dark:text-green-300">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span>Video ID: {lastResult.videoId}</span>
                        </div>
                        {lastResult.deletedFromDB && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <span>Removed from database</span>
                          </div>
                        )}
                        {lastResult.removedFromPlaylists > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <span>
                              Removed from {lastResult.removedFromPlaylists}{" "}
                              playlist(s)
                            </span>
                          </div>
                        )}
                        {lastResult.clearedFromCache && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <span>Cleared from cache</span>
                          </div>
                        )}
                        {lastResult.purgedFromCDN && (
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <span>Purged from CDN</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Info Card */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex gap-2">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="text-sm space-y-2">
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  When to use this tool:
                </p>
                <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                  <li>• A video has been deleted from YouTube</li>
                  <li>• A video violates content policies</li>
                  <li>• You want to completely remove a video from the site</li>
                  <li>• Cache is showing outdated video information</li>
                </ul>
                <p className="text-blue-700 dark:text-blue-300 mt-2">
                  Note: This wont delete the video from YouTube, only from your
                  local system.
                </p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAdminPageSSR();
