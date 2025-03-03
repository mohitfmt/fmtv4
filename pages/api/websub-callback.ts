import { NextApiRequest, NextApiResponse } from "next";
import { mutate } from "swr";
import { XMLParser } from "fast-xml-parser";

async function purgeCloudflareCache(paths: string[]) {
  if (!process.env.CLOUDFLARE_ZONE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    console.warn("[Cache] Cloudflare credentials not configured");
    return;
  }

  const currentDomain =
    process.env.NEXT_PUBLIC_DOMAIN || "dev-v4.freemalaysiatoday.com";
  const urls = paths.map((path) => {
    // Check if the path is already a full URL
    if (path.startsWith("http")) {
      return path;
    }
    return `https://${currentDomain}${path}`;
  });

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: urls }),
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(
        `Cloudflare purge failed: ${result.errors?.[0]?.message}`
      );
    }
    console.log(`[Cache] Purged ${urls.length} URLs from Cloudflare:`, urls);
  } catch (error) {
    console.error("[Cache] Purge request failed:", error);
    throw error;
  }
}

// Fetch a feed and extract its content
async function fetchFeed(feedUrl: string): Promise<string[]> {
  try {
    console.log(`[WebSub] Fetching feed: ${feedUrl}`);
    const response = await fetch(feedUrl, {
      headers: {
        Accept:
          "application/atom+xml, application/rss+xml, application/xml, text/xml",
        "User-Agent": "WebSub-Subscriber/1.0",
      },
    });

    if (!response.ok) {
      console.error(
        `[WebSub] Failed to fetch feed ${feedUrl}: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const feedContent = await response.text();
    console.log(`[WebSub] Received feed content (${feedContent.length} bytes)`);

    // Parse XML feed content
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      isArray: (name) => ["entry", "item"].includes(name),
    });

    const parsedFeed = parser.parse(feedContent);
    return extractArticleURLsFromFeed(parsedFeed);
  } catch (error) {
    console.error(`[WebSub] Error fetching feed ${feedUrl}:`, error);
    return [];
  }
}

// Extract URLs from different feed formats
function extractArticleURLsFromFeed(data: any): string[] {
  const urls: string[] = [];

  // Try to handle both Atom and RSS formats
  // Atom format
  if (data.feed && data.feed.entry) {
    const entries = Array.isArray(data.feed.entry)
      ? data.feed.entry
      : [data.feed.entry];
    entries.forEach((entry: any) => {
      // Handle different link formats
      if (entry.link) {
        if (Array.isArray(entry.link)) {
          entry.link.forEach((link: any) => {
            if (link["@_href"] || link["@_url"]) {
              urls.push(link["@_href"] || link["@_url"]);
            }
          });
        } else if (typeof entry.link === "object") {
          if (entry.link["@_href"] || entry.link["@_url"]) {
            urls.push(entry.link["@_href"] || entry.link["@_url"]);
          }
        } else if (typeof entry.link === "string") {
          urls.push(entry.link);
        }
      }

      // Sometimes the URL might be in id field
      if (
        entry.id &&
        typeof entry.id === "string" &&
        entry.id.startsWith("http")
      ) {
        urls.push(entry.id);
      }
    });
  }

  // RSS format
  if (data.rss && data.rss.channel && data.rss.channel.item) {
    const items = Array.isArray(data.rss.channel.item)
      ? data.rss.channel.item
      : [data.rss.channel.item];

    items.forEach((item: any) => {
      if (item.link) {
        if (typeof item.link === "string") {
          urls.push(item.link);
        } else if (item.link["#text"]) {
          urls.push(item.link["#text"]);
        }
      }

      // Check for guid that might be a permalink
      if (
        item.guid &&
        typeof item.guid === "string" &&
        item.guid.startsWith("http")
      ) {
        urls.push(item.guid);
      }
    });
  }

  return [...new Set(urls)]; // Remove duplicates
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle WebSub subscription verification
  if (req.method === "GET") {
    const { "hub.mode": mode, "hub.challenge": challenge } = req.query;

    if (mode === "subscribe" && challenge) {
      console.log("[WebSub] Subscription verified");
      return res.status(200).send(challenge);
    }

    return res.status(400).json({ error: "Invalid verification request" });
  }

  // Handle content notifications
  if (req.method === "POST") {
    try {
      console.log("[WebSub] Received content update notification");
      console.log("[WebSub] Content-Type:", req.headers["content-type"]);

      // Process the form-encoded data that contains feed URLs
      let feedUrls: string[] = [];

      // WebSub can send one or multiple hub.url parameters
      if (req.body && req.body["hub.url"]) {
        if (Array.isArray(req.body["hub.url"])) {
          feedUrls = req.body["hub.url"];
        } else {
          feedUrls = [req.body["hub.url"]];
        }
      }

      console.log("[WebSub] Extracted feed URLs:", feedUrls);

      if (feedUrls.length === 0) {
        console.warn("[WebSub] No feed URLs found in the notification");
        return res.status(400).json({ error: "No feed URLs in notification" });
      }

      // Fetch all feeds and extract article URLs
      const articleURLsArrays = await Promise.all(
        feedUrls.map((url) => fetchFeed(url))
      );
      const articleURLs = [...new Set(articleURLsArrays.flat())]; // Flatten and deduplicate

      console.log("[WebSub] All article URLs extracted:", articleURLs);

      if (articleURLs.length === 0) {
        console.warn("[WebSub] No article URLs found in the feeds");
      }

      // Step 1: Call revalidate endpoint
      const protocol =
        process.env.NODE_ENV === "development" ? "http" : "https";
      const host =
        req.headers.host ||
        process.env.NEXT_PUBLIC_DOMAIN ||
        "dev-v4.freemalaysiatoday.com";
      const baseUrl = `${protocol}://${host}`;

      // Run all operations in parallel since they're independent
      await Promise.all([
        // Revalidate pages
        fetch(`${baseUrl}/api/revalidate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-revalidate-key":
              process.env.REVALIDATE_SECRET_KEY || "default-secret",
          },
        }),

        fetch(`${baseUrl}/api/top-news`, {
          method: "POST",
        }),

        // Update last update time
        fetch(`${baseUrl}/api/last-update`, {
          method: "POST",
        }),

        // Trigger SWR revalidation for all clients
        mutate("/api/top-news"),
        mutate("/api/last-update"),
      ]);

      // Step 2: Purge Cloudflare cache for homepage
      await purgeCloudflareCache(["/"]);

      // Step 3: Purge Cloudflare cache for article URLs if any were found
      if (articleURLs.length > 0) {
        await purgeCloudflareCache(articleURLs);
      }

      return res.status(200).json({
        success: true,
        message: "Homepage revalidated and cache purged",
        articleURLs,
      });
    } catch (error) {
      console.error("[WebSub] Error:", error);
      return res.status(500).json({
        error: "Process failed",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
