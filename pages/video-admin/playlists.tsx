import { GetServerSideProps } from "next";
import { useState, useEffect } from "react";
import Head from "next/head";
import AdminLayout from "@/components/admin/AdminLayout";
import { withAdminPageSSR } from "@/lib/adminAuth";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  ExternalLink,
  Video,
  Calendar,
  Eye,
  EyeOff,
  Search,
  Filter,
} from "lucide-react";
import { videoApiJson } from "@/lib/videoApi";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

interface Playlist {
  id: string;
  playlistId: string;
  name: string;
  description?: string;
  videoCount: number;
  thumbnailUrl?: string;
  isActive: boolean;
  lastSynced?: string;
  viewCount?: number;
  channelTitle?: string;
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const data = await videoApiJson<Playlist[]>("/api/video-admin/playlists");
      setPlaylists(data);
    } catch (error) {
      console.error("Failed to load playlists:", error);
    } finally {
      setLoading(false);
    }
  };

  const syncPlaylist = async (playlistId: string) => {
    setSyncing(playlistId);
    try {
      await videoApiJson(`/api/video-admin/playlists/${playlistId}/sync`, {
        method: "POST",
      });
      // Reload playlists to get updated counts
      await loadPlaylists();
    } catch (error) {
      console.error("Failed to sync playlist:", error);
    } finally {
      setSyncing(null);
    }
  };

  const togglePlaylistStatus = async (
    playlistId: string,
    isActive: boolean
  ) => {
    try {
      await videoApiJson(`/api/video-admin/playlists/${playlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      // Update local state
      setPlaylists((prev) =>
        prev.map((p) =>
          p.playlistId === playlistId ? { ...p, isActive: !isActive } : p
        )
      );
    } catch (error) {
      console.error("Failed to toggle playlist status:", error);
    }
  };

  const syncAllPlaylists = async () => {
    setSyncing("all");
    try {
      await videoApiJson("/api/video-admin/playlists/sync-all", {
        method: "POST",
      });
      await loadPlaylists();
    } catch (error) {
      console.error("Failed to sync all playlists:", error);
    } finally {
      setSyncing(null);
    }
  };

  // Filter playlists based on search and active status
  const filteredPlaylists = playlists.filter((playlist) => {
    const matchesSearch =
      playlist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      playlist.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterActive === null || playlist.isActive === filterActive;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <AdminLayout title="Playlists" description="Loading...">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded"></div>
          ))}
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Playlist Management - FMT Admin</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
      </Head>

      <AdminLayout
        title="Playlist Management"
        description={`Manage ${playlists.length} YouTube playlists`}
      >
        {/* Controls Bar */}
        <div className="bg-card rounded-lg border border-border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search playlists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background"
              />
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              <Button
                variant={filterActive === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(null)}
              >
                <Filter className="w-4 h-4 mr-2" />
                All
              </Button>
              <Button
                variant={filterActive === true ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(true)}
              >
                Active
              </Button>
              <Button
                variant={filterActive === false ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterActive(false)}
              >
                Inactive
              </Button>
            </div>

            {/* Sync All */}
            <Button
              onClick={syncAllPlaylists}
              disabled={syncing === "all"}
              variant="outline"
            >
              {syncing === "all" ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Sync All
            </Button>
          </div>
        </div>

        {/* Playlists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPlaylists.map((playlist) => (
            <div
              key={playlist.playlistId}
              className="bg-card rounded-lg border border-border p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex gap-4">
                {/* Thumbnail */}
                {playlist.thumbnailUrl && (
                  <Image
                    src={playlist.thumbnailUrl}
                    alt={playlist.name}
                    className="w-32 h-20 object-cover rounded"
                  />
                )}

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {playlist.name}
                      </h3>
                      {playlist.channelTitle && (
                        <p className="text-xs text-muted-foreground">
                          {playlist.channelTitle}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant={playlist.isActive ? "default" : "outline"}
                      onClick={() =>
                        togglePlaylistStatus(
                          playlist.playlistId,
                          playlist.isActive
                        )
                      }
                    >
                      {playlist.isActive ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </Button>
                  </div>

                  {playlist.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {playlist.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      {playlist.videoCount} videos
                    </span>
                    {playlist.lastSynced && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(playlist.lastSynced), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncPlaylist(playlist.playlistId)}
                      disabled={syncing === playlist.playlistId}
                    >
                      {syncing === playlist.playlistId ? (
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3 mr-1" />
                      )}
                      Sync
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={`https://www.youtube.com/playlist?list=${playlist.playlistId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View on YouTube
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredPlaylists.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No playlists found</p>
          </div>
        )}
      </AdminLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = withAdminPageSSR();
