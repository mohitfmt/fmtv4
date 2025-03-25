// lib/preview-fetcher.ts
export async function fetchPreviewData(query: string, variables: any) {
  console.log(
    "[Preview Fetcher] Starting request with variables:",
    JSON.stringify(variables).substring(0, 100) + "..."
  );

  try {
    // Make the request to our proxy
    const response = await fetch("/api/wordpress-preview-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    console.log("[Preview Fetcher] Proxy response status:", response.status);

    // Get the full response text first for debugging
    const responseText = await response.text();

    // Try to parse the response text as JSON
    try {
      // If we can parse it as JSON, it's likely a proper API response
      const data = JSON.parse(responseText);

      // Check for GraphQL errors
      if (data.errors) {
        console.error("[Preview Fetcher] GraphQL errors:", data.errors);
        throw new Error(data.errors[0]?.message || "GraphQL error");
      }

      if (!data.data) {
        console.error("[Preview Fetcher] No data in response:", data);
        throw new Error("WordPress returned empty data");
      }

      return data.data;
    } catch (parseError) {
      // If parsing fails, the response is not valid JSON
      console.error(
        "[Preview Fetcher] Failed to parse response as JSON:",
        responseText.substring(0, 150) + "..."
      );

      throw new Error(
        `WordPress API error: ${responseText.substring(0, 100)}...`
      );
    }
  } catch (error) {
    console.error("[Preview Fetcher] Request error:", error);
    throw error;
  }
}
