// lib/gql-queries/gql-fetch-api.ts

const API_URL = "https://cms.freemalaysiatoday.com/graphql";

export async function gqlFetchAPI(
  query = "",
  { variables }: Record<string, any> = {}
) {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    };

    const res = await fetch(API_URL, {
      headers,
      method: "POST",
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Network response error:', {
        status: res.status,
        statusText: res.statusText,
        body: errorText
      });
      throw new Error(`Network response was not ok: ${res.status}`);
    }

    const json = await res.json();
    
    if (json.errors) {
      console.error('GraphQL Errors:', json.errors);
      throw new Error(json.errors[0]?.message || "Failed to fetch API");
    }

    return json.data;
  } catch (error) {
    console.error('API Call Error:', {
      error,
      query,
      variables
    });
    throw error;
  }
}