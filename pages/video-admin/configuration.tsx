// pages/video-admin/configuration.tsx
import { GetServerSideProps } from "next";
import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { withAdminPageSSR } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import {
  Save,
  AlertCircle,
  CheckCircle,
  Plus,
  Trash2,
  RefreshCw,
  Film,
  Search,
  ChevronDown,
  Info,
} from "lucide-react";
import { videoApiJson } from "@/lib/videoApi";
import { cn } from "@/lib/utils";
import { FaCalendar, FaHashtag, FaPlay, FaVideo } from "react-icons/fa6";
import { FaPlayCircle } from "react-icons/fa";
import Image from "next/image";

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
  name: string;
  title: string;
  videoCount: number;
  itemCount: number;
  description?: string;
  thumbnailUrl?: string;
  updatedAt?: string;
  channelTitle?: string;
  isActive?: boolean;
}

interface ConfigResponse {
  data: VideoConfig;
  traceId: string;
}

// Custom Combo Box component for rich playlist selection
const PlaylistComboBox = ({
  value,
  onChange,
  playlists,
  placeholder = "Select a playlist",
  allowEmpty = false,
  showDetails = true,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  playlists: Playlist[];
  placeholder?: string;
  allowEmpty?: boolean;
  showDetails?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedPlaylist = playlists.find((p) => p.playlistId === value);

  const filteredPlaylists = useMemo(() => {
    if (!search) return playlists;
    const searchLower = search.toLowerCase();
    return playlists.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.playlistId.toLowerCase().includes(searchLower)
    );
  }, [playlists, search]);

  const isShorts = (playlist: Playlist) =>
    playlist.name.toLowerCase().includes("short") ||
    playlist.name.toLowerCase().includes("reel");

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 border border-border rounded-lg bg-background cursor-pointer hover:border-primary/50 transition-colors"
      >
        {selectedPlaylist ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isShorts(selectedPlaylist) ? (
                <Film className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              ) : (
                <FaPlayCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
              <div>
                <div className="font-medium">{selectedPlaylist.name}</div>
                {showDetails && (
                  <div className="text-xs text-muted-foreground">
                    {selectedPlaylist.videoCount} videos •{" "}
                    {selectedPlaylist.channelTitle || "FMT"}
                  </div>
                )}
              </div>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </div>
        ) : (
          <div className="flex items-center justify-between text-muted-foreground">
            <span>{placeholder}</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </div>
        )}
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-96 overflow-hidden">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search playlists..."
                  className="w-full pl-8 pr-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:border-primary"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {allowEmpty && (
                <div
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                  className="p-3 hover:bg-muted cursor-pointer border-b border-border"
                >
                  <div className="text-muted-foreground">None</div>
                </div>
              )}

              {filteredPlaylists.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No playlists found
                </div>
              ) : (
                filteredPlaylists.map((playlist) => {
                  const videoCount =
                    playlist.videoCount || playlist.itemCount || 0;
                  const isEmpty = videoCount === 0;

                  return (
                    <div
                      key={playlist.playlistId}
                      onClick={() => {
                        onChange(playlist.playlistId);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className={cn(
                        "p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0",
                        value === playlist.playlistId && "bg-muted"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {playlist.thumbnailUrl && (
                          <Image
                            src={playlist.thumbnailUrl}
                            alt={playlist.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {isShorts(playlist) ? (
                              <Film className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            ) : (
                              <FaPlay className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )}
                            <span className="font-medium">{playlist.name}</span>
                          </div>
                          {playlist.description && (
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {playlist.description}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FaVideo className="w-3 h-3" />
                              {videoCount} videos
                            </span>
                            {playlist.channelTitle && (
                              <span className="flex items-center gap-1">
                                <FaHashtag className="w-3 h-3" />
                                {playlist.channelTitle}
                              </span>
                            )}
                            {playlist.updatedAt && (
                              <span className="flex items-center gap-1">
                                <FaCalendar className="w-3 h-3" />
                                {new Date(
                                  playlist.updatedAt
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        {isEmpty && (
                          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                            Empty
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Minimum number of playlist sections required
const MIN_PLAYLIST_SECTIONS = 5;
const MAX_PLAYLIST_SECTIONS = 8;

export default function ConfigurationPage() {
  const [config, setConfig] = useState<VideoConfig | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [playlistError, setPlaylistError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setPlaylistError(null);

      // Load configuration
      const configResponse = await videoApiJson<ConfigResponse>(
        "/api/video-admin/config"
      );
      const configData = configResponse?.data || null;
      setConfig(configData);

      // Load playlists
      try {
        const playlistsData = await videoApiJson<Playlist[]>(
          "/api/video-admin/playlists"
        );

        if (Array.isArray(playlistsData) && playlistsData.length > 0) {
          setPlaylists(playlistsData);
        } else {
          setPlaylistError(
            "No playlists found. Please sync playlists from YouTube first."
          );
          setPlaylists([]);
        }
      } catch (error) {
        console.error("Failed to load playlists:", error);
        setPlaylistError(
          "Failed to load playlists. Please check the sync status."
        );
        setPlaylists([]);
      }
    } catch (error) {
      console.error("Failed to load configuration:", error);
      setMessage("Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    // Validate minimum playlist sections
    if (config.videoPage.displayedPlaylists.length < MIN_PLAYLIST_SECTIONS) {
      setMessage(
        `Please add at least ${MIN_PLAYLIST_SECTIONS} playlist sections before saving.`
      );
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/video-admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }

      const result = await response.json();
      if (result.data) {
        setConfig(result.data);
      }

      setMessage("Configuration saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Save error:", error);
      setMessage(
        error instanceof Error ? error.message : "Failed to save configuration"
      );
      setTimeout(() => setMessage(""), 5000);
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

    const defaultPlaylistId =
      playlists.length > 0 ? playlists[0].playlistId : "";

    const newPlaylist = {
      playlistId: defaultPlaylistId,
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
    if (!config) return;

    // Don't allow removal if it would go below minimum
    if (config.videoPage.displayedPlaylists.length <= MIN_PLAYLIST_SECTIONS) {
      setMessage(`Minimum ${MIN_PLAYLIST_SECTIONS} playlist sections required`);
      setTimeout(() => setMessage(""), 3000);
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

  if (loading) {
    return (
      <AdminLayout title="Configuration" description="Loading...">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </AdminLayout>
    );
  }

  const totalVideos =
    config?.videoPage?.displayedPlaylists?.reduce((sum, item) => {
      const playlist = playlists.find((p) => p.playlistId === item.playlistId);
      const videoCount = playlist?.videoCount || 0;
      return sum + Math.min(item.maxVideos, videoCount);
    }, 0) || 0;

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
        {/* Messages */}
        {message && (
          <div
            className={cn(
              "mb-6 p-4 rounded-lg border flex items-center gap-2",
              message.includes("Failed") || message.includes("at least")
                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
            )}
          >
            {message.includes("Failed") || message.includes("at least") ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            {message}
          </div>
        )}

        {playlistError && (
          <div className="mb-6 p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p className="text-amber-800 dark:text-amber-200 text-sm">
                {playlistError}
              </p>
            </div>
          </div>
        )}

        {/* Statistics */}
        {playlists.length > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-card rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-1">
                Available Playlists
              </div>
              <div className="text-2xl font-semibold">{playlists.length}</div>
            </div>
            <div className="p-4 bg-card rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-1">
                Configured Sections
              </div>
              <div className="text-2xl font-semibold">
                {config?.videoPage?.displayedPlaylists?.length || 0} /{" "}
                {MAX_PLAYLIST_SECTIONS}
              </div>
            </div>
            <div className="p-4 bg-card rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-1">
                Total Videos to Display
              </div>
              <div className="text-2xl font-semibold">{totalVideos}</div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Homepage Configuration */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-xl font-semibold mb-2">Homepage Videos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure which videos appear on the homepage. The first video
              becomes the hero, positions 2-5 form the grid.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Main Playlist <span className="text-red-500">*</span>
                </label>
                <PlaylistComboBox
                  value={config?.homepage?.playlistId}
                  onChange={(value) =>
                    setConfig({
                      ...config!,
                      homepage: {
                        ...config!.homepage,
                        playlistId: value,
                      },
                    })
                  }
                  playlists={playlists}
                  placeholder="Select main playlist for homepage"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Fallback Playlist
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Used when main playlist has fewer than 5 videos
                </p>
                <PlaylistComboBox
                  value={config?.homepage?.fallbackPlaylistId}
                  onChange={(value) =>
                    setConfig({
                      ...config!,
                      homepage: {
                        ...config!.homepage,
                        fallbackPlaylistId: value || undefined,
                      },
                    })
                  }
                  playlists={playlists}
                  placeholder="Select fallback playlist (optional)"
                  allowEmpty
                />
              </div>
            </div>
          </div>

          {/* Video Page Configuration */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="text-xl font-semibold mb-2">Video Page Layout</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure playlists for the main video page
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Hero Carousel Playlist <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Featured videos in the top carousel
                </p>
                <PlaylistComboBox
                  value={config?.videoPage?.heroPlaylistId}
                  onChange={(value) =>
                    setConfig({
                      ...config!,
                      videoPage: {
                        ...config!.videoPage,
                        heroPlaylistId: value,
                      },
                    })
                  }
                  playlists={playlists}
                  placeholder="Select hero playlist"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Shorts Playlist <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Short-form videos (under 60 seconds)
                </p>
                <PlaylistComboBox
                  value={config?.videoPage?.shortsPlaylistId}
                  onChange={(value) =>
                    setConfig({
                      ...config!,
                      videoPage: {
                        ...config!.videoPage,
                        shortsPlaylistId: value,
                      },
                    })
                  }
                  playlists={playlists}
                  placeholder="Select shorts playlist"
                />
              </div>

              {/* Displayed Playlists */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-sm font-medium">
                      Additional Playlist Sections{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Minimum {MIN_PLAYLIST_SECTIONS}, Maximum{" "}
                      {MAX_PLAYLIST_SECTIONS} sections required
                    </p>
                  </div>
                  <Button
                    onClick={addDisplayedPlaylist}
                    size="sm"
                    variant="outline"
                    disabled={
                      !config ||
                      config.videoPage.displayedPlaylists.length >=
                        MAX_PLAYLIST_SECTIONS
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Section
                  </Button>
                </div>

                {config?.videoPage?.displayedPlaylists?.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 border border-border rounded-lg bg-muted/50">
                    No playlist sections configured. Click Add Section to add at
                    least {MIN_PLAYLIST_SECTIONS} playlists.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {config?.videoPage?.displayedPlaylists?.map(
                      (item, index) => {
                        const playlist = playlists.find(
                          (p) => p.playlistId === item.playlistId
                        );
                        const videoCount = playlist?.videoCount || 0;
                        const actualVideos = Math.min(
                          item.maxVideos,
                          videoCount
                        );
                        const canRemove =
                          config.videoPage.displayedPlaylists.length >
                          MIN_PLAYLIST_SECTIONS;

                        return (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-sm font-medium w-8 text-muted-foreground">
                                #{index + 1}
                              </span>

                              <div className="flex-1">
                                <PlaylistComboBox
                                  value={item.playlistId}
                                  onChange={(value) => {
                                    const updated = [
                                      ...config.videoPage.displayedPlaylists,
                                    ];
                                    updated[index].playlistId = value;
                                    setConfig({
                                      ...config,
                                      videoPage: {
                                        ...config.videoPage,
                                        displayedPlaylists: updated,
                                      },
                                    });
                                  }}
                                  playlists={playlists}
                                  placeholder="Select playlist"
                                  showDetails={false}
                                />
                                {playlist && (
                                  <div className="mt-1 text-xs text-muted-foreground pl-2">
                                    Will show {actualVideos} of {videoCount}{" "}
                                    available videos
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="text-sm text-muted-foreground">
                                Max:
                              </label>
                              <input
                                type="number"
                                value={item.maxVideos}
                                onChange={(e) => {
                                  const updated = [
                                    ...config.videoPage.displayedPlaylists,
                                  ];
                                  updated[index].maxVideos =
                                    parseInt(e.target.value) || 10;
                                  setConfig({
                                    ...config,
                                    videoPage: {
                                      ...config.videoPage,
                                      displayedPlaylists: updated,
                                    },
                                  });
                                }}
                                className="w-16 p-2 border border-border rounded bg-background text-center"
                                min="1"
                                max="50"
                              />
                            </div>

                            <Button
                              onClick={() => removeDisplayedPlaylist(index)}
                              size="sm"
                              variant="ghost"
                              disabled={!canRemove}
                              className={cn(
                                "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20",
                                !canRemove && "opacity-50 cursor-not-allowed"
                              )}
                              title={
                                !canRemove
                                  ? `Minimum ${MIN_PLAYLIST_SECTIONS} sections required`
                                  : "Remove section"
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}

                {config &&
                  config?.videoPage?.displayedPlaylists?.length > 0 && (
                    <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Info className="w-3 h-3" />
                        <span>
                          {config.videoPage.displayedPlaylists.length <
                          MIN_PLAYLIST_SECTIONS
                            ? `Add ${MIN_PLAYLIST_SECTIONS - config.videoPage.displayedPlaylists.length} more section(s) to meet minimum requirement`
                            : config.videoPage.displayedPlaylists.length ===
                                MAX_PLAYLIST_SECTIONS
                              ? "Maximum sections reached"
                              : `You can add ${MAX_PLAYLIST_SECTIONS - config.videoPage.displayedPlaylists.length} more section(s)`}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button onClick={loadData} variant="outline" disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload
            </Button>
            <Button
              onClick={saveConfig}
              disabled={
                saving ||
                !config ||
                !config.homepage?.playlistId ||
                !config.videoPage?.heroPlaylistId ||
                !config.videoPage?.shortsPlaylistId ||
                config.videoPage.displayedPlaylists.length <
                  MIN_PLAYLIST_SECTIONS
              }
              className="min-w-[120px]"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </AdminLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAdminPageSSR();
