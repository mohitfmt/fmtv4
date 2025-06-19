// Publish each updated article as its own mini-feed to PubSubHubbub
export async function pingSingleItemFeeds(
  articles: { id: number }[],
  frontendDomain: string,
  hubUrl = "https://pubsubhubbub.appspot.com/"
) {
  const baseUrl = `https://${frontendDomain}`;

  for (const post of articles) {
    const feedUrl = `${baseUrl}/api/feeds/websub/${post.id}.xml`;
    try {
      const body = new URLSearchParams({
        "hub.mode": "publish",
        "hub.url": feedUrl,
        "hub.topic": feedUrl,
      }).toString();

      const res = await fetch(hubUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!res.ok) {
        console.error(
          `[WebSub-Single] Failed to ping ${feedUrl}: ${res.status} ${res.statusText}`
        );
      } else {
        console.log(`[WebSub-Single] Pinged ${feedUrl} successfully`);
      }
    } catch (err) {
      console.error(`[WebSub-Single] Error pinging ${feedUrl}:`, err);
    }
  }
}
