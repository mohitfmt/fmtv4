// pages/video-admin/tools.tsx
// CONSOLIDATED ADMIN UTILITIES PAGE
// Combines: Pull Videos, Clear Cache, Verify Counts, Purge Video

import { useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Trash2,
  CheckCircle2,
  Database,
  AlertTriangle,
  Info,
  Loader2,
  AlertCircle,
  Link,
  Hash,
  Zap,
} from "lucide-react";
import { videoApiJson } from "@/lib/videoApi";
import { useVideoAdminAuth } from "@/hooks/useVideoAdminAuth";

// ==================== TYPES ====================

interface PurgeResult {
  videoId: string;
  removedFromPlaylists: number;
  clearedFromCache: boolean;
  purgedFromCDN: boolean;
  deletedFromDB: boolean;
}

interface SyncResult {
  success: boolean;
  message?: string;
  summary?: {
    totalPlaylists: number;
    videosAdded: number;
    videosUpdated: number;
    playlistItemsAdded: number;
    errors: number;
  };
  playlists?: Array<{
    playlistId: string;
    title: string;
    videosAdded: number;
    videosUpdated: number;
    errors: number;
  }>;
  traceId?: string;
  error?: string;
}

interface VerifyResult {
  success: boolean;
  message?: string;
  data?: {
    totalPlaylists: number;
    totalCorrected: number;
    totalErrors: number;
    duration: number;
    results?: Array<{
      playlistId: string;
      title: string;
      previousCount: number;
      actualCount: number;
      difference: number;
      corrected: boolean;
      error?: string;
    }>;
  };
  traceId?: string;
  timestamp?: string;
  error?: string;
}

// ==================== UTILITY CARDS ====================

// 1. PULL NEW VIDEOS CARD
function PullVideosCard() {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setProgress(0);
    setError(null);
    setSuccess(null);
    setLastResult(null);

    // Simulate progress bar (since API doesn't stream progress)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + 1;
      });
    }, 1000);

    try {
      const response = await videoApiJson<SyncResult>(
        "/api/cron/youtube-catch-up",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          timeout: 900000, // 15 minutes
        }
      );

      clearInterval(progressInterval);
      setProgress(100);

      if (response?.success) {
        setSuccess(
          response.message || "Successfully synced videos from YouTube!"
        );
        setLastResult(response);
      } else {
        throw new Error(response?.message || "Failed to sync videos");
      }
    } catch (error) {
      clearInterval(progressInterval);
      setProgress(0);
      console.error("Sync failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to sync videos. Please try again."
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-950 rounded-lg">
            <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Pull New Videos</h2>
            <p className="text-sm text-muted-foreground">
              Sync latest videos from all active YouTube playlists
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mb-4">
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="w-full"
            size="lg"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing... {progress}%
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Pull New Videos
              </>
            )}
          </Button>

          {/* Progress Bar */}
          {syncing && (
            <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && lastResult?.summary && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {success}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-green-700 dark:text-green-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>Playlists: {lastResult.summary.totalPlaylists}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>Videos Added: {lastResult.summary.videosAdded}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>Videos Updated: {lastResult.summary.videosUpdated}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>
                  Items Added: {lastResult.summary.playlistItemsAdded}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">When to use:</p>
              <ul className="space-y-1">
                <li>• Videos are missing from the site</li>
                <li>• New videos uploaded but not showing</li>
                <li>• Emergency sync needed</li>
              </ul>
              <p className="mt-2 text-blue-600 dark:text-blue-400">
                ⚠️ Takes 5-10 minutes to complete
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. CLEAR VIDEO CACHES CARD
function ClearCachesCard() {
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleClearCache = async () => {
    setClearing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await videoApiJson<{
        success: boolean;
        message: string;
      }>("/api/video-admin/clear-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response?.success) {
        setSuccess(
          response.message || "All video caches cleared successfully!"
        );
      } else {
        throw new Error(response?.message || "Failed to clear caches");
      }
    } catch (error) {
      console.error("Clear cache failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to clear caches. Please try again."
      );
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-950 rounded-lg">
            <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Clear Video Caches</h2>
            <p className="text-sm text-muted-foreground">
              Clear all video-related LRU caches
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mb-4">
          <Button
            onClick={handleClearCache}
            disabled={clearing}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {clearing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Clear All Caches
              </>
            )}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {success}
              </p>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-purple-700 dark:text-purple-300">
              <p className="font-medium mb-1">When to use:</p>
              <ul className="space-y-1">
                <li>• Videos showing outdated information</li>
                <li>• After major configuration changes</li>
                <li>• Troubleshooting display issues</li>
              </ul>
              <p className="mt-2 text-purple-600 dark:text-purple-400">
                ✓ Takes only a few seconds
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. VERIFY PLAYLIST COUNTS CARD
function VerifyCountsCard() {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<VerifyResult | null>(null);

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    setSuccess(null);
    setLastResult(null);

    try {
      const response = await videoApiJson<VerifyResult>(
        "/api/cron/verify-playlist-counts",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          timeout: 180000, // 3 minutes
        }
      );

      if (response?.success) {
        setSuccess(
          `Verified ${response.data?.totalPlaylists || 0} playlists, corrected ${response.data?.totalCorrected || 0} counts in ${response.data?.duration || 0}s`
        );
        setLastResult(response);
      } else {
        throw new Error(response?.message || "Failed to verify counts");
      }
    } catch (error) {
      console.error("Verify failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to verify playlist counts. Please try again."
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-green-100 dark:bg-green-950 rounded-lg">
            <Database className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Verify Playlist Counts</h2>
            <p className="text-sm text-muted-foreground">
              Check and correct video counts for all playlists
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mb-4">
          <Button
            onClick={handleVerify}
            disabled={verifying}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Verify Counts
              </>
            )}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {lastResult?.data && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm">
              <strong>Playlists Verified:</strong>{" "}
              {lastResult.data.totalPlaylists}
            </p>
            <p className="text-sm">
              <strong>Counts Corrected:</strong>{" "}
              {lastResult.data.totalCorrected}
            </p>
            {lastResult.data.totalErrors > 0 && (
              <p className="text-sm text-destructive">
                <strong>Errors:</strong> {lastResult.data.totalErrors}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              <strong>Duration:</strong> {lastResult.data.duration}s
            </p>
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-green-700 dark:text-green-300">
              <p className="font-medium mb-1">When to use:</p>
              <ul className="space-y-1">
                <li>• Playlist counts seem incorrect</li>
                <li>• After bulk video operations</li>
                <li>• Weekly maintenance check</li>
              </ul>
              <p className="mt-2 text-green-600 dark:text-green-400">
                ✓ Automatically corrects mismatches
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. PURGE SPECIFIC VIDEO CARD
function PurgeVideoCard() {
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

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-950 rounded-lg">
            <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Purge Specific Video</h2>
            <p className="text-sm text-muted-foreground">
              Remove a specific video from cache and database
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                This action cannot be undone
              </p>
              <p className="text-yellow-700 dark:text-yellow-300">
                This will permanently remove the video from all playlists,
                cache, and database.
              </p>
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
              placeholder="Enter YouTube video URL or ID"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={purging}
            />
          </div>

          {/* Help Button */}
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Info className="w-4 h-4" />
            {showHelp ? "Hide" : "Show"} accepted formats
          </button>

          {/* Help Text */}
          {showHelp && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Accepted formats:</p>
              {exampleFormats.map((format) => (
                <div
                  key={format.type}
                  className="flex items-center gap-2 text-sm"
                >
                  <format.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{format.type}:</span>
                  <code className="text-xs bg-background px-2 py-1 rounded">
                    {format.example}
                  </code>
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={purging || !videoInput.trim()}
            variant="destructive"
            className="w-full"
            size="lg"
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
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
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

        {/* Info */}
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 dark:text-red-300">
              <p className="font-medium mb-1">When to use:</p>
              <ul className="space-y-1">
                <li>• A video has been deleted from YouTube</li>
                <li>• Video violates content policies</li>
                <li>• Need to remove specific video completely</li>
              </ul>
              <p className="mt-2 text-red-600 dark:text-red-400">
                ⚠️ This wont delete from YouTube, only from your system
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function VideoAdminToolsPage() {
  const { user, isAuthorized, isChecking } = useVideoAdminAuth();

  if (isChecking || !isAuthorized) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Tools - Video Admin</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <AdminLayout
        title="Admin Tools"
        description="Utilities for managing videos, caches, and playlists"
      >
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-2">Video Admin Tools</h1>
            <p className="text-muted-foreground">
              Essential utilities for managing videos, caches, and maintaining
              data integrity. Use these tools carefully as some actions cannot
              be undone.
            </p>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Row 1 */}
            <PullVideosCard />
            <ClearCachesCard />

            {/* Row 2 */}
            <VerifyCountsCard />
            <PurgeVideoCard />
          </div>

          {/* Footer Note */}
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Best Practices:</p>
                <ul className="space-y-1">
                  <li>
                    • Use Pull New Videos when videos are missing or out of
                    sync
                  </li>
                  <li>• Clear caches after configuration changes</li>
                  <li>• Verify counts weekly or after bulk operations</li>
                  <li>
                    • Purge videos only when theyre deleted or violate policies
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
