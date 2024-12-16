import { getHeadlineNews } from "@/lib/gql-queries/get-headline-news";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const categories = [
      "super-highlight",
      "top-news",
      "business",
      "opinion",
      "world",
      "leisure",
      "sports",
      "top-bm",
      "video",
    ];

    const topNewsPosts = await Promise.all(
      categories.map(async (category) => {
        const posts = await getHeadlineNews(category, 1, false);
        return posts[0] ? { ...posts[0], categoryName: category } : null;
      })
    );

    const filteredPosts = topNewsPosts.filter(Boolean);
    res.status(200).json(filteredPosts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch top news" });
  }
}
