// pages/video-admin/playlists.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { videoApiJson } from "@/lib/videoApi";
import {
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiGrid,
  FiList,
  FiVideo,
  FiLoader,
  FiAlertCircle,
  FiCheckCircle,
  FiMoreVertical,
  FiExternalLink,
  FiZap,
  FiStar,
  FiChevronLeft,
  FiChevronRight,
  FiToggleLeft,
  FiToggleRight,
  FiCopy,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import {
  MdOutlineNewspaper,
  MdSportsSoccer,
  MdLiveTv,
  MdOutlineSmartDisplay,
  MdMusicNote,
  MdSync,
  MdSyncDisabled,
  MdSyncProblem,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdIndeterminateCheckBox,
} from "react-icons/md";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useVideoAdminAuth } from "@/hooks/useVideoAdminAuth";

interface PageProps {
  requiresAuth?: boolean;
  session?: any;
}

interface Playlist {
  playlistId: string;
  title: string;
  description?: string;
  itemCount: number;
  thumbnailUrl?: string | null;
  isActive: boolean;
  lastSyncedAt?: string;
  updatedAt?: string;
  createdAt?: string;
  channelTitle?: string | null;
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
  message?: string;
  playlistId?: string;
  queuePosition?: number;
}

// Utility functions
const hashHue = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
};

const gradientFor = (id: string) => {
  const h = hashHue(id);
  const h2 = (h + 35) % 360;
  return `linear-gradient(135deg, hsl(${h} 70% 45%) 0%, hsl(${h2} 70% 50%) 100%)`;
};

// Thumbnail with fallbacks
const PlaylistThumbnail = ({
  playlist,
  index,
  showThumbnails = true,
}: {
  playlist: Playlist;
  index: number;
  showThumbnails?: boolean;
}) => {
  const [imgError, setImgError] = useState(false);

  const getPlaylistIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("short") || t.includes("reel"))
      return <FiZap className="w-8 h-8 text-purple-400" />;
    if (t.includes("news"))
      return <MdOutlineNewspaper className="w-8 h-8 text-blue-400" />;
    if (t.includes("music"))
      return <MdMusicNote className="w-8 h-8 text-pink-400" />;
    if (t.includes("sport"))
      return <MdSportsSoccer className="w-8 h-8 text-green-400" />;
    if (t.includes("live"))
      return <MdLiveTv className="w-8 h-8 text-red-400" />;
    if (t.includes("exclusive"))
      return <FiStar className="w-8 h-8 text-yellow-400" />;
    return <MdOutlineSmartDisplay className="w-8 h-8 text-white/70" />;
  };

  if (!showThumbnails || !playlist.thumbnailUrl || imgError) {
    return (
      <div
        className="relative aspect-video rounded-md overflow-hidden"
        style={{ backgroundImage: gradientFor(playlist.playlistId) }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-background/70 backdrop-blur-sm px-3 py-2 rounded-xl flex items-center gap-2 shadow-lg">
            {getPlaylistIcon(playlist.title)}
            <span className="font-medium text-sm truncate max-w-[12rem] text-white/90">
              {playlist.title}
            </span>
          </div>
        </div>
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white/90 text-xs">
          <span className="flex items-center gap-1">
            <FiVideo className="w-3 h-3" />
            {playlist.itemCount.toLocaleString()}
          </span>
          {playlist.lastSyncedAt && (
            <span className="flex items-center gap-1">
              <MdSyncDisabled className="w-3 h-3" />
              {formatDistanceToNow(new Date(playlist.lastSyncedAt), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video rounded-md overflow-hidden bg-muted">
      <Image
        src={playlist.thumbnailUrl}
        alt={playlist.title}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        className="object-cover"
        priority={index < 4}
        loading={index < 4 ? "eager" : "lazy"}
        onError={() => setImgError(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-2 left-2 right-2 text-white text-xs">
          <p className="line-clamp-1">
            {playlist.description || "No description"}
          </p>
        </div>
      </div>
    </div>
  );
};

// Card Component (without animations)
const PlaylistCard = ({
  playlist,
  isSelected,
  onToggleSelect,
  onSync,
  onToggleActive,
  viewMode,
  index,
  showThumbnails,
}: {
  playlist: Playlist;
  isSelected: boolean;
  onToggleSelect: () => void;
  onSync: () => void;
  onToggleActive: () => void;
  viewMode: "grid" | "list";
  index: number;
  showThumbnails: boolean;
}) => {
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  const getPlaylistIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("short") || t.includes("reel"))
      return <FiZap className="w-5 h-5 text-purple-500" />;
    if (t.includes("news"))
      return <MdOutlineNewspaper className="w-5 h-5 text-blue-500" />;
    if (t.includes("music"))
      return <MdMusicNote className="w-5 h-5 text-pink-500" />;
    if (t.includes("sport"))
      return <MdSportsSoccer className="w-5 h-5 text-green-500" />;
    if (t.includes("live"))
      return <MdLiveTv className="w-5 h-5 text-red-500" />;
    if (t.includes("exclusive"))
      return <FiStar className="w-5 h-5 text-yellow-500" />;
    return <MdOutlineSmartDisplay className="w-5 h-5 text-primary" />;
  };

  const getSyncStatusIcon = () => {
    if (playlist.syncInProgress)
      return <MdSync className="w-4 h-4 animate-spin text-blue-500" />;
    if (playlist.lastSyncResult?.error)
      return <MdSyncProblem className="w-4 h-4 text-red-500" />;
    if (playlist.lastSyncedAt)
      return <MdSyncDisabled className="w-4 h-4 text-green-500" />;
    return <MdSyncDisabled className="w-4 h-4 text-gray-400" />;
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowActions(false);
    };
    if (showActions) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [showActions]);

  if (viewMode === "list") {
    return (
      <div className="group">
        <div
          className={cn(
            "flex items-center gap-4 p-4 bg-card rounded-lg border transition-all",
            "hover:shadow-md hover:border-primary/30",
            isSelected && "border-primary bg-primary/5"
          )}
        >
          <button
            onClick={onToggleSelect}
            className="flex-shrink-0"
            aria-label={isSelected ? "Deselect playlist" : "Select playlist"}
          >
            {isSelected ? (
              <MdCheckBox className="w-5 h-5 text-primary" />
            ) : (
              <MdCheckBoxOutlineBlank className="w-5 h-5 text-muted-foreground" />
            )}
          </button>

          <div className="relative w-20 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
            {!showThumbnails || !playlist.thumbnailUrl ? (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundImage: gradientFor(playlist.playlistId) }}
              >
                {getPlaylistIcon(playlist.title)}
              </div>
            ) : (
              <Image
                src={playlist.thumbnailUrl}
                alt={playlist.title}
                fill
                sizes="80px"
                className="object-cover"
                loading="lazy"
              />
            )}
            {playlist.syncInProgress && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <FiLoader className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {getPlaylistIcon(playlist.title)}
              <h3 className="font-semibold truncate">{playlist.title}</h3>
              {playlist.title.toLowerCase().includes("short") && (
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded">
                  Shorts
                </span>
              )}
              <span
                className={cn(
                  "px-2 py-0.5 text-xs rounded",
                  playlist.isActive
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400"
                )}
              >
                {playlist.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FiVideo className="w-3 h-3" />
                {playlist.itemCount.toLocaleString()} videos
              </span>
              {playlist.channelTitle && <span>{playlist.channelTitle}</span>}
              {playlist.lastSyncedAt && (
                <span className="flex items-center gap-1">
                  {getSyncStatusIcon()}
                  {formatDistanceToNow(new Date(playlist.lastSyncedAt), {
                    addSuffix: true,
                  })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleActive}
              className={cn(
                "p-2 rounded-lg transition-colors",
                playlist.isActive
                  ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                  : "bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400"
              )}
              aria-label={
                playlist.isActive ? "Deactivate playlist" : "Activate playlist"
              }
            >
              {playlist.isActive ? (
                <FiToggleRight className="w-5 h-5" />
              ) : (
                <FiToggleLeft className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={onSync}
              disabled={playlist.syncInProgress}
              className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
              aria-label="Sync playlist"
            >
              {playlist.syncInProgress ? (
                <FiLoader className="w-4 h-4 animate-spin" />
              ) : (
                <FiRefreshCw className="w-4 h-4" />
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="More actions"
              >
                <FiMoreVertical className="w-4 h-4" />
              </button>
              {showActions && (
                <div
                  ref={actionsRef}
                  className="absolute right-0 top-full mt-2 w-48 bg-card border rounded-lg shadow-lg z-10"
                >
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          playlist.playlistId
                        );
                        toast.success("Playlist ID copied!");
                      } catch {
                        toast.error("Failed to copy ID");
                      }
                      setShowActions(false);
                    }}
                  >
                    <FiCopy className="w-4 h-4" /> Copy ID
                  </button>
                  <a
                    href={`https://www.youtube.com/playlist?list=${playlist.playlistId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                    onClick={() => setShowActions(false)}
                  >
                    <FiExternalLink className="w-4 h-4" /> View on YouTube
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <div
        className={cn(
          "h-full bg-card rounded-lg border overflow-hidden transition-all",
          "hover:shadow-lg hover:border-primary/30",
          isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20"
        )}
      >
        <PlaylistThumbnail
          playlist={playlist}
          index={index}
          showThumbnails={showThumbnails}
        />
        {playlist.syncInProgress && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-blue-500 text-white text-xs flex items-center gap-1">
            <FiLoader className="w-3 h-3 animate-spin" /> Syncing
          </div>
        )}
        <button
          onClick={onToggleSelect}
          className="absolute top-2 left-2 p-1.5 rounded-lg bg-white/90 dark:bg-black/90 backdrop-blur-sm shadow-lg"
          aria-label={isSelected ? "Deselect playlist" : "Select playlist"}
        >
          {isSelected ? (
            <MdCheckBox className="w-5 h-5 text-primary" />
          ) : (
            <MdCheckBoxOutlineBlank className="w-5 h-5" />
          )}
        </button>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {getPlaylistIcon(playlist.title)}
              <h3 className="font-semibold truncate">{playlist.title}</h3>
            </div>
            <button
              onClick={onToggleActive}
              className={cn(
                "p-1 rounded transition-colors flex-shrink-0",
                playlist.isActive
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-400"
              )}
              aria-label={playlist.isActive ? "Deactivate" : "Activate"}
            >
              {playlist.isActive ? (
                <FiToggleRight className="w-5 h-5" />
              ) : (
                <FiToggleLeft className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Videos</span>
              <span className="font-medium">
                {playlist.itemCount.toLocaleString()}
              </span>
            </div>
            {playlist.lastSyncedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last sync</span>
                <span className="text-xs">
                  {formatDistanceToNow(new Date(playlist.lastSyncedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            )}
            <div className="pt-2 border-t flex items-center justify-between">
              <button
                onClick={onSync}
                disabled={playlist.syncInProgress}
                className="text-xs text-primary hover:text-primary/80 disabled:opacity-50 flex items-center gap-1"
              >
                {playlist.syncInProgress ? (
                  <>
                    <FiLoader className="w-3 h-3 animate-spin" /> Syncing...
                  </>
                ) : (
                  <>
                    <FiRefreshCw className="w-3 h-3" /> Sync
                  </>
                )}
              </button>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(playlist.playlistId);
                    toast.success("Playlist ID copied!");
                  } catch {
                    toast.error("Failed to copy ID");
                  }
                }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <FiCopy className="w-3 h-3" /> Copy ID
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Skeleton
const PlaylistSkeleton = ({ viewMode }: { viewMode: "grid" | "list" }) => {
  if (viewMode === "list") {
    return (
      <div className="flex items-center gap-4 p-4 bg-card rounded-lg border animate-pulse">
        <div className="w-5 h-5 bg-muted rounded" />
        <div className="w-20 h-12 bg-muted rounded" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
        <div className="flex gap-2">
          <div className="w-10 h-10 bg-muted rounded-lg" />
          <div className="w-10 h-10 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }
  return (
    <div className="bg-card rounded-lg border overflow-hidden animate-pulse">
      <div className="aspect-video bg-muted" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
    </div>
  );
};

export default function PlaylistsPage() {
  const { user, isAuthorized, isChecking } = useVideoAdminAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<"videos" | "name" | "updated">("videos");
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(
    new Set()
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters/sort/pageSize change
  useEffect(() => {
    setPage(1);
  }, [pageSize, filterActive, sortBy]);

  // Robust loader
  const loadPlaylists = useCallback(
    async (silent = false) => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const ac = new AbortController();
      abortControllerRef.current = ac;

      try {
        if (!silent) {
          setLoading(true);
          setError(null);
        }

        const params = new URLSearchParams({
          page: String(page),
          limit: String(pageSize),
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(filterActive !== null && { active: String(filterActive) }),
          ...(sortBy && { sort: sortBy }),
        });

        const res = await videoApiJson<any>(
          `/api/video-admin/playlists?${params.toString()}`,
          { signal: ac.signal }
        );

        const body =
          res &&
          typeof res === "object" &&
          "data" in res &&
          !Array.isArray(res.data) &&
          ("total" in res.data || "page" in res.data || "limit" in res.data)
            ? (res.data as PlaylistsResponse)
            : (res as PlaylistsResponse | undefined);

        const items: Playlist[] = Array.isArray((body as any)?.data)
          ? (body as any).data
          : Array.isArray((body as any)?.playlists)
            ? (body as any).playlists
            : Array.isArray(body as any)
              ? (body as any)
              : [];

        if (!Array.isArray(items)) {
          console.error("Unexpected playlists payload:", res);
          const msg = "Unexpected playlists payload";
          setError(msg);
          if (!silent) toast.error(msg);
          return;
        }

        const total = Number((body as any)?.total ?? items.length ?? 0);
        const limit = Number((body as any)?.limit ?? pageSize ?? 12);

        setPlaylists(items);
        setTotalCount(total);
        setTotalPages(Math.max(0, Math.ceil(total / Math.max(1, limit))));
        setError(null);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Failed to load playlists:", err);
          const msg = err?.message || "Failed to load playlists";
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (!silent) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    },
    [page, pageSize, debouncedSearch, filterActive, sortBy]
  );

  // Load data when authenticated
  useEffect(() => {
    if (status === "authenticated") {
      loadPlaylists();
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [status, loadPlaylists]);

  // Auto-refresh syncing items
  useEffect(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    const hasSyncing = playlists.some((p) => p.syncInProgress);
    if (!hasSyncing) return;

    const started = Date.now();
    let interval = 5000;

    const refresh = () => {
      loadPlaylists(true);
      const elapsed = Date.now() - started;
      if (elapsed > 30000 && interval < 30000) {
        interval = Math.min(interval * 1.5, 30000);
      }
      pollTimeoutRef.current = window.setTimeout(refresh, interval);
    };

    pollTimeoutRef.current = window.setTimeout(refresh, interval);
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [playlists, loadPlaylists]);

  // Actions
  const syncPlaylist = async (playlistId: string, playlistName: string) => {
    setSyncing(playlistId);
    try {
      const response = await videoApiJson<SyncResponse>(
        `/api/video-admin/playlists/${playlistId}/sync`,
        { method: "POST" }
      );
      if (response) {
        toast.success(response.message || `Started syncing "${playlistName}"`);
        setPlaylists((prev) =>
          prev.map((p) =>
            p.playlistId === playlistId ? { ...p, syncInProgress: true } : p
          )
        );
        setTimeout(() => loadPlaylists(true), 2000);
      } else {
        throw new Error("No response from server");
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to sync "${playlistName}"`);
    } finally {
      setSyncing(null);
    }
  };

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
        toast.success(
          `${playlist.title} ${!playlist.isActive ? "activated" : "deactivated"}`
        );
        setPlaylists((prev) =>
          prev.map((p) =>
            p.playlistId === playlist.playlistId
              ? { ...p, isActive: !playlist.isActive }
              : p
          )
        );
      }
    } catch {
      toast.error(`Failed to update ${playlist.title}`);
    }
  };

  const bulkSync = async () => {
    if (selectedPlaylists.size === 0) {
      toast.error("Please select playlists to sync");
      return;
    }
    setBulkSyncing(true);
    const results = await Promise.allSettled(
      [...selectedPlaylists].map((id) =>
        videoApiJson<SyncResponse>(`/api/video-admin/playlists/${id}/sync`, {
          method: "POST",
        })
      )
    );
    const succeeded = results.filter(
      (r) => r.status === "fulfilled" && r.value
    ).length;
    const failed = results.length - succeeded;
    if (failed > 0) toast.error(`Started ${succeeded} syncs, ${failed} failed`);
    else toast.success(`Started syncing ${succeeded} playlists`);
    setSelectedPlaylists(new Set());
    setBulkSyncing(false);
    setTimeout(() => loadPlaylists(true), 2000);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        if (selectedPlaylists.size === playlists.length)
          setSelectedPlaylists(new Set());
        else setSelectedPlaylists(new Set(playlists.map((p) => p.playlistId)));
      }
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [playlists, selectedPlaylists]);

  const toggleSelection = (playlistId: string) => {
    const next = new Set(selectedPlaylists);
    if (next.has(playlistId)) next.delete(playlistId);
    else next.add(playlistId);
    setSelectedPlaylists(next);
  };

  const selectAll = () => {
    if (selectedPlaylists.size === playlists.length)
      setSelectedPlaylists(new Set());
    else setSelectedPlaylists(new Set(playlists.map((p) => p.playlistId)));
  };

  const stats = {
    total: totalCount,
    active: playlists.filter((p) => p.isActive).length,
    syncing: playlists.filter((p) => p.syncInProgress).length,
    totalVideos: playlists.reduce((sum, p) => sum + p.itemCount, 0),
  };

  // Show loading skeleton when data is loading
  const showSkeleton = (loading && initialLoad) || status === "loading";
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
        <title>Playlists - FMT Video Admin</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <AdminLayout title="Playlists" description="Manage YouTube playlists">
        <div className="space-y-6">
          {/* Header Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Playlists", value: stats.total, icon: FiGrid },
              {
                label: "Active",
                value: stats.active,
                icon: FiCheckCircle,
                color: "text-green-600",
              },
              {
                label: "Syncing",
                value: stats.syncing,
                icon: MdSync,
                color: "text-blue-600",
                spin: true,
              },
              {
                label: "Total Videos",
                value: stats.totalVideos.toLocaleString(),
                icon: FiVideo,
              },
            ].map((stat) => (
              <div key={stat.label} className="p-4 bg-card rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className={cn("text-2xl font-bold", stat.color)}>
                      {stat.value}
                    </p>
                  </div>
                  <stat.icon
                    className={cn(
                      "w-8 h-8",
                      stat.color || "text-muted-foreground/30",
                      stat.spin && "animate-spin"
                    )}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="sticky top-0 z-10 flex flex-col lg:flex-row gap-4 p-4 bg-card rounded-lg border backdrop-blur-sm">
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 max-w-md">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search playlists... (Press / to focus)"
                  className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  variant="outline"
                  size="sm"
                >
                  <FiFilter className="w-4 h-4 mr-2" />
                  Filters
                  {filterActive !== null && (
                    <span className="ml-2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                      1
                    </span>
                  )}
                </Button>

                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-3 py-1 bg-background border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedPlaylists.size > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {selectedPlaylists.size} selected
                  </span>
                  <Button
                    onClick={bulkSync}
                    disabled={bulkSyncing}
                    size="sm"
                    variant="outline"
                  >
                    {bulkSyncing ? (
                      <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FiRefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sync Selected
                  </Button>
                </>
              )}

              <Button
                onClick={selectAll}
                variant="outline"
                size="sm"
                title="Ctrl/Cmd + A"
              >
                {selectedPlaylists.size === playlists.length ? (
                  <MdCheckBoxOutlineBlank className="w-4 h-4 mr-2" />
                ) : selectedPlaylists.size > 0 ? (
                  <MdIndeterminateCheckBox className="w-4 h-4 mr-2" />
                ) : (
                  <MdCheckBox className="w-4 h-4 mr-2" />
                )}
                {selectedPlaylists.size === playlists.length ? "None" : "All"}
              </Button>

              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    viewMode === "grid"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground"
                  )}
                  aria-label="Grid view"
                >
                  <FiGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    viewMode === "list"
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground"
                  )}
                  aria-label="List view"
                >
                  <FiList className="w-4 h-4" />
                </button>
              </div>

              <Button
                onClick={() => setShowThumbnails(!showThumbnails)}
                variant="outline"
                size="icon"
                title="Toggle thumbnails"
              >
                {showThumbnails ? (
                  <FiEye className="w-4 h-4" />
                ) : (
                  <FiEyeOff className="w-4 h-4" />
                )}
              </Button>

              <Button
                onClick={() => loadPlaylists()}
                variant="outline"
                size="icon"
                disabled={loading}
                aria-label="Refresh"
              >
                <FiRefreshCw
                  className={cn("w-4 h-4", loading && "animate-spin")}
                />
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="p-4 bg-card rounded-lg border space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Status
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setFilterActive(filterActive === true ? null : true)
                      }
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg border transition-colors",
                        filterActive === true
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      Active
                    </button>
                    <button
                      onClick={() =>
                        setFilterActive(filterActive === false ? null : false)
                      }
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg border transition-colors",
                        filterActive === false
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      Inactive
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full p-2 bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="videos">Video Count</option>
                    <option value="name">Name</option>
                    <option value="updated">Recently Updated</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* List */}
          {showSkeleton ? (
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-2"
              )}
            >
              {Array.from({ length: pageSize }).map((_, i) => (
                <PlaylistSkeleton key={i} viewMode={viewMode} />
              ))}
            </div>
          ) : playlists.length > 0 ? (
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-2"
              )}
            >
              {playlists.map((playlist, index) => (
                <PlaylistCard
                  key={playlist.playlistId}
                  playlist={playlist}
                  isSelected={selectedPlaylists.has(playlist.playlistId)}
                  onToggleSelect={() => toggleSelection(playlist.playlistId)}
                  onSync={() =>
                    syncPlaylist(playlist.playlistId, playlist.title)
                  }
                  onToggleActive={() => togglePlaylistStatus(playlist)}
                  viewMode={viewMode}
                  index={index}
                  showThumbnails={showThumbnails}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FiVideo className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No playlists found
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchTerm || filterActive !== null
                  ? "Try adjusting your filters"
                  : "Sync playlists from YouTube to get started"}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                variant="outline"
                size="sm"
              >
                <FiChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-4 py-2 text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                variant="outline"
                size="sm"
              >
                <FiChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
