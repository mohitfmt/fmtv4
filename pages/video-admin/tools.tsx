// pages/video-admin/tools.tsx
// CONSOLIDATED ADMIN UTILITIES PAGE
// All 6 tools: Pull Videos, Clear Cache, Fix Playlist, Sync Playlist, Verify Counts, Purge Video

import { useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  IoMdRefresh,
  IoMdTrash,
  IoMdCheckmarkCircle,
  IoMdWarning,
  IoMdInformationCircle,
  IoMdAlert,
  IoMdLink,
  IoMdFlash,
  IoMdGitMerge,
} from "react-icons/io";
import { videoApiJson } from "@/lib/videoApi";
import { useVideoAdminAuth } from "@/hooks/useVideoAdminAuth";
import { FaPoundSign } from "react-icons/fa";
import { FaDatabase } from "react-icons/fa6";

// ==================== TYPES ====================

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

interface ClearCacheResult {
  success: boolean;
  message?: string;
  details?: {
    lruCachesCleared: number;
    isrRevalidated: boolean;
    cdnPurged: boolean;
    duration: number;
    errors: string[];
  };
  traceId?: string;
}

interface FixVideoResult {
  success: boolean;
  message: string;
  results: Array<{
    videoId: string;
    title: string;
    before: {
      playlists: string[];
      playlistNames: string[];
    };
    after: {
      playlists: string[];
      playlistNames: string[];
    };
    changes: {
      added: string[];
      removed: string[];
      unchanged: string[];
    };
    cacheCleared: boolean;
    errors: string[];
  }>;
  cacheStatus: {
    lruCleared: boolean;
    cloudflarePurged: boolean;
    isrRevalidated: boolean;
    totalDuration: number;
  };
  totalProcessed: number;
  totalErrors: number;
  traceId: string;
  duration: number;
}

interface SyncPlaylistResult {
  success: boolean;
  message: string;
  data: {
    playlist: {
      playlistId: string;
      title: string;
      slug: string | null;
    };
    syncResult: {
      videosAdded: number;
      videosUpdated: number;
      videosRemoved: number;
      duration: number;
      errors: string[];
    };
    cacheStatus: {
      lruCleared: boolean;
      cloudflarePurged: boolean;
      isrRevalidated: boolean;
      totalDuration: number;
    };
  };
  traceId: string;
  duration: number;
}

interface EnhancedVerifyResult {
  success: boolean;
  message?: string;
  data?: {
    discovery: {
      totalOnYouTube: number;
      existingInDB: number;
      newDiscovered: number;
      discoveredPlaylists: Array<{
        playlistId: string;
        title: string;
        itemCount: number;
      }>;
    };
    verification: {
      totalVerified: number;
      totalCorrected: number;
      totalErrors: number;
      results: Array<{
        playlistId: string;
        title: string;
        previousCount: number;
        actualCount: number;
        difference: number;
        corrected: boolean;
        error?: string;
      }>;
    };
    duration: number;
    apiCallsUsed: number;
  };
  traceId?: string;
  timestamp?: string;
  error?: string;
}

interface PurgeResult {
  success: boolean;
  message?: string;
  results?: {
    videoId: string;
    removedFromPlaylists: number;
    clearedFromCache: boolean;
    purgedFromCDN: boolean;
    deletedFromDB: boolean;
  };
  traceId?: string;
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

    // Simulate progress bar
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
            <IoMdRefresh className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
                <IoMdRefresh className="w-4 h-4 mr-2 animate-spin" />
                Syncing... {progress}%
              </>
            ) : (
              <>
                <IoMdRefresh className="w-4 h-4 mr-2" />
                Pull New Videos
              </>
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        {syncing && (
          <div className="mb-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex gap-2">
              <IoMdAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex gap-2">
              <IoMdCheckmarkCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-green-700 dark:text-green-300">
                  {success}
                </p>
                {lastResult?.summary && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-green-700 dark:text-green-300">
                    <div>Added: {lastResult.summary.videosAdded}</div>
                    <div>Updated: {lastResult.summary.videosUpdated}</div>
                    <div>
                      Playlist Items: {lastResult.summary.playlistItemsAdded}
                    </div>
                    <div>Playlists: {lastResult.summary.totalPlaylists}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex gap-2">
            <IoMdInformationCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">When to use:</p>
              <ul className="space-y-1">
                <li>• New videos uploaded but not appearing</li>
                <li>• After creating new playlists</li>
                <li>• Videos missing from playlists</li>
              </ul>
              <p className="mt-2 text-blue-600 dark:text-blue-400">
                ⏱️ Takes 5-15 minutes depending on playlist size
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
  const [lastResult, setLastResult] = useState<ClearCacheResult | null>(null);

  const handleClear = async () => {
    setClearing(true);
    setError(null);
    setSuccess(null);
    setLastResult(null);

    try {
      const response = await videoApiJson<ClearCacheResult>(
        "/api/video-admin/clear-cache",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response?.success) {
        setSuccess(
          response.message || "All video caches cleared successfully!"
        );
        setLastResult(response);
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
            <IoMdFlash className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Clear Video Caches</h2>
            <p className="text-sm text-muted-foreground">
              Clear all video-related caches (LRU, ISR, CDN)
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="mb-4">
          <Button
            onClick={handleClear}
            disabled={clearing}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {clearing ? (
              <>
                <IoMdRefresh className="w-4 h-4 mr-2 animate-spin" />
                Clearing Caches...
              </>
            ) : (
              <>
                <IoMdFlash className="w-4 h-4 mr-2" />
                Clear All Caches
              </>
            )}
          </Button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex gap-2">
              <IoMdAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex gap-2">
              <IoMdCheckmarkCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-green-700 dark:text-green-300">
                  {success}
                </p>
                {lastResult?.details && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="p-2 bg-muted/50 rounded text-center">
                      <p className="text-xs text-muted-foreground">LRU</p>
                      <p className="text-lg font-bold">
                        {lastResult.details.lruCachesCleared || 0}
                      </p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded text-center">
                      <p className="text-xs text-muted-foreground">ISR</p>
                      <p className="text-lg font-bold">
                        {lastResult.details.isrRevalidated ? "✓" : "—"}
                      </p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded text-center">
                      <p className="text-xs text-muted-foreground">CDN</p>
                      <p className="text-lg font-bold">
                        {lastResult.details.cdnPurged ? "✓" : "—"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <div className="flex gap-2">
            <IoMdInformationCircle className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-purple-700 dark:text-purple-300">
              <p className="font-medium mb-1">When to use:</p>
              <ul className="space-y-1">
                <li>• Videos showing outdated information</li>
                <li>• After major configuration changes</li>
                <li>• Troubleshooting display issues</li>
              </ul>
              <p className="mt-2 text-purple-600 dark:text-purple-400">
                ⏱️ Takes 10-15 seconds to complete
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. FIX VIDEO PLAYLIST CARD
function FixVideoPlaylistCard() {
  const [fixing, setFixing] = useState(false);
  const [videoInput, setVideoInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<FixVideoResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleFix = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoInput.trim()) {
      setError("Please enter a video URL or ID");
      return;
    }

    setFixing(true);
    setError(null);
    setSuccess(null);
    setLastResult(null);

    try {
      const response = await videoApiJson<FixVideoResult>(
        "/api/video-admin/fix-video-playlist",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoInput: videoInput.trim() }),
        }
      );

      if (response?.success) {
        setSuccess(response.message);
        setLastResult(response);
        setVideoInput("");
      } else {
        throw new Error(response?.message || "Failed to fix video playlist");
      }
    } catch (error) {
      console.error("Fix failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fix video playlist. Please try again."
      );
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-950 rounded-lg">
            <IoMdGitMerge className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Fix Video Playlist</h2>
            <p className="text-sm text-muted-foreground">
              Re-sync video playlist assignment from YouTube
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleFix} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Video URL or ID (comma-separated for multiple)
            </label>
            <input
              type="text"
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              placeholder="Enter video URL, ID, or multiple separated by commas"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={fixing}
            />
          </div>

          {/* Help Toggle */}
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <IoMdInformationCircle className="w-4 h-4" />
            {showHelp ? "Hide examples" : "Show examples"}
          </button>

          {/* Example Formats */}
          {showHelp && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Accepted formats:
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex items-start gap-2">
                  <FaPoundSign className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Video ID</p>
                    <p className="text-muted-foreground">dQw4w9WgXcQ</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <IoMdLink className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">YouTube URL</p>
                    <p className="text-muted-foreground">
                      https://www.youtube.com/watch?v=dQw4w9WgXcQ
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <IoMdLink className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">FMT URL</p>
                    <p className="text-muted-foreground">
                      https://freemalaysiatoday.com/videos/dQw4w9WgXcQ
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FaPoundSign className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Multiple videos</p>
                    <p className="text-muted-foreground">
                      dQw4w9WgXcQ, abc123def45, xyz789abc12
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" disabled={fixing} className="w-full" size="lg">
            {fixing ? (
              <>
                <IoMdRefresh className="w-4 h-4 mr-2 animate-spin" />
                Fixing Playlist Assignment...
              </>
            ) : (
              <>
                <IoMdGitMerge className="w-4 h-4 mr-2" />
                Fix Playlist Assignment
              </>
            )}
          </Button>
        </form>

        {/* Status Messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex gap-2">
              <IoMdAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex gap-2">
              <IoMdCheckmarkCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                  {success}
                </p>
                {lastResult?.results && lastResult.results.length > 0 && (
                  <div className="space-y-3">
                    {lastResult.results.map((result, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-white dark:bg-gray-900 rounded border border-green-200 dark:border-green-800"
                      >
                        <p className="text-xs font-medium mb-1">
                          {result.title}
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">
                              Before:
                            </span>{" "}
                            {result.before.playlists.length}
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              After:
                            </span>{" "}
                            {result.after.playlists.length}
                          </div>
                          <div className="col-span-2">
                            <span className="text-green-600">
                              +{result.changes.added.length}
                            </span>{" "}
                            <span className="text-red-600">
                              -{result.changes.removed.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <div className="flex gap-2">
            <IoMdInformationCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-orange-700 dark:text-orange-300">
              <p className="font-medium mb-1">When to use:</p>
              <ul className="space-y-1">
                <li>• Video shows in wrong playlist</li>
                <li>• Playlist assignment changed on YouTube</li>
                <li>• Video removed from playlist but still appears</li>
              </ul>
              <p className="mt-2 text-orange-600 dark:text-orange-400">
                ⏱️ Takes 30-60 seconds per video
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. SYNC SPECIFIC PLAYLIST CARD
function SyncSpecificPlaylistCard() {
  const [syncing, setSyncing] = useState(false);
  const [playlistInput, setPlaylistInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncPlaylistResult | null>(null);

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!playlistInput.trim()) {
      setError("Please enter a playlist ID or slug");
      return;
    }

    setSyncing(true);
    setError(null);
    setSuccess(null);
    setLastResult(null);

    try {
      const response = await videoApiJson<SyncPlaylistResult>(
        "/api/video-admin/sync-specific-playlist",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playlistInput: playlistInput.trim() }),
          timeout: 300000, // 5 minutes
        }
      );

      if (response?.success) {
        setSuccess(response.message);
        setLastResult(response);
        setPlaylistInput("");
      } else {
        throw new Error(response?.message || "Failed to sync playlist");
      }
    } catch (error) {
      console.error("Sync failed:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to sync playlist. Please try again."
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
          <div className="p-3 bg-indigo-100 dark:bg-indigo-950 rounded-lg">
            <FaDatabase className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Sync Specific Playlist</h2>
            <p className="text-sm text-muted-foreground">
              Full sync of a single playlist from YouTube
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSync} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Playlist ID or Slug
            </label>
            <input
              type="text"
              value={playlistInput}
              onChange={(e) => setPlaylistInput(e.target.value)}
              placeholder="Enter playlist ID (PL...) or slug"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={syncing}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Example: PLPcW_mfxgWZAW_fJn-1BfphLMJjqJWDYV or fmt-news
            </p>
          </div>

          {/* Submit Button */}
          <Button type="submit" disabled={syncing} className="w-full" size="lg">
            {syncing ? (
              <>
                <IoMdRefresh className="w-4 h-4 mr-2 animate-spin" />
                Syncing Playlist...
              </>
            ) : (
              <>
                <FaDatabase className="w-4 h-4 mr-2" />
                Sync Playlist
              </>
            )}
          </Button>
        </form>

        {/* Status Messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex gap-2">
              <IoMdAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex gap-2">
              <IoMdCheckmarkCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                  {success}
                </p>
                {lastResult?.data && (
                  <div className="space-y-2">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      <strong>{lastResult.data.playlist.title}</strong>
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-muted-foreground">Added</p>
                        <p className="text-lg font-bold">
                          {lastResult.data.syncResult.videosAdded}
                        </p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-muted-foreground">Updated</p>
                        <p className="text-lg font-bold">
                          {lastResult.data.syncResult.videosUpdated}
                        </p>
                      </div>
                      <div className="p-2 bg-muted/50 rounded text-center">
                        <p className="text-muted-foreground">Removed</p>
                        <p className="text-lg font-bold">
                          {lastResult.data.syncResult.videosRemoved}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <div className="flex gap-2">
            <IoMdInformationCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-700 dark:text-indigo-300">
              <p className="font-medium mb-1">When to use:</p>
              <ul className="space-y-1">
                <li>• Playlist has major changes on YouTube</li>
                <li>• Videos in playlist need full refresh</li>
                <li>• Playlist counts or order incorrect</li>
              </ul>
              <p className="mt-2 text-indigo-600 dark:text-indigo-400">
                ⏱️ Takes 1-5 minutes depending on playlist size
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 5. VERIFY PLAYLIST COUNTS CARD
function VerifyCountsCard() {
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<EnhancedVerifyResult | null>(
    null
  );
  const [showDetails, setShowDetails] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    setSuccess(null);
    setLastResult(null);
    setShowDetails(false);

    try {
      const response = await videoApiJson<EnhancedVerifyResult>(
        "/api/cron/verify-playlist-counts",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          timeout: 300000, // 5 minutes
        }
      );

      if (response?.success) {
        const discovery = response.data?.discovery;
        const verification = response.data?.verification;

        let message = "";
        if (discovery && discovery.newDiscovered > 0) {
          message += `🎉 Discovered ${discovery.newDiscovered} new playlist${discovery.newDiscovered > 1 ? "s" : ""}! `;
        }
        message += `Verified ${verification?.totalVerified || 0} playlists, corrected ${verification?.totalCorrected || 0} counts in ${response.data?.duration || 0}s`;

        setSuccess(message);
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
            <FaDatabase className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">
              Discover & Verify Playlists
            </h2>
            <p className="text-sm text-muted-foreground">
              Find new playlists and correct video counts
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
                <IoMdRefresh className="w-4 h-4 mr-2 animate-spin" />
                Discovering & Verifying...
              </>
            ) : (
              <>
                <IoMdCheckmarkCircle className="w-4 h-4 mr-2" />
                Discover & Verify
              </>
            )}
          </Button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex gap-2">
              <IoMdAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex gap-2">
              <IoMdCheckmarkCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-green-700 dark:text-green-300">
                  {success}
                </p>

                {lastResult?.data && (
                  <div className="mt-3 space-y-2">
                    {/* Discovery Stats */}
                    {lastResult.data.discovery.newDiscovered > 0 && (
                      <div className="p-2 bg-white dark:bg-gray-900 rounded border border-green-200 dark:border-green-800">
                        <p className="text-xs font-medium mb-2">
                          🎉 New Playlists Discovered:
                        </p>
                        <div className="space-y-1">
                          {lastResult.data.discovery.discoveredPlaylists
                            .slice(0, 3)
                            .map((pl, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-muted-foreground"
                              >
                                • {pl.title} ({pl.itemCount} videos)
                              </div>
                            ))}
                          {lastResult.data.discovery.discoveredPlaylists
                            .length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              ... and{" "}
                              {lastResult.data.discovery.discoveredPlaylists
                                .length - 3}{" "}
                              more
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Corrections Stats */}
                    {lastResult.data.verification.totalCorrected > 0 && (
                      <div>
                        <button
                          onClick={() => setShowDetails(!showDetails)}
                          className="text-xs text-green-600 dark:text-green-400 hover:underline"
                        >
                          {showDetails
                            ? "Hide corrections"
                            : `Show ${lastResult.data.verification.totalCorrected} corrections`}
                        </button>

                        {showDetails &&
                          lastResult.data.verification.results && (
                            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                              {lastResult.data.verification.results
                                .filter((r) => r.corrected)
                                .map((result, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs p-2 bg-white dark:bg-gray-900 rounded border border-green-200 dark:border-green-800"
                                  >
                                    <p className="font-medium">
                                      {result.title}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {result.previousCount} →{" "}
                                      {result.actualCount} (
                                      {result.difference > 0 ? "+" : ""}
                                      {result.difference})
                                    </p>
                                  </div>
                                ))}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex gap-2">
            <IoMdInformationCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-green-700 dark:text-green-300">
              <p className="font-medium mb-1">When to use:</p>
              <ul className="space-y-1">
                <li>• After creating new playlists on YouTube</li>
                <li>• Playlist counts look incorrect</li>
                <li>• Weekly maintenance check</li>
              </ul>
              <p className="mt-2 text-green-600 dark:text-green-400">
                ⏱️ Takes 2-5 minutes depending on playlist count
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 6. PURGE SPECIFIC VIDEO CARD
function PurgeVideoCard() {
  const [purging, setPurging] = useState(false);
  const [videoInput, setVideoInput] = useState("");
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

    // Confirmation
    const confirmed = window.confirm(
      "⚠️ This will permanently delete the video from the database and all caches. This action cannot be undone. Continue?"
    );

    if (!confirmed) return;

    setPurging(true);
    setError(null);
    setSuccess(null);
    setLastResult(null);

    try {
      const response = await videoApiJson<PurgeResult>(
        "/api/video-admin/purge-video",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoInput: videoInput.trim() }),
        }
      );

      if (response?.success) {
        setSuccess(response.message || "Video purged successfully");
        setLastResult(response);
        setVideoInput("");
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

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-red-100 dark:bg-red-950 rounded-lg">
            <IoMdTrash className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Purge Specific Video</h2>
            <p className="text-sm text-muted-foreground">
              Permanently remove a video from cache and database
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex gap-2">
            <IoMdWarning className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
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

          {/* Help Toggle */}
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <IoMdInformationCircle className="w-4 h-4" />
            {showHelp ? "Hide examples" : "Show examples"}
          </button>

          {/* Example Formats */}
          {showHelp && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Accepted formats:
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex items-start gap-2">
                  <FaPoundSign className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Video ID</p>
                    <p className="text-muted-foreground">dQw4w9WgXcQ</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <IoMdLink className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">YouTube URL</p>
                    <p className="text-muted-foreground">
                      https://www.youtube.com/watch?v=dQw4w9WgXcQ
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <IoMdLink className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Short URL</p>
                    <p className="text-muted-foreground">
                      https://youtu.be/dQw4w9WgXcQ
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={purging}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            {purging ? (
              <>
                <IoMdRefresh className="w-4 h-4 mr-2 animate-spin" />
                Purging Video...
              </>
            ) : (
              <>
                <IoMdTrash className="w-4 h-4 mr-2" />
                Purge Video
              </>
            )}
          </Button>
        </form>

        {/* Status Messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex gap-2">
              <IoMdAlert className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex gap-2">
              <IoMdCheckmarkCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-green-700 dark:text-green-300">
                  {success}
                </p>
                {lastResult?.results && (
                  <div className="mt-2 space-y-1 text-xs text-green-700 dark:text-green-300">
                    {lastResult.results.deletedFromDB && (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Removed from database</span>
                      </div>
                    )}
                    {lastResult.results.removedFromPlaylists > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span>
                          Removed from {lastResult.results.removedFromPlaylists}{" "}
                          playlist(s)
                        </span>
                      </div>
                    )}
                    {lastResult.results.clearedFromCache && (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Cleared from cache</span>
                      </div>
                    )}
                    {lastResult.results.purgedFromCDN && (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span>Purged from CDN</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex gap-2">
            <IoMdInformationCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 dark:text-red-300">
              <p className="font-medium mb-1">When to use:</p>
              <ul className="space-y-1">
                <li>• Video deleted from YouTube but still on FMT</li>
                <li>• Video needs complete removal from system</li>
                <li>• Cleanup after bulk deletions</li>
              </ul>
              <p className="mt-2 text-red-600 dark:text-red-400">
                ⏱️ Takes 15-30 seconds to complete
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN PAGE ====================

export default function VideoAdminTools() {
  const { isAuthorized, user } = useVideoAdminAuth();

  if (!isAuthorized || !user) {
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
        description="Utilities for managing video content and caches"
      >
        <div className="space-y-6">
          {/* Grid Layout - 2 columns on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Row 1 */}
            <PullVideosCard />
            <ClearCachesCard />

            {/* Row 2 */}
            <FixVideoPlaylistCard />
            <SyncSpecificPlaylistCard />

            {/* Row 3 */}
            <VerifyCountsCard />
            <PurgeVideoCard />
          </div>

          {/* Help Section */}
          <div className="mt-8 p-6 bg-muted/50 border border-border rounded-lg">
            <div className="flex items-start gap-3">
              <IoMdInformationCircle className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Need Help?</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong>Quick Tips:</strong>
                  </p>
                  <ul className="space-y-1 ml-4 list-disc">
                    <li>
                      <strong>Pull New Videos:</strong> Use for daily sync of
                      all playlists
                    </li>
                    <li>
                      <strong>Clear Caches:</strong> Use when videos show stale
                      data
                    </li>
                    <li>
                      <strong>Fix Playlist:</strong> Use for individual video
                      playlist issues
                    </li>
                    <li>
                      <strong>Sync Playlist:</strong> Use for full playlist
                      refresh
                    </li>
                    <li>
                      <strong>Verify Counts:</strong> Use weekly or after major
                      changes
                    </li>
                    <li>
                      <strong>Purge Video:</strong> Use only for deleted videos
                    </li>
                  </ul>
                  <p className="mt-4">
                    If issues persist, check Cloud Run logs or contact the
                    technical team.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}
