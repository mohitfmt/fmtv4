import { GetServerSideProps } from "next";
import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { withAdminPageSSR } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  ExternalLink,
  Video,
  Eye,
  EyeOff,
  Search,
  Filter,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Info,
  PlayCircle,
  Clock,
  Hash,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { videoApiJson } from "@/lib/videoApi";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Playlist {
  id: string;
  playlistId: string;
  title: string;
  description?: string;
  itemCount: number;
  thumbnailUrl?: string;
  isActive: boolean;
  lastSynced?: string;
  updatedAt?: string;
  createdAt?: string;
  channelTitle?: string;
  syncInProgress?: boolean;
  lastSyncResult?: {
    videosAdded?: number;
    videosUpdated?: number;
    videosRemoved?: number;
    error?: string;
  };
}

interface PlaylistsResponse {
  data: Playlist[];
  total: number;
  page: number;
  limit: number;
}

interface SyncResponse {
  success: boolean;
  message: string;
  playlistId?: string;
  queuePosition?: number;
}

export default function PlaylistsPage() {
  // State Management
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<"videos" | "name" | "updated">("videos");
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(
    new Set()
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch playlists with filters
  const loadPlaylists = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
          setError(null);
        }

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "12",
          ...(searchTerm && { search: searchTerm }),
          ...(filterActive !== null && { active: filterActive.toString() }),
          ...(sortBy && { sort: sortBy }),
        });

        const response = await videoApiJson<PlaylistsResponse>(
          `/api/video-admin/playlists?${params.toString()}`
        );

        if (response?.data) {
          setPlaylists(response.data);
          setTotalPages(Math.ceil(response.total / 12));
          setTotalCount(response.total);
        }
      } catch (error) {
        console.error("Failed to load playlists:", error);
        setError("Failed to load playlists. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [page, searchTerm, filterActive, sortBy]
  );

  // Initial load and refresh
  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  // Auto-refresh every 30 seconds if any playlist is syncing
  useEffect(() => {
    const hasSyncing = playlists.some((p) => p.syncInProgress);
    if (hasSyncing) {
      const interval = setInterval(() => {
        loadPlaylists(true);
      }, 5000); // Check every 5 seconds when syncing
      return () => clearInterval(interval);
    }
  }, [playlists, loadPlaylists]);

  // Sync individual playlist
  const syncPlaylist = async (playlistId: string, playlistName: string) => {
    setSyncing(playlistId);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await videoApiJson<SyncResponse>(
        `/api/video-admin/playlists/${playlistId}/sync`,
        {
          method: "POST",
        }
      );

      if (response?.success) {
        setSuccessMessage(`Started syncing "${playlistName}"`);
        // Mark playlist as syncing
        setPlaylists((prev) =>
          prev.map((p) =>
            p.playlistId === playlistId ? { ...p, syncInProgress: true } : p
          )
        );
        // Reload after a delay to get updated status
        setTimeout(() => loadPlaylists(true), 2000);
      } else {
        throw new Error(response?.message || "Sync failed");
      }
    } catch (error: any) {
      console.error("Failed to sync playlist:", error);
      setError(error.message || `Failed to sync "${playlistName}"`);
    } finally {
      setSyncing(null);
      // Clear messages after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
    }
  };

  // Toggle playlist active status
  const togglePlaylistStatus = async (playlist: Playlist) => {
    try {
      const response = await videoApiJson(
        `/api/video-admin/playlists/${playlist.playlistId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !playlist.isActive }),
        }
      );

      if (response) {
        setSuccessMessage(
          `${playlist.title} ${!playlist.isActive ? "activated" : "deactivated"}`
        );
        // Update local state
        setPlaylists((prev) =>
          prev.map((p) =>
            p.playlistId === playlist.playlistId
              ? { ...p, isActive: !playlist.isActive }
              : p
          )
        );
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error("Failed to toggle playlist status:", error);
      setError(`Failed to update ${playlist.title}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  // Bulk sync selected playlists
  const bulkSync = async () => {
    if (selectedPlaylists.size === 0) {
      setError("Please select playlists to sync");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setBulkSyncing(true);
    setError(null);
    setSuccessMessage(null);

    let successCount = 0;
    let failCount = 0;

    for (const playlistId of selectedPlaylists) {
      const playlist = playlists.find((p) => p.playlistId === playlistId);
      if (!playlist) continue;

      try {
        await videoApiJson<SyncResponse>(
          `/api/video-admin/playlists/${playlistId}/sync`,
          {
            method: "POST",
          }
        );
        successCount++;
        // Mark as syncing
        setPlaylists((prev) =>
          prev.map((p) =>
            p.playlistId === playlistId ? { ...p, syncInProgress: true } : p
          )
        );
      } catch (error) {
        failCount++;
        console.error(`Failed to sync ${playlist.title}:`, error);
      }
    }

    setBulkSyncing(false);
    setSelectedPlaylists(new Set());

    if (successCount > 0) {
      setSuccessMessage(`Started syncing ${successCount} playlist(s)`);
    }
    if (failCount > 0) {
      setError(`Failed to sync ${failCount} playlist(s)`);
    }

    // Reload after a delay
    setTimeout(() => {
      loadPlaylists(true);
      setSuccessMessage(null);
      setError(null);
    }, 3000);
  };

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPlaylists();
    setRefreshing(false);
  };

  // Toggle playlist selection
  const toggleSelection = (playlistId: string) => {
    setSelectedPlaylists((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playlistId)) {
        newSet.delete(playlistId);
      } else {
        newSet.add(playlistId);
      }
      return newSet;
    });
  };

  // Select all visible playlists
  const selectAll = () => {
    if (selectedPlaylists.size === playlists.length) {
      setSelectedPlaylists(new Set());
    } else {
      setSelectedPlaylists(new Set(playlists.map((p) => p.playlistId)));
    }
  };

  // Filter playlists based on search and filters
  const filteredPlaylists = playlists.filter((playlist) => {
    const matchesSearch =
      !searchTerm ||
      playlist.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      playlist.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterActive === null || playlist.isActive === filterActive;
    const matchesVisibility = showInactive || playlist.isActive;

    return matchesSearch && matchesFilter && matchesVisibility;
  });

  // Render empty state
  if (loading && playlists.length === 0) {
    return (
      <AdminLayout
        title="Playlist Management"
        description="Manage YouTube playlists and sync videos"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Playlist Management - Video Admin</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <AdminLayout
        title="Playlist Management"
        description="Manage YouTube playlists and sync videos"
      >
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-green-800 dark:text-green-200">
                {successMessage}
              </p>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Playlists</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
              <PlayCircle className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {playlists.filter((p) => p.isActive).length}
                </p>
              </div>
              <Eye className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Videos</p>
                <p className="text-2xl font-bold">
                  {playlists
                    .reduce((sum, p) => sum + (p.itemCount || 0), 0)
                    .toLocaleString()}
                </p>
              </div>
              <Video className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Syncing</p>
                <p className="text-2xl font-bold">
                  {playlists.filter((p) => p.syncInProgress).length}
                </p>
              </div>
              <RefreshCw
                className={cn(
                  "w-8 h-8",
                  playlists.some((p) => p.syncInProgress)
                    ? "text-blue-500 animate-spin"
                    : "text-gray-500"
                )}
              />
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search playlists..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Filter Active Status */}
            <div className="relative">
              <button
                onClick={() => {
                  setFilterActive(
                    filterActive === null
                      ? true
                      : filterActive === true
                        ? false
                        : null
                  );
                  setPage(1);
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors",
                  filterActive !== null && "border-primary"
                )}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden md:inline">
                  {filterActive === null
                    ? "All"
                    : filterActive
                      ? "Active"
                      : "Inactive"}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => {
                  const options: Array<"videos" | "name" | "updated"> = [
                    "videos",
                    "name",
                    "updated",
                  ];
                  const currentIndex = options.indexOf(sortBy);
                  setSortBy(options[(currentIndex + 1) % options.length]);
                  setPage(1);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors"
              >
                <Hash className="w-4 h-4" />
                <span className="hidden md:inline">
                  Sort:{" "}
                  {sortBy === "videos"
                    ? "Videos"
                    : sortBy === "name"
                      ? "Name"
                      : "Updated"}
                </span>
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-3 py-2 transition-colors",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card hover:bg-accent"
                )}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-3 py-2 transition-colors",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card hover:bg-accent"
                )}
              >
                List
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Select All */}
            {filteredPlaylists.length > 0 && (
              <Button onClick={selectAll} variant="outline" size="sm">
                {selectedPlaylists.size === playlists.length
                  ? "Deselect All"
                  : "Select All"}
              </Button>
            )}

            {/* Bulk Sync */}
            {selectedPlaylists.size > 0 && (
              <Button
                onClick={bulkSync}
                disabled={bulkSyncing}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                {bulkSyncing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sync {selectedPlaylists.size} Selected
              </Button>
            )}

            {/* Refresh */}
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw
                className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Playlists Grid/List */}
        {filteredPlaylists.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No playlists found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterActive !== null
                ? "Try adjusting your search or filters"
                : "Sync playlists from YouTube to get started"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {filteredPlaylists.map((playlist) => (
              <div
                key={playlist.playlistId}
                className={cn(
                  "bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow",
                  !playlist.isActive && "opacity-60",
                  playlist.syncInProgress &&
                    "ring-2 ring-blue-500 ring-opacity-50"
                )}
              >
                {/* Checkbox for selection */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedPlaylists.has(playlist.playlistId)}
                        onChange={() => toggleSelection(playlist.playlistId)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground line-clamp-1">
                          {playlist.title}
                        </h3>
                        {playlist.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {playlist.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => togglePlaylistStatus(playlist)}
                      className={cn(
                        "p-1 rounded transition-colors",
                        playlist.isActive
                          ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                          : "text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-950/20"
                      )}
                      title={playlist.isActive ? "Active" : "Inactive"}
                    >
                      {playlist.isActive ? (
                        <Eye className="w-5 h-5" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Thumbnail */}
                {playlist.thumbnailUrl && (
                  <div className="relative aspect-video bg-muted">
                    <Image
                      src={playlist.thumbnailUrl}
                      alt={playlist.title}
                      fill
                      className="object-cover"
                    />
                    {playlist.syncInProgress && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Video className="w-4 h-4" />
                      {playlist.itemCount || 0} videos
                    </span>
                    {playlist.updatedAt && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {formatDistanceToNow(new Date(playlist.updatedAt), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>

                  {playlist.channelTitle && (
                    <p className="text-xs text-muted-foreground">
                      Channel: {playlist.channelTitle}
                    </p>
                  )}

                  {/* Last sync result */}
                  {playlist.lastSyncResult && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Last sync:
                        {playlist.lastSyncResult.error ? (
                          <span className="text-red-600"> Failed</span>
                        ) : (
                          <span className="text-green-600">
                            {" "}
                            +{playlist.lastSyncResult.videosAdded ||
                              0} added,{" "}
                            {playlist.lastSyncResult.videosUpdated || 0} updated
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-border flex gap-2">
                  <Button
                    onClick={() =>
                      syncPlaylist(playlist.playlistId, playlist.title)
                    }
                    disabled={
                      syncing === playlist.playlistId ||
                      playlist.syncInProgress ||
                      bulkSyncing
                    }
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    {syncing === playlist.playlistId ||
                    playlist.syncInProgress ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() =>
                      window.open(
                        `https://youtube.com/playlist?list=${playlist.playlistId}`,
                        "_blank"
                      )
                    }
                    size="sm"
                    variant="ghost"
                    className="px-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedPlaylists.size === playlists.length}
                      onChange={selectAll}
                    />
                  </th>
                  <th className="p-4 text-left">Playlist</th>
                  <th className="p-4 text-center">Videos</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-left">Last Updated</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlaylists.map((playlist) => (
                  <tr
                    key={playlist.playlistId}
                    className={cn(
                      "border-b border-border hover:bg-muted/50 transition-colors",
                      !playlist.isActive && "opacity-60"
                    )}
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedPlaylists.has(playlist.playlistId)}
                        onChange={() => toggleSelection(playlist.playlistId)}
                      />
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{playlist.title}</p>
                        {playlist.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {playlist.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1">
                        <Video className="w-4 h-4 text-muted-foreground" />
                        {playlist.itemCount || 0}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {playlist.syncInProgress ? (
                        <span className="inline-flex items-center gap-1 text-blue-600">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Syncing
                        </span>
                      ) : (
                        <button
                          onClick={() => togglePlaylistStatus(playlist)}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs",
                            playlist.isActive
                              ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-400"
                          )}
                        >
                          {playlist.isActive ? (
                            <>
                              <Eye className="w-3 h-3" /> Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" /> Inactive
                            </>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="p-4">
                      {playlist.updatedAt && (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(playlist.updatedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() =>
                            syncPlaylist(playlist.playlistId, playlist.title)
                          }
                          disabled={
                            syncing === playlist.playlistId ||
                            playlist.syncInProgress ||
                            bulkSyncing
                          }
                          size="sm"
                          variant="ghost"
                        >
                          <RefreshCw
                            className={cn(
                              "w-4 h-4",
                              (syncing === playlist.playlistId ||
                                playlist.syncInProgress) &&
                                "animate-spin"
                            )}
                          />
                        </Button>
                        <Button
                          onClick={() =>
                            window.open(
                              `https://youtube.com/playlist?list=${playlist.playlistId}`,
                              "_blank"
                            )
                          }
                          size="sm"
                          variant="ghost"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 12 + 1} to {Math.min(page * 12, totalCount)}{" "}
              of {totalCount} playlists
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                size="sm"
                variant="outline"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded-md transition-colors",
                        pageNum === page
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && <span className="px-2">...</span>}
              </div>

              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                size="sm"
                variant="outline"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAdminPageSSR(
  async (context) => {
    return {
      props: {
        requiresAuth: true,
      },
    };
  }
);
