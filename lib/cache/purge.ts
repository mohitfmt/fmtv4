// lib/cache/purge.ts

/**
 * Purge Cloudflare cache by tags
 * Tags allow purging multiple URLs that share the same tag
 */
export async function purgeCloudflareByTags(tags: string[]): Promise<void> {
  const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
  const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

  if (!CF_ZONE_ID || !CF_API_TOKEN) {
    console.warn("[Cloudflare] Purge skipped: Missing credentials");
    return;
  }

  // Cloudflare has a limit of 30 tags per request
  const TAG_BATCH_SIZE = 30;

  console.log(`[Cloudflare] Purging ${tags.length} cache tags`);

  for (let i = 0; i < tags.length; i += TAG_BATCH_SIZE) {
    const batch = tags.slice(i, i + TAG_BATCH_SIZE);

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${CF_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tags: batch }),
        }
      );

      const json = await response.json();

      if (!json.success) {
        console.error(
          `[Cloudflare] Tag purge failed for batch ${i / TAG_BATCH_SIZE + 1}:`,
          json.errors
        );

        // Log specific errors if available
        if (json.errors && Array.isArray(json.errors)) {
          json.errors.forEach((error: any) => {
            console.error(
              `[Cloudflare] Error: ${error.code} - ${error.message}`
            );
          });
        }
      } else {
        console.log(
          `[Cloudflare] Successfully purged batch ${i / TAG_BATCH_SIZE + 1} (${batch.length} tags)`
        );
      }
    } catch (error) {
      console.error(
        `[Cloudflare] Error purging tag batch ${i / TAG_BATCH_SIZE + 1}:`,
        error
      );
    }

    // Small delay between batches to avoid rate limiting
    if (i + TAG_BATCH_SIZE < tags.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

/**
 * Purge Cloudflare cache by specific URLs
 * This ensures immediate cache invalidation for specific pages
 */
export async function purgeCloudflareByUrls(urls: string[]): Promise<void> {
  const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
  const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

  if (!CF_ZONE_ID || !CF_API_TOKEN) {
    console.warn("[Cloudflare] Purge skipped: Missing credentials");
    return;
  }

  // Cloudflare has a limit of 30 URLs per request
  const URL_BATCH_SIZE = 30;

  console.log(`[Cloudflare] Purging ${urls.length} URLs`);

  for (let i = 0; i < urls.length; i += URL_BATCH_SIZE) {
    const batch = urls.slice(i, i + URL_BATCH_SIZE);

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${CF_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: batch,
          }),
        }
      );

      const json = await response.json();

      if (!json.success) {
        console.error(
          `[Cloudflare] URL purge failed for batch ${i / URL_BATCH_SIZE + 1}:`,
          json.errors
        );

        // Log specific errors if available
        if (json.errors && Array.isArray(json.errors)) {
          json.errors.forEach((error: any) => {
            console.error(
              `[Cloudflare] Error: ${error.code} - ${error.message}`
            );
          });
        }
      } else {
        console.log(
          `[Cloudflare] Successfully purged batch ${i / URL_BATCH_SIZE + 1} (${batch.length} URLs)`
        );

        // Log any warnings
        if (json.messages && Array.isArray(json.messages)) {
          json.messages.forEach((message: any) => {
            console.warn(`[Cloudflare] Warning: ${message}`);
          });
        }
      }
    } catch (error) {
      console.error(
        `[Cloudflare] Error purging URL batch ${i / URL_BATCH_SIZE + 1}:`,
        error
      );
    }

    // Small delay between batches to avoid rate limiting
    if (i + URL_BATCH_SIZE < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

/**
 * Purge everything in Cloudflare cache for the zone
 * USE WITH EXTREME CAUTION - This will purge the entire cache
 */
export async function purgeCloudflareEverything(): Promise<void> {
  const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
  const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

  if (!CF_ZONE_ID || !CF_API_TOKEN) {
    console.warn("[Cloudflare] Purge skipped: Missing credentials");
    return;
  }

  console.warn(
    "[Cloudflare] PURGING ENTIRE CACHE - This will clear all cached content!"
  );

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          purge_everything: true,
        }),
      }
    );

    const json = await response.json();

    if (!json.success) {
      console.error("[Cloudflare] Full cache purge failed:", json.errors);
    } else {
      console.log("[Cloudflare] Successfully purged entire cache");
    }
  } catch (error) {
    console.error("[Cloudflare] Error purging entire cache:", error);
  }
}

/**
 * Helper function to validate URLs before purging
 * Ensures URLs are properly formatted for Cloudflare
 */
export function validateUrlsForPurge(urls: string[]): string[] {
  return urls.filter((url) => {
    try {
      new URL(url);
      return true;
    } catch {
      console.warn(`[Cloudflare] Invalid URL skipped: ${url}`);
      return false;
    }
  });
}

/**
 * Helper function to check if Cloudflare is properly configured
 */
export function isCloudflareConfigured(): boolean {
  return !!(process.env.CLOUDFLARE_ZONE_ID && process.env.CLOUDFLARE_API_TOKEN);
}
