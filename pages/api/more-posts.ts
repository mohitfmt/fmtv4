// pages/api/[category]/posts.ts
import { NextApiRequest, NextApiResponse } from "next";
import { gqlFetchAPI } from "@/lib/gql-queries/gql-fetch-api";
import { GET_FILTERED_CATEGORY } from "@/lib/gql-queries/get-filtered-category";

// pages/api/more-posts.ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { page = 1, category } = req.query;
  const postsPerPage = 4;
  const offset = (Number(page) - 1) * postsPerPage + 5; // +5 because we already have 5 initial posts

  try {
    const posts = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: postsPerPage,
        where: {
          offsetPagination: {
            offset,
            size: postsPerPage,
          },
          taxQuery: {
            relation: "AND",
            taxArray: [
              {
                field: "SLUG",
                operator: "AND",
                taxonomy: "CATEGORY",
                terms: [category],
              },
            ],
          },
        },
      },
    });

    res.status(200).json({
      posts: posts.posts.edges,
      hasMore: posts.posts.edges.length === postsPerPage,
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
}
