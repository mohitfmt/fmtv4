import type { NextApiRequest, NextApiResponse } from "next";
import {
  fetchRSSFeedPayloads,
  updateRSSFeed,
} from "@/lib/feeds-generator/rss-feed-generator";

interface RSSpayloadType {
  rssUrl: string;
  category: string;
  atomLink: string;
  title: string;
  fullPath: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const slug = req.query.slug as string;
  const slugPayload = (await fetchRSSFeedPayloads(slug)) as RSSpayloadType;

  if (!slugPayload) return res.status(404).send("Not Found");

  try {
    const response = await fetch(slugPayload.rssUrl, { cache: "no-store" });
    const feed = await response.text();
    const updatedFeed = updateRSSFeed(feed, {
      category: slugPayload.category,
      title: slugPayload.title,
      atomLink: slugPayload.atomLink,
      fullPath: slugPayload.fullPath,
    });
    res.setHeader("Content-Type", "application/rss+xml");
    res.status(200).send(updatedFeed);
  } catch (err) {
    console.error(`[FEEDS_API_ERROR] RSS fetching error :`, err);
    res
      .status(500)
      .send(
        `[FEEDS_API_ERROR] Internal Server Error: RSS fetching error : ${err}`
      );
  }
}
