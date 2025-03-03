import { NextApiRequest, NextApiResponse } from "next";
import { mutate } from "swr";
import { XMLParser } from "fast-xml-parser";

// We actually DO want body parsing for this route since we're receiving form data
export const config = {
  api: {
    bodyParser: {
      // This ensures we can handle urlencoded form data
      urlencoded: true,
    },
  },
};

// Function to transform URLs to the correct domain and extract category pages
function processURLsForPurging(urls: string[]): string[] {
  if (urls.length === 0) return [];

  const currentDomain =
    process.env.NEXT_PUBLIC_DOMAIN || "dev-v4.freemalaysiatoday.com";
  const processedUrls: string[] = [];
  const categoryPages = new Set<string>();

  // Add default news category page
  categoryPages.add(`https://${currentDomain}/news`);

  // Define category mappings
  const categoryMappings: Record<string, string> = {
    bahasa: "berita",
    leisure: "lifestyle",
    nation: "news",
    business: "business",
    opinion: "opinion",
    sports: "sports",
    world: "world",
  };

  urls.forEach((url) => {
    try {
      // Parse the URL to extract just the path
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      // Add the path with the correct domain
      processedUrls.push(`https://${currentDomain}${path}`);

      // Extract category for category page purging
      const pathParts = path.split("/").filter(Boolean);
      if (pathParts.length >= 2 && pathParts[0] === "category") {
        const category = pathParts[1];

        // Map category to frontend route
        const frontendCategory = categoryMappings[category];

        // If category isn't in our mapping, default to 'news'
        if (!frontendCategory) {
          // Special handling for special categories used for placement
          // We'll still purge them but also ensure 'news' is purged
          categoryPages.add(`https://${currentDomain}/news`);
        } else {
          // Add the mapped category page
          categoryPages.add(`https://${currentDomain}/${frontendCategory}`);
        }
      }
    } catch (error) {
      console.warn(`[Cache] Failed to process URL ${url}:`, error);
      // If URL parsing fails, use the original URL
      processedUrls.push(url);
    }
  });

  // Add all category pages to the processed URLs
  return [...processedUrls, ...categoryPages];
}

async function purgeCloudflareCache(paths: string[]) {
  if (!process.env.CLOUDFLARE_ZONE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    console.warn("[Cache] Cloudflare credentials not configured");
    return;
  }

  // Process URLs to fix domains and add category pages
  const urls = paths.map((path) => {
    // Handle non-URL paths (like "/")
    if (!path.startsWith("http")) {
      const currentDomain =
        process.env.NEXT_PUBLIC_DOMAIN || "dev-v4.freemalaysiatoday.com";
      return `https://${currentDomain}${path}`;
    }
    return path;
  });

  const processedUrls = processURLsForPurging(urls);

  if (processedUrls.length === 0) {
    console.log("[Cache] No URLs to purge after processing");
    return;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ files: processedUrls }),
      }
    );

    const result = await response.json();
    if (!result.success) {
      throw new Error(
        `Cloudflare purge failed: ${result.errors?.[0]?.message}`
      );
    }
    console.log(
      `[Cache] Purged ${processedUrls.length} URLs from Cloudflare:`,
      processedUrls
    );
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

      // Step 1: Call revalidate endpoint for each article URL and category
      const revalidationPromises = [];

      // Revalidate the homepage
      revalidationPromises.push(
        fetch(`${baseUrl}/api/revalidate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-revalidate-key":
              process.env.REVALIDATE_SECRET_KEY || "default-secret",
          },
        })
      );

      // Extract unique categories to revalidate
      const categories = new Set<string>();

      // Process each article URL to get the slug and category
      articleURLs.forEach((url) => {
        try {
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split("/").filter(Boolean);

          // Only process category paths with proper structure
          if (pathParts.length >= 4 && pathParts[0] === "category") {
            const category = pathParts[1];
            // For each article, revalidate the article page
            // Format should be: /category/news/2025/03/03/article-slug
            const year = pathParts[2];
            const month = pathParts[3];
            const day = pathParts[4];
            const slug = pathParts[5];

            if (slug) {
              // Revalidate the specific article
              revalidationPromises.push(
                fetch(`${baseUrl}/api/revalidate`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-revalidate-key":
                      process.env.REVALIDATE_SECRET_KEY || "default-secret",
                  },
                  body: JSON.stringify({
                    type: "post",
                    postSlug: `${category}/${year}/${month}/${day}/${slug}`,
                  }),
                })
              );

              // Add the category to our set for revalidation
              categories.add(category);
            }
          }
        } catch (error) {
          console.warn(
            `[WebSub] Failed to process URL ${url} for revalidation:`,
            error
          );
        }
      });

      // Revalidate each category
      categories.forEach((category) => {
        // Map WordPress category to frontend path if needed
        const categoryMappings: Record<string, string> = {
          bahasa: "/berita",
          leisure: "/lifestyle",
          nation: "/news",
          business: "/business",
          opinion: "/opinion",
          sports: "/sports",
          world: "/world",
        };

        const categoryPath = categoryMappings[category] || "/news";

        revalidationPromises.push(
          fetch(`${baseUrl}/api/revalidate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-revalidate-key":
                process.env.REVALIDATE_SECRET_KEY || "default-secret",
            },
            body: JSON.stringify({
              type: "category",
              path: categoryPath,
            }),
          })
        );
      });

      // Also ensure we revalidate these specific endpoints
      revalidationPromises.push(
        fetch(`${baseUrl}/api/top-news`, { method: "POST" }),
        fetch(`${baseUrl}/api/last-update`, { method: "POST" }),
        mutate("/api/top-news"),
        mutate("/api/last-update")
      );

      // Run all revalidation operations in parallel
      await Promise.all(revalidationPromises);

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
