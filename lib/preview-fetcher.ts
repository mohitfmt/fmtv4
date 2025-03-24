/**
 * Preview Data Fetcher
 *
 * This specialized function fetches WordPress preview data through our proxy API.
 * It avoids CORS issues by not directly calling the WordPress GraphQL endpoint.
 */
export async function fetchPreviewData(
  query: string,
  variables: any,
  token?: string
) {
  console.log("[Preview Fetcher] Fetching preview data through proxy");

  try {
    // Make a request to our preview proxy API
    const response = await fetch("/api/wordpress-preview-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
        token, // Pass the token to be forwarded to WordPress
      }),
    });

    // Check if the proxy request was successful
    if (!response.ok) {
      let errorMessage = `Preview proxy returned ${response.status}`;

      try {
        // Try to get detailed error information
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.details || errorMessage;
      } catch (e) {
        // If we can't parse the JSON, fall back to text
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }

      console.error("[Preview Fetcher] Proxy error:", errorMessage);
      throw new Error(`Preview fetch failed: ${errorMessage}`);
    }

    // Parse the JSON response
    const json = await response.json();

    // Check for GraphQL errors
    if (json.errors) {
      const errorMessage =
        json.errors[0]?.message || "GraphQL error in preview";
      console.error("[Preview Fetcher] GraphQL errors:", json.errors);
      throw new Error(errorMessage);
    }

    console.log("[Preview Fetcher] Successfully fetched preview data");
    return json.data;
  } catch (error) {
    console.error("[Preview Fetcher] Error:", error);
    throw error; // Re-throw to allow the component to handle it
  }
}
