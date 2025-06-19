// pages/api/feeds/websub/[postId].ts
import type { NextApiRequest, NextApiResponse } from "next";

// force this API to always run dynamically
export const dynamic = "force-dynamic";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { postId } = req.query;
  if (!postId || Array.isArray(postId)) {
    return res.status(400).end("invalid postId");
  }

  const wp =
    process.env.NEXT_PUBLIC_CMS_URL || "https://cms.freemalaysiatoday.com";

  // fetch *all* fields + embeds for author, categories, tags, media
  const r = await fetch(`${wp}/wp-json/wp/v2/posts/${postId}?_embed`, {
    headers: { Accept: "application/json" },
  });
  if (!r.ok) {
    return res.status(r.status).end();
  }
  const post = (await r.json()) as any;

  // use UTCString for RFC-822 dates
  const pubDate = new Date(post.date_gmt).toUTCString();
  const modDate = new Date(post.modified_gmt).toUTCString();

  // pull out embeds
  const authorName = post._embedded?.author?.[0]?.name || "";
  const featured = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "";

  // categories & tags
  const cats = (post._embedded?.["wp:term"]?.[0] || []).map(
    (c: any) => `<category domain="category"><![CDATA[${c.name}]]></category>`
  );
  const tags = (post._embedded?.["wp:term"]?.[1] || []).map(
    (t: any) => `<category domain="tag"><![CDATA[${t.name}]]></category>`
  );

  // build RSS
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[${post.title.rendered}]]></title>
    <link>${post.link}</link>
    <description><![CDATA[${post.excerpt.rendered}]]></description>
    <lastBuildDate>${modDate}</lastBuildDate>

    <item>
      <title><![CDATA[${post.title.rendered}]]></title>
      <link>${post.link}</link>
      <guid isPermaLink="true">${post.link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${post.excerpt.rendered}]]></description>
      <content:encoded><![CDATA[${post.content.rendered}]]></content:encoded>
      ${authorName ? `<author><![CDATA[${authorName}]]></author>` : ""}
      ${cats.concat(tags).join("\n      ")}
      ${
        featured
          ? `<enclosure url="${featured}" type="image/${featured
              .split(".")
              .pop()}" />`
          : ""
      }
    </item>
  </channel>
</rss>`;

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(xml);
}
