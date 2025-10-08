// lib/cache/smart-revalidator.ts
// SmartRevalidator - Intelligent cache orchestration for video system

import { prisma } from "@/lib/prisma";

interface SmartRevalidatorInput {
  videoIds?: string[]; // Videos added/updated/deleted
  playlistIds?: string[]; // Playlists that changed
  configChanged?: boolean; // Config was modified
  reason?: string; // For logging
  skipCloudflare?: boolean; // For dev testing
}

interface RevalidationResult {
  success: boolean;
  pagesRevalidated: string[];
  cachesCleared: string[];
  errors: string[];
  duration: number;
}

export class SmartRevalidator {
  private baseUrl: string;
  private revalidateSecret: string;

  constructor() {
    // Determine base URL based on environment
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "";

    if (appUrl.includes("localhost")) {
      this.baseUrl = "http://localhost:3000";
    } else if (appUrl.includes("dev-v4")) {
      this.baseUrl = "https://dev-v4.freemalaysiatoday.com";
    } else {
      this.baseUrl = "https://www.freemalaysiatoday.com";
    }

    this.revalidateSecret =
      process.env.REVALIDATE_SECRET_KEY || process.env.REVALIDATE_SECRET || "";
  }

  /**
   * Main entry point - revalidate based on what changed
   */
  async revalidate(input: SmartRevalidatorInput): Promise<RevalidationResult> {
    const startTime = Date.now();
    const result: RevalidationResult = {
      success: true,
      pagesRevalidated: [],
      cachesCleared: [],
      errors: [],
      duration: 0,
    };

    console.log(
      `[SmartRevalidator] Starting - Reason: ${input.reason || "Manual"}`
    );
    console.log(`[SmartRevalidator] Input:`, {
      videoIds: input.videoIds?.length || 0,
      playlistIds: input.playlistIds?.length || 0,
      configChanged: input.configChanged || false,
    });

    try {
      // Step 1: Extract and normalize inputs
      const { videoIds, playlistIds } = this.normalizeInputs(input);

      // Step 2: Find all affected pages
      const affectedPages = await this.findAffectedPages(
        videoIds,
        playlistIds,
        input.configChanged
      );

      console.log(
        `[SmartRevalidator] Found ${affectedPages.size} affected pages`
      );

      // Step 4: Trigger ISR revalidation
      const revalidated = await this.revalidatePages(Array.from(affectedPages));
      result.pagesRevalidated = revalidated;

      // Step 5: Purge Cloudflare CDN (unless skipped)
      if (!input.skipCloudflare) {
        await this.purgeCloudflare(affectedPages, videoIds, playlistIds);
        result.cachesCleared.push("Cloudflare");
      }
    } catch (error: any) {
      console.error("[SmartRevalidator] Error:", error);
      result.errors.push(error.message);
      result.success = false;
    }

    result.duration = Date.now() - startTime;
    console.log(`[SmartRevalidator] Complete in ${result.duration}ms`, {
      pages: result.pagesRevalidated.length,
      caches: result.cachesCleared,
      errors: result.errors.length,
    });

    return result;
  }

  /**
   * Extract video IDs from URLs if needed
   */
  private normalizeInputs(input: SmartRevalidatorInput): {
    videoIds: string[];
    playlistIds: string[];
  } {
    const videoIds: string[] = [];
    const playlistIds: string[] = [];

    // Process video IDs (might be URLs)
    if (input.videoIds) {
      for (const id of input.videoIds) {
        // Extract ID from URL if needed
        const videoId = this.extractVideoId(id);
        if (videoId) videoIds.push(videoId);
      }
    }

    // Process playlist IDs (already clean)
    if (input.playlistIds) {
      playlistIds.push(...input.playlistIds);
    }

    return { videoIds, playlistIds };
  }

  /**
   * Extract video ID from various formats
   */
  private extractVideoId(input: string): string | null {
    // Already a video ID (11 characters)
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
      return input;
    }

    // Extract from URL
    const patterns = [
      /\/videos\/([a-zA-Z0-9_-]{11})/, // /videos/XTYHDHMp0cA
      /watch\?v=([a-zA-Z0-9_-]{11})/, // watch?v=XTYHDHMp0cA
      /youtu\.be\/([a-zA-Z0-9_-]{11})/, // youtu.be/XTYHDHMp0cA
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Find all pages affected by the changes
   */
  private async findAffectedPages(
    videoIds: string[],
    playlistIds: string[],
    configChanged?: boolean
  ): Promise<Set<string>> {
    const pages = new Set<string>();

    // If config changed, revalidate main pages
    if (configChanged) {
      pages.add("/"); // Homepage
      pages.add("/videos"); // Video hub

      // Get all playlist pages from config
      const config = await this.getVideoConfig();
      if (config) {
        // Add pages for playlists in config
        const configPlaylistIds = this.getConfigPlaylistIds(config);
        for (const playlistId of configPlaylistIds) {
          const playlist = await prisma.playlist.findFirst({
            where: { playlistId },
            select: { slug: true },
          });
          if (playlist?.slug) {
            pages.add(`/videos/playlist/${playlist.slug}`);
          }
        }
      }
    }

    // Process videos - find their playlists
    if (videoIds.length > 0) {
      for (const videoId of videoIds) {
        // Add individual video page
        pages.add(`/videos/${videoId}`);

        // Find playlists containing this video
        const video = await prisma.videos.findFirst({
          where: { videoId },
          select: { playlists: true },
        });

        if (video?.playlists) {
          playlistIds.push(...video.playlists);
        }
      }
    }

    // Process playlists - check where they appear
    if (playlistIds.length > 0) {
      const config = await this.getVideoConfig();
      const uniquePlaylistIds = [...new Set(playlistIds)];

      for (const playlistId of uniquePlaylistIds) {
        // Get playlist slug for its page
        const playlist = await prisma.playlist.findFirst({
          where: { playlistId },
          select: { slug: true },
        });

        if (playlist?.slug) {
          // Add playlist page
          pages.add(`/videos/playlist/${playlist.slug}`);

          // Check if this playlist appears in config
          if (config && this.playlistAppearsInConfig(playlistId, config)) {
            // Add main pages if playlist is featured
            if (this.isHomepagePlaylist(playlistId, config)) {
              pages.add("/");
            }
            if (this.isVideoHubPlaylist(playlistId, config)) {
              pages.add("/videos");
            }
          }
        }
      }
    }

    return pages;
  }

  /**
   * Get video configuration
   */
  private async getVideoConfig() {
    try {
      return await prisma.videoConfig.findFirst({
        orderBy: { updatedAt: "desc" },
      });
    } catch (error) {
      console.error("[SmartRevalidator] Failed to load config:", error);
      return null;
    }
  }

  /**
   * Extract all playlist IDs from config
   */
  private getConfigPlaylistIds(config: any): string[] {
    const ids: string[] = [];

    if (config.homepagePlaylist) ids.push(config.homepagePlaylist);
    if (config.heroPlaylist) ids.push(config.heroPlaylist);
    if (config.shortsPlaylist) ids.push(config.shortsPlaylist);

    if (Array.isArray(config.displayedPlaylists)) {
      for (const item of config.displayedPlaylists) {
        if (item.playlistId) ids.push(item.playlistId);
      }
    }

    return [...new Set(ids)]; // Remove duplicates
  }

  /**
   * Check if playlist appears anywhere in config
   */
  private playlistAppearsInConfig(playlistId: string, config: any): boolean {
    return this.getConfigPlaylistIds(config).includes(playlistId);
  }

  /**
   * Check if playlist is on homepage
   */
  private isHomepagePlaylist(playlistId: string, config: any): boolean {
    return config.homepagePlaylist === playlistId;
  }

  /**
   * Check if playlist is on video hub
   */
  private isVideoHubPlaylist(playlistId: string, config: any): boolean {
    if (config.heroPlaylist === playlistId) return true;
    if (config.shortsPlaylist === playlistId) return true;

    if (Array.isArray(config.displayedPlaylists)) {
      return config.displayedPlaylists.some(
        (item: any) => item.playlistId === playlistId
      );
    }

    return false;
  }

  /**
   * Revalidate pages using ISR
   */
  private async revalidatePages(pages: string[]): Promise<string[]> {
    if (!this.revalidateSecret) {
      console.warn("[SmartRevalidator] No revalidate secret configured");
      return [];
    }

    const revalidated: string[] = [];

    try {
      const response = await fetch(`${this.baseUrl}/api/internal/revalidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-revalidate-secret": this.revalidateSecret,
        },
        body: JSON.stringify({ paths: pages }),
      });

      if (response.ok) {
        const data = await response.json();
        revalidated.push(...(data.revalidated || pages));
        console.log(
          `[SmartRevalidator] ISR revalidated ${revalidated.length} pages`
        );
      } else {
        console.error(
          "[SmartRevalidator] ISR revalidation failed:",
          response.status
        );
      }
    } catch (error) {
      console.error("[SmartRevalidator] ISR revalidation error:", error);
    }

    return revalidated;
  }

  /**
   * Purge Cloudflare CDN cache
   */
  private async purgeCloudflare(
    pages: Set<string>,
    videoIds: string[],
    playlistIds: string[]
  ): Promise<void> {
    const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
    const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

    if (!CF_ZONE_ID || !CF_API_TOKEN) {
      console.log(
        "[SmartRevalidator] Cloudflare not configured, skipping CDN purge"
      );
      return;
    }

    // Build cache tags
    const tags: string[] = ["videos", "video-gallery"];

    // Add video tags
    videoIds.forEach((id) => tags.push(`video:${id}`));

    // Add playlist tags
    playlistIds.forEach((id) => tags.push(`playlist:${id}`));

    // Add page tags
    pages.forEach((page) => tags.push(`path:${page}`));

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${CF_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tags: [...new Set(tags)] }), // Remove duplicates
        }
      );

      if (response.ok) {
        console.log(
          `[SmartRevalidator] Purged ${tags.length} Cloudflare cache tags`
        );
      } else {
        console.error(
          "[SmartRevalidator] Cloudflare purge failed:",
          response.status
        );
      }
    } catch (error) {
      console.error("[SmartRevalidator] Cloudflare purge error:", error);
    }
  }
}

// Export singleton instance for easy use
export const smartRevalidator = new SmartRevalidator();

// Export convenience functions
export const revalidateVideo = (videoId: string, reason?: string) =>
  smartRevalidator.revalidate({ videoIds: [videoId], reason });

export const revalidatePlaylist = (playlistId: string, reason?: string) =>
  smartRevalidator.revalidate({ playlistIds: [playlistId], reason });

export const revalidateConfig = () =>
  smartRevalidator.revalidate({
    configChanged: true,
    reason: "config-changed",
  });

export const revalidateVideos = (videoIds: string[], reason?: string) =>
  smartRevalidator.revalidate({ videoIds, reason });
