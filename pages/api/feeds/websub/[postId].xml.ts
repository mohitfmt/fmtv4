import type { NextApiRequest, NextApiResponse } from "next";
import { formatISO } from "date-fns";

export const dynamic = "force-dynamic";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { postId } = req.query;
  if (!postId || Array.isArray(postId)) {
    return res.status(400).end();
  }

  const wpDomain =
    process.env.NEXT_PUBLIC_CMS_URL || "https://cms.freemalaysiatoday.com";

  // Fetch the single post data
  const response = await fetch(
    `${wpDomain}/wp-json/wp/v2/posts/${postId}?_fields=id,title,link,modified,slug`,
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    return res.status(response.status).end();
  }

  const post = (await response.json()) as {
    id: number;
    title: { rendered: string };
    link: string;
    modified: string;
    slug: string;
  };

  const modDate = new Date(post.modified);
  const pubDate = formatISO(modDate);

  // Build a minimal RSS feed with a single <item>
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${post.title.rendered}</title>
    <link>${post.link}</link>
    <description>Update feed for post ${post.id}</description>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <item>
      <title>${post.title.rendered}</title>
      <link>${post.link}</link>
      <guid isPermaLink="true">${post.link}</guid>
      <pubDate>${pubDate}</pubDate>
    </item>
  </channel>
</rss>`;

  res.setHeader("Content-Type", "application/rss+xml");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(xml);
}
