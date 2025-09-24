// pages/video-admin/configuration.tsx - PRODUCTION OPTIMIZED VERSION
import { GetServerSideProps } from "next";
import {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
  useMemo,
} from "react";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { withAdminPageSSR } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { videoApiJson } from "@/lib/videoApi";
import {
  motion,
  AnimatePresence,
  LazyMotion,
  domAnimation,
  type Variants,
} from "framer-motion";
import {
  FiSave,
  FiAlertCircle,
  FiCheckCircle,
  FiPlus,
  FiTrash2,
  FiLoader,
  FiInfo,
  FiSettings,
  FiVideo,
  FiHome,
  FiPlayCircle,
  FiZap,
  FiChevronDown,
  FiSearch,
  FiStar,
  FiLayers,
  FiRotateCcw,
  FiCopy,
  FiLock,
  FiAlertTriangle,
} from "react-icons/fi";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Tooltip } from "@/components/ui/tooltip";

interface VideoConfig {
  homepage: {
    playlistId: string;
  };
  videoPage: {
    heroPlaylistId: string;
    shortsPlaylistId: string;
    displayedPlaylists: Array<{
      playlistId: string;
      position: number;
      maxVideos: number;
    }>;
  };
}

interface Playlist {
  playlistId: string;
  title: string;
  itemCount: number;
  thumbnailUrl?: string | null;
  channelTitle?: string | null;
  isActive: boolean;
  updatedAt?: string;
  lastSyncedAt?: string;
  syncInProgress?: boolean;
}

// Cache Context for Playlist Data
interface PlaylistCacheContextType {
  playlists: Playlist[];
  loading: boolean;
  lastFetch: Date | null;
  refreshPlaylists: () => Promise<void>;
}

const PlaylistCacheContext = createContext<PlaylistCacheContextType>({
  playlists: [],
  loading: false,
  lastFetch: null,
  refreshPlaylists: async () => {},
});

// Cache Provider Component
const PlaylistCacheProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const cacheTimeoutRef = useRef<NodeJS.Timeout>();

  const refreshPlaylists = useCallback(async () => {
    // Prevent concurrent fetches
    if (loading) return;

    // Check cache age (5 minutes)
    if (lastFetch && Date.now() - lastFetch.getTime() < 5 * 60 * 1000) {
      return;
    }

    setLoading(true);
    try {
      const response = await videoApiJson<{
        success: boolean;
        playlists: Playlist[];
      }>("/api/video-admin/playlists?limit=100&active=true");

      if (response?.success && Array.isArray(response.playlists)) {
        // Filter out playlists with 0 videos
        const activePlaylists = response.playlists.filter(
          (p) => p.itemCount > 0
        );
        setPlaylists(activePlaylists);
        setLastFetch(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch playlists:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, lastFetch]);

  // Auto-refresh cache every 5 minutes
  useEffect(() => {
    refreshPlaylists();
    cacheTimeoutRef.current = setInterval(refreshPlaylists, 5 * 60 * 1000);

    return () => {
      if (cacheTimeoutRef.current) {
        clearInterval(cacheTimeoutRef.current);
      }
    };
  }, []);

  return (
    <PlaylistCacheContext.Provider
      value={{ playlists, loading, lastFetch, refreshPlaylists }}
    >
      {children}
    </PlaylistCacheContext.Provider>
  );
};

const usePlaylistCache = () => useContext(PlaylistCacheContext);

const MIN_PLAYLIST_SECTIONS = 5;
const MAX_PLAYLIST_SECTIONS = 8;
const DEFAULT_DISPLAY_LIMIT = 6; // Multiple of 3 for grid layout

// Animation Variants
const pageVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1,
    },
  },
};

// Enhanced Playlist Selector with Duplicate Prevention
const PlaylistSelector = ({
  value,
  onChange,
  playlists,
  usedPlaylists,
  currentSection,
  placeholder = "Select a playlist",
  label,
  icon: Icon,
  helper,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  playlists: Playlist[];
  usedPlaylists?: { playlistId: string; section: string }[];
  currentSection?: string;
  placeholder?: string;
  label?: string;
  icon?: any;
  helper?: string;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPlaylist = playlists.find((p) => p.playlistId === value);

  // Filter playlists and check for duplicates
  const filteredPlaylists = useMemo(() => {
    return playlists
      .filter((p) => p.itemCount > 0) // Hide playlists with 0 videos
      .filter(
        (p) =>
          p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.playlistId.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map((playlist) => {
        const usedIn = usedPlaylists?.find(
          (u) =>
            u.playlistId === playlist.playlistId && u.section !== currentSection
        );
        return {
          ...playlist,
          isUsed: !!usedIn,
          usedInSection: usedIn?.section,
        };
      });
  }, [playlists, searchTerm, usedPlaylists, currentSection]);

  // Smart suggestions based on playlist metrics
  const getSmartSuggestion = (playlist: Playlist): string | null => {
    if (!playlist.lastSyncedAt) return null;

    const daysSinceSync = Math.floor(
      (Date.now() - new Date(playlist.lastSyncedAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysSinceSync > 30) {
      return `Not updated in ${daysSinceSync} days`;
    }

    if (playlist.itemCount === 0) {
      return "Empty playlist";
    }

    return null;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2" ref={dropdownRef}>
      {label && (
        <label className="text-sm font-medium mb-2 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />}
          {label}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "w-full p-3 bg-background border rounded-lg",
            "focus:outline-none focus:ring-1 focus:ring-primary/30",
            "flex items-center justify-between transition-all",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex items-center gap-3 flex-1">
            {selectedPlaylist ? (
              <>
                {selectedPlaylist.thumbnailUrl && (
                  <Image
                    src={selectedPlaylist.thumbnailUrl}
                    alt={selectedPlaylist.title}
                    width={40}
                    height={30}
                    className="rounded object-cover"
                  />
                )}
                <div className="text-left">
                  <div className="font-medium">{selectedPlaylist.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedPlaylist.itemCount} videos
                  </div>
                </div>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <FiChevronDown
            className={cn(
              "w-5 h-5 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-2 bg-background border rounded-lg shadow-lg overflow-hidden"
            >
              <div className="p-2 border-b">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search playlists..."
                    className="w-full pl-9 pr-3 py-2 bg-muted/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <div className="max-h-[300px] overflow-y-auto">
                {filteredPlaylists.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No playlists found
                  </div>
                ) : (
                  filteredPlaylists.map((playlist) => {
                    const suggestion = getSmartSuggestion(playlist);
                    const isDisabled = playlist.isUsed;

                    return (
                      <button
                        key={playlist.playlistId}
                        type="button"
                        onClick={() => {
                          if (!isDisabled) {
                            onChange(playlist.playlistId);
                            setIsOpen(false);
                            setSearchTerm("");
                          }
                        }}
                        disabled={isDisabled}
                        className={cn(
                          "w-full p-3 hover:bg-muted/50 transition-colors",
                          "flex items-center gap-3 text-left",
                          value === playlist.playlistId && "bg-muted",
                          isDisabled && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {playlist.thumbnailUrl && (
                          <Image
                            src={playlist.thumbnailUrl}
                            alt={playlist.title}
                            width={48}
                            height={36}
                            className="rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {playlist.title}
                            </span>
                            {isDisabled && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs">
                                <FiLock className="w-3 h-3" />
                                Used in {playlist.usedInSection}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {playlist.itemCount} videos
                            </span>
                            {suggestion && (
                              <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <FiInfo className="w-3 h-3" />
                                {suggestion}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {helper && <p className="text-xs text-muted-foreground mt-1">{helper}</p>}
    </div>
  );
};

function ConfigurationPage({ requiresAuth }: { requiresAuth?: boolean }) {
  const { data: currentSession } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<VideoConfig | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [bulkDisplayLimit, setBulkDisplayLimit] = useState(
    DEFAULT_DISPLAY_LIMIT
  );

  // Use playlist cache
  const { playlists, refreshPlaylists } = usePlaylistCache();

  useEffect(() => {
    if (currentSession) {
      loadConfig();
    }
  }, [currentSession]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const configResponse = await videoApiJson<{ data: VideoConfig }>(
        "/api/video-admin/config"
      );

      if (configResponse?.data) {
        setConfig(configResponse.data);
      }
    } catch (error) {
      console.error("Failed to load configuration:", error);
      showMessage("Failed to load configuration", "error");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, type: "success" | "error") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(
      () => {
        setMessage("");
        setMessageType("");
      },
      type === "error" ? 5000 : 3000
    );
  };

  // Validate display limit is multiple of 3
  const validateDisplayLimit = (value: number): number => {
    if (value % 3 !== 0) {
      const rounded = Math.round(value / 3) * 3;
      return Math.max(3, Math.min(rounded, 99));
    }
    return value;
  };

  // Get used playlists for duplicate prevention
  const usedPlaylists = useMemo(() => {
    if (!config) return [];

    const used: { playlistId: string; section: string }[] = [];

    if (config.homepage.playlistId) {
      used.push({
        playlistId: config.homepage.playlistId,
        section: "Homepage",
      });
    }
    if (config.videoPage.heroPlaylistId) {
      used.push({
        playlistId: config.videoPage.heroPlaylistId,
        section: "Hero",
      });
    }
    if (config.videoPage.shortsPlaylistId) {
      used.push({
        playlistId: config.videoPage.shortsPlaylistId,
        section: "Shorts",
      });
    }

    return used;
  }, [config]);

  const saveConfig = async () => {
    if (!config) return;

    // Validate display limits
    const hasInvalidLimits = config.videoPage.displayedPlaylists.some(
      (p) => p.maxVideos % 3 !== 0
    );

    if (hasInvalidLimits) {
      showMessage("Display limits must be multiples of 3", "error");
      return;
    }

    if (config.videoPage.displayedPlaylists.length < MIN_PLAYLIST_SECTIONS) {
      showMessage(
        `Please add at least ${MIN_PLAYLIST_SECTIONS} playlist sections before saving.`,
        "error"
      );
      return;
    }

    setSaving(true);
    try {
      const response = await videoApiJson<{ data: VideoConfig }>(
        "/api/video-admin/config",
        {
          method: "POST",
          body: JSON.stringify(config),
        }
      );

      if (response?.data) {
        setConfig(response.data);
        showMessage("Configuration saved successfully!", "success");
      }
    } catch (error) {
      console.error("Save error:", error);
      showMessage("Failed to save configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  const addDisplayedPlaylist = () => {
    if (
      !config ||
      config.videoPage.displayedPlaylists.length >= MAX_PLAYLIST_SECTIONS
    ) {
      return;
    }

    const newPlaylist = {
      playlistId: playlists[0]?.playlistId || "",
      position: config.videoPage.displayedPlaylists.length + 1,
      maxVideos: DEFAULT_DISPLAY_LIMIT,
    };

    setConfig({
      ...config,
      videoPage: {
        ...config.videoPage,
        displayedPlaylists: [
          ...config.videoPage.displayedPlaylists,
          newPlaylist,
        ],
      },
    });
  };

  const removeDisplayedPlaylist = (index: number) => {
    if (
      !config ||
      config.videoPage.displayedPlaylists.length <= MIN_PLAYLIST_SECTIONS
    ) {
      showMessage(
        `Minimum ${MIN_PLAYLIST_SECTIONS} playlist sections required`,
        "error"
      );
      return;
    }

    const updated = config.videoPage.displayedPlaylists.filter(
      (_, i) => i !== index
    );
    updated.forEach((p, i) => (p.position = i + 1));

    setConfig({
      ...config,
      videoPage: {
        ...config.videoPage,
        displayedPlaylists: updated,
      },
    });
  };

  // Bulk Operations
  const applyDisplayLimitToAll = () => {
    if (!config) return;

    const validLimit = validateDisplayLimit(bulkDisplayLimit);

    const updated = config.videoPage.displayedPlaylists.map((p) => ({
      ...p,
      maxVideos: validLimit,
    }));

    setConfig({
      ...config,
      videoPage: {
        ...config.videoPage,
        displayedPlaylists: updated,
      },
    });

    showMessage(
      `Applied display limit of ${validLimit} to all sections`,
      "success"
    );
  };

  const resetToDefaults = () => {
    if (!playlists.length) return;

    // Default configuration - FMT News appears 3 times intentionally:
    // 1. Homepage playlist
    // 2. Hero section playlist
    // 3. First displayed playlist
    // This is the correct default setup as per requirements

    // Find specific playlists for default configuration
    const fmtNews = playlists.find((p) => p.title === "FMT News");
    const fmtReels = playlists.find((p) => p.title === "FMT Reels");
    const fmtLifestyle = playlists.find((p) => p.title === "FMT Lifestyle");
    const fmtSpecialReport = playlists.find(
      (p) => p.title === "FMT Special Report"
    );
    const fmtExclusive = playlists.find((p) => p.title === "FMT Exclusive");
    const fmtBusiness = playlists.find((p) => p.title === "FMT Business");
    const fmtCarzilla = playlists.find((p) => p.title === "FMT Carzilla");

    // If we can't find the specific playlists, fall back to first available ones
    const defaultDisplayedPlaylists = [];

    // Build the default displayed playlists in order
    if (fmtNews) {
      defaultDisplayedPlaylists.push({
        playlistId: fmtNews.playlistId,
        position: 1,
        maxVideos: DEFAULT_DISPLAY_LIMIT,
      });
    }

    if (fmtLifestyle) {
      defaultDisplayedPlaylists.push({
        playlistId: fmtLifestyle.playlistId,
        position: 2,
        maxVideos: DEFAULT_DISPLAY_LIMIT,
      });
    }

    if (fmtSpecialReport) {
      defaultDisplayedPlaylists.push({
        playlistId: fmtSpecialReport.playlistId,
        position: 3,
        maxVideos: DEFAULT_DISPLAY_LIMIT,
      });
    }

    if (fmtExclusive) {
      defaultDisplayedPlaylists.push({
        playlistId: fmtExclusive.playlistId,
        position: 4,
        maxVideos: DEFAULT_DISPLAY_LIMIT,
      });
    }

    if (fmtBusiness) {
      defaultDisplayedPlaylists.push({
        playlistId: fmtBusiness.playlistId,
        position: 5,
        maxVideos: DEFAULT_DISPLAY_LIMIT,
      });
    }

    if (fmtCarzilla) {
      defaultDisplayedPlaylists.push({
        playlistId: fmtCarzilla.playlistId,
        position: 6,
        maxVideos: DEFAULT_DISPLAY_LIMIT,
      });
    }

    // If we don't have exactly 6, fill with other playlists
    if (defaultDisplayedPlaylists.length < 6) {
      const usedIds = new Set(
        defaultDisplayedPlaylists.map((p) => p.playlistId)
      );
      const availablePlaylists = playlists.filter(
        (p) => !usedIds.has(p.playlistId)
      );

      while (
        defaultDisplayedPlaylists.length < 6 &&
        availablePlaylists.length > 0
      ) {
        const playlist = availablePlaylists.shift();
        if (playlist) {
          defaultDisplayedPlaylists.push({
            playlistId: playlist.playlistId,
            position: defaultDisplayedPlaylists.length + 1,
            maxVideos: DEFAULT_DISPLAY_LIMIT,
          });
        }
      }
    }

    setConfig({
      homepage: {
        playlistId: fmtNews?.playlistId || playlists[0]?.playlistId || "",
      },
      videoPage: {
        heroPlaylistId: fmtNews?.playlistId || playlists[0]?.playlistId || "",
        shortsPlaylistId:
          fmtReels?.playlistId || playlists[1]?.playlistId || "",
        displayedPlaylists: defaultDisplayedPlaylists,
      },
    });

    showMessage("Configuration reset to defaults", "success");
  };

  if (loading) {
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
        <title>Video Configuration - Admin</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>
      <AdminLayout>
        <LazyMotion features={domAnimation}>
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            className="max-w-7xl mx-auto p-6 space-y-6"
          >
            {/* Header with Bulk Operations */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <FiSettings className="w-8 h-8" />
                  Video Configuration
                </h1>
                <p className="text-muted-foreground mt-1">
                  Configure homepage and video page layouts
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={resetToDefaults}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FiRotateCcw className="w-4 h-4" />
                  Reset to Defaults
                </Button>
                <Button
                  onClick={() => refreshPlaylists()}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FiLoader className="w-4 h-4" />
                  Refresh Playlists
                </Button>
                <Button
                  onClick={saveConfig}
                  disabled={saving || !config}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <FiLoader className="w-4 h-4 animate-spin" />
                  ) : (
                    <FiSave className="w-4 h-4" />
                  )}
                  {saving ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </div>

            {/* Alert Messages */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    "p-4 rounded-lg flex items-center gap-3",
                    messageType === "success"
                      ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                      : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400"
                  )}
                >
                  {messageType === "success" ? (
                    <FiCheckCircle className="w-5 h-5" />
                  ) : (
                    <FiAlertCircle className="w-5 h-5" />
                  )}
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            {config && (
              <>
                {/* Homepage Configuration */}
                <motion.div className="bg-card rounded-lg border p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <FiHome className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-semibold">
                      Homepage Configuration
                    </h2>
                  </div>

                  <PlaylistSelector
                    value={config.homepage.playlistId}
                    onChange={(value) =>
                      setConfig({
                        ...config,
                        homepage: { ...config.homepage, playlistId: value },
                      })
                    }
                    playlists={playlists}
                    usedPlaylists={usedPlaylists}
                    currentSection="Homepage"
                    label="Main Homepage Playlist"
                    icon={FiVideo}
                    helper="First 5 videos will be displayed. If fewer than 5 videos, the system will auto-supplement with latest videos."
                  />
                </motion.div>

                {/* Video Page Configuration */}
                <motion.div className="bg-card rounded-lg border p-6 space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FiPlayCircle className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-semibold">
                      Video Page Configuration
                    </h2>
                  </div>

                  {/* Hero & Shorts */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <PlaylistSelector
                      value={config.videoPage.heroPlaylistId}
                      onChange={(value) =>
                        setConfig({
                          ...config,
                          videoPage: {
                            ...config.videoPage,
                            heroPlaylistId: value,
                          },
                        })
                      }
                      playlists={playlists}
                      usedPlaylists={usedPlaylists}
                      currentSection="Hero"
                      label="Hero Section Playlist"
                      icon={FiStar}
                      helper="Featured prominently at the top of the video page"
                    />

                    <PlaylistSelector
                      value={config.videoPage.shortsPlaylistId}
                      onChange={(value) =>
                        setConfig({
                          ...config,
                          videoPage: {
                            ...config.videoPage,
                            shortsPlaylistId: value,
                          },
                        })
                      }
                      playlists={playlists}
                      usedPlaylists={usedPlaylists}
                      currentSection="Shorts"
                      label="Shorts Section Playlist"
                      icon={FiZap}
                      helper="Quick, engaging short-form content"
                    />
                  </div>

                  {/* Displayed Playlists with Bulk Operations */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <FiLayers className="w-5 h-5" />
                        Displayed Playlists (
                        {config.videoPage.displayedPlaylists.length})
                      </h3>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                          <input
                            type="number"
                            value={bulkDisplayLimit}
                            onChange={(e) =>
                              setBulkDisplayLimit(
                                parseInt(e.target.value) ||
                                  DEFAULT_DISPLAY_LIMIT
                              )
                            }
                            onBlur={(e) =>
                              setBulkDisplayLimit(
                                validateDisplayLimit(
                                  parseInt(e.target.value) ||
                                    DEFAULT_DISPLAY_LIMIT
                                )
                              )
                            }
                            min="3"
                            max="99"
                            step="3"
                            className="w-16 px-2 py-1 bg-background rounded text-sm"
                          />
                          <Button
                            onClick={applyDisplayLimitToAll}
                            size="sm"
                            variant="ghost"
                            className="flex items-center gap-1"
                          >
                            <FiCopy className="w-3 h-3" />
                            Apply to All
                          </Button>
                        </div>

                        {config.videoPage.displayedPlaylists.length <
                          MAX_PLAYLIST_SECTIONS && (
                          <Button
                            onClick={addDisplayedPlaylist}
                            size="sm"
                            className="flex items-center gap-2"
                          >
                            <FiPlus className="w-4 h-4" />
                            Add Playlist
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <AnimatePresence>
                        {config.videoPage.displayedPlaylists.map(
                          (item, index) => {
                            const playlist = playlists.find(
                              (p) => p.playlistId === item.playlistId
                            );

                            return (
                              <motion.div
                                key={`${item.playlistId}-${index}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="bg-muted/30 rounded-lg p-4"
                              >
                                <div className="flex items-start gap-4">
                                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-sm font-medium">
                                    {index + 1}
                                  </div>

                                  <div className="flex-1 grid md:grid-cols-2 gap-4">
                                    <PlaylistSelector
                                      value={item.playlistId}
                                      onChange={(value) => {
                                        const updated = [
                                          ...config.videoPage
                                            .displayedPlaylists,
                                        ];
                                        updated[index] = {
                                          ...updated[index],
                                          playlistId: value,
                                        };
                                        setConfig({
                                          ...config,
                                          videoPage: {
                                            ...config.videoPage,
                                            displayedPlaylists: updated,
                                          },
                                        });
                                      }}
                                      playlists={playlists}
                                      placeholder="Select playlist..."
                                    />

                                    <div>
                                      <label className="text-sm font-medium mb-2 block">
                                        Display Limit
                                      </label>
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min="3"
                                          max="99"
                                          step="3"
                                          value={item.maxVideos}
                                          onChange={(e) => {
                                            const value =
                                              parseInt(e.target.value) ||
                                              DEFAULT_DISPLAY_LIMIT;
                                            const updated = [
                                              ...config.videoPage
                                                .displayedPlaylists,
                                            ];
                                            updated[index] = {
                                              ...updated[index],
                                              maxVideos: value,
                                            };
                                            setConfig({
                                              ...config,
                                              videoPage: {
                                                ...config.videoPage,
                                                displayedPlaylists: updated,
                                              },
                                            });
                                          }}
                                          onBlur={(e) => {
                                            const value = validateDisplayLimit(
                                              parseInt(e.target.value) ||
                                                DEFAULT_DISPLAY_LIMIT
                                            );
                                            const updated = [
                                              ...config.videoPage
                                                .displayedPlaylists,
                                            ];
                                            updated[index] = {
                                              ...updated[index],
                                              maxVideos: value,
                                            };
                                            setConfig({
                                              ...config,
                                              videoPage: {
                                                ...config.videoPage,
                                                displayedPlaylists: updated,
                                              },
                                            });
                                          }}
                                          className="w-full p-3 bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
                                        />
                                        {item.maxVideos % 3 !== 0 && (
                                          <Tooltip>
                                            <FiAlertTriangle className="w-5 h-5 text-amber-500" />
                                            Must be multiple of 3 for grid
                                            layout
                                          </Tooltip>
                                        )}
                                      </div>
                                      {playlist &&
                                        item.maxVideos > playlist.itemCount && (
                                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            Limited to {playlist.itemCount}{" "}
                                            available videos
                                          </p>
                                        )}
                                    </div>
                                  </div>

                                  <button
                                    onClick={() =>
                                      removeDisplayedPlaylist(index)
                                    }
                                    disabled={
                                      config.videoPage.displayedPlaylists
                                        .length <= MIN_PLAYLIST_SECTIONS
                                    }
                                    className={cn(
                                      "p-2 rounded-lg transition-colors",
                                      config.videoPage.displayedPlaylists
                                        .length <= MIN_PLAYLIST_SECTIONS
                                        ? "opacity-50 cursor-not-allowed"
                                        : "hover:bg-destructive/10 text-destructive"
                                    )}
                                  >
                                    <FiTrash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          }
                        )}
                      </AnimatePresence>
                    </div>

                    {config.videoPage.displayedPlaylists.length <
                      MIN_PLAYLIST_SECTIONS && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg flex items-start gap-3"
                      >
                        <FiInfo className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Add{" "}
                          {MIN_PLAYLIST_SECTIONS -
                            config.videoPage.displayedPlaylists.length}{" "}
                          more section(s) to meet the minimum requirement for
                          optimal layout
                        </p>
                      </motion.div>
                    )}

                    {config.videoPage.displayedPlaylists.length >=
                      MAX_PLAYLIST_SECTIONS && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg flex items-start gap-3"
                      >
                        <FiInfo className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Maximum of {MAX_PLAYLIST_SECTIONS} playlist sections
                          reached
                        </p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        </LazyMotion>
      </AdminLayout>
    </>
  );
}

// Wrap with cache provider
export default function ConfigurationPageWithCache(props: {
  requiresAuth?: boolean;
}) {
  return (
    <PlaylistCacheProvider>
      <ConfigurationPage {...props} />
    </PlaylistCacheProvider>
  );
}

export const getServerSideProps: GetServerSideProps = withAdminPageSSR();
