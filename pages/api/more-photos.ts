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
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  const { categorySlug = "photos", offset } = req.body;

  // Set aggressive caching headers for API route
  res.setHeader("Cache-Control", `s-maxage=3600, stale-while-revalidate=60`);

  try {
    const response = await gqlFetchAPI(GET_FILTERED_CATEGORY, {
      variables: {
        first: 12,
        where: {
          offsetPagination: { offset, size: 12 },
          taxQuery: {
            relation: "AND",
            taxArray: [
              {
                field: "SLUG",
                operator: "AND",
                taxonomy: "CATEGORY",
                terms: [categorySlug],
              },
            ],
          },
        },
      },
    });

    res.status(200).json({ posts: response.posts });
  } catch (error) {
    console.error("Error fetching more posts:", error);
    res.status(500).json({ error: "Failed to load more posts" });
  }
}
