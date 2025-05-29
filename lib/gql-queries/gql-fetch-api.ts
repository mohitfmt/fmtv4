const API_URL =
  process.env.WORDPRESS_API_URL || "https://cms.freemalaysiatoday.com/graphql";

export async function gqlFetchAPI(
  query = "",
  {
    variables,
    headers = {},
  }: {
    variables?: any;
    headers?: Record<string, string>;
  } = {}
) {
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
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(
        "[Network response error]",
        JSON.stringify({
          status: res.status,
          statusText: res.statusText,
          body: errorText,
        })
      );
      throw new Error(`Network response was not ok: ${res.status}`);
    }

    const json = await res.json();

    if (json.errors) {
      console.error("GraphQL Errors:", json.errors);
      throw new Error(json.errors[0]?.message || "Failed to fetch API");
    }

    return json.data;
  } catch (error) {
    console.error(
      "[API Call Error]",
      JSON.stringify({
        error,
        query,
        variables,
      })
    );
    throw error;
  }
}
