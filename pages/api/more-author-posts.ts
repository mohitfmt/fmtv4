// pages/api/more-author-posts.ts
import { NextApiRequest, NextApiResponse } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { authorId, offset } = req.body;

  if (!authorId) {
    return res.status(400).json({ message: "Author ID is required" });
  }

  try {
    const response = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: 20,
        where: {
          offsetPagination: { offset, size: 20 },
          // Using authorIn instead of taxQuery since we're filtering by author
          authorIn: [parseInt(authorId, 10)],
          status: "PUBLISH",
        },
      },
    });

    res.status(200).json({
      posts: response.posts,
      total: response.posts.edges.length,
    });
  } catch (error) {
    console.error("Error fetching more author posts:", error);
    res.status(500).json({ error: "Failed to load more posts" });
  }
}