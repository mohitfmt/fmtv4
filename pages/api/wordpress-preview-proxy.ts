import { NextApiRequest, NextApiResponse } from "next";

/**
 * WordPress GraphQL Preview Proxy API
 *
 * This API endpoint acts as a proxy between the browser and WordPress GraphQL.
 * It solves CORS issues by having the server make the request to WordPress
 * instead of having the browser make direct cross-origin requests.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests for security
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get the WordPress GraphQL endpoint from environment variable
    const wpGraphQLEndpoint =
      process.env.WORDPRESS_API_URL ||
      "https://cms.freemalaysiatoday.com/graphql";

    // Extract the GraphQL query and variables from the request body
    const { query, variables } = req.body;

    console.log("[Preview Proxy] Forwarding request to WordPress GraphQL");

    // Forward the request to WordPress with appropriate headers
    const response = await fetch(wpGraphQLEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        // Add the WordPress authentication token if available
        ...(process.env.NEXT_PUBLIC_WP_REFRESH_TOKEN && {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_WP_REFRESH_TOKEN}`,
        }),
        // Allow passing a custom token from the request
        ...(req.body.token && {
          Authorization: `Bearer ${req.body.token}`,
        }),
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    // Check if the WordPress response was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Preview Proxy] WordPress error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      return res.status(response.status).json({
        error: `WordPress returned an error: ${response.statusText}`,
        details: errorText,
      });
    }

    // Get the response data from WordPress
    const data = await response.json();

    // Forward any GraphQL errors to the client
    if (data.errors) {
      console.warn("[Preview Proxy] GraphQL errors:", data.errors);
    }

    // Return the WordPress response to the client
    return res.status(200).json(data);
  } catch (error) {
    console.error("[Preview Proxy] Server error:", error);
    return res.status(500).json({
      error: "Failed to fetch from WordPress",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
