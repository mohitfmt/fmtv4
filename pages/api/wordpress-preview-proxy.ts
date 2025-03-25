// pages/api/wordpress-preview-proxy.ts
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Make sure we have the correct WordPress GraphQL endpoint
    const wpEndpoint =
      process.env.WORDPRESS_API_URL ||
      "https://cms.freemalaysiatoday.com/graphql";

    console.log("[WordPress Proxy] Using endpoint:", wpEndpoint);

    // Get the GraphQL query from request body
    const { query, variables } = req.body;

    if (!query) {
      return res.status(400).json({ error: "GraphQL query is required" });
    }

    // Create headers with specific focus on making WordPress accept the request
    const headers: any = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 NextJS/Proxy",

      // Spoof these headers to help with CORS and origin issues
      Origin: wpEndpoint.split("/graphql")[0],
      Referer: wpEndpoint,
    };

    // Add authorization if available
    if (process.env.NEXT_PUBLIC_WP_REFRESH_TOKEN) {
      headers["Authorization"] =
        `Bearer ${process.env.NEXT_PUBLIC_WP_REFRESH_TOKEN}`;
      console.log("[WordPress Proxy] Added authorization token from env");
    }

    console.log(
      "[WordPress Proxy] Request headers:",
      Object.entries(headers)
        .filter(([key]) => key !== "Authorization") // Don't log auth token
        .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {})
    );

    // Log request details (without sensitive data)
    console.log(
      "[WordPress Proxy] Request variables:",
      variables ? JSON.stringify(variables).substring(0, 100) + "..." : "none"
    );

    // Make the direct request to WordPress with explicit full URL
    const fullUrl = wpEndpoint.startsWith("http")
      ? wpEndpoint
      : `https://${wpEndpoint}`;

    console.log("[WordPress Proxy] Making fetch request to:", fullUrl);

    const response = await fetch(fullUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });

    console.log("[WordPress Proxy] Response status:", response.status);
    console.log(
      "[WordPress Proxy] Response headers:",
      Object.fromEntries([...response.headers.entries()])
    );

    // Get response content type
    const contentType = response.headers.get("content-type") || "";
    console.log("[WordPress Proxy] Content-Type:", contentType);

    // Handle different response types
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      // For non-JSON responses, get text and return meaningful error
      const text = await response.text();
      const firstChars = text.substring(0, 150).replace(/\n/g, " ");

      console.error(
        "[WordPress Proxy] Received non-JSON response:",
        firstChars + "..."
      );

      return res.status(500).json({
        error: `WordPress returned non-JSON response (${response.status})`,
        details: `Response starts with: ${firstChars}...`,
      });
    }
  } catch (error) {
    // Detailed error logging
    console.error("[WordPress Proxy] Fetch error:", error);

    return res.status(500).json({
      error: "Failed to fetch from WordPress GraphQL",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
