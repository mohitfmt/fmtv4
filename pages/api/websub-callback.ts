import { NextApiRequest, NextApiResponse } from "next";
import { mutate } from "swr";
import { XMLParser } from "fast-xml-parser";
import getRawBody from "raw-body";

async function purgeCloudflareCache(paths: string[]) {
  if (!process.env.CLOUDFLARE_ZONE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    console.warn("[Cache] Cloudflare credentials not configured");
    return;
  }

  const currentDomain =
    process.env.NEXT_PUBLIC_DOMAIN || "dev-v4.freemalaysiatoday.com";
  const urls = paths.map((path) => `https://${currentDomain}${path}`);

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
    console.log(`[Cache] Purged ${urls.length} URLs from Cloudflare`);
  } catch (error) {
    console.error("[Cache] Purge request failed:", error);
    throw error;
  }
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
      // Parse incoming WebSub notification (RSS/Atom XML)
      const xmlData = await getRawBody(req, { encoding: "utf-8" });
      const parser = new XMLParser({ ignoreAttributes: false });
      const jsonData = parser.parse(xmlData);
      console.log("[WebSub] Parsed XML data:", jsonData, "/n XMLData", xmlData);

      // Extract article URLs
      let articleURLs: string[] = [];
      if (jsonData.feed && jsonData.feed.entry) {
        const entries = Array.isArray(jsonData.feed.entry)
          ? jsonData.feed.entry
          : [jsonData.feed.entry];
        articleURLs = entries.map((entry: any) => entry.link["@_href"]);
      }

      console.log("[WebSub] Extracted article URLs:", articleURLs);
      // Step 1: Call revalidate endpoint
      const protocol = "https"; // or use your env condition
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

        mutate("/api/top-news"),
        // Trigger SWR revalidation for all clients
        mutate("/api/last-update"),
      ]);

      // Step 2: Purge Cloudflare cache
      await purgeCloudflareCache(["/"]);
      await purgeCloudflareCache(articleURLs);

      return res.status(200).json({
        success: true,
        message: "Homepage revalidated and cache purged",
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
