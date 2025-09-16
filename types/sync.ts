// types/sync.ts

export interface SyncState {
  uploadsEtag?: string;
  uploadsLastModified?: string;
  uploadsPlaylistId?: string;
  lastIdleCheck?: Record<string, string>;
  idleOrder?: string[];
}

export interface LastSyncResult {
  videosAdded: number;
  videosUpdated: number;
  videosRemoved: number;
  error?: string;
  at: string;
}

export interface PlaylistSyncState {
  etag: string | null;
  lastModified: string | null;
  fingerprint: string | null;
  lastFingerprintAt: Date | null;
  syncInProgress: boolean;
  lastSyncResult: LastSyncResult | null;
  itemCount: number;
  syncLeaseUntil: Date | null;
  syncLeaseOwner: string | null;
  activeWindowUntil: Date | null;
}

export interface DisplayedPlaylist {
  playlistId: string;
  title: string;
}
