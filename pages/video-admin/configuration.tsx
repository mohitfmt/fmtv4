// pages/video-admin/configuration.tsx - FIXED VERSION
import { GetServerSideProps } from "next";
import { useState, useEffect, useRef } from "react";
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
  FiShield,
  FiActivity,
  FiChevronDown,
  FiSearch,
  FiMusic,
  FiFilm,
  FiGrid,
  FiEye,
  FiEyeOff,
  FiShuffle,
  FiStar,
  FiClock,
  FiBarChart2,
  FiLayers,
} from "react-icons/fi";
import {
  MdOutlineNewspaper,
  MdSportsSoccer,
  MdLiveTv,
  MdOutlineSmartDisplay,
} from "react-icons/md";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface PageProps {
  requiresAuth?: boolean;
  session?: any;
}

interface VideoConfig {
  homepage: {
    playlistId: string;
    fallbackPlaylistId?: string;
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
  syncInProgress?: boolean;
}

const MIN_PLAYLIST_SECTIONS = 5;
const MAX_PLAYLIST_SECTIONS = 8;

// Fixed Animation Variants with proper types
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

const itemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const scaleVariants: Variants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  tap: { scale: 0.98 },
  hover: { scale: 1.02 },
};

// Enhanced Playlist Selector Component
const PlaylistSelector = ({
  value,
  onChange,
  playlists,
  placeholder = "Select a playlist",
  label,
  icon: Icon,
  helper,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  playlists: Playlist[];
  placeholder?: string;
  label?: string;
  icon?: any;
  helper?: string;
  disabled?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedPlaylist = playlists.find((p) => p.playlistId === value);

  const filteredPlaylists = playlists.filter((p) => {
    const searchLower = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(searchLower) ||
      p.channelTitle?.toLowerCase().includes(searchLower) ||
      p.playlistId.toLowerCase().includes(searchLower)
    );
  });

  const isShorts = (title: string) =>
    title?.toLowerCase().includes("short") ||
    title?.toLowerCase().includes("reel");

  const getPlaylistIcon = (title: string) => {
    const titleLower = title.toLowerCase();
    if (isShorts(title)) return <FiZap className="w-4 h-4" />;
    if (titleLower.includes("news"))
      return <MdOutlineNewspaper className="w-4 h-4" />;
    if (titleLower.includes("music")) return <FiMusic className="w-4 h-4" />;
    if (titleLower.includes("sport"))
      return <MdSportsSoccer className="w-4 h-4" />;
    if (titleLower.includes("live")) return <MdLiveTv className="w-4 h-4" />;
    if (titleLower.includes("exclusive")) return <FiStar className="w-4 h-4" />;
    return <MdOutlineSmartDisplay className="w-4 h-4" />;
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

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={itemVariants}
      className="relative"
      ref={dropdownRef}
    >
      {label && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
            <label className="text-sm font-medium">{label}</label>
          </div>
          {helper && (
            <span className="text-xs text-muted-foreground italic">
              {helper}
            </span>
          )}
        </div>
      )}

      <motion.button
        whileTap="tap"
        whileHover="hover"
        variants={scaleVariants}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full p-4 bg-card border rounded-lg transition-all relative overflow-hidden group",
          "hover:border-primary/50 hover:shadow-md",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "border-primary shadow-md ring-1 ring-primary/20"
        )}
      >
        <div className="relative flex items-center gap-3">
          {selectedPlaylist ? (
            <>
              {selectedPlaylist.thumbnailUrl ? (
                <div className="relative w-12 h-12 rounded-md overflow-hidden bg-muted">
                  <Image
                    src={selectedPlaylist.thumbnailUrl}
                    alt={selectedPlaylist.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                  {getPlaylistIcon(selectedPlaylist.title)}
                </div>
              )}

              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  {getPlaylistIcon(selectedPlaylist.title)}
                  <p className="font-semibold">{selectedPlaylist.title}</p>
                  {isShorts(selectedPlaylist.title) && (
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded">
                      Shorts
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FiFilm className="w-3 h-3" />
                    {selectedPlaylist.itemCount.toLocaleString()} videos
                  </span>
                  {selectedPlaylist.channelTitle && (
                    <span className="text-xs text-muted-foreground">
                      {selectedPlaylist.channelTitle}
                    </span>
                  )}
                </div>
              </div>

              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <FiChevronDown className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                <FiGrid className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-muted-foreground">{placeholder}</p>
              </div>
              <FiChevronDown className="w-5 h-5 text-muted-foreground" />
            </>
          )}
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-card border rounded-lg shadow-xl overflow-hidden"
          >
            {/* Search Bar */}
            <div className="p-3 border-b bg-muted/20">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search playlists..."
                  className="w-full pl-10 pr-4 py-2 bg-background border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                  autoFocus
                />
              </div>
            </div>

            {/* Playlists List */}
            <div className="max-h-[320px] overflow-y-auto">
              {filteredPlaylists.length > 0 ? (
                <div className="p-2">
                  {filteredPlaylists.map((playlist, index) => (
                    <motion.div
                      key={playlist.playlistId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onMouseEnter={() => setHoveredId(playlist.playlistId)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => {
                        onChange(playlist.playlistId);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className={cn(
                        "p-3 rounded-md cursor-pointer transition-all",
                        "hover:bg-accent",
                        hoveredId === playlist.playlistId && "bg-accent",
                        value === playlist.playlistId &&
                          "bg-primary/10 border border-primary/20"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {playlist.thumbnailUrl ? (
                          <div className="relative w-14 h-14 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            <Image
                              src={playlist.thumbnailUrl}
                              alt={playlist.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            {getPlaylistIcon(playlist.title)}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {getPlaylistIcon(playlist.title)}
                            <p className="font-medium">{playlist.title}</p>
                            {isShorts(playlist.title) && (
                              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded">
                                Shorts
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <FiFilm className="w-3 h-3" />
                              {playlist.itemCount.toLocaleString()}
                            </span>
                            {playlist.channelTitle && (
                              <span className="text-xs text-muted-foreground">
                                {playlist.channelTitle}
                              </span>
                            )}
                            {playlist.updatedAt && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <FiClock className="w-3 h-3" />
                                {formatDistanceToNow(
                                  new Date(playlist.updatedAt),
                                  { addSuffix: true }
                                )}
                              </span>
                            )}
                          </div>

                          {playlist.syncInProgress && (
                            <div className="flex items-center gap-1 mt-1">
                              <FiLoader className="w-3 h-3 animate-spin text-primary" />
                              <span className="text-xs text-primary">
                                Syncing...
                              </span>
                            </div>
                          )}
                        </div>

                        {value === playlist.playlistId && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex-shrink-0"
                          >
                            <FiCheckCircle className="w-5 h-5 text-primary" />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <FiSearch className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No playlists found
                  </p>
                </div>
              )}
            </div>

            {/* Quick Stats Footer */}
            <div className="p-3 border-t bg-muted/20">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{filteredPlaylists.length} playlists available</span>
                <span className="flex items-center gap-1">
                  <FiBarChart2 className="w-3 h-3" />
                  {filteredPlaylists
                    .reduce((sum, p) => sum + p.itemCount, 0)
                    .toLocaleString()}{" "}
                  total videos
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Stats Card Component
const StatsCard = ({
  title,
  value,
  icon: Icon,
  delay = 0,
}: {
  title: string;
  value: string | number;
  icon: any;
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className="relative p-6 bg-card rounded-lg border overflow-hidden group"
    >
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
};

export default function ConfigurationPage({ requiresAuth }: PageProps) {
  const { data: currentSession } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<VideoConfig | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (currentSession) {
      loadData();
    }
  }, [currentSession]);

  const loadData = async () => {
    setLoading(true);
    try {
      const configResponse = await videoApiJson<{ data: VideoConfig }>(
        "/api/video-admin/config"
      );
      if (configResponse?.data) {
        setConfig(configResponse.data);
      }

      const playlistsResponse = await videoApiJson<{
        success: boolean;
        playlists: Playlist[];
        pagination: any;
      }>("/api/video-admin/playlists?limit=100&active=true");

      if (
        playlistsResponse?.success &&
        Array.isArray(playlistsResponse.playlists)
      ) {
        setPlaylists(playlistsResponse.playlists);

        if (playlistsResponse.playlists.length === 0) {
          showMessage(
            "No active playlists found. Please sync playlists from YouTube first.",
            "error"
          );
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
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

  const saveConfig = async () => {
    if (!config) return;

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
    )
      return;

    const newPlaylist = {
      playlistId: playlists[0]?.playlistId || "",
      position: config.videoPage.displayedPlaylists.length + 1,
      maxVideos: 10,
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

  const shufflePlaylists = () => {
    if (!config || !playlists.length) return;

    const shuffled = [...config.videoPage.displayedPlaylists].sort(
      () => Math.random() - 0.5
    );
    shuffled.forEach((p, i) => (p.position = i + 1));

    setConfig({
      ...config,
      videoPage: {
        ...config.videoPage,
        displayedPlaylists: shuffled,
      },
    });

    showMessage("Playlists shuffled!", "success");
  };

  if (requiresAuth && !currentSession) {
    return null;
  }

  if (loading) {
    return (
      <AdminLayout title="Configuration" description="Loading configuration...">
        <div className="flex items-center justify-center min-h-[400px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <FiSettings className="w-16 h-16 text-primary mx-auto" />
            </motion.div>
            <p className="text-muted-foreground">Loading configuration...</p>
          </motion.div>
        </div>
      </AdminLayout>
    );
  }

  const totalVideos =
    config?.videoPage?.displayedPlaylists?.reduce((sum, item) => {
      const playlist = playlists.find((p) => p.playlistId === item.playlistId);
      return sum + Math.min(item.maxVideos, playlist?.itemCount || 0);
    }, 0) || 0;

  const totalAvailableVideos = playlists.reduce(
    (sum, p) => sum + p.itemCount,
    0
  );

  return (
    <>
      <Head>
        <title>Video Configuration - FMT Admin</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <AdminLayout
        title="Video Configuration"
        description="Configure homepage and video page layouts"
      >
        <LazyMotion features={domAnimation}>
          <motion.div
            initial="initial"
            animate="animate"
            variants={pageVariants}
            className="space-y-6"
          >
            {/* Header - Clean design without gradients */}
            <motion.div
              variants={itemVariants}
              className="relative p-6 bg-card rounded-lg border shadow-sm"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FiSettings className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">
                      Video Configuration
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Manage your video content layout
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    variant="outline"
                    size="sm"
                    className="flex-1 sm:flex-initial"
                  >
                    {showAdvanced ? (
                      <FiEyeOff className="w-4 h-4 mr-2" />
                    ) : (
                      <FiEye className="w-4 h-4 mr-2" />
                    )}
                    <span>{showAdvanced ? "Simple" : "Advanced"}</span>
                  </Button>

                  <Button
                    onClick={saveConfig}
                    disabled={saving || !config || playlists.length === 0}
                    className="flex-1 sm:flex-initial"
                  >
                    {saving ? (
                      <>
                        <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FiSave className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Messages */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className={cn(
                    "p-4 rounded-lg border flex items-center gap-3",
                    messageType === "error"
                      ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900"
                      : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                  )}
                >
                  {messageType === "error" ? (
                    <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  )}
                  <span
                    className={
                      messageType === "error"
                        ? "text-red-700 dark:text-red-300"
                        : "text-green-700 dark:text-green-300"
                    }
                  >
                    {message}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Statistics - Clean cards without gradients */}
            {playlists.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  title="Total Playlists"
                  value={playlists.length}
                  icon={FiLayers}
                  delay={0}
                />
                <StatsCard
                  title="Active Sections"
                  value={`${config?.videoPage?.displayedPlaylists?.length || 0}/${MAX_PLAYLIST_SECTIONS}`}
                  icon={FiActivity}
                  delay={0.1}
                />
                <StatsCard
                  title="Videos to Display"
                  value={totalVideos.toLocaleString()}
                  icon={FiPlayCircle}
                  delay={0.2}
                />
                <StatsCard
                  title="Total Available"
                  value={totalAvailableVideos.toLocaleString()}
                  icon={FiVideo}
                  delay={0.3}
                />
              </div>
            )}

            {playlists.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg"
              >
                <div className="flex flex-col items-center text-center">
                  <FiAlertCircle className="w-16 h-16 text-amber-600 dark:text-amber-400 mb-4" />
                  <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
                    No Playlists Available
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-2 max-w-md">
                    Please sync playlists from YouTube first, then return to
                    configure them.
                  </p>
                </div>
              </motion.div>
            ) : (
              <>
                {/* Homepage Configuration */}
                <motion.div
                  variants={itemVariants}
                  className="bg-card rounded-lg border p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <FiHome className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold">Homepage Videos</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <PlaylistSelector
                      value={config?.homepage.playlistId || ""}
                      onChange={(value) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                homepage: {
                                  ...prev.homepage,
                                  playlistId: value,
                                },
                              }
                            : null
                        )
                      }
                      playlists={playlists}
                      label="Primary Playlist"
                      icon={FiPlayCircle}
                      helper="Main content"
                    />

                    <PlaylistSelector
                      value={config?.homepage.fallbackPlaylistId || ""}
                      onChange={(value) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                homepage: {
                                  ...prev.homepage,
                                  fallbackPlaylistId: value,
                                },
                              }
                            : null
                        )
                      }
                      playlists={playlists}
                      label="Fallback Playlist"
                      icon={FiShield}
                      helper="Backup content"
                    />
                  </div>
                </motion.div>

                {/* Video Page Configuration */}
                <motion.div
                  variants={itemVariants}
                  className="bg-card rounded-lg border p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <FiVideo className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold">Video Page Layout</h3>
                    {showAdvanced && (
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={shufflePlaylists}
                        className="ml-auto p-2 bg-muted rounded-lg hover:bg-accent transition-colors"
                      >
                        <FiShuffle className="w-4 h-4" />
                      </motion.button>
                    )}
                  </div>

                  {/* Hero & Shorts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <PlaylistSelector
                      value={config?.videoPage.heroPlaylistId || ""}
                      onChange={(value) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                videoPage: {
                                  ...prev.videoPage,
                                  heroPlaylistId: value,
                                },
                              }
                            : null
                        )
                      }
                      playlists={playlists}
                      label="Hero Playlist"
                      icon={FiStar}
                      helper="Featured content"
                    />

                    <PlaylistSelector
                      value={config?.videoPage.shortsPlaylistId || ""}
                      onChange={(value) =>
                        setConfig((prev) =>
                          prev
                            ? {
                                ...prev,
                                videoPage: {
                                  ...prev.videoPage,
                                  shortsPlaylistId: value,
                                },
                              }
                            : null
                        )
                      }
                      playlists={playlists}
                      label="Shorts Playlist"
                      icon={FiZap}
                      helper="Quick videos"
                    />
                  </div>

                  {/* Displayed Playlists */}
                  <div className="border-t pt-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <h4 className="font-semibold">Displayed Playlists</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {config?.videoPage.displayedPlaylists.length || 0} of{" "}
                          {MIN_PLAYLIST_SECTIONS}-{MAX_PLAYLIST_SECTIONS}{" "}
                          sections configured
                        </p>
                      </div>
                      <Button
                        onClick={addDisplayedPlaylist}
                        disabled={
                          !config ||
                          config.videoPage.displayedPlaylists.length >=
                            MAX_PLAYLIST_SECTIONS
                        }
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        <FiPlus className="w-4 h-4 mr-1" />
                        Add Section
                      </Button>
                    </div>

                    <AnimatePresence mode="popLayout">
                      <div className="space-y-3">
                        {config?.videoPage.displayedPlaylists.map(
                          (item, index) => {
                            const playlist = playlists.find(
                              (p) => p.playlistId === item.playlistId
                            );
                            return (
                              <motion.div
                                key={`${item.playlistId}-${index}`}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                                className="group"
                              >
                                <div className="p-4 bg-muted/30 rounded-lg border hover:border-primary/30 transition-all">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                      {index + 1}
                                    </div>

                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                                      <div className="sm:col-span-2">
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
                                      </div>

                                      <div>
                                        <label className="text-sm font-medium mb-2 block">
                                          Display Limit
                                        </label>
                                        <input
                                          type="number"
                                          min="1"
                                          max="50"
                                          value={item.maxVideos}
                                          onChange={(e) => {
                                            const updated = [
                                              ...config.videoPage
                                                .displayedPlaylists,
                                            ];
                                            updated[index] = {
                                              ...updated[index],
                                              maxVideos:
                                                parseInt(e.target.value) || 10,
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
                                      </div>
                                    </div>

                                    <motion.button
                                      whileTap={{ scale: 0.9 }}
                                      whileHover={{ scale: 1.1 }}
                                      onClick={() =>
                                        removeDisplayedPlaylist(index)
                                      }
                                      disabled={
                                        config.videoPage.displayedPlaylists
                                          .length <= MIN_PLAYLIST_SECTIONS
                                      }
                                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      <FiTrash2 className="w-4 h-4" />
                                    </motion.button>
                                  </div>

                                  {playlist && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      className="mt-3 pl-12 flex flex-wrap items-center gap-4 text-xs text-muted-foreground"
                                    >
                                      <span className="flex items-center gap-1">
                                        <FiEye className="w-3 h-3" />
                                        Will display:{" "}
                                        <strong>
                                          {Math.min(
                                            item.maxVideos,
                                            playlist.itemCount
                                          )}
                                        </strong>{" "}
                                        videos
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <FiFilm className="w-3 h-3" />
                                        Available:{" "}
                                        <strong>
                                          {playlist.itemCount.toLocaleString()}
                                        </strong>{" "}
                                        videos
                                      </span>
                                      {item.maxVideos > playlist.itemCount && (
                                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                          <FiInfo className="w-3 h-3" />
                                          Limited by availability
                                        </span>
                                      )}
                                    </motion.div>
                                  )}
                                </div>
                              </motion.div>
                            );
                          }
                        )}
                      </div>
                    </AnimatePresence>

                    {config &&
                      config.videoPage.displayedPlaylists.length <
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

export const getServerSideProps: GetServerSideProps<PageProps> =
  withAdminPageSSR();
