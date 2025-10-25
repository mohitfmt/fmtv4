// lib/gql-queries/gql-fetch-api.ts
// ✅ UPDATED: Added timeout + better error handling

const API_URL =
  process.env.WORDPRESS_API_URL || "https://cms.freemalaysiatoday.com/graphql";

export async function gqlFetchAPI(
  query = "",
  {
    variables,
    headers = {},
    timeout = 8000, // ✅ NEW: 8-second timeout
  }: {
    variables?: any;
    headers?: Record<string, string>;
    timeout?: number; // ✅ NEW: Configurable timeout
  } = {}
) {
  // ✅ NEW: Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    };

    const res = await fetch(API_URL, {
      headers: { ...baseHeaders, ...headers },
      method: "POST",
      body: JSON.stringify({
        query,
        variables,
      }),
      cache: "no-store",
      signal: controller.signal, // ✅ NEW: Abort on timeout
    });

    // ✅ NEW: Clear timeout if request completes
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();

      // ✅ IMPROVED: More detailed error logging
      console.error("[gqlFetchAPI] HTTP Error:", {
        status: res.status,
        statusText: res.statusText,
        body: errorText.substring(0, 200),
        query: query.substring(0, 100), // First 100 chars of query
        variables: JSON.stringify(variables || {}).substring(0, 200),
      });

      throw new Error(
        `GraphQL HTTP ${res.status}: ${errorText.substring(0, 100)}`
      );
    }

    const json = await res.json();

    if (json.errors) {
      // ✅ IMPROVED: Log GraphQL errors with context
      console.error("[gqlFetchAPI] GraphQL Errors:", {
        errors: json.errors,
        query: query.substring(0, 100),
        variables: JSON.stringify(variables || {}).substring(0, 200),
      });

      throw new Error(json.errors[0]?.message || "GraphQL query failed");
    }

    return json.data;
  } catch (error: any) {
    // ✅ NEW: Handle timeout specifically
    if (error.name === "AbortError") {
      console.error(`[gqlFetchAPI] ⏱️  Timeout after ${timeout}ms:`, {
        query: query.substring(0, 100),
        variables: JSON.stringify(variables || {}).substring(0, 200),
      });
      throw new Error(`WordPress query timeout (>${timeout}ms)`);
    }

    // ✅ IMPROVED: Better error context
    console.error("[gqlFetchAPI] Request failed:", {
      error: error.message,
      query: query.substring(0, 100),
      variables: JSON.stringify(variables || {}).substring(0, 200),
    });

    throw error;
  } finally {
    // ✅ NEW: Always clear timeout
    clearTimeout(timeoutId);
  }
}
