// lib/cache/smart-revalidator.ts
// SmartRevalidator - SSR Version with CDN-only cache orchestration

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
  pagesRevalidated: string[]; // Keep for backward compatibility (always empty)
  cachesCleared: string[];
  errors: string[];
  duration: number;
}

export class SmartRevalidator {
  private baseUrl: string;

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
  }

  /**
   * Main entry point - purge CDN based on what changed
   */
  async revalidate(input: SmartRevalidatorInput): Promise<RevalidationResult> {
    const startTime = Date.now();
    const result: RevalidationResult = {
      success: true,
      pagesRevalidated: [], // Always empty in SSR mode
      cachesCleared: [],
      errors: [],
      duration: 0,
    };

    console.log(
      `[SmartRevalidator SSR] Starting - Reason: ${input.reason || "Manual"}`
    );
    console.log(`[SmartRevalidator SSR] Input:`, {
      videoIds: input.videoIds?.length || 0,
      playlistIds: input.playlistIds?.length || 0,
      configChanged: input.configChanged || false,
    });

    try {
      // Step 1: Extract and normalize inputs
      const { videoIds, playlistIds } = this.normalizeInputs(input);

      // Step 2: Find all affected pages for cache tags
      const affectedPages = await this.findAffectedPages(
        videoIds,
        playlistIds,
        input.configChanged
      );

      console.log(
        `[SmartRevalidator SSR] Found ${affectedPages.size} affected pages for CDN purge`
      );

      // Step 3: Purge Cloudflare CDN (unless skipped)
      if (!input.skipCloudflare) {
        await this.purgeCloudflare(affectedPages, videoIds, playlistIds);
        result.cachesCleared.push("Cloudflare");
      }
    } catch (error: any) {
      console.error("[SmartRevalidator SSR] Error:", error);
      result.errors.push(error.message);
      result.success = false;
    }

    result.duration = Date.now() - startTime;
    console.log(`[SmartRevalidator SSR] Complete in ${result.duration}ms`, {
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

    // Config change affects main pages
    if (configChanged) {
      pages.add("/");
      pages.add("/videos");
      pages.add("/videos/shorts");
    }

    // Find videos in playlists
    if (videoIds.length > 0) {
      const videoPlaylists = await prisma.playlistItems.findMany({
        where: {
          videoId: { in: videoIds },
        },
        select: {
          playlistId: true,
        },
      });

      for (const vp of videoPlaylists) {
        playlistIds.push(vp.playlistId);
      }
    }

    // Get config for homepage/hub checks
    const config = await this.getConfig();

    // Check each playlist
    for (const playlistId of playlistIds) {
      // Homepage
      if (this.isHomepagePlaylist(playlistId, config)) {
        pages.add("/");
      }

      // Video hub
      if (this.isVideoHubPlaylist(playlistId, config)) {
        pages.add("/videos");
      }

      // Shorts page
      if (playlistId === config.shortsPlaylist) {
        pages.add("/videos/shorts");
      }

      // Playlist page itself
      pages.add(`/videos/playlist/${playlistId}`);
    }

    // Individual video pages
    for (const videoId of videoIds) {
      pages.add(`/videos/${videoId}`);
    }

    return pages;
  }

  /**
   * Get video config
   */
  private async getConfig(): Promise<any> {
    const config = await prisma.videoConfig.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    return config || {};
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
        "[SmartRevalidator SSR] Cloudflare not configured, skipping CDN purge"
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
          `[SmartRevalidator SSR] Purged ${tags.length} Cloudflare cache tags`
        );
      } else {
        console.error(
          "[SmartRevalidator SSR] Cloudflare purge failed:",
          response.status
        );
      }
    } catch (error) {
      console.error("[SmartRevalidator SSR] Cloudflare purge error:", error);
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
