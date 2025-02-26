import type { NextApiRequest, NextApiResponse } from "next";
import { getCategoryNews } from "@/lib/gql-queries/get-category-news";
import { ParsedUrlQuery } from "querystring";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Destructure query parameters safely
  const { category, limit } = req.query as ParsedUrlQuery;

  const parsedLimit = Number(limit);

  // Validate that category is provided
  if (!category) {
    return res
      .status(400)
      .json({ error: "Missing required category parameter" });
  }

  try {
    const posts = await getCategoryNews(category as string, parsedLimit, false);

    return res.status(200).json(posts);
  } catch (error) {
    console.error("error in api", error);
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
}
