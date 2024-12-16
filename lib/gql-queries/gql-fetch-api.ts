const API_URL =
  process.env.WORDPRESS_API_URL ||
  "https://staging-cms.freemalaysiatoday.com/graphql";

export async function gqlFetchAPI(
  query = "",
  { variables }: Record<string, any> = {}
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
  };


  // if (process.env.WORDPRESS_AUTH_REFRESH_TOKEN) {
  //   headers["Authorization"] =
  //     `Bearer ${process.env.WORDPRESS_AUTH_REFRESH_TOKEN}`;
  // }

  // WPGraphQL Plugin must be enabled
  const res = await fetch(API_URL, {
    headers,
    method: "POST",
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const json = await res.json();
  if (json.errors) {
    console.error(json.errors);
    throw new Error("Failed to fetch API");
  }
  return json.data;
}
