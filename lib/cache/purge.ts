export async function purgeCloudflareByTags(tags: string[]) {
  const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
  const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

  if (!CF_ZONE_ID || !CF_API_TOKEN) {
    console.warn("Cloudflare purge skipped: Missing credentials");
    return;
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags }),
      }
    );

    const json = await res.json();
    if (!json.success) {
      throw new Error(JSON.stringify(json.errors));
    }

    console.log("[Cloudflare Purge] Tags purged:", tags);
  } catch (err) {
    console.error("[Cloudflare Purge Error]", err);
  }
}
