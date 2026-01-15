import type { NextApiRequest, NextApiResponse } from "next";
import {
  fetchATOMFeedPayloads,
  transformRssToAtomFeed,
} from "@/lib/feeds-generator/atom-feed-generator";

interface PayloadType {
  rssUrl: string;
  link: string;
  title: string;
  subtitle: string;
  selfLink: string;
  categories: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const slug = req.query.slug as string;
  const slugPayload = (await fetchATOMFeedPayloads(slug)) as PayloadType;

  if (!slugPayload) return res.status(404).send("Not Found");

  try {
    const response = await fetch(slugPayload.rssUrl, { cache: "no-store" });
    const rssFeed = await response.text();
    const atomFeed = transformRssToAtomFeed(rssFeed, {
      id: slugPayload.link,
      title: slugPayload.title,
      subtitle: slugPayload.subtitle,
      link: slugPayload.link,
      selfLink: slugPayload.selfLink,
      categories: slugPayload.categories,
    });
    res.setHeader("Content-Type", "application/atom+xml");
    res.setHeader(
      "Cache-Control",
      "public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400"
    );
    res.setHeader("CDN-Cache-Control", "public, max-age=3600");
    res.status(200).send(atomFeed);
  } catch (err) {
    console.error("[FEEDS_API_ERROR] Atom feeds fetching error:", err);
    res
      .status(500)
      .send(`[FEEDS_API_ERROR] Atom feeds Internal Server Error : ${err}`);
  }
}
